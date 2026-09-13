<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Services\Reports;

use App\Domains\Accounting\Models\Account;
use App\Domains\Inventory\Models\StockBalance;
use App\Domains\Products\Models\ItemCategory;
use Illuminate\Support\Facades\DB;

class InventoryReconciliationService
{
    /**
     * تقرير المطابقة المحاسبية اللحظية بين تقييم المخزون المالي وأرصدة الأستاذ العام (GL)
     * مع قراءة ديناميكية كاملة لحسابات الأصول المخزنية بدون أي Hardcoding
     *
     * @return array
     */
    public function getReconciliation(): array
    {
        // 1. الاكتشاف الديناميكي لحسابات الأصول المخزنية:
        // الحسابات المعرفة في فئات الأصناف + الحسابات الفرعية النشطة تحت شجرة المخزون (113%)
        $categoryAccountIds = ItemCategory::whereNotNull('inventory_account_id')
            ->pluck('inventory_account_id')
            ->all();

        $accounts = Account::query()
            ->where('is_leaf', true)
            ->where('is_active', true)
            ->where(function ($q) use ($categoryAccountIds) {
                $q->where('code', 'like', '113%')
                  ->orWhereIn('id', $categoryAccountIds);
            })
            ->orderBy('code')
            ->get();

        // 2. تجميع أرصدة الـ GL اللحظية من قيود اليومية المرحلة فقط
        $glBalancesQuery = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.status', 'posted')
            ->whereIn('journal_entry_lines.account_id', $accounts->pluck('id'))
            ->select([
                'journal_entry_lines.account_id',
                DB::raw('COALESCE(SUM(journal_entry_lines.debit), 0) as total_debit'),
                DB::raw('COALESCE(SUM(journal_entry_lines.credit), 0) as total_credit'),
                DB::raw('COALESCE(SUM(journal_entry_lines.debit) - SUM(journal_entry_lines.credit), 0) as net_balance'),
            ])
            ->groupBy('journal_entry_lines.account_id')
            ->get()
            ->keyBy('account_id');

        // 3. تجميع قيمة المخزون اللحظية حسب الفئات والحسابات
        // استعلام قيمة المخزون الحالي بالتكلفة لكل فئة
        $categoryStockValuations = StockBalance::query()
            ->join('items', 'stock_balances.item_id', '=', 'items.id')
            ->select([
                'items.category_id',
                DB::raw('COALESCE(SUM(stock_balances.quantity * stock_balances.unit_cost), 0) as total_cost_value'),
                DB::raw('COALESCE(SUM(stock_balances.quantity), 0) as total_quantity'),
            ])
            ->where('stock_balances.quantity', '>', 0)
            ->groupBy('items.category_id')
            ->get()
            ->keyBy('category_id');

        // ربط الفئات بالحسابات
        $allCategories = ItemCategory::all()->groupBy('inventory_account_id');

        $accountRows = [];
        $grandTotalValuation = 0.0;
        $grandTotalGL = 0.0;

        foreach ($accounts as $acc) {
            $glRow = $glBalancesQuery->get($acc->id);
            $glBalance = $glRow ? (float) $glRow->net_balance : 0.0;
            $glDebit = $glRow ? (float) $glRow->total_debit : 0.0;
            $glCredit = $glRow ? (float) $glRow->total_credit : 0.0;

            // حساب قيمة المخزون التابعة لهذا الحساب عبر الفئات المرتبطة به
            $linkedCategories = $allCategories->get($acc->id, collect());
            $accountValuation = 0.0;
            $accountQuantity = 0.0;
            $categoryNames = [];

            foreach ($linkedCategories as $cat) {
                $categoryNames[] = $cat->name_ar;
                $catStock = $categoryStockValuations->get($cat->id);
                if ($catStock) {
                    $accountValuation += (float) $catStock->total_cost_value;
                    $accountQuantity += (float) $catStock->total_quantity;
                }
            }

            // إذا لم يكن مرتبطاً بفئات مباشرة، وكان الحساب الافتراضي للأغذية (1131)، نربط الفئات التي لا حساب لها
            if ($linkedCategories->isEmpty() && $acc->code === '1131') {
                $unassignedCatStock = $categoryStockValuations->filter(function ($val, $catId) {
                    $cat = ItemCategory::find($catId);
                    return !$cat || !$cat->inventory_account_id;
                });
                foreach ($unassignedCatStock as $cStock) {
                    $accountValuation += (float) $cStock->total_cost_value;
                    $accountQuantity += (float) $cStock->total_quantity;
                }
            }

            $diff = round($accountValuation - $glBalance, 4);
            $isMatched = abs($diff) < 0.01;

            $accountRows[] = [
                'account_id' => $acc->id,
                'account_code' => $acc->code,
                'account_name' => $acc->name_ar,
                'linked_categories' => !empty($categoryNames) ? implode('، ', $categoryNames) : 'حساب أصول عام',
                'inventory_quantity' => round($accountQuantity, 4),
                'inventory_valuation' => round($accountValuation, 4),
                'gl_debit' => round($glDebit, 4),
                'gl_credit' => round($glCredit, 4),
                'gl_balance' => round($glBalance, 4),
                'difference' => $diff,
                'status' => $isMatched ? 'MATCHED' : 'DIFFERENCE',
                'status_label' => $isMatched ? 'متطابق' : 'يوجد فارق تسوية',
            ];

            $grandTotalValuation += $accountValuation;
            $grandTotalGL += $glBalance;
        }

        // إجمالي قيمة المخزون الكلية في المستودعات
        $actualTotalValuation = (float) StockBalance::where('quantity', '>', 0)
            ->selectRaw('COALESCE(SUM(quantity * unit_cost), 0) as total')
            ->value('total');

        $overallDiff = round($actualTotalValuation - $grandTotalGL, 4);
        $overallMatched = abs($overallDiff) < 0.01;

        return [
            'status' => $overallMatched ? 'MATCHED' : 'DIFFERENCE',
            'status_label' => $overallMatched ? 'مطابق لدفتر الأستاذ العام' : 'يوجد فارق تسوية مع الأستاذ العام',
            'summary' => [
                'total_inventory_valuation' => round($actualTotalValuation, 4),
                'total_gl_inventory_balance' => round($grandTotalGL, 4),
                'net_difference' => $overallDiff,
                'is_balanced' => $overallMatched,
                'accounts_count' => count($accountRows),
            ],
            'accounts' => $accountRows,
        ];
    }
}
