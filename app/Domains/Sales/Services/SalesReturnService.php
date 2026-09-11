<?php

declare(strict_types=1);

namespace App\Domains\Sales\Services;

use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Services\JournalService;
use App\Domains\Core\Models\SystemSetting;
use App\Domains\Core\Services\FiscalPeriodService;
use App\Domains\Products\Models\Item;
use App\Domains\Sales\Enums\InvoiceStatus;
use App\Domains\Sales\Enums\PaymentMethod;
use App\Domains\Sales\Models\SalesInvoice;
use App\Domains\Sales\Models\SalesInvoiceLine;
use App\Domains\Sales\Models\SalesReturn;
use App\Domains\Sales\Models\SalesReturnLine;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesReturnService
{
    public function __construct(
        private readonly CustomerService $customerService,
        private readonly JournalService $journalService,
        private readonly FiscalPeriodService $fiscalPeriodService,
        private readonly ZatcaQrService $zatcaQrService,
    ) {}

    /**
     * جلب أسطر الفاتورة القابلة للإرجاع مع الكميات المتبقية لكل سطر
     *
     * @return array<string, mixed>
     */
    public function getReturnableLines(int $invoiceId): array
    {
        $invoice = SalesInvoice::with(['lines.item', 'lines.itemUnit', 'customer', 'branch'])
            ->findOrFail($invoiceId);

        if (!$invoice->isPosted()) {
            throw ValidationException::withMessages([
                'invoice' => ["لا يمكن إرجاع فاتورة غير مرحلة أو ملغاة (حالة الفاتورة: {$invoice->status->label()})."],
            ]);
        }

        $linesData = [];
        foreach ($invoice->lines as $line) {
            $alreadyReturned = (float) SalesReturnLine::where('sales_invoice_line_id', $line->id)
                ->whereHas('salesReturn', fn ($q) => $q->where('status', 'posted'))
                ->sum('quantity');

            $remainingQty = max(0, (float) bcsub((string) $line->quantity, (string) $alreadyReturned, 4));

            $linesData[] = [
                'sales_invoice_line_id' => $line->id,
                'item_id' => $line->item_id,
                'item_name_ar' => $line->item?->name_ar ?? 'صنف',
                'item_sku' => $line->item?->sku ?? '',
                'unit_name' => $line->unit_name,
                'conversion_factor' => (float) $line->conversion_factor,
                'original_quantity' => (float) $line->quantity,
                'already_returned_quantity' => $alreadyReturned,
                'remaining_quantity' => $remainingQty,
                'unit_price' => (float) $line->unit_price,
                'cost_price' => (float) $line->cost_price,
                'tax_rate' => (float) $line->tax_rate,
            ];
        }

        return [
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'invoice_date' => $invoice->invoice_date->toDateString(),
            'customer_id' => $invoice->customer_id,
            'customer_name' => $invoice->customer_name,
            'payment_method' => $invoice->payment_method->value,
            'lines' => $linesData,
        ];
    }

    /**
     * إنشاء وترحيل مرتجع مبيعات وإصدار الإشعار الدائن والقيد المحاسبي
     *
     * @param array<string, mixed> $data
     */
    public function createAndPostReturn(array $data): SalesReturn
    {
        return DB::transaction(function () use ($data) {
            $invoiceId = (int) ($data['sales_invoice_id'] ?? 0);
            $invoice = SalesInvoice::with(['lines.item', 'customer', 'branch'])->find($invoiceId);

            if (!$invoice) {
                throw ValidationException::withMessages([
                    'sales_invoice_id' => ['فاتورة المبيعات الأصلية غير موجودة.'],
                ]);
            }

            if (!$invoice->isPosted()) {
                throw ValidationException::withMessages([
                    'sales_invoice_id' => ["لا يمكن عمل مرتجع لفاتورة غير مرحلة (الحالة: {$invoice->status->label()})."],
                ]);
            }

            $rawLines = $data['lines'] ?? [];
            if (empty($rawLines)) {
                throw ValidationException::withMessages([
                    'lines' => ['يجب تحديد صنف واحد على الأقل لإتمام المرتجع.'],
                ]);
            }

            $returnDate = !empty($data['return_date']) ? (string) $data['return_date'] : Carbon::now()->toDateString();
            $this->fiscalPeriodService->assertDateInOpenPeriod($returnDate);

            $refundMethod = $data['refund_method'] ?? $invoice->payment_method->value;
            if (!in_array($refundMethod, ['cash', 'credit', 'bank_transfer'], true)) {
                $refundMethod = 'cash';
            }

            // فحص وتجهيز أسطر المرتجع وحساب التكاليف والضرائب
            $calculatedLines = [];
            $subtotal = '0.0000';
            $taxTotal = '0.0000';
            $totalCost = '0.0000';

            foreach ($rawLines as $lineData) {
                $invoiceLineId = (int) ($lineData['sales_invoice_line_id'] ?? 0);
                $returnQty = (float) ($lineData['quantity'] ?? 0);

                if ($returnQty <= 0) {
                    continue;
                }

                $invoiceLine = SalesInvoiceLine::with('item')->find($invoiceLineId);
                if (!$invoiceLine || $invoiceLine->sales_invoice_id !== $invoice->id) {
                    throw ValidationException::withMessages([
                        'lines' => ["سطر الفاتورة المحدد (معرف: {$invoiceLineId}) غير صالح لهذه الفاتورة."],
                    ]);
                }

                // حساب الكمية المتبقية للإرجاع بدقة لمنع إرجاع نفس الكمية مرتين
                $alreadyReturned = (float) SalesReturnLine::where('sales_invoice_line_id', $invoiceLine->id)
                    ->whereHas('salesReturn', fn ($q) => $q->where('status', 'posted'))
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

                $unitPrice = (float) $invoiceLine->unit_price;
                $taxRate = (float) $invoiceLine->tax_rate;
                $lineSubtotal = round($returnQty * $unitPrice, 4);
                $lineTax = round($lineSubtotal * ($taxRate / 100), 4);
                $lineTotal = round($lineSubtotal + $lineTax, 4);

                // استخدام التكلفة الأصلية المسجلة بسطر الفاتورة وقت البيع
                $costPrice = (float) $invoiceLine->cost_price;
                $lineCost = bcmul((string) $baseQty, (string) $costPrice, 4);

                $subtotal = bcadd($subtotal, (string) $lineSubtotal, 4);
                $taxTotal = bcadd($taxTotal, (string) $lineTax, 4);
                $totalCost = bcadd($totalCost, $lineCost, 4);

                $calculatedLines[] = [
                    'sales_invoice_line_id' => $invoiceLine->id,
                    'item_id' => $invoiceLine->item_id,
                    'item_unit_id' => $invoiceLine->item_unit_id,
                    'unit_name' => $invoiceLine->unit_name,
                    'conversion_factor' => $conversionFactor,
                    'quantity' => $returnQty,
                    'base_quantity' => $baseQty,
                    'unit_price' => $unitPrice,
                    'cost_price' => $costPrice,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $lineTax,
                    'subtotal' => $lineSubtotal,
                    'total' => $lineTotal,
                ];
            }

            if (empty($calculatedLines)) {
                throw ValidationException::withMessages([
                    'lines' => ['يجب إدخال كمية أكبر من الصفر لصنف واحد على الأقل لإتمام المرتجع.'],
                ]);
            }

            $totalAmount = bcadd($subtotal, $taxTotal, 4);

            // توليد رقم تسلسلي للمرتجع
            $yearMonth = Carbon::parse($returnDate)->format('Ym');
            $count = SalesReturn::where('return_number', 'like', "RT-{$yearMonth}-%")->count() + 1;
            $returnNumber = sprintf('RT-%s-%04d', $yearMonth, $count);

            // استرجاع كميات المخزون للأصناف المرتجعة فورياً
            foreach ($calculatedLines as $cl) {
                $item = Item::lockForUpdate()->find($cl['item_id']);
                if ($item) {
                    $newStock = bcadd((string) $item->stock_quantity, (string) $cl['base_quantity'], 4);
                    $item->update(['stock_quantity' => $newStock]);
                }
            }

            // تجهيز القيد المحاسبي المتوازن للمرتجع
            // 1. حساب الطرف الدائن (رد المبلغ كاش أو بنك أو تخفيض مديونية العميل)
            $creditAccountCode = match ($refundMethod) {
                'cash' => '1111',          // الصندوق الرئيسي
                'bank_transfer' => '1114', // مصرف الراجحي
                'credit' => '1121',        // عملاء التموين
                default => '1111',
            };

            $creditAccount = Account::where('code', $creditAccountCode)->where('is_leaf', true)->first();
            if (!$creditAccount) {
                throw ValidationException::withMessages([
                    'accounting' => ["حساب رد المبالغ المحاسبي [{$creditAccountCode}] غير مهيأ في الدليل كحساب تحليلي."],
                ]);
            }

            // 2. حساب ضريبة المبيعات 15% (مدين لتخفيض الالتزام الضريبي)
            $taxAccount = Account::where('code', '2130')->where('is_leaf', true)->first();
            if (!$taxAccount) {
                throw ValidationException::withMessages([
                    'accounting' => ['حساب ضريبة القيمة المضافة المخرجات [2130] غير مهيأ في الدليل.'],
                ]);
            }

            // 3. حساب مبيعات أو مردودات المواد الغذائية (مدين لتخفيض الإيرادات)
            $revenueAccount = Account::where('code', '4110')->where('is_leaf', true)->first();
            if (!$revenueAccount) {
                throw ValidationException::withMessages([
                    'accounting' => ['حساب مبيعات المواد الغذائية [4110] غير مهيأ في الدليل.'],
                ]);
            }

            // 4. حسابات تكلفة البضاعة المباعة والمخزون
            $cogsAccount = Account::where('code', '5110')->where('is_leaf', true)->first();
            $inventoryAccount = Account::where('code', '1131')->where('is_leaf', true)->first();

            $journalLines = [];

            // سطر تخفيض الإيرادات (مدين بقيمة المرتجع قبل الضريبة)
            $journalLines[] = [
                'account_id' => $revenueAccount->id,
                'description' => "مردودات مبيعات - إشعار دائن رقم {$returnNumber} للفاتورة {$invoice->invoice_number}",
                'debit' => (float) $subtotal,
                'credit' => 0.0,
            ];

            // سطر تخفيض الضريبة (مدين بقيمة ضريبة المرتجع)
            if ((float) $taxTotal > 0) {
                $journalLines[] = [
                    'account_id' => $taxAccount->id,
                    'description' => "تخفيض ضريبة القيمة المضافة 15% - مرتجع {$returnNumber}",
                    'debit' => (float) $taxTotal,
                    'credit' => 0.0,
                ];
            }

            // سطر رد المبلغ للعميل أو الصندوق (دائن بإجمالي المرتجع)
            $journalLines[] = [
                'account_id' => $creditAccount->id,
                'description' => "رد قيمة مرتجع مبيعات رقم {$returnNumber} - {$invoice->customer_name}",
                'debit' => 0.0,
                'credit' => (float) $totalAmount,
            ];

            // سطر إعادة تكلفة المخزون (مدين المخزون / دائن تكلفة البضاعة المباعة بالتكلفة الأصلية)
            if ((float) $totalCost > 0 && $inventoryAccount && $cogsAccount) {
                $journalLines[] = [
                    'account_id' => $inventoryAccount->id,
                    'description' => "إعادة بضاعة للمخزون - مرتجع {$returnNumber}",
                    'debit' => (float) $totalCost,
                    'credit' => 0.0,
                ];

                $journalLines[] = [
                    'account_id' => $cogsAccount->id,
                    'description' => "تخفيض تكلفة المبيعات COGS - مرتجع {$returnNumber}",
                    'debit' => 0.0,
                    'credit' => (float) $totalCost,
                ];
            }

            // توليد وترحيل قيد اليومية آلياً
            $journalEntry = $this->journalService->createAndPost([
                'branch_id' => $invoice->branch_id,
                'date' => $returnDate,
                'description' => "إشعار دائن ومرتجع مبيعات رقم {$returnNumber} للفاتورة {$invoice->invoice_number}",
                'reference' => $returnNumber,
                'source_type' => 'manual',
            ], $journalLines);

            // توليد رمز ZATCA QR للإشعار الدائن
            $sellerName = SystemSetting::get('company_name', 'ميزان للمواد الغذائية');
            $vatNumber = SystemSetting::get('vat_number', '300000000000003');
            $timestamp = Carbon::parse($returnDate)->format('Y-m-d\TH:i:s\Z');
            $qrPayload = $this->zatcaQrService->generateTlvQr(
                $sellerName,
                $vatNumber,
                $timestamp,
                number_format((float) $totalAmount, 2, '.', ''),
                number_format((float) $taxTotal, 2, '.', '')
            );

            // حفظ سجل المرتجع الرئيسي
            $salesReturn = SalesReturn::create([
                'return_number' => $returnNumber,
                'sales_invoice_id' => $invoice->id,
                'return_date' => $returnDate,
                'branch_id' => $invoice->branch_id,
                'customer_id' => $invoice->customer_id,
                'customer_name' => $invoice->customer_name,
                'refund_method' => $refundMethod,
                'status' => 'posted',
                'subtotal' => $subtotal,
                'tax_amount' => $taxTotal,
                'total_amount' => $totalAmount,
                'reason' => $data['reason'] ?? 'مرتجع مبيعات',
                'journal_entry_id' => $journalEntry->id,
                'zatca_qr_payload' => $qrPayload,
                'posted_at' => Carbon::now(),
            ]);

            // حفظ أسطر المرتجع
            foreach ($calculatedLines as $cl) {
                $cl['sales_return_id'] = $salesReturn->id;
                SalesReturnLine::create($cl);
            }

            // في حال كان البيع آجلاً ورد المبلغ قيد على الحساب، نخفض مديونية العميل
            if ($refundMethod === 'credit' && $invoice->customer_id) {
                $this->customerService->adjustBalance((int) $invoice->customer_id, -((float) $totalAmount));
            }

            return $salesReturn->load(['lines.item', 'lines.itemUnit', 'customer', 'branch', 'journalEntry', 'invoice']);
        });
    }
}
