<?php

declare(strict_types=1);

namespace App\Domains\Purchases\Services;

use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Services\JournalService;
use App\Domains\Core\Services\FiscalPeriodService;
use App\Domains\Products\Models\Item;
use App\Domains\Purchases\Enums\PurchaseInvoiceStatus;
use App\Domains\Purchases\Models\PurchaseInvoice;
use App\Domains\Purchases\Models\PurchaseInvoiceLine;
use App\Domains\Purchases\Models\Supplier;
use App\Domains\Sales\Enums\PaymentMethod;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseInvoiceService
{
    public function __construct(
        private readonly SupplierService $supplierService,
        private readonly JournalService $journalService,
        private readonly FiscalPeriodService $fiscalPeriodService,
    ) {}

    /**
     * @param array<string, mixed> $filters
     * @return LengthAwarePaginator<PurchaseInvoice>
     */
    public function getInvoices(array $filters = []): LengthAwarePaginator
    {
        $query = PurchaseInvoice::with(['supplier', 'branch']);

        if (!empty($filters['search'])) {
            $term = '%' . trim((string) $filters['search']) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('invoice_number', 'like', $term)
                    ->orWhere('supplier_invoice_number', 'like', $term)
                    ->orWhere('supplier_name', 'like', $term);
            });
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['payment_method']) && $filters['payment_method'] !== 'all') {
            $query->where('payment_method', $filters['payment_method']);
        }

        if (!empty($filters['supplier_id']) && $filters['supplier_id'] !== 'all') {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        $perPage = !empty($filters['per_page']) ? (int) $filters['per_page'] : 25;

        return $query->orderBy('id', 'desc')->paginate($perPage);
    }

    public function getInvoice(int $id): PurchaseInvoice
    {
        return PurchaseInvoice::with(['lines.item', 'lines.itemUnit', 'supplier', 'branch', 'journalEntry'])
            ->findOrFail($id);
    }

    /**
     * إنشاء فاتورة مشتريات (مسودة أو ترحيل فوري)
     *
     * @param array<string, mixed> $data
     */
    public function createInvoice(array $data): PurchaseInvoice
    {
        return DB::transaction(function () use ($data) {
            $rawLines = $data['lines'] ?? [];
            if (empty($rawLines)) {
                throw ValidationException::withMessages([
                    'lines' => ['يجب إضافة صنف واحد على الأقل في فاتورة الشراء.'],
                ]);
            }

            $invoiceDate = !empty($data['invoice_date']) ? (string) $data['invoice_date'] : Carbon::now()->toDateString();
            $paymentMethod = $data['payment_method'] ?? 'cash';
            $dueDate = ($paymentMethod === 'credit' && !empty($data['due_date'])) ? (string) $data['due_date'] : $invoiceDate;

            // التحقق من المورد في الشراء الآجل
            $supplierId = !empty($data['supplier_id']) ? (int) $data['supplier_id'] : null;
            $supplier = $supplierId ? Supplier::find($supplierId) : null;

            if ($paymentMethod === 'credit' && !$supplier) {
                throw ValidationException::withMessages([
                    'supplier_id' => ['المورد إلزامي في فواتير الشراء الآجل لضبط حسابات الدائنين.'],
                ]);
            }

            // لقطة تاريخية للمورد
            $supplierName = $supplier ? $supplier->name_ar : ($data['supplier_name'] ?? 'مشتريات نقدية عامة');
            $supplierTaxNumber = $supplier?->tax_number ?? ($data['supplier_tax_number'] ?? null);

            // توليد رقم فاتورة الشراء تسلسلياً
            $yearMonth = Carbon::parse($invoiceDate)->format('Ym');
            $lastCount = PurchaseInvoice::where('invoice_number', 'like', "PINV-{$yearMonth}-%")->count() + 1;
            $invoiceNumber = $data['invoice_number'] ?? sprintf('PINV-%s-%04d', $yearMonth, $lastCount);

            // حساب أسطر الفاتورة
            $calculatedLines = [];
            $subtotal = '0.0000';
            $totalDiscount = '0.0000';
            $totalTax = '0.0000';

            foreach ($rawLines as $line) {
                $qty = (float) ($line['quantity'] ?? 0);
                if ($qty <= 0) {
                    continue;
                }

                $conversionFactor = (float) ($line['conversion_factor'] ?? 1.0);
                if ($conversionFactor <= 0) $conversionFactor = 1.0;
                $baseQty = bcmul((string) $qty, (string) $conversionFactor, 4);

                $unitPrice = (float) ($line['unit_price'] ?? 0);
                $discountAmount = (float) ($line['discount_amount'] ?? 0);
                $grossLine = round($qty * $unitPrice, 4);
                $netLine = max(0, round($grossLine - $discountAmount, 4));

                // نسبة الضريبة مرنة وليست ثابتة
                $taxRate = isset($line['tax_rate']) ? (float) $line['tax_rate'] : 15.0;
                $lineTax = round($netLine * ($taxRate / 100), 4);
                $lineTotal = round($netLine + $lineTax, 4);

                $subtotal = bcadd($subtotal, (string) $grossLine, 4);
                $totalDiscount = bcadd($totalDiscount, (string) $discountAmount, 4);
                $totalTax = bcadd($totalTax, (string) $lineTax, 4);

                $calculatedLines[] = [
                    'item_id' => $line['item_id'],
                    'item_unit_id' => $line['item_unit_id'] ?? null,
                    'unit_name' => $line['unit_name'] ?? 'حبة',
                    'conversion_factor' => $conversionFactor,
                    'quantity' => $qty,
                    'base_quantity' => $baseQty,
                    'unit_price' => $unitPrice,
                    'discount_amount' => $discountAmount,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $lineTax,
                    'subtotal' => $grossLine,
                    'total' => $lineTotal,
                ];
            }

            if (empty($calculatedLines)) {
                throw ValidationException::withMessages([
                    'lines' => ['يجب إدخال كمية صحيحة أكبر من الصفر لصنف واحد على الأقل.'],
                ]);
            }

            $netSubtotal = bcsub($subtotal, $totalDiscount, 4);
            $totalAmount = bcadd($netSubtotal, $totalTax, 4);

            $purchaseInvoice = PurchaseInvoice::create([
                'invoice_number' => $invoiceNumber,
                'supplier_invoice_number' => $data['supplier_invoice_number'] ?? null,
                'invoice_date' => $invoiceDate,
                'due_date' => $dueDate,
                'branch_id' => (int) ($data['branch_id'] ?? 1),
                'supplier_id' => $supplier?->id,
                'supplier_name' => $supplierName,
                'supplier_tax_number' => $supplierTaxNumber,
                'payment_method' => $paymentMethod,
                'status' => PurchaseInvoiceStatus::DRAFT,
                'subtotal' => $subtotal,
                'discount_amount' => $totalDiscount,
                'tax_amount' => $totalTax,
                'total_amount' => $totalAmount,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($calculatedLines as $lineRow) {
                $lineRow['purchase_invoice_id'] = $purchaseInvoice->id;
                PurchaseInvoiceLine::create($lineRow);
            }

            // إذا كان المطلوب الترحيل فوراً
            if (!empty($data['post_immediately'])) {
                $this->postInvoice($purchaseInvoice->id);
            }

            return $purchaseInvoice->fresh(['lines.item', 'lines.itemUnit', 'supplier', 'branch', 'journalEntry']);
        });
    }

    /**
     * ترحيل فاتورة المشتريات (تأثير المخزون، آخر سعر شراء، القيد المحاسبي، رصيد المورد)
     */
    public function postInvoice(int $invoiceId): PurchaseInvoice
    {
        return DB::transaction(function () use ($invoiceId) {
            $invoice = PurchaseInvoice::with(['lines.item', 'supplier', 'branch'])->lockForUpdate()->findOrFail($invoiceId);

            // فحوصات الحصانة (Idempotency)
            if ($invoice->isPosted()) {
                throw ValidationException::withMessages([
                    'invoice' => ['فاتورة الشراء مرحّلة مسبقاً ولا يمكن إعادة ترحيلها.'],
                ]);
            }

            if ($invoice->isCancelled()) {
                throw ValidationException::withMessages([
                    'invoice' => ['لا يمكن ترحيل فاتورة مشتريات ملغاة.'],
                ]);
            }

            // فحص الفترة المالية المفتوحة
            $this->fiscalPeriodService->assertDateInOpenPeriod($invoice->invoice_date->toDateString());

            // 1. زيادة رصيد المخزون وتحديث آخر تكلفة شراء في بطاقة الصنف
            foreach ($invoice->lines as $line) {
                $item = Item::lockForUpdate()->find($line->item_id);
                if ($item) {
                    $newStock = bcadd((string) $item->stock_quantity, (string) $line->base_quantity, 4);
                    
                    // حساب آخر سعر شراء للوحدة الأساسية (صافي السعر بعد الخصم)
                    $conversionFactor = (float) $line->conversion_factor;
                    if ($conversionFactor <= 0) $conversionFactor = 1.0;
                    
                    $netLineAmount = (float) $line->subtotal - (float) $line->discount_amount;
                    $unitNetCost = (float) bcdiv((string) $netLineAmount, (string) $line->base_quantity, 4);

                    $item->update([
                        'stock_quantity' => $newStock,
                        'cost_price' => $unitNetCost, // آخر سعر شراء للوحدة الأساسية
                    ]);
                }
            }

            // 2. إعداد القيد المحاسبي المتوازن بالصافي بعد الخصم
            $netSubtotal = (float) bcsub((string) $invoice->subtotal, (string) $invoice->discount_amount, 4);
            $taxAmount = (float) $invoice->tax_amount;
            $totalAmount = (float) $invoice->total_amount;

            $inventoryAccount = Account::where('code', '1131')->where('is_leaf', true)->first();
            $taxAccount = Account::where('code', '1141')->where('is_leaf', true)->first();

            $creditAccountCode = match ($invoice->payment_method->value) {
                'credit' => '2110',        // موردو المواد الغذائية
                'bank_transfer' => '1114', // مصرف الراجحي
                'cash' => '1111',          // الصندوق الرئيسي
                default => '1111',
            };
            $creditAccount = Account::where('code', $creditAccountCode)->where('is_leaf', true)->first();

            if (!$inventoryAccount || !$taxAccount || !$creditAccount) {
                throw ValidationException::withMessages([
                    'accounting' => ['تعذر إيجاد الحسابات المحاسبية الإلزامية للمشتريات (1131, 1141, أو حساب السداد).'],
                ]);
            }

            $journalLines = [];

            // مدين: المخزون الغذائي بصافي التكلفة بعد الخصم
            $journalLines[] = [
                'account_id' => $inventoryAccount->id,
                'description' => "مشتريات بضاعة - فاتورة شراء رقم {$invoice->invoice_number} من {$invoice->supplier_name}",
                'debit' => $netSubtotal,
                'credit' => 0.0,
            ];

            // مدين: ضريبة القيمة المضافة المدخلات (مشتريات 15%)
            if ($taxAmount > 0) {
                $journalLines[] = [
                    'account_id' => $taxAccount->id,
                    'description' => "ضريبة القيمة المضافة مدخلات - فاتورة شراء رقم {$invoice->invoice_number}",
                    'debit' => $taxAmount,
                    'credit' => 0.0,
                ];
            }

            // دائن: المورد أو الصندوق أو البنك بإجمالي الفاتورة
            $journalLines[] = [
                'account_id' => $creditAccount->id,
                'description' => "استحقاق مشتريات - فاتورة رقم {$invoice->invoice_number} ({$invoice->supplier_name})",
                'debit' => 0.0,
                'credit' => $totalAmount,
            ];

            $journalEntry = $this->journalService->createAndPost([
                'branch_id' => $invoice->branch_id,
                'date' => $invoice->invoice_date->toDateString(),
                'description' => "فاتورة مشتريات رقم {$invoice->invoice_number} من {$invoice->supplier_name}",
                'reference' => $invoice->invoice_number,
                'source_type' => 'manual',
            ], $journalLines);

            // 3. تعديل رصيد المورد في حال الشراء الآجل
            if ($invoice->payment_method->value === 'credit' && $invoice->supplier_id) {
                $this->supplierService->adjustBalance((int) $invoice->supplier_id, $totalAmount);
            }

            $invoice->update([
                'status' => PurchaseInvoiceStatus::POSTED,
                'journal_entry_id' => $journalEntry->id,
                'posted_at' => Carbon::now(),
            ]);

            return $invoice->fresh(['lines.item', 'lines.itemUnit', 'supplier', 'branch', 'journalEntry']);
        });
    }

    /**
     * إلغاء فاتورة مشتريات مرحّلة بأمان ورقابة صارمة على المخزون
     */
    public function cancelInvoice(int $invoiceId, ?string $reason = null): PurchaseInvoice
    {
        return DB::transaction(function () use ($invoiceId, $reason) {
            $invoice = PurchaseInvoice::with(['lines.item', 'supplier'])->lockForUpdate()->findOrFail($invoiceId);

            // فحوصات الحصانة (Idempotency)
            if ($invoice->isCancelled()) {
                throw ValidationException::withMessages([
                    'invoice' => ['فاتورة الشراء ملغاة مسبقاً ولا يمكن تكرار الإلغاء.'],
                ]);
            }

            if (!$invoice->isPosted()) {
                throw ValidationException::withMessages([
                    'invoice' => ['لا يمكن إلغاء فاتورة مسودة غير مرحّلة (يمكن حذفها مباشرة).'],
                ]);
            }

            // الرقابة الصارمة على المخزون لمنع الأرصدة السالبة
            foreach ($invoice->lines as $line) {
                $item = Item::lockForUpdate()->find($line->item_id);
                if ($item) {
                    if ((float) $item->stock_quantity < (float) $line->base_quantity) {
                        throw ValidationException::withMessages([
                            'stock' => [
                                "لا يمكن إلغاء فاتورة الشراء؛ رصيد المخزون الحالي للصنف [{$item->name_ar}] ({$item->stock_quantity}) غير كافٍ لخصم الكمية المشتراة ({$line->base_quantity})؛ قد تكون البضاعة قد صُرفت أو بيعت بالفعل.",
                            ],
                        ]);
                    }
                }
            }

            // 1. خصم الكميات المستلمة من المخزون
            foreach ($invoice->lines as $line) {
                $item = Item::lockForUpdate()->find($line->item_id);
                if ($item) {
                    $newStock = bcsub((string) $item->stock_quantity, (string) $line->base_quantity, 4);
                    $item->update(['stock_quantity' => $newStock]);
                }
            }

            // 2. عكس القيد المحاسبي
            if ($invoice->journal_entry_id) {
                $this->journalService->reverseEntry($invoice->journal_entry_id, "إلغاء فاتورة المشتريات رقم {$invoice->invoice_number}: " . ($reason ?? 'طلب المستخدم'));
            }

            // 3. تخفيض رصيد المورد في حال الشراء الآجل
            if ($invoice->payment_method->value === 'credit' && $invoice->supplier_id) {
                $this->supplierService->adjustBalance((int) $invoice->supplier_id, -((float) $invoice->total_amount));
            }

            $invoice->update([
                'status' => PurchaseInvoiceStatus::CANCELLED,
                'cancelled_at' => Carbon::now(),
            ]);

            return $invoice->fresh(['lines.item', 'lines.itemUnit', 'supplier', 'branch', 'journalEntry']);
        });
    }
}
