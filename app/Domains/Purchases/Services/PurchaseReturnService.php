<?php

declare(strict_types=1);

namespace App\Domains\Purchases\Services;

use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Services\JournalService;
use App\Domains\Core\Models\SystemSetting;
use App\Domains\Core\Services\FiscalPeriodService;
use App\Domains\Products\Models\Item;
use App\Domains\Purchases\Enums\PurchaseInvoiceStatus;
use App\Domains\Purchases\Models\PurchaseInvoice;
use App\Domains\Purchases\Models\PurchaseInvoiceLine;
use App\Domains\Purchases\Models\PurchaseReturn;
use App\Domains\Purchases\Models\PurchaseReturnLine;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseReturnService
{
    public function __construct(
        private readonly SupplierService $supplierService,
        private readonly JournalService $journalService,
        private readonly FiscalPeriodService $fiscalPeriodService,
    ) {}

    /**
     * جلب أسطر فاتورة الشراء القابلة للإرجاع مع الكميات المتبقية لكل سطر
     *
     * @return array<string, mixed>
     */
    public function getReturnableLines(int $invoiceId): array
    {
        $invoice = PurchaseInvoice::with(['lines.item', 'lines.itemUnit', 'supplier', 'branch'])
            ->findOrFail($invoiceId);

        if (!$invoice->isPosted()) {
            throw ValidationException::withMessages([
                'invoice' => ["لا يمكن إرجاع فاتورة غير مرحلة أو ملغاة (حالة الفاتورة: {$invoice->status->label()})."],
            ]);
        }

        $linesData = [];
        foreach ($invoice->lines as $line) {
            $alreadyReturned = (float) PurchaseReturnLine::where('purchase_invoice_line_id', $line->id)
                ->whereHas('purchaseReturn', fn ($q) => $q->where('status', 'posted'))
                ->sum('quantity');

            $remainingQty = max(0, (float) bcsub((string) $line->quantity, (string) $alreadyReturned, 4));

            $linesData[] = [
                'purchase_invoice_line_id' => $line->id,
                'item_id' => $line->item_id,
                'item_name_ar' => $line->item?->name_ar ?? 'صنف',
                'item_sku' => $line->item?->sku ?? '',
                'unit_name' => $line->unit_name,
                'conversion_factor' => (float) $line->conversion_factor,
                'original_quantity' => (float) $line->quantity,
                'already_returned_quantity' => $alreadyReturned,
                'remaining_quantity' => $remainingQty,
                'unit_price' => (float) $line->unit_price,
                'tax_rate' => (float) $line->tax_rate,
            ];
        }

        return [
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'supplier_invoice_number' => $invoice->supplier_invoice_number,
            'invoice_date' => $invoice->invoice_date->toDateString(),
            'supplier_id' => $invoice->supplier_id,
            'supplier_name' => $invoice->supplier_name,
            'payment_method' => $invoice->payment_method->value,
            'lines' => $linesData,
        ];
    }

    /**
     * إنشاء وترحيل مردود مشتريات وإصدار الإشعار المدين والقيد المحاسبي
     *
     * @param array<string, mixed> $data
     */
    public function createAndPostReturn(array $data): PurchaseReturn
    {
        return DB::transaction(function () use ($data) {
            $invoiceId = (int) ($data['purchase_invoice_id'] ?? 0);
            
            // قفل الفاتورة الأصلية لمنع التزامن والتعارض
            $invoice = PurchaseInvoice::with(['lines.item', 'supplier', 'branch'])
                ->lockForUpdate()
                ->find($invoiceId);

            if (!$invoice) {
                throw ValidationException::withMessages([
                    'purchase_invoice_id' => ['فاتورة المشتريات الأصلية غير موجودة.'],
                ]);
            }

            if (!$invoice->isPosted()) {
                throw ValidationException::withMessages([
                    'purchase_invoice_id' => ["لا يمكن عمل مردود لفاتورة غير مرحلة (الحالة: {$invoice->status->label()})."],
                ]);
            }

            $rawLines = $data['lines'] ?? [];
            if (empty($rawLines)) {
                throw ValidationException::withMessages([
                    'lines' => ['يجب تحديد صنف واحد على الأقل لإتمام المردود.'],
                ]);
            }

            $returnDate = !empty($data['return_date']) ? (string) $data['return_date'] : Carbon::now()->toDateString();
            $this->fiscalPeriodService->assertDateInOpenPeriod($returnDate);

            $refundMethod = $data['refund_method'] ?? 'credit';
            if (!in_array($refundMethod, ['credit', 'cash', 'bank_transfer'], true)) {
                $refundMethod = 'credit';
            }

            $calculatedLines = [];
            $subtotal = '0.0000';
            $taxTotal = '0.0000';

            foreach ($rawLines as $lineData) {
                $invoiceLineId = (int) ($lineData['purchase_invoice_line_id'] ?? 0);
                $returnQty = (float) ($lineData['quantity'] ?? 0);

                if ($returnQty <= 0) {
                    continue;
                }

                // قفل سطر الفاتورة الأصلية
                $invoiceLine = PurchaseInvoiceLine::with('item')
                    ->lockForUpdate()
                    ->find($invoiceLineId);

                if (!$invoiceLine || $invoiceLine->purchase_invoice_id !== $invoice->id) {
                    throw ValidationException::withMessages([
                        'lines' => ["سطر الفاتورة المحدد (معرف: {$invoiceLineId}) غير صالح لهذه الفاتورة."],
                    ]);
                }

                // حساب الكمية المتبقية القابلة للإرجاع بدقة مع القفل لمنع الإرجاع المزدوج
                $alreadyReturned = (float) PurchaseReturnLine::where('purchase_invoice_line_id', $invoiceLine->id)
                    ->whereHas('purchaseReturn', fn ($q) => $q->where('status', 'posted'))
                    ->lockForUpdate()
                    ->sum('quantity');

                $remainingQty = (float) bcsub((string) $invoiceLine->quantity, (string) $alreadyReturned, 4);

                if ($returnQty > $remainingQty) {
                    $itemName = $invoiceLine->item?->name_ar ?? "صنف رقم {$invoiceLine->item_id}";
                    throw ValidationException::withMessages([
                        'lines' => [
                            "الكمية المرتجعة للصنف [{$itemName}] ({$returnQty} {$invoiceLine->unit_name}) تتجاوز الكمية المتبقية القابلة للإرجاع ({$remainingQty} {$invoiceLine->unit_name}).",
                        ],
                    ]);
                }

                $conversionFactor = (float) $invoiceLine->conversion_factor;
                if ($conversionFactor <= 0) $conversionFactor = 1.0;
                $baseQty = bcmul((string) $returnQty, (string) $conversionFactor, 4);

                // قفل رصيد الصنف والتحقق من كفاية المخزون للإرجاع
                $item = Item::lockForUpdate()->findOrFail($invoiceLine->item_id);
                $currentStock = (float) $item->stock_quantity;
                if ($currentStock < (float) $baseQty) {
                    throw ValidationException::withMessages([
                        'lines' => [
                            "رصيد المخزون المتوفر للصنف [{$item->name_ar}] هو ({$currentStock}) ولا يكفي لإرجاع كمية ({$baseQty}) للمورد.",
                        ],
                    ]);
                }

                $unitPrice = (float) $invoiceLine->unit_price;
                $taxRate = (float) $invoiceLine->tax_rate;
                $lineSubtotal = round($returnQty * $unitPrice, 4);
                $lineTax = round($lineSubtotal * ($taxRate / 100), 4);
                $lineTotal = round($lineSubtotal + $lineTax, 4);

                $subtotal = bcadd($subtotal, (string) $lineSubtotal, 4);
                $taxTotal = bcadd($taxTotal, (string) $lineTax, 4);

                $calculatedLines[] = [
                    'purchase_invoice_line_id' => $invoiceLine->id,
                    'item_id' => $invoiceLine->item_id,
                    'item_unit_id' => $invoiceLine->item_unit_id,
                    'unit_name' => $invoiceLine->unit_name,
                    'conversion_factor' => $conversionFactor,
                    'quantity' => $returnQty,
                    'base_quantity' => $baseQty,
                    'unit_price' => $unitPrice,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $lineTax,
                    'subtotal' => $lineSubtotal,
                    'total' => $lineTotal,
                ];
            }

            if (empty($calculatedLines)) {
                throw ValidationException::withMessages([
                    'lines' => ['يجب إدخال كمية أكبر من الصفر لصنف واحد على الأقل لإتمام المردود.'],
                ]);
            }

            $totalAmount = bcadd($subtotal, $taxTotal, 4);

            // توليد أرقام تسلسلية للمردود والإشعار المدين
            $yearMonth = Carbon::parse($returnDate)->format('Ym');
            $count = PurchaseReturn::where('return_number', 'like', "PRT-{$yearMonth}-%")->count() + 1;
            $returnNumber = sprintf('PRT-%s-%04d', $yearMonth, $count);
            $debitNoteNumber = sprintf('DN-%s-%04d', $yearMonth, $count);

            // خصم الكميات من المخزون (بضاعة خارجة للمورد)
            foreach ($calculatedLines as $cl) {
                $item = Item::lockForUpdate()->find($cl['item_id']);
                if ($item) {
                    $newStock = bcsub((string) $item->stock_quantity, (string) $cl['base_quantity'], 4);
                    $item->update(['stock_quantity' => $newStock]);
                }
            }

            // استخراج الحسابات المحاسبية ديناميكياً بدون Hardcoding
            $inventoryAccount = $this->resolveAccount('inventory');
            $taxAccount = $this->resolveAccount('input_tax');
            $debitAccount = match ($refundMethod) {
                'cash' => $this->resolveAccount('cash'),
                'bank_transfer' => $this->resolveAccount('bank'),
                'credit' => $this->resolveAccount('supplier', $invoice->supplier_id),
                default => $this->resolveAccount('supplier', $invoice->supplier_id),
            };

            // إعداد القيد المحاسبي المتوازن لمردود المشتريات
            $journalLines = [];

            // الطرف المدين: تسوية الاسترداد (تخفيض التزام المورد أو زيادة الصندوق/البنك)
            $debitDesc = match ($refundMethod) {
                'credit' => "إشعار مدين وتخفيض مديونية المورد - مردود {$returnNumber} للفاتورة {$invoice->invoice_number}",
                'cash' => "استرداد نقدي بالصندوق - مردود مشتريات {$returnNumber}",
                'bank_transfer' => "استرداد تحويل بنكي - مردود مشتريات {$returnNumber}",
            };

            $journalLines[] = [
                'account_id' => $debitAccount->id,
                'description' => $debitDesc,
                'debit' => (float) $totalAmount,
                'credit' => 0.0,
            ];

            // الطرف الدائن 1: تخفيض قيمة المخزون بصافي المردود
            $journalLines[] = [
                'account_id' => $inventoryAccount->id,
                'description' => "تخفيض المخزون - مردود مشتريات {$returnNumber} ({$invoice->supplier_name})",
                'debit' => 0.0,
                'credit' => (float) $subtotal,
            ];

            // الطرف الدائن 2: عكس ضريبة القيمة المضافة المدخلات
            if ((float) $taxTotal > 0) {
                $journalLines[] = [
                    'account_id' => $taxAccount->id,
                    'description' => "عكس ضريبة القيمة المضافة مدخلات - مردود مشتريات {$returnNumber}",
                    'debit' => 0.0,
                    'credit' => (float) $taxTotal,
                ];
            }

            // ترحيل قيد اليومية
            $journalEntry = $this->journalService->createAndPost([
                'branch_id' => $invoice->branch_id,
                'date' => $returnDate,
                'description' => "إشعار مدين ومردود مشتريات رقم {$returnNumber} للفاتورة {$invoice->invoice_number}",
                'reference' => $debitNoteNumber,
                'source_type' => 'manual',
            ], $journalLines);

            // حفظ سجل مردود المشتريات
            $purchaseReturn = PurchaseReturn::create([
                'return_number' => $returnNumber,
                'debit_note_number' => $debitNoteNumber,
                'purchase_invoice_id' => $invoice->id,
                'return_date' => $returnDate,
                'branch_id' => $invoice->branch_id,
                'supplier_id' => $invoice->supplier_id,
                'supplier_name' => $invoice->supplier_name,
                'refund_method' => $refundMethod,
                'status' => 'posted',
                'subtotal' => $subtotal,
                'tax_amount' => $taxTotal,
                'total_amount' => $totalAmount,
                'reason' => $data['reason'] ?? 'مردود مشتريات',
                'notes' => $data['notes'] ?? null,
                'journal_entry_id' => $journalEntry->id,
                'posted_at' => Carbon::now(),
            ]);

            // حفظ أسطر المردود
            foreach ($calculatedLines as $cl) {
                $cl['purchase_return_id'] = $purchaseReturn->id;
                PurchaseReturnLine::create($cl);
            }

            // تحديث الرصيد التشغيلي للمورد إن كانت طريقة التسوية قيد على الحساب (آجل)
            if ($refundMethod === 'credit' && $invoice->supplier_id) {
                $this->supplierService->adjustBalance((int) $invoice->supplier_id, -((float) $totalAmount));
            }

            return $purchaseReturn->load(['lines.item', 'lines.itemUnit', 'supplier', 'branch', 'journalEntry', 'invoice']);
        });
    }

    /**
     * إلغاء مردود مشتريات مرحل، عكس قيد اليومية، وإعادة بضاعة المخزون ورصيد المورد
     */
    public function cancelReturn(int $returnId, ?string $reason = null): PurchaseReturn
    {
        return DB::transaction(function () use ($returnId, $reason) {
            $return = PurchaseReturn::with(['lines.item', 'journalEntry'])
                ->lockForUpdate()
                ->findOrFail($returnId);

            if ($return->isCancelled()) {
                throw ValidationException::withMessages([
                    'return' => ['مردود المشتريات ملغى مسبقاً ولا يمكن إلغاؤه مرة أخرى.'],
                ]);
            }

            $today = Carbon::now()->toDateString();
            $this->fiscalPeriodService->assertDateInOpenPeriod($today);

            // 1. إعادة كميات المخزون للأصناف
            foreach ($return->lines as $line) {
                $item = Item::lockForUpdate()->find($line->item_id);
                if ($item) {
                    $restoredStock = bcadd((string) $item->stock_quantity, (string) $line->base_quantity, 4);
                    $item->update(['stock_quantity' => $restoredStock]);
                }
            }

            // 2. عكس القيد المحاسبي إن وُجد
            if ($return->journalEntry && $return->journalEntry->isPosted()) {
                $this->journalService->reverseEntry(
                    $return->journalEntry,
                    $reason ?: "إلغاء مردود مشتريات رقم {$return->return_number}",
                    $today
                );
            }

            // 3. إعادة رصيد المورد إذا كان الإرجاع تم قيده على حسابه (Credit)
            if ($return->refund_method === 'credit' && $return->supplier_id) {
                $this->supplierService->adjustBalance((int) $return->supplier_id, +((float) $return->total_amount));
            }

            // 4. تحديث حالة المردود إلى ملغى
            $appendNote = ' [تم الإلغاء في ' . Carbon::now()->toDateTimeString() . ' - السبب: ' . ($reason ?: 'طلب المستخدم') . ']';
            $return->update([
                'status' => 'cancelled',
                'cancelled_at' => Carbon::now(),
                'notes' => trim(($return->notes ?? '') . $appendNote),
            ]);

            return $return->fresh(['lines.item', 'lines.itemUnit', 'supplier', 'branch', 'journalEntry', 'invoice']);
        });
    }

    /**
     * استعراض قائمة مردودات المشتريات
     *
     * @param array<string, mixed> $filters
     * @return LengthAwarePaginator<PurchaseReturn>
     */
    public function getReturns(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $query = PurchaseReturn::with(['supplier', 'branch', 'invoice', 'journalEntry']);

        if (!empty($filters['search'])) {
            $term = '%' . trim((string) $filters['search']) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('return_number', 'like', $term)
                    ->orWhere('debit_note_number', 'like', $term)
                    ->orWhere('supplier_name', 'like', $term);
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('return_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->where('return_date', '<=', $filters['date_to']);
        }

        return $query->orderBy('id', 'desc')->paginate($perPage);
    }

    public function getReturnById(int $id): PurchaseReturn
    {
        return PurchaseReturn::with(['lines.item', 'lines.itemUnit', 'supplier', 'branch', 'journalEntry', 'invoice'])
            ->findOrFail($id);
    }

    /**
     * استخراج الحساب المحاسبي ديناميكياً من الإعدادات أو شجرة الحسابات
     */
    public function resolveAccount(string $type, ?int $supplierId = null): Account
    {
        $account = match ($type) {
            'supplier' => $this->findSupplierAccount($supplierId),
            'inventory' => $this->findInventoryAccount(),
            'input_tax' => $this->findInputTaxAccount(),
            'cash' => $this->findCashAccount(),
            'bank' => $this->findBankAccount(),
            default => null,
        };

        if (!$account) {
            throw ValidationException::withMessages([
                'accounting' => ["الحساب المحاسبي المطلوب لـ [{$type}] غير مهيأ في الدليل المحاسبي أو الإعدادات."],
            ]);
        }

        return $account;
    }

    protected function findSupplierAccount(?int $supplierId): ?Account
    {
        // 1. محاولة قراءة الحساب من إعدادات النظام
        $settingCode = SystemSetting::get('accounting.supplier_control_account');
        if ($settingCode) {
            $acc = Account::where('code', $settingCode)->where('is_leaf', true)->first();
            if ($acc) return $acc;
        }

        // 2. الكود القياسي للموردين 2110 أو ما يبدأ بـ 211
        $acc = Account::where('code', '2110')->where('is_leaf', true)->first();
        if ($acc) return $acc;

        return Account::where('code', 'LIKE', '211%')->where('is_leaf', true)->first();
    }

    protected function findInventoryAccount(): ?Account
    {
        $settingCode = SystemSetting::get('accounting.inventory_account');
        if ($settingCode) {
            $acc = Account::where('code', $settingCode)->where('is_leaf', true)->first();
            if ($acc) return $acc;
        }

        $acc = Account::where('code', '1131')->where('is_leaf', true)->first();
        if ($acc) return $acc;

        return Account::where('code', 'LIKE', '113%')->where('is_leaf', true)->first();
    }

    protected function findInputTaxAccount(): ?Account
    {
        $settingCode = SystemSetting::get('accounting.input_tax_account');
        if ($settingCode) {
            $acc = Account::where('code', $settingCode)->where('is_leaf', true)->first();
            if ($acc) return $acc;
        }

        $acc = Account::where('code', '1141')->where('is_leaf', true)->first();
        if ($acc) return $acc;

        $acc = Account::where('code', '1140')->where('is_leaf', true)->first();
        if ($acc) return $acc;

        return Account::where('name_ar', 'LIKE', '%مدخلات%')->where('is_leaf', true)->first();
    }

    protected function findCashAccount(): ?Account
    {
        $settingCode = SystemSetting::get('accounting.default_cash_account');
        if ($settingCode) {
            $acc = Account::where('code', $settingCode)->where('is_leaf', true)->first();
            if ($acc) return $acc;
        }

        $acc = Account::where('code', '1111')->where('is_leaf', true)->first();
        if ($acc) return $acc;

        return Account::where('code', 'LIKE', '111%')->where('is_leaf', true)->first();
    }

    protected function findBankAccount(): ?Account
    {
        $settingCode = SystemSetting::get('accounting.default_bank_account');
        if ($settingCode) {
            $acc = Account::where('code', $settingCode)->where('is_leaf', true)->first();
            if ($acc) return $acc;
        }

        $acc = Account::where('code', '1114')->where('is_leaf', true)->first();
        if ($acc) return $acc;

        return Account::where(function ($q) {
            $q->where('name_ar', 'LIKE', '%مصرف%')->orWhere('name_ar', 'LIKE', '%بنك%');
        })->where('is_leaf', true)->first();
    }
}
