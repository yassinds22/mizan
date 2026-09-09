<?php

declare(strict_types=1);

namespace App\Domains\Sales\Services;

use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Services\JournalService;
use App\Domains\Core\Models\Branch;
use App\Domains\Core\Models\SystemSetting;
use App\Domains\Core\Services\FiscalPeriodService;
use App\Domains\Products\Models\Item;
use App\Domains\Sales\Enums\InvoiceStatus;
use App\Domains\Sales\Enums\PaymentMethod;
use App\Domains\Sales\Models\Customer;
use App\Domains\Sales\Models\SalesInvoice;
use App\Domains\Sales\Repositories\Contracts\SalesInvoiceRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesInvoiceService
{
    public function __construct(
        private readonly SalesInvoiceRepositoryInterface $invoiceRepository,
        private readonly CustomerService $customerService,
        private readonly JournalService $journalService,
        private readonly FiscalPeriodService $fiscalPeriodService,
        private readonly ZatcaQrService $zatcaQrService,
    ) {}

    public function listInvoices(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        return $this->invoiceRepository->paginate($filters, $perPage);
    }

    public function getInvoice(int $id): SalesInvoice
    {
        $invoice = $this->invoiceRepository->findById($id);
        if (!$invoice) {
            throw ValidationException::withMessages([
                'invoice_id' => ["فاتورة المبيعات غير موجودة (معرف: {$id})"],
            ]);
        }
        return $invoice;
    }

    /**
     * إنشاء فاتورة مبيعات (مسودة أو مرحلة مباشرة)
     *
     * @param array<string, mixed> $data
     * @param array<int, array<string, mixed>> $rawLines
     */
    public function createInvoice(array $data, array $rawLines = [], bool $postImmediately = false): SalesInvoice
    {
        return DB::transaction(function () use ($data, $rawLines, $postImmediately) {
            if (empty($rawLines)) {
                throw ValidationException::withMessages([
                    'lines' => ['يجب إضافة صنف واحد على الأقل في فاتورة المبيعات.'],
                ]);
            }

            $date = !empty($data['invoice_date']) ? (string) $data['invoice_date'] : Carbon::now()->toDateString();
            $this->fiscalPeriodService->assertDateInOpenPeriod($date);

            // التحقق من الفرع
            $branchId = !empty($data['branch_id']) ? (int) $data['branch_id'] : (int) Branch::where('is_active', true)->value('id');
            if (!$branchId) {
                throw ValidationException::withMessages([
                    'branch_id' => ['يجب تحديد فرع صالح للمبيعات.'],
                ]);
            }
            $data['branch_id'] = $branchId;
            $data['invoice_date'] = $date;

            // تحديد بيانات العميل
            $customerId = !empty($data['customer_id']) ? (int) $data['customer_id'] : null;
            if ($customerId) {
                $customer = $this->customerService->getCustomer($customerId);
                $data['customer_id'] = $customer->id;
                $data['customer_name'] = $customer->name_ar;
                $data['customer_tax_number'] = $customer->tax_number;
            } else {
                $data['customer_name'] = !empty($data['customer_name']) ? (string) $data['customer_name'] : 'عميل نقدي عام';
                $data['customer_tax_number'] = $data['customer_tax_number'] ?? null;
            }

            // توليد رقم الفاتورة التسلسلي
            if (empty($data['invoice_number'])) {
                $data['invoice_number'] = $this->invoiceRepository->generateNextInvoiceNumber($date);
            }

            // تجهيز بنود الفاتورة وحساب المجاميع
            $calculatedLines = [];
            $subtotal = '0.0000';
            $discountTotal = '0.0000';
            $taxTotal = '0.0000';

            foreach ($rawLines as $line) {
                $itemId = (int) ($line['item_id'] ?? 0);
                $item = Item::with('category')->find($itemId);
                if (!$item) {
                    throw ValidationException::withMessages([
                        'lines' => ["الصنف المحدد غير موجود (معرف: {$itemId})"],
                    ]);
                }

                $qty = (float) ($line['quantity'] ?? 1);
                if ($qty <= 0) {
                    throw ValidationException::withMessages([
                        'lines' => ["كمية الصنف [{$item->name_ar}] يجب أن تكون أكبر من الصفر."],
                    ]);
                }

                $conversionFactor = (float) ($line['conversion_factor'] ?? 1.0);
                if ($conversionFactor <= 0) $conversionFactor = 1.0;
                $baseQty = $qty * $conversionFactor;

                $unitPrice = (float) ($line['unit_price'] ?? 0);
                $costPrice = (float) ($line['cost_price'] ?? $item->cost_price);
                $discountRate = (float) ($line['discount_rate'] ?? 0);
                $taxRate = isset($line['tax_rate']) ? (float) $line['tax_rate'] : 15.0;

                $lineSubtotal = round($qty * $unitPrice, 4);
                $lineDiscount = round($lineSubtotal * ($discountRate / 100), 4);
                $taxableAmount = max(0, $lineSubtotal - $lineDiscount);
                $lineTax = round($taxableAmount * ($taxRate / 100), 4);
                $lineTotal = round($taxableAmount + $lineTax, 4);

                $subtotal = bcadd($subtotal, (string) $lineSubtotal, 4);
                $discountTotal = bcadd($discountTotal, (string) $lineDiscount, 4);
                $taxTotal = bcadd($taxTotal, (string) $lineTax, 4);

                $calculatedLines[] = [
                    'item_id' => $item->id,
                    'item_unit_id' => !empty($line['item_unit_id']) ? (int) $line['item_unit_id'] : null,
                    'unit_name' => (string) ($line['unit_name'] ?? $item->base_uom_id),
                    'conversion_factor' => $conversionFactor,
                    'quantity' => $qty,
                    'base_quantity' => $baseQty,
                    'unit_price' => $unitPrice,
                    'cost_price' => $costPrice,
                    'discount_rate' => $discountRate,
                    'discount_amount' => $lineDiscount,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $lineTax,
                    'subtotal' => $lineSubtotal,
                    'total' => $lineTotal,
                ];
            }

            $totalAmount = bcadd(bcsub($subtotal, $discountTotal, 4), $taxTotal, 4);

            $data['subtotal'] = $subtotal;
            $data['discount_amount'] = $discountTotal;
            $data['tax_amount'] = $taxTotal;
            $data['total_amount'] = $totalAmount;
            $data['status'] = InvoiceStatus::DRAFT->value;

            $paymentMethod = $data['payment_method'] ?? 'cash';
            if ($paymentMethod === 'cash' || $paymentMethod === 'bank_transfer') {
                $data['paid_amount'] = $totalAmount;
                $data['remaining_amount'] = '0.0000';
            } else {
                $data['paid_amount'] = '0.0000';
                $data['remaining_amount'] = $totalAmount;
            }

            // توليد رمز ZATCA QR التلقائي
            $sellerName = SystemSetting::get('company_name', 'ميزان للمواد الغذائية');
            $vatNumber = SystemSetting::get('vat_number', '300000000000003');
            $timestamp = Carbon::parse($date)->format('Y-m-d\TH:i:s\Z');

            $data['zatca_qr_payload'] = $this->zatcaQrService->generateTlvQr(
                $sellerName,
                $vatNumber,
                $timestamp,
                number_format((float) $totalAmount, 2, '.', ''),
                number_format((float) $taxTotal, 2, '.', '')
            );

            $invoice = $this->invoiceRepository->create($data, $calculatedLines);

            if ($postImmediately) {
                return $this->postInvoice($invoice);
            }

            return $invoice;
        });
    }

    /**
     * ترحيل فاتورة المبيعات وتوليد قيد اليومية المتوازن آلياً
     */
    public function postInvoice(int|SalesInvoice $invoice): SalesInvoice
    {
        return DB::transaction(function () use ($invoice) {
            $inv = is_int($invoice) ? $this->getInvoice($invoice) : $invoice->fresh(['lines.item.category', 'customer', 'branch']);

            if ($inv->isPosted()) {
                throw ValidationException::withMessages([
                    'invoice' => ["الفاتورة رقم [{$inv->invoice_number}] مرحّلة مسبقاً."],
                ]);
            }

            if ($inv->isCancelled()) {
                throw ValidationException::withMessages([
                    'invoice' => ["لا يمكن ترحيل فاتورة ملغاة [{$inv->invoice_number}]."],
                ]);
            }

            $date = $inv->invoice_date->toDateString();
            $this->fiscalPeriodService->assertDateInOpenPeriod($date);

            // تحديد الحسابات المحاسبية
            // 1. الطرف المدين (الصندوق أو البنك أو العميل)
            $paymentMethod = $inv->payment_method->value;
            $debitAccountCode = match ($paymentMethod) {
                'cash' => '1111',          // الصندوق الرئيسي
                'bank_transfer' => '1114', // مصرف الراجحي
                'credit' => '1121',        // عملاء التموين
                default => '1111',
            };

            $debitAccount = Account::where('code', $debitAccountCode)->where('is_leaf', true)->first();
            if (!$debitAccount) {
                throw ValidationException::withMessages([
                    'accounting' => ["حساب القبض المحاسبي [{$debitAccountCode}] غير مهيأ في الدليل كحساب تحليلي."],
                ]);
            }

            // 2. حساب ضريبة المبيعات 15% (دائن)
            $taxAccount = Account::where('code', '2130')->where('is_leaf', true)->first();
            if (!$taxAccount) {
                throw ValidationException::withMessages([
                    'accounting' => ['حساب ضريبة القيمة المضافة المخرجات [2130] غير مهيأ في الدليل كحساب تحليلي.'],
                ]);
            }

            // 3. حساب إيرادات المبيعات (دائن)
            $defaultRevenueAccount = Account::where('code', '4110')->where('is_leaf', true)->first();
            if (!$defaultRevenueAccount) {
                throw ValidationException::withMessages([
                    'accounting' => ['حساب مبيعات المواد الغذائية [4110] غير مهيأ في الدليل كحساب تحليلي.'],
                ]);
            }

            // 4. حسابات تكلفة البضاعة المباعة والمخزون
            $defaultCogsAccount = Account::where('code', '5110')->where('is_leaf', true)->first();
            $defaultInventoryAccount = Account::where('code', '1131')->where('is_leaf', true)->first();

            // بناء أسطر قيد اليومية
            $journalLines = [];

            // سطر الطرف المدين (إجمالي الفاتورة شامل الضريبة)
            $journalLines[] = [
                'account_id' => $debitAccount->id,
                'description' => "مبيعات فاتورة رقم {$inv->invoice_number} - {$inv->customer_name}",
                'debit' => (float) $inv->total_amount,
                'credit' => 0.0,
            ];

            // سطر الإيرادات (المبيعات الصافية بدون الضريبة)
            $netSales = bcsub((string) $inv->subtotal, (string) $inv->discount_amount, 4);
            $journalLines[] = [
                'account_id' => $defaultRevenueAccount->id,
                'description' => "إيراد مبيعات مواد غذائية - فاتورة {$inv->invoice_number}",
                'debit' => 0.0,
                'credit' => (float) $netSales,
            ];

            // سطر الضريبة (إذا كانت أكبر من صفر)
            if ((float) $inv->tax_amount > 0) {
                $journalLines[] = [
                    'account_id' => $taxAccount->id,
                    'description' => "ضريبة القيمة المضافة 15% - فاتورة {$inv->invoice_number}",
                    'debit' => 0.0,
                    'credit' => (float) $inv->tax_amount,
                ];
            }

            // حساب تكلفة البضاعة المباعة COGS والمخزون تلقائياً
            $totalCogs = '0.0000';
            foreach ($inv->lines as $line) {
                $lineCogs = bcmul((string) $line->base_quantity, (string) $line->cost_price, 4);
                $totalCogs = bcadd($totalCogs, $lineCogs, 4);
            }

            if ((float) $totalCogs > 0 && $defaultCogsAccount && $defaultInventoryAccount) {
                // سطر مدين COGS
                $journalLines[] = [
                    'account_id' => $defaultCogsAccount->id,
                    'description' => "تكلفة بضاعة مباعة - فاتورة {$inv->invoice_number}",
                    'debit' => (float) $totalCogs,
                    'credit' => 0.0,
                ];

                // سطر دائن المخزون
                $journalLines[] = [
                    'account_id' => $defaultInventoryAccount->id,
                    'description' => "خروج بضاعة من المخزون - فاتورة {$inv->invoice_number}",
                    'debit' => 0.0,
                    'credit' => (float) $totalCogs,
                ];
            }

            // إنشاء وترحيل القيد آلياً
            $journalEntry = $this->journalService->createAndPost([
                'branch_id' => $inv->branch_id,
                'date' => $date,
                'description' => "إثبات مبيعات فاتورة رقم {$inv->invoice_number} - {$inv->customer_name}",
                'reference' => $inv->invoice_number,
                'source_type' => 'manual',
            ], $journalLines);

            // تحديث الفاتورة
            $inv->update([
                'status' => InvoiceStatus::POSTED,
                'journal_entry_id' => $journalEntry->id,
                'posted_at' => Carbon::now(),
            ]);

            // إذا كانت الفاتورة آجلة ولديه حساب عميل مسجل، نزيد رصيد مديونيته
            if ($inv->payment_method === PaymentMethod::CREDIT && $inv->customer_id) {
                $this->customerService->adjustBalance((int) $inv->customer_id, (float) $inv->total_amount);
            }

            return $inv->fresh(['lines.item', 'lines.itemUnit', 'customer', 'branch', 'journalEntry']);
        });
    }

    /**
     * إلغاء الفاتورة وعكس القيد المحاسبي
     */
    public function cancelInvoice(int $id, string $reason = 'إلغاء فاتورة مبيعات'): SalesInvoice
    {
        return DB::transaction(function () use ($id, $reason) {
            $inv = $this->getInvoice($id);

            if ($inv->isCancelled()) {
                throw ValidationException::withMessages([
                    'invoice' => ['الفاتورة ملغاة بالفعل مسبقاً.'],
                ]);
            }

            // إذا كانت مرحلة، نعكس قيد اليومية
            if ($inv->isPosted() && $inv->journal_entry_id) {
                $this->journalService->reverseEntry($inv->journal_entry_id, $reason, Carbon::now()->toDateString());

                // إذا كانت آجلة، ننقص رصيد مديونية العميل
                if ($inv->payment_method === PaymentMethod::CREDIT && $inv->customer_id) {
                    $this->customerService->adjustBalance((int) $inv->customer_id, -(float) $inv->total_amount);
                }
            }

            $inv->update([
                'status' => InvoiceStatus::CANCELLED,
            ]);

            return $inv->fresh();
        });
    }
}
