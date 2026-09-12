<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Services;

use App\Domains\Accounting\Enums\AccountNature;
use App\Domains\Accounting\Enums\AccountType;
use App\Domains\Accounting\Enums\JournalEntryStatus;
use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Accounting\Models\JournalEntryLine;
use App\Domains\Core\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FinancialReportService
{
    /**
     * 1. ميزان المراجعة (Trial Balance) بالمجاميع والأرصدة والتسلسل الشجري
     *
     * يتم احتساب المجاميع الإجمالية حصرياً من أوراق الشجرة (Leaf Accounts) لمنع التكرار المزدوج (Double Counting)
     *
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function getTrialBalance(array $filters = []): array
    {
        $dateFrom = !empty($filters['date_from']) ? (string) $filters['date_from'] : null;
        $dateTo = !empty($filters['date_to']) ? (string) $filters['date_to'] : Carbon::now()->toDateString();
        $branchId = !empty($filters['branch_id']) && $filters['branch_id'] !== 'all' ? (int) $filters['branch_id'] : null;
        $costCenterId = !empty($filters['cost_center_id']) && $filters['cost_center_id'] !== 'all' ? (int) $filters['cost_center_id'] : null;
        $hideZero = filter_var($filters['hide_zero'] ?? false, FILTER_VALIDATE_BOOLEAN);

        // جلب كافة الحسابات النشطة في شجرة الحسابات مرتبة بالكود
        $accounts = Account::active()->orderBy('code')->get();

        // 1. حساب حركات ما قبل الفترة (الرصيد الافتتاحي) للأوراق فقط
        $openingQuery = JournalEntryLine::query()
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.status', JournalEntryStatus::Posted->value);

        if ($dateFrom) {
            $openingQuery->where('journal_entries.date', '<', $dateFrom);
        } else {
            // إذا لم يُحدد تاريخ بداية، فالرصيد الافتتاحي صفر وتعتبر كل الحركات ضمن الفترة
            $openingQuery->whereRaw('1 = 0');
        }

        if ($branchId) {
            $openingQuery->where('journal_entries.branch_id', $branchId);
        }
        if ($costCenterId) {
            $openingQuery->where('journal_entry_lines.cost_center_id', $costCenterId);
        }

        $openingRows = $openingQuery
            ->select('journal_entry_lines.account_id', DB::raw('SUM(journal_entry_lines.debit) as total_debit'), DB::raw('SUM(journal_entry_lines.credit) as total_credit'))
            ->groupBy('journal_entry_lines.account_id')
            ->get()
            ->keyBy('account_id');

        // 2. حساب حركات الفترة المحددة
        $periodQuery = JournalEntryLine::query()
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.status', JournalEntryStatus::Posted->value);

        if ($dateFrom) {
            $periodQuery->where('journal_entries.date', '>=', $dateFrom);
        }
        $periodQuery->where('journal_entries.date', '<=', $dateTo);

        if ($branchId) {
            $periodQuery->where('journal_entries.branch_id', $branchId);
        }
        if ($costCenterId) {
            $periodQuery->where('journal_entry_lines.cost_center_id', $costCenterId);
        }

        $periodRows = $periodQuery
            ->select('journal_entry_lines.account_id', DB::raw('SUM(journal_entry_lines.debit) as total_debit'), DB::raw('SUM(journal_entry_lines.credit) as total_credit'))
            ->groupBy('journal_entry_lines.account_id')
            ->get()
            ->keyBy('account_id');

        // خريطة الحسابات التراكمية
        $accountStats = [];
        foreach ($accounts as $acc) {
            $opRow = $openingRows->get($acc->id);
            $prRow = $periodRows->get($acc->id);

            $rawOpDebit = (float) ($opRow->total_debit ?? 0);
            $rawOpCredit = (float) ($opRow->total_credit ?? 0);
            $rawPrDebit = (float) ($prRow->total_debit ?? 0);
            $rawPrCredit = (float) ($prRow->total_credit ?? 0);

            // صافي الافتتاحي (مدين أو دائن)
            $netOpDebit = 0.0;
            $netOpCredit = 0.0;
            if ($rawOpDebit >= $rawOpCredit) {
                $netOpDebit = $rawOpDebit - $rawOpCredit;
            } else {
                $netOpCredit = $rawOpCredit - $rawOpDebit;
            }

            // صافي الختامي = (افتتاحي مدين + فترة مدين) - (افتتاحي دائن + فترة دائن)
            $totDebit = $rawOpDebit + $rawPrDebit;
            $totCredit = $rawOpCredit + $rawPrCredit;

            $closingDebit = 0.0;
            $closingCredit = 0.0;
            if ($totDebit >= $totCredit) {
                $closingDebit = $totDebit - $totCredit;
            } else {
                $closingCredit = $totCredit - $totDebit;
            }

            $accountStats[$acc->id] = [
                'id' => $acc->id,
                'code' => $acc->code,
                'name_ar' => $acc->name_ar,
                'name_en' => $acc->name_en,
                'type' => $acc->type->value,
                'type_label' => $acc->type->label(),
                'nature' => $acc->nature->value,
                'level' => $acc->level,
                'parent_id' => $acc->parent_id,
                'is_leaf' => (bool) $acc->is_leaf,
                'opening_debit' => round($netOpDebit, 2),
                'opening_credit' => round($netOpCredit, 2),
                'period_debit' => round($rawPrDebit, 2),
                'period_credit' => round($rawPrCredit, 2),
                'closing_debit' => round($closingDebit, 2),
                'closing_credit' => round($closingCredit, 2),
            ];
        }

        // 3. احتساب المجاميع الإجمالية الصارمة من أوراق الشجرة (Leaf Accounts) فقط لمنع التكرار المزدوج
        $grandTotals = [
            'opening_debit' => 0.0,
            'opening_credit' => 0.0,
            'period_debit' => 0.0,
            'period_credit' => 0.0,
            'closing_debit' => 0.0,
            'closing_credit' => 0.0,
        ];

        foreach ($accountStats as $stat) {
            if ($stat['is_leaf']) {
                $grandTotals['opening_debit'] += $stat['opening_debit'];
                $grandTotals['opening_credit'] += $stat['opening_credit'];
                $grandTotals['period_debit'] += $stat['period_debit'];
                $grandTotals['period_credit'] += $stat['period_credit'];
                $grandTotals['closing_debit'] += $stat['closing_debit'];
                $grandTotals['closing_credit'] += $stat['closing_credit'];
            }
        }

        // 4. تجميع أرصدة الآباء (Tree Rollup) للعرض الهرمي من الأبناء
        // نرتب من المستوى الأعمق (الأكبر رقماً) إلى المستوى الأعلى
        $accountsByLevelDesc = $accounts->sortByDesc('level');
        foreach ($accountsByLevelDesc as $childAcc) {
            if ($childAcc->parent_id && isset($accountStats[$childAcc->parent_id])) {
                $pid = $childAcc->parent_id;
                $childStat = $accountStats[$childAcc->id];

                // إذا كان الابن leaf فإن مساهمته تضاف، وإذا كان parent فهو أخذ مسبقاً مساهمة أوراقه
                if ($childAcc->is_leaf) {
                    $accountStats[$pid]['opening_debit'] += $childStat['opening_debit'];
                    $accountStats[$pid]['opening_credit'] += $childStat['opening_credit'];
                    $accountStats[$pid]['period_debit'] += $childStat['period_debit'];
                    $accountStats[$pid]['period_credit'] += $childStat['period_credit'];
                    $accountStats[$pid]['closing_debit'] += $childStat['closing_debit'];
                    $accountStats[$pid]['closing_credit'] += $childStat['closing_credit'];
                }
            }
        }

        // تدوير قيم الآباء
        foreach ($accountStats as &$st) {
            $st['opening_debit'] = round($st['opening_debit'], 2);
            $st['opening_credit'] = round($st['opening_credit'], 2);
            $st['period_debit'] = round($st['period_debit'], 2);
            $st['period_credit'] = round($st['period_credit'], 2);
            $st['closing_debit'] = round($st['closing_debit'], 2);
            $st['closing_credit'] = round($st['closing_credit'], 2);
        }
        unset($st);

        // تصفية الصفر إن طُلب ذلك
        $finalAccounts = array_values($accountStats);
        if ($hideZero) {
            $finalAccounts = array_filter($finalAccounts, function ($st) {
                return $st['opening_debit'] > 0
                    || $st['opening_credit'] > 0
                    || $st['period_debit'] > 0
                    || $st['period_credit'] > 0
                    || $st['closing_debit'] > 0
                    || $st['closing_credit'] > 0;
            });
            $finalAccounts = array_values($finalAccounts);
        }

        // التحقق الصارم من توازن ميزان المراجعة
        $isBalanced = abs($grandTotals['closing_debit'] - $grandTotals['closing_credit']) < 0.05
            && abs($grandTotals['period_debit'] - $grandTotals['period_credit']) < 0.05;

        return [
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'branch_id' => $branchId,
                'cost_center_id' => $costCenterId,
                'hide_zero' => $hideZero,
            ],
            'accounts' => $finalAccounts,
            'totals' => [
                'opening_debit' => round($grandTotals['opening_debit'], 2),
                'opening_credit' => round($grandTotals['opening_credit'], 2),
                'period_debit' => round($grandTotals['period_debit'], 2),
                'period_credit' => round($grandTotals['period_credit'], 2),
                'closing_debit' => round($grandTotals['closing_debit'], 2),
                'closing_credit' => round($grandTotals['closing_credit'], 2),
                'difference' => round(abs($grandTotals['closing_debit'] - $grandTotals['closing_credit']), 2),
            ],
            'is_balanced' => $isBalanced,
        ];
    }

    /**
     * 2. كشف دفتر الأستاذ العام لأي حساب (General Ledger Account Ledger)
     *
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function getAccountLedger(int $accountId, array $filters = []): array
    {
        $account = Account::with('parent')->findOrFail($accountId);

        $dateFrom = !empty($filters['date_from']) ? (string) $filters['date_from'] : null;
        $dateTo = !empty($filters['date_to']) ? (string) $filters['date_to'] : Carbon::now()->toDateString();
        $branchId = !empty($filters['branch_id']) && $filters['branch_id'] !== 'all' ? (int) $filters['branch_id'] : null;
        $costCenterId = !empty($filters['cost_center_id']) && $filters['cost_center_id'] !== 'all' ? (int) $filters['cost_center_id'] : null;

        // إذا كان الحساب أباً (Parent)، نجمع معرفات كافة أبنائه الأوراق
        $accountIds = $account->is_leaf
            ? [$account->id]
            : $this->getAllLeafAccountIds($account->id);

        // 1. حساب الرصيد الافتتاحي قبل date_from
        $openingDebit = 0.0;
        $openingCredit = 0.0;

        if ($dateFrom) {
            $opQuery = JournalEntryLine::query()
                ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
                ->whereIn('journal_entry_lines.account_id', $accountIds)
                ->where('journal_entries.status', JournalEntryStatus::Posted->value)
                ->where('journal_entries.date', '<', $dateFrom);

            if ($branchId) $opQuery->where('journal_entries.branch_id', $branchId);
            if ($costCenterId) $opQuery->where('journal_entry_lines.cost_center_id', $costCenterId);

            $opResult = $opQuery->select(
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )->first();

            $openingDebit = (float) ($opResult->total_debit ?? 0);
            $openingCredit = (float) ($opResult->total_credit ?? 0);
        }

        // الرصيد الافتتاحي يتبع طبيعة الحساب (مدين أو دائن)
        $isDebitNature = $account->nature === AccountNature::Debit;
        $openingBalance = $isDebitNature
            ? ($openingDebit - $openingCredit)
            : ($openingCredit - $openingDebit);

        // 2. جلب حركات الفترة
        $transQuery = JournalEntryLine::query()
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->whereIn('journal_entry_lines.account_id', $accountIds)
            ->where('journal_entries.status', JournalEntryStatus::Posted->value);

        if ($dateFrom) {
            $transQuery->where('journal_entries.date', '>=', $dateFrom);
        }
        $transQuery->where('journal_entries.date', '<=', $dateTo);

        if ($branchId) $transQuery->where('journal_entries.branch_id', $branchId);
        if ($costCenterId) $transQuery->where('journal_entry_lines.cost_center_id', $costCenterId);

        $rows = $transQuery
            ->select(
                'journal_entry_lines.id as line_id',
                'journal_entry_lines.account_id',
                'journal_entry_lines.debit',
                'journal_entry_lines.credit',
                'journal_entry_lines.description as line_description',
                'journal_entries.id as journal_entry_id',
                'journal_entries.entry_number',
                'journal_entries.date',
                'journal_entries.source_reference as reference',
                'journal_entries.description as entry_description',
                'journal_entries.source_type',
                'journal_entries.branch_id'
            )
            ->orderBy('journal_entries.date', 'asc')
            ->orderBy('journal_entries.id', 'asc')
            ->orderBy('journal_entry_lines.id', 'asc')
            ->get();

        // 3. حساب الرصيد التراكمي اللحظي لكل حركة
        $runningBalance = $openingBalance;
        $totalPeriodDebit = 0.0;
        $totalPeriodCredit = 0.0;
        $transactions = [];

        foreach ($rows as $row) {
            $d = (float) $row->debit;
            $c = (float) $row->credit;
            $totalPeriodDebit += $d;
            $totalPeriodCredit += $c;

            if ($isDebitNature) {
                $runningBalance += ($d - $c);
            } else {
                $runningBalance += ($c - $d);
            }

            $transactions[] = [
                'line_id' => $row->line_id,
                'account_id' => $row->account_id,
                'journal_entry_id' => $row->journal_entry_id,
                'entry_number' => $row->entry_number,
                'date' => Carbon::parse($row->date)->toDateString(),
                'reference' => $row->reference ?: $row->entry_number,
                'description' => $row->line_description ?: $row->entry_description,
                'source_type' => $row->source_type,
                'debit' => round($d, 2),
                'credit' => round($c, 2),
                'running_balance' => round($runningBalance, 2),
            ];
        }

        return [
            'account' => [
                'id' => $account->id,
                'code' => $account->code,
                'name_ar' => $account->name_ar,
                'name_en' => $account->name_en,
                'type' => $account->type->value,
                'type_label' => $account->type->label(),
                'nature' => $account->nature->value,
                'nature_label' => $account->nature->label(),
                'is_leaf' => (bool) $account->is_leaf,
            ],
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'branch_id' => $branchId,
                'cost_center_id' => $costCenterId,
            ],
            'opening_balance' => round($openingBalance, 2),
            'transactions' => $transactions,
            'total_debit' => round($totalPeriodDebit, 2),
            'total_credit' => round($totalPeriodCredit, 2),
            'net_change' => round($totalPeriodDebit - $totalPeriodCredit, 2),
            'closing_balance' => round($runningBalance, 2),
        ];
    }

    /**
     * 3. قائمة الدخل والأرباح والخسائر (Income Statement / P&L)
     *
     * يتم تصنيف الحسابات باستخدام AccountType بدون Hardcoded Codes
     *
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function getIncomeStatement(array $filters = []): array
    {
        $dateFrom = !empty($filters['date_from']) ? (string) $filters['date_from'] : Carbon::now()->startOfYear()->toDateString();
        $dateTo = !empty($filters['date_to']) ? (string) $filters['date_to'] : Carbon::now()->toDateString();
        $branchId = !empty($filters['branch_id']) && $filters['branch_id'] !== 'all' ? (int) $filters['branch_id'] : null;

        // جلب حركات حسابات الإيرادات والمصروفات خلال الفترة
        $query = JournalEntryLine::query()
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('chart_of_accounts', 'journal_entry_lines.account_id', '=', 'chart_of_accounts.id')
            ->where('journal_entries.status', JournalEntryStatus::Posted->value)
            ->where('journal_entries.date', '>=', $dateFrom)
            ->where('journal_entries.date', '<=', $dateTo)
            ->whereIn('chart_of_accounts.type', [AccountType::Revenue->value, AccountType::Expense->value]);

        if ($branchId) {
            $query->where('journal_entries.branch_id', $branchId);
        }

        $lineTotals = $query
            ->select(
                'chart_of_accounts.id',
                'chart_of_accounts.code',
                'chart_of_accounts.name_ar',
                'chart_of_accounts.type',
                'chart_of_accounts.parent_id',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('chart_of_accounts.id', 'chart_of_accounts.code', 'chart_of_accounts.name_ar', 'chart_of_accounts.type', 'chart_of_accounts.parent_id')
            ->get();

        $cogsParentAccount = $this->findCogsParentAccount();
        $cogsParentId = $cogsParentAccount?->id;

        $revenueItems = [];
        $cogsItems = [];
        $operatingExpenseItems = [];

        $totalRevenue = 0.0;
        $totalCogs = 0.0;
        $totalOperatingExpenses = 0.0;

        foreach ($lineTotals as $row) {
            $debit = (float) $row->total_debit;
            $credit = (float) $row->total_credit;

            if ($row->type === AccountType::Revenue->value) {
                // الإيرادات بطبيعتها دائنة (صافي الإيراد = الدائن - المدين)
                $netAmount = $credit - $debit;
                $totalRevenue += $netAmount;

                $revenueItems[] = [
                    'account_id' => $row->id,
                    'code' => $row->code,
                    'name_ar' => $row->name_ar,
                    'amount' => round($netAmount, 2),
                ];
            } elseif ($row->type === AccountType::Expense->value) {
                // المصروفات بطبيعتها مدينة (صافي المصروف = المدين - الدائن)
                $netAmount = $debit - $credit;

                // التحقق هل الحساب يتبع لمجموعة تكلفة البضاعة المباعة (COGS)
                $isCogs = $this->isAccountUnderParent($row->id, $cogsParentId);

                if ($isCogs) {
                    $totalCogs += $netAmount;
                    $cogsItems[] = [
                        'account_id' => $row->id,
                        'code' => $row->code,
                        'name_ar' => $row->name_ar,
                        'amount' => round($netAmount, 2),
                    ];
                } else {
                    $totalOperatingExpenses += $netAmount;
                    $operatingExpenseItems[] = [
                        'account_id' => $row->id,
                        'code' => $row->code,
                        'name_ar' => $row->name_ar,
                        'amount' => round($netAmount, 2),
                    ];
                }
            }
        }

        // الحسابات المالية الختامية
        $grossProfit = $totalRevenue - $totalCogs;
        $netProfit = $grossProfit - $totalOperatingExpenses;
        $grossMarginPercent = $totalRevenue > 0 ? round(($grossProfit / $totalRevenue) * 100, 2) : 0.0;
        $netMarginPercent = $totalRevenue > 0 ? round(($netProfit / $totalRevenue) * 100, 2) : 0.0;

        return [
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'branch_id' => $branchId,
            ],
            'revenues' => [
                'items' => $revenueItems,
                'total' => round($totalRevenue, 2),
            ],
            'cogs' => [
                'items' => $cogsItems,
                'total' => round($totalCogs, 2),
            ],
            'gross_profit' => round($grossProfit, 2),
            'gross_margin_percent' => $grossMarginPercent,
            'operating_expenses' => [
                'items' => $operatingExpenseItems,
                'total' => round($totalOperatingExpenses, 2),
            ],
            'net_profit' => round($netProfit, 2),
            'net_margin_percent' => $netMarginPercent,
        ];
    }

    /**
     * 4. الميزانية العمومية وقائمة المركز المالي (Balance Sheet)
     *
     * وتتحقق من المعادلة الذهبية: الأصول = الالتزامات + حقوق الملكية (متضمنة صافي ربح الفترة)
     *
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function getBalanceSheet(array $filters = []): array
    {
        $dateTo = !empty($filters['date_to']) ? (string) $filters['date_to'] : Carbon::now()->toDateString();
        $branchId = !empty($filters['branch_id']) && $filters['branch_id'] !== 'all' ? (int) $filters['branch_id'] : null;

        // 1. حساب أرصدة الحسابات للأصول والخصوم وحقوق الملكية حتى تاريخ date_to
        $query = JournalEntryLine::query()
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('chart_of_accounts', 'journal_entry_lines.account_id', '=', 'chart_of_accounts.id')
            ->where('journal_entries.status', JournalEntryStatus::Posted->value)
            ->where('journal_entries.date', '<=', $dateTo)
            ->whereIn('chart_of_accounts.type', [
                AccountType::Asset->value,
                AccountType::Liability->value,
                AccountType::Equity->value,
            ]);

        if ($branchId) {
            $query->where('journal_entries.branch_id', $branchId);
        }

        $rows = $query
            ->select(
                'chart_of_accounts.id',
                'chart_of_accounts.code',
                'chart_of_accounts.name_ar',
                'chart_of_accounts.type',
                'chart_of_accounts.nature',
                'chart_of_accounts.parent_id',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('chart_of_accounts.id', 'chart_of_accounts.code', 'chart_of_accounts.name_ar', 'chart_of_accounts.type', 'chart_of_accounts.nature', 'chart_of_accounts.parent_id')
            ->get();

        $assetItems = [];
        $liabilityItems = [];
        $equityItems = [];

        $totalAssets = 0.0;
        $totalLiabilities = 0.0;
        $totalEquityWithoutProfit = 0.0;

        foreach ($rows as $r) {
            $debit = (float) $r->total_debit;
            $credit = (float) $r->total_credit;

            if ($r->type === AccountType::Asset->value) {
                // الأصول مدينة (صافي الرصيد = مدين - دائن)
                $bal = $debit - $credit;
                $totalAssets += $bal;
                $assetItems[] = [
                    'account_id' => $r->id,
                    'code' => $r->code,
                    'name_ar' => $r->name_ar,
                    'balance' => round($bal, 2),
                ];
            } elseif ($r->type === AccountType::Liability->value) {
                // الخصوم دائنة (صافي الرصيد = دائن - مدين)
                $bal = $credit - $debit;
                $totalLiabilities += $bal;
                $liabilityItems[] = [
                    'account_id' => $r->id,
                    'code' => $r->code,
                    'name_ar' => $r->name_ar,
                    'balance' => round($bal, 2),
                ];
            } elseif ($r->type === AccountType::Equity->value) {
                // حقوق الملكية دائنة (صافي الرصيد = دائن - مدين)
                $bal = $credit - $debit;
                $totalEquityWithoutProfit += $bal;
                $equityItems[] = [
                    'account_id' => $r->id,
                    'code' => $r->code,
                    'name_ar' => $r->name_ar,
                    'balance' => round($bal, 2),
                ];
            }
        }

        // 2. احتساب صافي أرباح/خسائر الفترة التراكمية من قائمة الدخل لترحيلها لحقوق الملكية
        $incomeReport = $this->getIncomeStatement([
            'date_from' => null, // تراكمي كامل حتى تاريخ الميزانية
            'date_to' => $dateTo,
            'branch_id' => $branchId,
        ]);
        $currentPeriodNetProfit = (float) $incomeReport['net_profit'];

        // إجمالي حقوق الملكية متضمنة أرباح الفترة
        $totalEquity = $totalEquityWithoutProfit + $currentPeriodNetProfit;

        // مجموع الالتزامات وحقوق الملكية
        $totalLiabilitiesAndEquity = $totalLiabilities + $totalEquity;

        // التحقق من توازن الميزانية العمومية
        $difference = round(abs($totalAssets - $totalLiabilitiesAndEquity), 2);
        $isBalanced = $difference < 0.05;

        return [
            'as_of_date' => $dateTo,
            'branch_id' => $branchId,
            'assets' => [
                'items' => $assetItems,
                'total' => round($totalAssets, 2),
            ],
            'liabilities' => [
                'items' => $liabilityItems,
                'total' => round($totalLiabilities, 2),
            ],
            'equity' => [
                'items' => $equityItems,
                'current_period_net_profit' => round($currentPeriodNetProfit, 2),
                'total_equity' => round($totalEquity, 2),
            ],
            'total_liabilities_and_equity' => round($totalLiabilitiesAndEquity, 2),
            'difference' => $difference,
            'is_balanced' => $isBalanced,
        ];
    }

    /**
     * 5. تقرير الموقف الضريبي لضريبة القيمة المضافة (VAT Position Report)
     *
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function getVatPositionReport(array $filters = []): array
    {
        $dateFrom = !empty($filters['date_from']) ? (string) $filters['date_from'] : Carbon::now()->startOfMonth()->toDateString();
        $dateTo = !empty($filters['date_to']) ? (string) $filters['date_to'] : Carbon::now()->toDateString();
        $branchId = !empty($filters['branch_id']) && $filters['branch_id'] !== 'all' ? (int) $filters['branch_id'] : null;

        // 1. تحديد حسابات الضريبة ديناميكياً
        $inputTaxAccount = $this->findInputTaxAccount();
        $outputTaxAccount = $this->findOutputTaxAccount();

        // 2. حركات ضريبة المخرجات (مبيعات ومردوداتها)
        $outputTaxStats = $this->getTaxAccountStats($outputTaxAccount?->id, $dateFrom, $dateTo, $branchId);
        // في حساب ضريبة المخرجات (دائن): الدائن هو الضريبة المستحقة على المبيعات، والمدين هو عكس الضريبة على المردودات
        $outputGross = $outputTaxStats['credit'];
        $outputAdjustments = $outputTaxStats['debit'];
        $netOutputTax = $outputGross - $outputAdjustments;

        // 3. حركات ضريبة المدخلات (مشتريات ومردوداتها)
        $inputTaxStats = $this->getTaxAccountStats($inputTaxAccount?->id, $dateFrom, $dateTo, $branchId);
        // في حساب ضريبة المدخلات (مدين): المدين هو الضريبة المدفوعة على المشتريات، والدائن هو عكس الضريبة على المردودات
        $inputGross = $inputTaxStats['debit'];
        $inputAdjustments = $inputTaxStats['credit'];
        $netInputTax = $inputGross - $inputAdjustments;

        // 4. صافي الموقف الضريبي للهيئة
        $netVatPayable = $netOutputTax - $netInputTax;

        return [
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'branch_id' => $branchId,
            ],
            'output_vat' => [
                'account_name' => $outputTaxAccount?->name_ar ?? 'ضريبة المخرجات (مبيعات)',
                'gross_tax' => round($outputGross, 2),
                'adjustments_returns' => round($outputAdjustments, 2),
                'net_tax' => round($netOutputTax, 2),
                'estimated_sales_base' => round($netOutputTax / 0.15, 2),
            ],
            'input_vat' => [
                'account_name' => $inputTaxAccount?->name_ar ?? 'ضريبة المدخلات (مشتريات)',
                'gross_tax' => round($inputGross, 2),
                'adjustments_returns' => round($inputAdjustments, 2),
                'net_tax' => round($netInputTax, 2),
                'estimated_purchases_base' => round($netInputTax / 0.15, 2),
            ],
            'net_vat_position' => [
                'amount' => round(abs($netVatPayable), 2),
                'status' => $netVatPayable >= 0 ? 'payable' : 'refundable',
                'status_label' => $netVatPayable >= 0 ? 'صافي ضريبة واجبة السداد للهيئة' : 'رصيد ضريبي دائن مسترد من الهيئة',
            ],
        ];
    }

    // ==========================================
    // Helpers & Dynamic Account Resolvers
    // ==========================================

    protected function findCogsParentAccount(): ?Account
    {
        // 1. البحث في الإعدادات المخصصة أولاً
        $setting = SystemSetting::get('accounting.cogs_parent_account');
        if ($setting) {
            $acc = Account::where('code', $setting)->first();
            if ($acc) return $acc;
        }

        // 2. البحث عن كود 5100 المعياري
        $acc = Account::where('code', '5100')->first();
        if ($acc) return $acc;

        // 3. البحث بالاسم مع اشتراط ألا يكون الحساب الرئيسي للمصروفات (level > 1)
        $acc = Account::where('level', '>', 1)
            ->where(function ($q) {
                $q->where('name_ar', 'LIKE', '%تكلفة البضاعة المباعة%')
                  ->orWhere('name_ar', 'LIKE', '%تكلفة المبيعات%')
                  ->orWhere('name_ar', 'LIKE', '%COGS%');
            })->first();

        if ($acc) return $acc;

        return Account::where('code', 'LIKE', '51%')->where('level', 2)->first();
    }

    protected function isAccountUnderParent(int $accountId, ?int $parentId): bool
    {
        if (!$parentId) {
            $acc = Account::find($accountId);
            return $acc && str_starts_with($acc->code, '51');
        }

        if ($accountId === $parentId) return true;

        $current = Account::find($accountId);
        while ($current && $current->parent_id) {
            if ($current->parent_id === $parentId) {
                return true;
            }
            $current = Account::find($current->parent_id);
        }

        return false;
    }

    protected function getAllLeafAccountIds(int $parentId): array
    {
        $leafIds = [];
        $children = Account::where('parent_id', $parentId)->get();

        foreach ($children as $child) {
            if ($child->is_leaf) {
                $leafIds[] = $child->id;
            } else {
                $leafIds = array_merge($leafIds, $this->getAllLeafAccountIds($child->id));
            }
        }

        return $leafIds;
    }

    protected function findInputTaxAccount(): ?Account
    {
        $code = SystemSetting::get('accounting.input_tax_account');
        if ($code) {
            $acc = Account::where('code', $code)->first();
            if ($acc) return $acc;
        }

        $acc = Account::where('name_ar', 'LIKE', '%مدخلات%')->where('is_leaf', true)->first();
        if ($acc) return $acc;

        return Account::where('code', '1141')->first();
    }

    protected function findOutputTaxAccount(): ?Account
    {
        $code = SystemSetting::get('accounting.output_tax_account');
        if ($code) {
            $acc = Account::where('code', $code)->first();
            if ($acc) return $acc;
        }

        $acc = Account::where('name_ar', 'LIKE', '%مخرجات%')->where('is_leaf', true)->first();
        if ($acc) return $acc;

        return Account::where('code', '2130')->first();
    }

    protected function getTaxAccountStats(?int $accountId, string $dateFrom, string $dateTo, ?int $branchId): array
    {
        if (!$accountId) {
            return ['debit' => 0.0, 'credit' => 0.0];
        }

        $query = JournalEntryLine::query()
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entry_lines.account_id', $accountId)
            ->where('journal_entries.status', JournalEntryStatus::Posted->value)
            ->where('journal_entries.date', '>=', $dateFrom)
            ->where('journal_entries.date', '<=', $dateTo);

        if ($branchId) {
            $query->where('journal_entries.branch_id', $branchId);
        }

        $res = $query->select(
            DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
            DB::raw('SUM(journal_entry_lines.credit) as total_credit')
        )->first();

        return [
            'debit' => (float) ($res->total_debit ?? 0),
            'credit' => (float) ($res->total_credit ?? 0),
        ];
    }
}
