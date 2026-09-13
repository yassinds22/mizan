<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Services\Reports;

use App\Domains\Inventory\Models\StockBalance;
use App\Domains\Inventory\Models\StockLedgerEntry;
use App\Domains\Products\Models\Item;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InventoryAnalyticsService
{
    /**
     * تقرير تحليلات حركة المخزون والرقابة: تنبيهات إعادة الطلب والأصناف الراكدة
     *
     * @param array $filters [warehouse_id, days_threshold]
     * @return array
     */
    public function getAnalytics(array $filters = []): array
    {
        $warehouseId = !empty($filters['warehouse_id']) ? (int) $filters['warehouse_id'] : null;
        $daysThreshold = !empty($filters['days_threshold']) ? max(1, (int) $filters['days_threshold']) : 30;

        $reorderAlerts = $this->getReorderAlerts($warehouseId);
        $slowMovingStock = $this->getSlowMovingStock($warehouseId, $daysThreshold);

        return [
            'filters' => [
                'warehouse_id' => $warehouseId,
                'days_threshold' => $daysThreshold,
            ],
            'summary' => [
                'low_stock_items_count' => count($reorderAlerts),
                'total_reorder_estimated_cost' => round(array_sum(array_column($reorderAlerts, 'estimated_order_cost')), 4),
                'slow_moving_items_count' => count($slowMovingStock),
                'total_frozen_capital' => round(array_sum(array_column($slowMovingStock, 'frozen_capital')), 4),
            ],
            'reorder_alerts' => $reorderAlerts,
            'slow_moving_stock' => $slowMovingStock,
        ];
    }

    /**
     * رصد الأصناف التي وصلت أو تجاوزت حد إعادة الطلب
     */
    private function getReorderAlerts(?int $warehouseId): array
    {
        $query = Item::query()
            ->leftJoin('stock_balances', function ($join) use ($warehouseId) {
                $join->on('items.id', '=', 'stock_balances.item_id');
                if ($warehouseId) {
                    $join->where('stock_balances.warehouse_id', '=', $warehouseId);
                }
            })
            ->leftJoin('item_categories', 'items.category_id', '=', 'item_categories.id')
            ->leftJoin('units_of_measure', 'items.base_uom_id', '=', 'units_of_measure.id')
            ->where('items.is_active', true)
            ->where('items.reorder_level', '>', 0);

        $itemsWithStock = $query->select([
            'items.id as item_id',
            'items.sku',
            'items.barcode',
            'items.name_ar',
            'items.cost_price',
            'items.reorder_level',
            'item_categories.name_ar as category_name',
            'units_of_measure.name_ar as uom_name',
            DB::raw('COALESCE(SUM(stock_balances.quantity), 0) as current_quantity'),
            DB::raw('COALESCE(SUM(stock_balances.reserved_quantity), 0) as reserved_quantity'),
            DB::raw('COALESCE(MAX(stock_balances.unit_cost), items.cost_price, 0) as unit_cost'),
        ])
        ->groupBy('items.id', 'items.sku', 'items.barcode', 'items.name_ar', 'items.cost_price', 'items.reorder_level', 'item_categories.name_ar', 'units_of_measure.name_ar')
        ->havingRaw('COALESCE(SUM(stock_balances.quantity), 0) <= items.reorder_level')
        ->get();

        $alerts = [];
        foreach ($itemsWithStock as $row) {
            $currentQty = (float) $row->current_quantity;
            $reserved = (float) $row->reserved_quantity;
            $availableQty = max(0.0, $currentQty - $reserved);
            $reorderLevel = (float) $row->reorder_level;
            $unitCost = (float) ($row->unit_cost ?: $row->cost_price ?: 0);

            $shortage = max(0.0, $reorderLevel - $availableQty);
            // اقتراح كمية تغطي حد الطلب مع هامش أمان 50%
            $suggestedOrderQty = round(max($reorderLevel * 1.5 - $availableQty, $shortage), 2);
            $estimatedCost = round($suggestedOrderQty * $unitCost, 4);

            $alerts[] = [
                'item_id' => $row->item_id,
                'sku' => $row->sku,
                'barcode' => $row->barcode,
                'name_ar' => $row->name_ar,
                'category_name' => $row->category_name ?? '—',
                'uom_name' => $row->uom_name ?? '—',
                'current_quantity' => round($currentQty, 4),
                'available_quantity' => round($availableQty, 4),
                'reorder_level' => round($reorderLevel, 4),
                'shortage_quantity' => round($shortage, 4),
                'suggested_order_qty' => $suggestedOrderQty,
                'unit_cost' => round($unitCost, 4),
                'estimated_order_cost' => $estimatedCost,
                'urgency' => $availableQty <= 0 ? 'CRITICAL' : 'WARNING',
                'urgency_label' => $availableQty <= 0 ? 'نفد المخزون تماماً' : 'تحت حد إعادة الطلب',
            ];
        }

        // ترتيب حسب الأولوية: الحرج أولاً ثم قيمة العجز الأكبر
        usort($alerts, function ($a, $b) {
            if ($a['urgency'] === 'CRITICAL' && $b['urgency'] !== 'CRITICAL') return -1;
            if ($a['urgency'] !== 'CRITICAL' && $b['urgency'] === 'CRITICAL') return 1;
            return $b['shortage_quantity'] <=> $a['shortage_quantity'];
        });

        return $alerts;
    }

    /**
     * رصد الأصناف الراكدة وبطيئة الحركة استناداً إلى آخر حركة خروج فعلية مرحّلة
     */
    private function getSlowMovingStock(?int $warehouseId, int $daysThreshold): array
    {
        $today = Carbon::now();
        $cutoffDate = $today->copy()->subDays($daysThreshold)->toDateString();

        // 1. استخراج آخر تاريخ خروج فعلي (quantity_delta < 0) لكل صنف
        $lastOutQuery = StockLedgerEntry::query()
            ->select([
                'item_id',
                DB::raw('MAX(entry_date) as last_out_date'),
            ])
            ->where('quantity_delta', '<', 0);

        if ($warehouseId) {
            $lastOutQuery->where('warehouse_id', $warehouseId);
        }

        $lastOutDates = $lastOutQuery->groupBy('item_id')->pluck('last_out_date', 'item_id');

        // 2. فحص الأصناف التي لديها رصيد موجب حالياً
        $balancesQuery = StockBalance::query()
            ->join('items', 'stock_balances.item_id', '=', 'items.id')
            ->leftJoin('item_categories', 'items.category_id', '=', 'item_categories.id')
            ->leftJoin('units_of_measure', 'items.base_uom_id', '=', 'units_of_measure.id')
            ->where('stock_balances.quantity', '>', 0)
            ->where('items.is_active', true);

        if ($warehouseId) {
            $balancesQuery->where('stock_balances.warehouse_id', $warehouseId);
        }

        $stockRows = $balancesQuery->select([
            'items.id as item_id',
            'items.sku',
            'items.name_ar',
            'item_categories.name_ar as category_name',
            'units_of_measure.name_ar as uom_name',
            DB::raw('SUM(stock_balances.quantity) as current_quantity'),
            DB::raw('MAX(stock_balances.unit_cost) as unit_cost'),
            DB::raw('SUM(stock_balances.quantity * stock_balances.unit_cost) as total_cost_value'),
        ])
        ->groupBy('items.id', 'items.sku', 'items.name_ar', 'item_categories.name_ar', 'units_of_measure.name_ar')
        ->get();

        $slowItems = [];
        foreach ($stockRows as $row) {
            $lastOut = $lastOutDates->get($row->item_id);

            // صنف لم تخرج منه أي كمية إطلاقاً، أو أن آخر خروج كان قبل تاريخ الحد الفاصل
            if (!$lastOut || $lastOut <= $cutoffDate) {
                $daysInactive = $lastOut ? Carbon::parse($lastOut)->diffInDays($today) : 999;

                $classification = 'SLOW';
                $classificationLabel = 'بطيء الحركة (Slow)';
                $tone = 'info';

                if ($daysInactive >= 90) {
                    $classification = 'DEAD';
                    $classificationLabel = 'راكد تماماً (Dead Stock)';
                    $tone = 'danger';
                } elseif ($daysInactive >= 60) {
                    $classification = 'VERY_SLOW';
                    $classificationLabel = 'شديد البطء (Very Slow)';
                    $tone = 'warn';
                }

                $qty = (float) $row->current_quantity;
                $cost = (float) ($row->unit_cost ?: 0);
                $capital = (float) $row->total_cost_value;

                $slowItems[] = [
                    'item_id' => $row->item_id,
                    'sku' => $row->sku,
                    'name_ar' => $row->name_ar,
                    'category_name' => $row->category_name ?? '—',
                    'uom_name' => $row->uom_name ?? '—',
                    'current_quantity' => round($qty, 4),
                    'unit_cost' => round($cost, 4),
                    'frozen_capital' => round($capital, 4),
                    'last_out_date' => $lastOut ?: 'لا يوجد حركة صرف سابقة',
                    'days_inactive' => $daysInactive >= 900 ? 'أكثر من 90 يوم' : "{$daysInactive} يوم",
                    'classification' => $classification,
                    'classification_label' => $classificationLabel,
                    'tone' => $tone,
                ];
            }
        }

        // فرز تنازلي حسب رأس المال المجمد
        usort($slowItems, fn($a, $b) => $b['frozen_capital'] <=> $a['frozen_capital']);

        return $slowItems;
    }
}
