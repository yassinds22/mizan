<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Services;

use App\Domains\Accounting\Enums\JournalEntryStatus;
use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Purchases\Models\PurchaseInvoice;
use App\Domains\Purchases\Models\PurchaseReturn;
use App\Domains\Purchases\Models\Supplier;
use App\Domains\Sales\Models\Customer;
use App\Domains\Sales\Models\SalesInvoice;
use App\Domains\Sales\Models\SalesReturn;
use App\Domains\Treasury\Enums\VoucherPartyType;
use App\Domains\Treasury\Enums\VoucherType;
use App\Domains\Treasury\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class PartyStatementService
{
    /**
     * استخراج كشف الحساب المالي الموحد للطرف (مورد أو عميل)
     * معتمد حصرياً على القيود المحاسبية المرحّلة (General Ledger Source of Truth)
     *
     * @param string $partyType 'supplier' أو 'customer'
     * @param int $partyId معرف المورد أو العميل
     * @param string|null $dateFrom تاريخ البداية (Y-m-d)
     * @param string|null $dateTo تاريخ النهاية (Y-m-d)
     * @param int|null $branchId الفرع (اختياري)
     * @return array
     */
    public function getStatement(
        string $partyType,
        int $partyId,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        ?int $branchId = null
    ): array {
        $partyType = strtolower(trim($partyType));
        if (!in_array($partyType, ['supplier', 'customer'], true)) {
            throw ValidationException::withMessages([
                'party_type' => ['نوع الطرف غير صالح. يجب أن يكون supplier أو customer.'],
            ]);
        }

        // 1. جلب بيانات الطرف والتحقق من وجوده
        $party = $partyType === 'supplier'
            ? Supplier::findOrFail($partyId)
            : Customer::findOrFail($partyId);

        // 2. جلب جميع الحركات المستخرجة من أسطر القيود المحاسبية المرتبطة بمستندات الطرف
        $allTransactions = $this->getTransactions($partyType, $partyId, null, null, $branchId);

        // 3. احتساب الرصيد الافتتاحي قبل date_from
        $openingBalance = $this->getOpeningBalance($allTransactions, $partyType, $dateFrom);

        // 4. تصفية حركات الفترة المطلوبة [date_from, date_to]
        $periodTransactions = $allTransactions->filter(function ($tx) use ($dateFrom, $dateTo) {
            $txDate = $tx['date'];
            if ($dateFrom && $txDate < $dateFrom) {
                return false;
            }
            if ($dateTo && $txDate > $dateTo) {
                return false;
            }
            return true;
        })->values();

        // 5. حساب الرصيد التراكمي اللحظي لكل حركة سطر بسطر
        $calculatedTransactions = $this->calculateRunningBalance($openingBalance, $periodTransactions, $partyType);

        // 6. حساب مجاميع الفترة
        $totals = $this->getTotals(collect($calculatedTransactions));

        // 7. احتساب الرصيد الختامي
        $closingBalance = $this->getClosingBalance(
            $openingBalance,
            $totals['total_debit'],
            $totals['total_credit'],
            $partyType
        );

        // 8. حساب الرصيد المحاسبي الإجمالي التراكمي (All-time GL Balance) لمطابقته مع الرصيد التشغيلي
        $allTimeTotals = $this->getTotals($allTransactions);
        $allTimeGlBalance = $this->getClosingBalance(
            0.0,
            $allTimeTotals['total_debit'],
            $allTimeTotals['total_credit'],
            $partyType
        );

        $operationalBalance = (float) $party->balance;
        $isReconciled = abs(round($allTimeGlBalance, 2) - round($operationalBalance, 2)) < 0.01;

        return [
            'party' => [
                'id' => $party->id,
                'type' => $partyType,
                'code' => $party->code,
                'name' => $party->name_ar,
                'name_en' => $party->name_en,
                'tax_number' => $party->tax_number,
                'commercial_register' => $party->commercial_register,
                'phone' => $party->phone,
                'email' => $party->email,
                'city' => $party->city,
                'address' => $party->address,
                'operational_balance' => round($operationalBalance, 2),
            ],
            'filters' => [
                'party_type' => $partyType,
                'party_id' => $partyId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'branch_id' => $branchId,
            ],
            'opening_balance' => round($openingBalance, 2),
            'transactions' => $calculatedTransactions,
            'total_debit' => round($totals['total_debit'], 2),
            'total_credit' => round($totals['total_credit'], 2),
            'net_change' => round($totals['net_change'], 2),
            'closing_balance' => round($closingBalance, 2),
            'currency' => 'SAR',
            'reconciliation' => [
                'statement_closing_balance' => round($closingBalance, 2),
                'gl_all_time_balance' => round($allTimeGlBalance, 2),
                'party_operational_balance' => round($operationalBalance, 2),
                'is_reconciled' => $isReconciled,
            ],
        ];
    }

    /**
     * استخراج جميع الحركات المالية للطرف مباشرة من أسطر القيود المحاسبية المرحّلة (GL Lines)
     * مع إرفاق البيانات الوصفية للمستندات المقابلة (الفواتير والسندات)
     */
    public function getTransactions(
        string $partyType,
        int $partyId,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        ?int $branchId = null
    ): Collection {
        // تحديد حسابات المراقبة المرتبطة بالطرف (ذمم الموردين 211 أو ذمم العملاء 112)
        $accountCodes = $partyType === 'supplier'
            ? ['2110', '211']
            : ['1121', '112'];

        $controlAccountIds = Account::where(function ($q) use ($accountCodes) {
            foreach ($accountCodes as $code) {
                $q->orWhere('code', 'LIKE', "{$code}%");
            }
        })->pluck('id')->toArray();

        $transactions = collect();

        if ($partyType === 'supplier') {
            $this->loadSupplierTransactions($partyId, $controlAccountIds, $branchId, $transactions);
        } else {
            $this->loadCustomerTransactions($partyId, $controlAccountIds, $branchId, $transactions);
        }

        // ترتيب الحركات تصاعدياً حسب التاريخ ثم معرف القيد ثم المعرف
        return $transactions->sortBy([
            ['date', 'asc'],
            ['journal_entry_id', 'asc'],
            ['id', 'asc'],
        ])->values();
    }

    /**
     * جلب حركات المورد من القيود المحاسبية للمستندات (فواتير مشتريات، سندات، ومردودات)
     */
    protected function loadSupplierTransactions(
        int $supplierId,
        array $controlAccountIds,
        ?int $branchId,
        Collection &$transactions
    ): void {
        // 1. فواتير المشتريات المرحّلة
        $invoicesQuery = PurchaseInvoice::query()
            ->where('supplier_id', $supplierId)
            ->whereNotNull('journal_entry_id')
            ->with(['journalEntry.lines.account']);

        if ($branchId) {
            $invoicesQuery->where('branch_id', $branchId);
        }

        $invoices = $invoicesQuery->get();
        $invoiceJeIds = [];

        foreach ($invoices as $invoice) {
            $entry = $invoice->journalEntry;
            if (!$entry || !$entry->isPosted()) {
                continue;
            }
            $invoiceJeIds[] = $entry->id;

            // استخراج الأسطر التي تخص حساب الموردين من القيد
            $partyLines = $entry->lines->filter(function ($line) use ($controlAccountIds) {
                return in_array($line->account_id, $controlAccountIds, true);
            });

            $debit = (float) $partyLines->sum('debit');
            $credit = (float) $partyLines->sum('credit');

            // إذا كانت الفاتورة لم تؤثر في ذمة المورد (كأن تكون سداد نقدي مباشر لم يمر عبر حساب المورد)،
            // فالمصدر المحاسبي (GL) سليم ولن يدرجها في كشف حساب الذمة إلا إذا كانت Credit
            if ($debit == 0 && $credit == 0) {
                continue;
            }

            $transactions->push([
                'id' => "PINV-{$invoice->id}",
                'date' => $entry->date ? $entry->date->toDateString() : $invoice->invoice_date->toDateString(),
                'journal_entry_id' => $entry->id,
                'journal_entry_number' => $entry->entry_number,
                'document_type' => 'purchase_invoice',
                'document_type_label' => 'فاتورة مشتريات',
                'document_id' => $invoice->id,
                'document_number' => $invoice->invoice_number,
                'reference' => $invoice->supplier_invoice_number ?: $invoice->invoice_number,
                'description' => $invoice->notes ?: ($entry->description ?: "فاتورة مشتريات رقم {$invoice->invoice_number}"),
                'debit' => $debit,
                'credit' => $credit,
            ]);
        }

        // 2. مردودات المشتريات والإشعارات المدينة المرحّلة
        $returnsQuery = PurchaseReturn::query()
            ->where('supplier_id', $supplierId)
            ->whereNotNull('journal_entry_id')
            ->with(['journalEntry.lines.account']);

        if ($branchId) {
            $returnsQuery->where('branch_id', $branchId);
        }

        $returns = $returnsQuery->get();
        $returnJeIds = [];

        foreach ($returns as $ret) {
            $entry = $ret->journalEntry;
            if (!$entry || !$entry->isPosted()) {
                continue;
            }
            $returnJeIds[] = $entry->id;

            $partyLines = $entry->lines->filter(function ($line) use ($controlAccountIds) {
                return in_array($line->account_id, $controlAccountIds, true);
            });

            $debit = (float) $partyLines->sum('debit');
            $credit = (float) $partyLines->sum('credit');

            if ($debit == 0 && $credit == 0) {
                continue;
            }

            $transactions->push([
                'id' => "PRET-{$ret->id}",
                'date' => $entry->date ? $entry->date->toDateString() : $ret->return_date->toDateString(),
                'journal_entry_id' => $entry->id,
                'journal_entry_number' => $entry->entry_number,
                'document_type' => 'purchase_return',
                'document_type_label' => 'مردود مشتريات / إشعار مدين',
                'document_id' => $ret->id,
                'document_number' => $ret->return_number,
                'reference' => $ret->debit_note_number ?: $ret->return_number,
                'description' => $ret->reason ?: ($entry->description ?: "مردود مشتريات رقم {$ret->return_number}"),
                'debit' => $debit,
                'credit' => $credit,
            ]);
        }

        // 3. السندات المالية (صرف لمورد أو قبض استرداد من مورد)
        $vouchersQuery = Voucher::query()
            ->where('party_type', VoucherPartyType::SUPPLIER)
            ->where('party_id', $supplierId)
            ->whereNotNull('journal_entry_id')
            ->with(['journalEntry.lines.account']);

        if ($branchId) {
            $vouchersQuery->where('branch_id', $branchId);
        }

        $vouchers = $vouchersQuery->get();
        $voucherJeIds = [];

        foreach ($vouchers as $voucher) {
            $entry = $voucher->journalEntry;
            if (!$entry || !$entry->isPosted()) {
                continue;
            }
            $voucherJeIds[] = $entry->id;

            // استخراج أسطر حساب المورد من القيد المحاسبي
            $partyLines = $entry->lines->filter(function ($line) use ($controlAccountIds, $voucher) {
                return in_array($line->account_id, $controlAccountIds, true)
                    || ($voucher->counter_account_id && $line->account_id === $voucher->counter_account_id);
            });

            $debit = (float) $partyLines->sum('debit');
            $credit = (float) $partyLines->sum('credit');

            if ($debit == 0 && $credit == 0) {
                continue;
            }

            $isPayment = $voucher->voucher_type === VoucherType::PAYMENT;

            $transactions->push([
                'id' => "VOUCH-{$voucher->id}",
                'date' => $entry->date ? $entry->date->toDateString() : $voucher->voucher_date->toDateString(),
                'journal_entry_id' => $entry->id,
                'journal_entry_number' => $entry->entry_number,
                'document_type' => $isPayment ? 'payment_voucher' : 'receipt_voucher',
                'document_type_label' => $isPayment ? 'سند صرف لمورد' : 'استرداد نقدي من مورد',
                'document_id' => $voucher->id,
                'document_number' => $voucher->voucher_number,
                'reference' => $voucher->reference ?: $voucher->voucher_number,
                'description' => $voucher->notes ?: ($entry->description ?: "سند رقم {$voucher->voucher_number}"),
                'debit' => $debit,
                'credit' => $credit,
            ]);
        }

        // 4. التحقق من القيود العكسية (Reversal Entries) لأي مستند ملغي
        $parentJeIds = array_merge($invoiceJeIds, $returnJeIds, $voucherJeIds);
        if (!empty($parentJeIds)) {
            $reversals = JournalEntry::query()
                ->whereIn('reversal_of_id', $parentJeIds)
                ->where('status', JournalEntryStatus::Posted)
                ->with(['lines.account'])
                ->get();

            foreach ($reversals as $revEntry) {
                $partyLines = $revEntry->lines->filter(function ($line) use ($controlAccountIds) {
                    return in_array($line->account_id, $controlAccountIds, true);
                });

                $debit = (float) $partyLines->sum('debit');
                $credit = (float) $partyLines->sum('credit');

                if ($debit == 0 && $credit == 0) {
                    continue;
                }

                $transactions->push([
                    'id' => "REV-{$revEntry->id}",
                    'date' => $revEntry->date ? $revEntry->date->toDateString() : Carbon::now()->toDateString(),
                    'journal_entry_id' => $revEntry->id,
                    'journal_entry_number' => $revEntry->entry_number,
                    'document_type' => 'reversal',
                    'document_type_label' => 'قيد عكسي / إلغاء مستند',
                    'document_id' => $revEntry->id,
                    'document_number' => $revEntry->entry_number,
                    'reference' => $revEntry->source_reference ?: "عكس قيد",
                    'description' => $revEntry->description ?: "قيد تسوية عكسي",
                    'debit' => $debit,
                    'credit' => $credit,
                ]);
            }
        }
    }

    /**
     * جلب حركات العميل من القيود المحاسبية للمستندات (فواتير مبيعات، سندات قبض، ومردودات)
     */
    protected function loadCustomerTransactions(
        int $customerId,
        array $controlAccountIds,
        ?int $branchId,
        Collection &$transactions
    ): void {
        // 1. فواتير المبيعات المرحّلة
        $invoicesQuery = SalesInvoice::query()
            ->where('customer_id', $customerId)
            ->whereNotNull('journal_entry_id')
            ->with(['journalEntry.lines.account']);

        if ($branchId) {
            $invoicesQuery->where('branch_id', $branchId);
        }

        $invoices = $invoicesQuery->get();
        $invoiceJeIds = [];

        foreach ($invoices as $invoice) {
            $entry = $invoice->journalEntry;
            if (!$entry || !$entry->isPosted()) {
                continue;
            }
            $invoiceJeIds[] = $entry->id;

            $partyLines = $entry->lines->filter(function ($line) use ($controlAccountIds) {
                return in_array($line->account_id, $controlAccountIds, true);
            });

            $debit = (float) $partyLines->sum('debit');
            $credit = (float) $partyLines->sum('credit');

            if ($debit == 0 && $credit == 0) {
                continue;
            }

            $transactions->push([
                'id' => "SINV-{$invoice->id}",
                'date' => $entry->date ? $entry->date->toDateString() : $invoice->invoice_date->toDateString(),
                'journal_entry_id' => $entry->id,
                'journal_entry_number' => $entry->entry_number,
                'document_type' => 'sales_invoice',
                'document_type_label' => 'فاتورة مبيعات',
                'document_id' => $invoice->id,
                'document_number' => $invoice->invoice_number,
                'reference' => $invoice->customer_po_number ?: $invoice->invoice_number,
                'description' => $invoice->notes ?: ($entry->description ?: "فاتورة مبيعات رقم {$invoice->invoice_number}"),
                'debit' => $debit,
                'credit' => $credit,
            ]);
        }

        // 2. مردودات المبيعات المرحّلة
        $returnsQuery = SalesReturn::query()
            ->where('customer_id', $customerId)
            ->whereNotNull('journal_entry_id')
            ->with(['journalEntry.lines.account']);

        if ($branchId) {
            $returnsQuery->where('branch_id', $branchId);
        }

        $returns = $returnsQuery->get();
        $returnJeIds = [];

        foreach ($returns as $ret) {
            $entry = $ret->journalEntry;
            if (!$entry || !$entry->isPosted()) {
                continue;
            }
            $returnJeIds[] = $entry->id;

            $partyLines = $entry->lines->filter(function ($line) use ($controlAccountIds) {
                return in_array($line->account_id, $controlAccountIds, true);
            });

            $debit = (float) $partyLines->sum('debit');
            $credit = (float) $partyLines->sum('credit');

            if ($debit == 0 && $credit == 0) {
                continue;
            }

            $transactions->push([
                'id' => "SRET-{$ret->id}",
                'date' => $entry->date ? $entry->date->toDateString() : $ret->return_date->toDateString(),
                'journal_entry_id' => $entry->id,
                'journal_entry_number' => $entry->entry_number,
                'document_type' => 'sales_return',
                'document_type_label' => 'مردود مبيعات',
                'document_id' => $ret->id,
                'document_number' => $ret->return_number,
                'reference' => $ret->invoice?->invoice_number ?: $ret->return_number,
                'description' => $ret->reason ?: ($entry->description ?: "مردود مبيعات رقم {$ret->return_number}"),
                'debit' => $debit,
                'credit' => $credit,
            ]);
        }

        // 3. السندات المالية (قبض من عميل أو صرف رد رصيد لعميل)
        $vouchersQuery = Voucher::query()
            ->where('party_type', VoucherPartyType::CUSTOMER)
            ->where('party_id', $customerId)
            ->whereNotNull('journal_entry_id')
            ->with(['journalEntry.lines.account']);

        if ($branchId) {
            $vouchersQuery->where('branch_id', $branchId);
        }

        $vouchers = $vouchersQuery->get();
        $voucherJeIds = [];

        foreach ($vouchers as $voucher) {
            $entry = $voucher->journalEntry;
            if (!$entry || !$entry->isPosted()) {
                continue;
            }
            $voucherJeIds[] = $entry->id;

            $partyLines = $entry->lines->filter(function ($line) use ($controlAccountIds, $voucher) {
                return in_array($line->account_id, $controlAccountIds, true)
                    || ($voucher->counter_account_id && $line->account_id === $voucher->counter_account_id);
            });

            $debit = (float) $partyLines->sum('debit');
            $credit = (float) $partyLines->sum('credit');

            if ($debit == 0 && $credit == 0) {
                continue;
            }

            $isReceipt = $voucher->voucher_type === VoucherType::RECEIPT;

            $transactions->push([
                'id' => "VOUCH-{$voucher->id}",
                'date' => $entry->date ? $entry->date->toDateString() : $voucher->voucher_date->toDateString(),
                'journal_entry_id' => $entry->id,
                'journal_entry_number' => $entry->entry_number,
                'document_type' => $isReceipt ? 'receipt_voucher' : 'payment_voucher',
                'document_type_label' => $isReceipt ? 'سند قبض من عميل' : 'سند صرف رد رصيد لعميل',
                'document_id' => $voucher->id,
                'document_number' => $voucher->voucher_number,
                'reference' => $voucher->reference ?: $voucher->voucher_number,
                'description' => $voucher->notes ?: ($entry->description ?: "سند رقم {$voucher->voucher_number}"),
                'debit' => $debit,
                'credit' => $credit,
            ]);
        }

        // 4. القيود العكسية لأي مستند تم إلغاؤه
        $parentJeIds = array_merge($invoiceJeIds, $returnJeIds, $voucherJeIds);
        if (!empty($parentJeIds)) {
            $reversals = JournalEntry::query()
                ->whereIn('reversal_of_id', $parentJeIds)
                ->where('status', JournalEntryStatus::Posted)
                ->with(['lines.account'])
                ->get();

            foreach ($reversals as $revEntry) {
                $partyLines = $revEntry->lines->filter(function ($line) use ($controlAccountIds) {
                    return in_array($line->account_id, $controlAccountIds, true);
                });

                $debit = (float) $partyLines->sum('debit');
                $credit = (float) $partyLines->sum('credit');

                if ($debit == 0 && $credit == 0) {
                    continue;
                }

                $transactions->push([
                    'id' => "REV-{$revEntry->id}",
                    'date' => $revEntry->date ? $revEntry->date->toDateString() : Carbon::now()->toDateString(),
                    'journal_entry_id' => $revEntry->id,
                    'journal_entry_number' => $revEntry->entry_number,
                    'document_type' => 'reversal',
                    'document_type_label' => 'قيد عكسي / إلغاء مستند',
                    'document_id' => $revEntry->id,
                    'document_number' => $revEntry->entry_number,
                    'reference' => $revEntry->source_reference ?: "عكس قيد",
                    'description' => $revEntry->description ?: "قيد تسوية عكسي",
                    'debit' => $debit,
                    'credit' => $credit,
                ]);
            }
        }
    }

    /**
     * احتساب الرصيد الافتتاحي ما قبل تاريخ البداية مباشرة من قيود الأستاذ العام
     */
    public function getOpeningBalance(Collection $allTransactions, string $partyType, ?string $dateFrom): float
    {
        if (!$dateFrom) {
            return 0.0;
        }

        $priorTransactions = $allTransactions->filter(fn($tx) => $tx['date'] < $dateFrom);

        $totalDebit = (float) $priorTransactions->sum('debit');
        $totalCredit = (float) $priorTransactions->sum('credit');

        // للمورد: الرصيد الموجب دائن (Credit - Debit)
        // للعميل: الرصيد الموجب مدين (Debit - Credit)
        return $partyType === 'supplier'
            ? ($totalCredit - $totalDebit)
            : ($totalDebit - $totalCredit);
    }

    /**
     * حساب الرصيد التراكمي المتحرك لكل سطر حركة
     */
    public function calculateRunningBalance(float $openingBalance, Collection $transactions, string $partyType): array
    {
        $running = $openingBalance;
        $result = [];

        foreach ($transactions as $tx) {
            $debit = (float) $tx['debit'];
            $credit = (float) $tx['credit'];

            if ($partyType === 'supplier') {
                // المورد: الرصيد يزيد بالدائن وينقص بالمدين
                $running = $running + $credit - $debit;
            } else {
                // العميل: الرصيد يزيد بالمدين وينقص بالدائن
                $running = $running + $debit - $credit;
            }

            $tx['balance'] = round($running, 2);
            $result[] = $tx;
        }

        return $result;
    }

    /**
     * حساب مجاميع الفترة
     */
    public function getTotals(Collection $transactions): array
    {
        $totalDebit = (float) $transactions->sum('debit');
        $totalCredit = (float) $transactions->sum('credit');

        return [
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'net_change' => $totalDebit - $totalCredit,
        ];
    }

    /**
     * احتساب الرصيد الختامي
     */
    public function getClosingBalance(
        float $openingBalance,
        float $totalDebit,
        float $totalCredit,
        string $partyType
    ): float {
        return $partyType === 'supplier'
            ? ($openingBalance + $totalCredit - $totalDebit)
            : ($openingBalance + $totalDebit - $totalCredit);
    }
}
