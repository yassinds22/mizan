<?php

declare(strict_types=1);

namespace App\Domains\Treasury\Services;

use App\Domains\Accounting\Enums\AccountType;
use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Services\JournalService;
use App\Domains\Core\Models\Branch;
use App\Domains\Core\Services\FiscalPeriodService;
use App\Domains\Purchases\Models\PurchaseInvoice;
use App\Domains\Purchases\Models\Supplier;
use App\Domains\Purchases\Services\SupplierService;
use App\Domains\Sales\Models\Customer;
use App\Domains\Sales\Models\SalesInvoice;
use App\Domains\Sales\Services\CustomerService;
use App\Domains\Treasury\Enums\VoucherPartyType;
use App\Domains\Treasury\Enums\VoucherPaymentMethod;
use App\Domains\Treasury\Enums\VoucherStatus;
use App\Domains\Treasury\Enums\VoucherType;
use App\Domains\Treasury\Models\Voucher;
use App\Domains\Treasury\Models\VoucherAllocation;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VoucherService
{
    public function __construct(
        private readonly JournalService $journalService,
        private readonly FiscalPeriodService $fiscalPeriodService,
        private readonly CustomerService $customerService,
        private readonly SupplierService $supplierService,
    ) {}

    /**
     * استعراض قائمة السندات مع الفلاتر والصفحات
     *
     * @param array<string, mixed> $filters
     */
    public function listVouchers(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $query = Voucher::with(['treasuryAccount', 'counterAccount', 'branch', 'customer', 'supplier', 'journalEntry']);

        if (!empty($filters['voucher_type']) && $filters['voucher_type'] !== 'all') {
            $query->where('voucher_type', $filters['voucher_type']);
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['party_type']) && $filters['party_type'] !== 'all') {
            $query->where('party_type', $filters['party_type']);
        }

        if (!empty($filters['party_id']) && $filters['party_id'] !== 'all') {
            $query->where('party_id', $filters['party_id']);
        }

        if (!empty($filters['treasury_account_id']) && $filters['treasury_account_id'] !== 'all') {
            $query->where('treasury_account_id', $filters['treasury_account_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->where('date', '<=', $filters['date_to']);
        }

        if (!empty($filters['search'])) {
            $search = '%' . trim((string) $filters['search']) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('voucher_number', 'like', $search)
                    ->orWhere('party_name', 'like', $search)
                    ->orWhere('reference_number', 'like', $search)
                    ->orWhere('notes', 'like', $search);
            });
        }

        return $query->orderBy('id', 'desc')->paginate($perPage);
    }

    /**
     * جلب تفاصيل سند محدد
     */
    public function getVoucher(int $id): Voucher
    {
        return Voucher::with([
            'treasuryAccount',
            'counterAccount',
            'branch',
            'customer',
            'supplier',
            'costCenter',
            'journalEntry.lines.account',
            'allocations.salesInvoice',
            'allocations.purchaseInvoice',
        ])->findOrFail($id);
    }

    /**
     * التحقق من صلاحية حساب الخزينة/البنك
     */
    public function validateTreasuryAccount(int $accountId): Account
    {
        $account = Account::find($accountId);

        if (!$account || !$account->is_active || !$account->is_leaf) {
            throw ValidationException::withMessages([
                'treasury_account_id' => ['حساب الخزينة/البنك المحدد غير صالح أو غير نشط أو ليس حساباً تحليلياً.'],
            ]);
        }

        // يجب أن يكون حساب أصول
        if ($account->type !== AccountType::Asset) {
            throw ValidationException::withMessages([
                'treasury_account_id' => ['حساب الخزينة/البنك يجب أن يكون من حسابات الأصول النقدية.'],
            ]);
        }

        // التحقق من تصنيفه كـ Cash / Bank / Treasury
        $isCashOrBank = str_starts_with((string) $account->code, '111')
            || in_array($account->parent?->code, ['1110', '1100'], true)
            || str_contains($account->name_ar, 'صندوق')
            || str_contains($account->name_ar, 'بنك')
            || str_contains($account->name_ar, 'نقدية')
            || str_contains(strtolower($account->name_en ?? ''), 'cash')
            || str_contains(strtolower($account->name_en ?? ''), 'bank');

        if (!$isCashOrBank) {
            throw ValidationException::withMessages([
                'treasury_account_id' => ['الحساب المحدد لا ينتمي إلى حسابات النقدية وما في حكمها أو البنوك.'],
            ]);
        }

        return $account;
    }

    /**
     * تحديد الحساب المقابل تلقائياً للعملاء والموردين ومنع التلاعب
     */
    public function resolveCounterAccount(string $partyType, ?int $partyId, ?int $customAccountId): Account
    {
        if ($partyType === VoucherPartyType::CUSTOMER->value) {
            if (!$partyId) {
                throw ValidationException::withMessages([
                    'party_id' => ['يجب تحديد عميل صالح عند اختيار طرف من نوع عميل.'],
                ]);
            }
            $customer = Customer::find($partyId);
            if (!$customer) {
                throw ValidationException::withMessages([
                    'party_id' => ['العميل المحدد غير موجود.'],
                ]);
            }

            // تحديد حساب تحكم العملاء تلقائياً (1121 كمعيار أساسي)
            $controlAccount = Account::where('code', '1121')->where('is_leaf', true)->first()
                ?? Account::where('code', 'like', '112%')->where('is_leaf', true)->where('is_active', true)->first();

            if (!$controlAccount) {
                throw ValidationException::withMessages([
                    'counter_account_id' => ['حساب تحكم ذمم العملاء (1121) غير مهيأ كحساب تحليلي في الدليل المحاسبي.'],
                ]);
            }

            return $controlAccount;
        }

        if ($partyType === VoucherPartyType::SUPPLIER->value) {
            if (!$partyId) {
                throw ValidationException::withMessages([
                    'party_id' => ['يجب تحديد مورد صالح عند اختيار طرف من نوع مورد.'],
                ]);
            }
            $supplier = Supplier::find($partyId);
            if (!$supplier) {
                throw ValidationException::withMessages([
                    'party_id' => ['المورد المحدد غير موجود.'],
                ]);
            }

            // تحديد حساب تحكم الموردين تلقائياً (2110 كمعيار أساسي)
            $controlAccount = Account::where('code', '2110')->where('is_leaf', true)->first()
                ?? Account::where('code', 'like', '211%')->where('is_leaf', true)->where('is_active', true)->first();

            if (!$controlAccount) {
                throw ValidationException::withMessages([
                    'counter_account_id' => ['حساب تحكم ذمم الموردين (2110) غير مهيأ كحساب تحليلي في الدليل المحاسبي.'],
                ]);
            }

            return $controlAccount;
        }

        if ($partyType === VoucherPartyType::ACCOUNT->value) {
            if (!$customAccountId) {
                throw ValidationException::withMessages([
                    'counter_account_id' => ['يجب اختيار الحساب المالي المقابل من دليل الحسابات.'],
                ]);
            }

            $account = Account::find($customAccountId);
            if (!$account || !$account->is_active || !$account->is_leaf) {
                throw ValidationException::withMessages([
                    'counter_account_id' => ['الحساب المقابل المحدد غير صالح أو غير نشط أو ليس حساباً تحليلياً.'],
                ]);
            }

            return $account;
        }

        throw ValidationException::withMessages([
            'party_type' => ['نوع الطرف المحدد غير مدعوم.'],
        ]);
    }

    /**
     * إنشاء مسودة سند قبض أو صرف
     *
     * @param array<string, mixed> $data
     * @param array<int, array<string, mixed>> $allocations
     */
    public function createDraft(array $data, array $allocations = []): Voucher
    {
        return DB::transaction(function () use ($data, $allocations) {
            $voucherType = VoucherType::from($data['voucher_type'] ?? 'receipt');
            $date = !empty($data['date']) ? (string) $data['date'] : Carbon::now()->toDateString();
            $amount = (float) ($data['amount'] ?? 0);

            if ($amount <= 0) {
                throw ValidationException::withMessages([
                    'amount' => ['مبلغ السند يجب أن يكون أكبر من الصفر.'],
                ]);
            }

            $branchId = !empty($data['branch_id']) ? (int) $data['branch_id'] : (int) Branch::where('is_active', true)->value('id');
            if (!$branchId) {
                throw ValidationException::withMessages([
                    'branch_id' => ['يجب تحديد فرع صالح.'],
                ]);
            }

            $fiscalPeriod = $this->fiscalPeriodService->getPeriodForDate($date);
            if (!$fiscalPeriod) {
                throw ValidationException::withMessages([
                    'date' => ["لا توجد فترة مالية مهيأة للتاريخ المحدد ({$date})."],
                ]);
            }

            // التحقق من حساب الخزينة
            $treasuryAccountId = (int) ($data['treasury_account_id'] ?? 0);
            $treasuryAccount = $this->validateTreasuryAccount($treasuryAccountId);

            // تحديد الحساب المقابل وفق القواعد المحاسبية
            $partyType = $data['party_type'] ?? 'customer';
            $partyId = !empty($data['party_id']) ? (int) $data['party_id'] : null;
            $counterAccountId = !empty($data['counter_account_id']) ? (int) $data['counter_account_id'] : null;
            $counterAccount = $this->resolveCounterAccount($partyType, $partyId, $counterAccountId);

            // تحديد اسم الطرف
            $partyName = $data['party_name'] ?? null;
            if (!$partyName) {
                if ($partyType === VoucherPartyType::CUSTOMER->value && $partyId) {
                    $partyName = Customer::find($partyId)?->name_ar ?? 'عميل';
                } elseif ($partyType === VoucherPartyType::SUPPLIER->value && $partyId) {
                    $partyName = Supplier::find($partyId)?->name_ar ?? 'مورد';
                } else {
                    $partyName = $counterAccount->name_ar;
                }
            }

            // توليد رقم السند بأمان تزامن كامل
            $voucherNumber = !empty($data['voucher_number'])
                ? (string) $data['voucher_number']
                : $this->generateNextVoucherNumber($voucherType, $date);

            $voucher = Voucher::create([
                'voucher_number' => $voucherNumber,
                'voucher_type' => $voucherType,
                'date' => $date,
                'branch_id' => $branchId,
                'fiscal_period_id' => $fiscalPeriod->id,
                'party_type' => $partyType,
                'party_id' => $partyId,
                'party_name' => $partyName,
                'treasury_account_id' => $treasuryAccount->id,
                'counter_account_id' => $counterAccount->id,
                'payment_method' => $data['payment_method'] ?? VoucherPaymentMethod::CASH->value,
                'reference_number' => $data['reference_number'] ?? null,
                'amount' => $amount,
                'cost_center_id' => !empty($data['cost_center_id']) ? (int) $data['cost_center_id'] : null,
                'notes' => $data['notes'] ?? null,
                'received_from' => $data['received_from'] ?? ($voucherType === VoucherType::RECEIPT ? $partyName : null),
                'paid_to' => $data['paid_to'] ?? ($voucherType === VoucherType::PAYMENT ? $partyName : null),
                'status' => VoucherStatus::DRAFT,
                'created_by' => $data['created_by'] ?? null,
            ]);

            // حفظ أسطر التخصيص إن وجدت
            if (!empty($allocations)) {
                $totalAllocated = '0.0000';
                foreach ($allocations as $alloc) {
                    $allocAmount = (float) ($alloc['allocated_amount'] ?? 0);
                    if ($allocAmount <= 0) continue;

                    $totalAllocated = bcadd($totalAllocated, (string) $allocAmount, 4);

                    if ($alloc['invoice_type'] === 'sales_invoice') {
                        $invoice = SalesInvoice::find($alloc['invoice_id']);
                        if (!$invoice || !$invoice->isPosted()) {
                            throw ValidationException::withMessages([
                                'allocations' => ["فاتورة المبيعات المحددة غير صالحة أو غير مرحلة."],
                            ]);
                        }
                        if ($partyId && $invoice->customer_id !== $partyId) {
                            throw ValidationException::withMessages([
                                'allocations' => ["لا يمكن تخصيص الفاتورة [{$invoice->invoice_number}]؛ لأنها تخص عميلاً آخر غير العميل المحدد في السند."],
                            ]);
                        }
                        $prevAlloc = (float) VoucherAllocation::where('invoice_type', 'sales_invoice')
                            ->where('invoice_id', $invoice->id)
                            ->whereHas('voucher', fn ($q) => $q->where('status', VoucherStatus::POSTED->value))
                            ->sum('allocated_amount');
                        $calcRem = max(0, (float) bcsub((string) $invoice->total_amount, (string) $prevAlloc, 4));
                        $rem = min((float) $invoice->remaining_amount, $calcRem);
                        if ($allocAmount > $rem) {
                            throw ValidationException::withMessages([
                                'allocations' => ["المبلغ المخصص للفاتورة [{$invoice->invoice_number}] ({$allocAmount} ر.س) يتجاوز المتبقي الفعلي منها ({$rem} ر.س)."],
                            ]);
                        }
                    }

                    VoucherAllocation::create([
                        'voucher_id' => $voucher->id,
                        'invoice_type' => $alloc['invoice_type'],
                        'invoice_id' => (int) $alloc['invoice_id'],
                        'allocated_amount' => $allocAmount,
                    ]);
                }

                if ((float) $totalAllocated > (float) $amount) {
                    throw ValidationException::withMessages([
                        'allocations' => ['إجمالي المبالغ المخصصة للفواتير لا يمكن أن يتجاوز مبلغ السند.'],
                    ]);
                }
            }

            return $voucher->fresh(['treasuryAccount', 'counterAccount', 'allocations']);
        });
    }

    /**
     * تحديث سند مسودة
     *
     * @param array<string, mixed> $data
     * @param array<int, array<string, mixed>> $allocations
     */
    public function updateDraft(int $id, array $data, array $allocations = []): Voucher
    {
        return DB::transaction(function () use ($id, $data, $allocations) {
            $voucher = Voucher::lockForUpdate()->findOrFail($id);

            if (!$voucher->isDraft()) {
                throw ValidationException::withMessages([
                    'voucher' => ['لا يمكن تعديل سند غير مسودة (السندات المرحلة والملغاة محصنة من التعديل).'],
                ]);
            }

            $date = !empty($data['date']) ? (string) $data['date'] : $voucher->date->toDateString();
            $amount = isset($data['amount']) ? (float) $data['amount'] : (float) $voucher->amount;

            if ($amount <= 0) {
                throw ValidationException::withMessages([
                    'amount' => ['مبلغ السند يجب أن يكون أكبر من الصفر.'],
                ]);
            }

            $fiscalPeriod = $this->fiscalPeriodService->getPeriodForDate($date);
            if (!$fiscalPeriod) {
                throw ValidationException::withMessages([
                    'date' => ["لا توجد فترة مالية مهيأة للتاريخ المحدد ({$date})."],
                ]);
            }

            $treasuryAccountId = (int) ($data['treasury_account_id'] ?? $voucher->treasury_account_id);
            $treasuryAccount = $this->validateTreasuryAccount($treasuryAccountId);

            $partyType = $data['party_type'] ?? $voucher->party_type->value;
            $partyId = isset($data['party_id']) ? (int) $data['party_id'] : $voucher->party_id;
            $counterAccountId = isset($data['counter_account_id']) ? (int) $data['counter_account_id'] : null;
            $counterAccount = $this->resolveCounterAccount($partyType, $partyId, $counterAccountId);

            $partyName = $data['party_name'] ?? $voucher->party_name;

            $voucher->update([
                'date' => $date,
                'branch_id' => !empty($data['branch_id']) ? (int) $data['branch_id'] : $voucher->branch_id,
                'fiscal_period_id' => $fiscalPeriod->id,
                'party_type' => $partyType,
                'party_id' => $partyId,
                'party_name' => $partyName,
                'treasury_account_id' => $treasuryAccount->id,
                'counter_account_id' => $counterAccount->id,
                'payment_method' => $data['payment_method'] ?? $voucher->payment_method->value,
                'reference_number' => $data['reference_number'] ?? $voucher->reference_number,
                'amount' => $amount,
                'cost_center_id' => !empty($data['cost_center_id']) ? (int) $data['cost_center_id'] : $voucher->cost_center_id,
                'notes' => $data['notes'] ?? $voucher->notes,
                'received_from' => $data['received_from'] ?? $voucher->received_from,
                'paid_to' => $data['paid_to'] ?? $voucher->paid_to,
            ]);

            // إعادة تعيين أسطر التخصيص للمسودة
            $voucher->allocations()->delete();
            if (!empty($allocations)) {
                $totalAllocated = '0.0000';
                foreach ($allocations as $alloc) {
                    $allocAmount = (float) ($alloc['allocated_amount'] ?? 0);
                    if ($allocAmount <= 0) continue;

                    $totalAllocated = bcadd($totalAllocated, (string) $allocAmount, 4);

                    VoucherAllocation::create([
                        'voucher_id' => $voucher->id,
                        'invoice_type' => $alloc['invoice_type'],
                        'invoice_id' => (int) $alloc['invoice_id'],
                        'allocated_amount' => $allocAmount,
                    ]);
                }

                if ((float) $totalAllocated > (float) $amount) {
                    throw ValidationException::withMessages([
                        'allocations' => ['إجمالي المبالغ المخصصة للفواتير لا يمكن أن يتجاوز مبلغ السند.'],
                    ]);
                }
            }

            return $voucher->fresh(['treasuryAccount', 'counterAccount', 'allocations']);
        });
    }

    /**
     * حذف مسودة سند
     */
    public function deleteDraft(int $id): bool
    {
        return DB::transaction(function () use ($id) {
            $voucher = Voucher::lockForUpdate()->findOrFail($id);

            if (!$voucher->isDraft()) {
                throw ValidationException::withMessages([
                    'voucher' => ['لا يمكن حذف إلا السندات المسودة فقط.'],
                ]);
            }

            $voucher->allocations()->delete();
            return (bool) $voucher->delete();
        });
    }

    /**
     * ترحيل السند وتوليد القيد المحاسبي وتحديث الأرصدة والتخصيصات بأمان تام
     */
    public function postVoucher(int|Voucher $voucher, ?int $userId = null): Voucher
    {
        return DB::transaction(function () use ($voucher, $userId) {
            $v = is_int($voucher) ? Voucher::lockForUpdate()->findOrFail($voucher) : $voucher->fresh();
            $v = Voucher::lockForUpdate()->findOrFail($v->id);

            // 1. فحوصات الحصانة وحالة السند
            if ($v->isPosted()) {
                throw ValidationException::withMessages([
                    'voucher' => ["السند رقم [{$v->voucher_number}] مرحّل مسبقاً ولا يمكن إعادة ترحيله."],
                ]);
            }

            if ($v->isCancelled()) {
                throw ValidationException::withMessages([
                    'voucher' => ["لا يمكن ترحيل سند ملغى [{$v->voucher_number}]."],
                ]);
            }

            // 2. التحقق الإلزامي من الفترة المالية المفتوحة
            $date = $v->date->toDateString();
            $this->fiscalPeriodService->assertDateInOpenPeriod($date);

            // 3. التحقق من حساب الخزينة والحساب المقابل
            $treasuryAccount = $this->validateTreasuryAccount($v->treasury_account_id);
            $counterAccount = $this->resolveCounterAccount(
                $v->party_type->value,
                $v->party_id,
                $v->counter_account_id
            );

            // 4. معالجة وتدقيق تخصيص الفواتير (Allocation Validation & Concurrency Lock)
            $allocations = $v->allocations()->get();
            $totalAllocated = '0.0000';

            foreach ($allocations as $allocation) {
                $allocAmount = (float) $allocation->allocated_amount;
                if ($allocAmount <= 0) continue;

                $totalAllocated = bcadd($totalAllocated, (string) $allocAmount, 4);

                if ($allocation->invoice_type === 'sales_invoice') {
                    $invoice = SalesInvoice::lockForUpdate()->find($allocation->invoice_id);
                    if (!$invoice || !$invoice->isPosted()) {
                        throw ValidationException::withMessages([
                            'allocations' => ["فاتورة المبيعات المحددة (معرف: {$allocation->invoice_id}) غير صالحة أو غير مرحلة."],
                        ]);
                    }

                    // التحقق الصارم: الفاتورة يجب أن تعود لنفس العميل في السند
                    if ($invoice->customer_id !== $v->party_id) {
                        throw ValidationException::withMessages([
                            'allocations' => [
                                "لا يمكن تخصيص الفاتورة [{$invoice->invoice_number}]؛ لأنها تخص عميلاً آخر غير العميل المحدد في السند.",
                            ],
                        ]);
                    }

                    // احتساب المتبقي الحقيقي استناداً إلى مجموع التخصيصات من السندات المرحلة السابقة
                    $previouslyAllocated = (float) VoucherAllocation::where('invoice_type', 'sales_invoice')
                        ->where('invoice_id', $invoice->id)
                        ->where('id', '!=', $allocation->id)
                        ->whereHas('voucher', fn ($q) => $q->where('status', VoucherStatus::POSTED->value))
                        ->sum('allocated_amount');

                    $calculatedRemaining = max(0, (float) bcsub((string) $invoice->total_amount, (string) $previouslyAllocated, 4));
                    $remainingOnInvoice = min((float) $invoice->remaining_amount, $calculatedRemaining);

                    if ($allocAmount > $remainingOnInvoice) {
                        throw ValidationException::withMessages([
                            'allocations' => [
                                "المبلغ المخصص للفاتورة [{$invoice->invoice_number}] ({$allocAmount} ر.س) يتجاوز المتبقي الفعلي منها ({$remainingOnInvoice} ر.س).",
                            ],
                        ]);
                    }

                    // تحديث القيمة المشتقة paid_amount و remaining_amount في الفاتورة
                    $newPaidAmount = bcadd((string) $previouslyAllocated, (string) $allocAmount, 4);
                    $newRemaining = bcsub((string) $invoice->total_amount, (string) $newPaidAmount, 4);
                    $invoice->update([
                        'paid_amount' => $newPaidAmount,
                        'remaining_amount' => max(0, (float) $newRemaining),
                    ]);
                } elseif ($allocation->invoice_type === 'purchase_invoice') {
                    $invoice = PurchaseInvoice::lockForUpdate()->find($allocation->invoice_id);
                    if (!$invoice || !$invoice->isPosted()) {
                        throw ValidationException::withMessages([
                            'allocations' => ["فاتورة الشراء المحددة (معرف: {$allocation->invoice_id}) غير صالحة أو غير مرحلة."],
                        ]);
                    }

                    // التحقق الصارم: الفاتورة يجب أن تعود لنفس المورد في السند
                    if ($invoice->supplier_id !== $v->party_id) {
                        throw ValidationException::withMessages([
                            'allocations' => [
                                "لا يمكن تخصيص الفاتورة [{$invoice->invoice_number}]؛ لأنها تخص مورداً آخر غير المورد المحدد في السند.",
                            ],
                        ]);
                    }

                    // احتساب المتبقي الحقيقي
                    $previouslyAllocated = (float) VoucherAllocation::where('invoice_type', 'purchase_invoice')
                        ->where('invoice_id', $invoice->id)
                        ->where('id', '!=', $allocation->id)
                        ->whereHas('voucher', fn ($q) => $q->where('status', VoucherStatus::POSTED->value))
                        ->sum('allocated_amount');

                    $remainingOnInvoice = max(0, (float) bcsub((string) $invoice->total_amount, (string) $previouslyAllocated, 4));

                    if ($allocAmount > $remainingOnInvoice) {
                        throw ValidationException::withMessages([
                            'allocations' => [
                                "المبلغ المخصص لفاتورة الشراء [{$invoice->invoice_number}] ({$allocAmount} ر.س) يتجاوز المتبقي الفعلي منها ({$remainingOnInvoice} ر.س).",
                            ],
                        ]);
                    }
                }
            }

            if ((float) $totalAllocated > (float) $v->amount) {
                throw ValidationException::withMessages([
                    'allocations' => ['إجمالي المبالغ المخصصة للفواتير يتجاوز قيمة السند الإجمالية.'],
                ]);
            }

            // 5. بناء أسطر القيد المحاسبي المتوازن آلياً
            $journalLines = [];
            $amount = (float) $v->amount;

            if ($v->voucher_type === VoucherType::RECEIPT) {
                // سند قبض: النقدية/البنك مدين، والطرف المقابل دائن
                // سطر الطرف المدين (الخزينة)
                $journalLines[] = [
                    'account_id' => $treasuryAccount->id,
                    'description' => "تحصيل نقدي - سند قبض رقم {$v->voucher_number} من {$v->party_name}",
                    'debit' => $amount,
                    'credit' => 0.0,
                    'cost_center_id' => $v->cost_center_id,
                ];

                // سطر الطرف الدائن (الحساب المقابل - العملاء أو حساب الإيراد/العام)
                $journalLines[] = [
                    'account_id' => $counterAccount->id,
                    'description' => "إثبات سداد/قبض - سند رقم {$v->voucher_number} ({$v->party_name})",
                    'debit' => 0.0,
                    'credit' => $amount,
                    'cost_center_id' => $v->cost_center_id,
                ];
            } else {
                // سند صرف: الطرف المقابل مدين (المورد أو المصروف)، والنقدية/البنك دائن
                // سطر الطرف المدين (المورد أو المصروف المباشر)
                $journalLines[] = [
                    'account_id' => $counterAccount->id,
                    'description' => "صرف نقدي - سند صرف رقم {$v->voucher_number} إلى {$v->party_name}",
                    'debit' => $amount,
                    'credit' => 0.0,
                    'cost_center_id' => $v->cost_center_id,
                ];

                // سطر الطرف الدائن (الخزينة)
                $journalLines[] = [
                    'account_id' => $treasuryAccount->id,
                    'description' => "إثبات صرف خزينة - سند رقم {$v->voucher_number}",
                    'debit' => 0.0,
                    'credit' => $amount,
                    'cost_center_id' => $v->cost_center_id,
                ];
            }

            // توليد وترحيل قيد اليومية عبر JournalService
            $journalEntry = $this->journalService->createAndPost([
                'branch_id' => $v->branch_id,
                'date' => $date,
                'description' => ($v->voucher_type === VoucherType::RECEIPT ? 'سند قبض رقم ' : 'سند صرف رقم ') . $v->voucher_number . ' - ' . $v->party_name,
                'reference' => $v->voucher_number,
                'source_type' => 'manual',
            ], $journalLines);

            // 6. تحديث رصيد الطرف (العميل أو المورد)
            if ($v->party_type === VoucherPartyType::CUSTOMER && $v->party_id) {
                if ($v->voucher_type === VoucherType::RECEIPT) {
                    // تحصيل من العميل يخفض مديونيته (أو يزيد رصيده الدائن/الدفعة المقدمة)
                    $this->customerService->adjustBalance((int) $v->party_id, -$amount);
                } else {
                    // صرف لعميل (رد رصيد دائن أو رد دفعة مقدمة) يزيد مديونيته
                    $this->customerService->adjustBalance((int) $v->party_id, $amount);
                }
            } elseif ($v->party_type === VoucherPartyType::SUPPLIER && $v->party_id) {
                if ($v->voucher_type === VoucherType::PAYMENT) {
                    // سداد لمورد يخفض مستحقاته (أو يزيد رصيده المدين/الدفعة المقدمة)
                    $this->supplierService->adjustBalance((int) $v->party_id, -$amount);
                } else {
                    // استرداد نقدي من مورد يزيد التزاماته
                    $this->supplierService->adjustBalance((int) $v->party_id, $amount);
                }
            }

            // 7. تحديث حالة السند إلى مرحل وتثبيت التوقيت
            $v->update([
                'status' => VoucherStatus::POSTED,
                'journal_entry_id' => $journalEntry->id,
                'posted_at' => Carbon::now(),
            ]);

            return $v->fresh(['treasuryAccount', 'counterAccount', 'allocations', 'journalEntry']);
        });
    }

    /**
     * إلغاء السند وعكس القيد المحاسبي والأرصدة مع الاحتفاظ بالتخصيصات التاريخية
     */
    public function cancelVoucher(int|Voucher $voucher, string $reason = 'إلغاء السند', ?int $userId = null): Voucher
    {
        return DB::transaction(function () use ($voucher, $reason) {
            $v = is_int($voucher) ? Voucher::lockForUpdate()->findOrFail($voucher) : $voucher->fresh();
            $v = Voucher::lockForUpdate()->findOrFail($v->id);

            if ($v->isCancelled()) {
                throw ValidationException::withMessages([
                    'voucher' => ["السند رقم [{$v->voucher_number}] ملغى مسبقاً."],
                ]);
            }

            // إذا كان السند مسودة، يلغى مباشرة دون أثر محاسبي
            if ($v->isDraft()) {
                $v->update([
                    'status' => VoucherStatus::CANCELLED,
                    'cancelled_at' => Carbon::now(),
                    'cancellation_reason' => $reason,
                ]);
                return $v->fresh();
            }

            // السند المرحل: التحقق من الفترة المالية المفتوحة لتاريخ الإلغاء
            $cancelDate = Carbon::now()->toDateString();
            $this->fiscalPeriodService->assertDateInOpenPeriod($cancelDate);

            // 1. عكس قيد اليومية المحاسبي عبر JournalService
            if ($v->journal_entry_id) {
                $this->journalService->reverseEntry(
                    $v->journal_entry_id,
                    "إلغاء السند رقم {$v->voucher_number}: {$reason}",
                    $cancelDate
                );
            }

            // 2. عكس التأثير على رصيد العميل أو المورد
            $amount = (float) $v->amount;
            if ($v->party_type === VoucherPartyType::CUSTOMER && $v->party_id) {
                if ($v->voucher_type === VoucherType::RECEIPT) {
                    // عكس قبض العميل: إعادة إضافة المبلغ لمديونيته
                    $this->customerService->adjustBalance((int) $v->party_id, $amount);
                } else {
                    $this->customerService->adjustBalance((int) $v->party_id, -$amount);
                }
            } elseif ($v->party_type === VoucherPartyType::SUPPLIER && $v->party_id) {
                if ($v->voucher_type === VoucherType::PAYMENT) {
                    // عكس سداد المورد: إعادة إضافة المبلغ لمستحقاته
                    $this->supplierService->adjustBalance((int) $v->party_id, $amount);
                } else {
                    $this->supplierService->adjustBalance((int) $v->party_id, -$amount);
                }
            }

            // 3. عكس تخصيصات الفواتير مع الاحتفاظ بسجلات التخصيص التاريخية للأرشيف والتدقيق
            $allocations = $v->allocations()->get();
            foreach ($allocations as $allocation) {
                if ($allocation->invoice_type === 'sales_invoice') {
                    $invoice = SalesInvoice::lockForUpdate()->find($allocation->invoice_id);
                    if ($invoice) {
                        // إعادة احتساب المدفوع للفاتورة بعد استبعاد هذا السند الملغى
                        $validAllocated = (float) VoucherAllocation::where('invoice_type', 'sales_invoice')
                            ->where('invoice_id', $invoice->id)
                            ->where('id', '!=', $allocation->id)
                            ->whereHas('voucher', fn ($q) => $q->where('status', VoucherStatus::POSTED->value)->where('id', '!=', $v->id))
                            ->sum('allocated_amount');

                        $newRemaining = bcsub((string) $invoice->total_amount, (string) $validAllocated, 4);
                        $invoice->update([
                            'paid_amount' => $validAllocated,
                            'remaining_amount' => max(0, (float) $newRemaining),
                        ]);
                    }
                }
            }

            // 4. تحديث حالة السند
            $v->update([
                'status' => VoucherStatus::CANCELLED,
                'cancelled_at' => Carbon::now(),
                'cancellation_reason' => $reason,
            ]);

            return $v->fresh(['treasuryAccount', 'counterAccount', 'allocations', 'journalEntry']);
        });
    }

    /**
     * جلب الفواتير المفتوحة لطرف محدد (عميل أو مورد) لاختيار سدادها
     *
     * @return array<int, array<string, mixed>>
     */
    public function getOpenInvoices(string $partyType, int $partyId): array
    {
        $openInvoices = [];

        if ($partyType === VoucherPartyType::CUSTOMER->value) {
            $invoices = SalesInvoice::where('customer_id', $partyId)
                ->where('status', 'posted')
                ->orderBy('invoice_date', 'asc')
                ->get();

            foreach ($invoices as $inv) {
                $alreadyAllocated = (float) VoucherAllocation::where('invoice_type', 'sales_invoice')
                    ->where('invoice_id', $inv->id)
                    ->whereHas('voucher', fn ($q) => $q->where('status', VoucherStatus::POSTED->value))
                    ->sum('allocated_amount');

                $remaining = max(0, (float) bcsub((string) $inv->total_amount, (string) $alreadyAllocated, 4));

                if ($remaining > 0.0001) {
                    $openInvoices[] = [
                        'invoice_id' => $inv->id,
                        'invoice_number' => $inv->invoice_number,
                        'invoice_date' => $inv->invoice_date->toDateString(),
                        'due_date' => $inv->due_date?->toDateString(),
                        'total_amount' => (float) $inv->total_amount,
                        'paid_amount' => $alreadyAllocated,
                        'remaining_amount' => $remaining,
                        'invoice_type' => 'sales_invoice',
                    ];
                }
            }
        } elseif ($partyType === VoucherPartyType::SUPPLIER->value) {
            $invoices = PurchaseInvoice::where('supplier_id', $partyId)
                ->where('status', 'posted')
                ->orderBy('invoice_date', 'asc')
                ->get();

            foreach ($invoices as $inv) {
                $alreadyAllocated = (float) VoucherAllocation::where('invoice_type', 'purchase_invoice')
                    ->where('invoice_id', $inv->id)
                    ->whereHas('voucher', fn ($q) => $q->where('status', VoucherStatus::POSTED->value))
                    ->sum('allocated_amount');

                $remaining = max(0, (float) bcsub((string) $inv->total_amount, (string) $alreadyAllocated, 4));

                if ($remaining > 0.0001) {
                    $openInvoices[] = [
                        'invoice_id' => $inv->id,
                        'invoice_number' => $inv->invoice_number,
                        'supplier_invoice_number' => $inv->supplier_invoice_number,
                        'invoice_date' => $inv->invoice_date->toDateString(),
                        'due_date' => $inv->due_date?->toDateString(),
                        'total_amount' => (float) $inv->total_amount,
                        'paid_amount' => $alreadyAllocated,
                        'remaining_amount' => $remaining,
                        'invoice_type' => 'purchase_invoice',
                    ];
                }
            }
        }

        return $openInvoices;
    }

    /**
     * توليد رقم السند التسلسلي بأمان تزامن كامل
     */
    public function generateNextVoucherNumber(VoucherType $type, string $date): string
    {
        $year = Carbon::parse($date)->format('Y');
        $prefix = sprintf('%s-%s-', $type === VoucherType::RECEIPT ? 'RV' : 'PV', $year);

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $maxNumber = DB::table('vouchers')
                ->where('voucher_number', 'like', $prefix . '%')
                ->lockForUpdate()
                ->max('voucher_number');

            $nextSeq = 1;
            if ($maxNumber && preg_match('/-(\d+)$/', (string) $maxNumber, $matches)) {
                $nextSeq = ((int) $matches[1]) + 1;
            }

            $candidate = sprintf('%s%04d', $prefix, $nextSeq);

            if (!DB::table('vouchers')->where('voucher_number', $candidate)->exists()) {
                return $candidate;
            }
        }

        return sprintf('%s%04d-%s', $prefix, $nextSeq + 1, uniqid());
    }
}
