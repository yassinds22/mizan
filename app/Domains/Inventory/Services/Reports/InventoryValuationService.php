<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Services\Reports;

use App\Domains\Inventory\Models\StockBalance;
use App\Domains\Products\Enums\PriceTier;
use App\Domains\Products\Models\Item;
use App\Domains\Products\Services\ItemService;
use App\Domains\Warehouses\Models\Warehouse;
use Illuminate\Support\Facades\DB;

class InventoryValuationService
{
    public function __construct(
        private readonly ItemService $itemService,
    ) {}

    /**
     * استخراج تقرير تقييم المخزون المالي المفصل مع هوامش الربح
     *
     * @param array $filters [warehouse_id, category_id, search, price_tier]
     * @return array
     */
    public function getValuation(array $filters = []): array
    {
        $warehouseId = !empty($filters['warehouse_id']) ? (int) $filters['warehouse_id'] : null;
        $categoryId = !empty($filters['category_id']) ? (int) $filters['category_id'] : null;
        $search = !empty($filters['search']) ? trim((string) $filters['search']) : null;
        $tierInput = !empty($filters['price_tier']) ? (string) $filters['price_tier'] : 'retail';

        // محاولة مطابقة PriceTier enum إن أمكن، وإلا تمرير السلسلة النصية
        $priceTier = PriceTier::tryFrom($tierInput) ?? PriceTier::Retail;

        // 1. تجميع الأرصدة والتكلفة من stock_balances
        $balanceQuery = StockBalance::query()
            ->select([
                'item_id',
                DB::raw('SUM(quantity) as total_quantity'),
                DB::raw('SUM(reserved_quantity) as total_reserved'),
                DB::raw('SUM(quantity * unit_cost) as total_cost_value'),
            ])
            ->where('quantity', '>', 0)
            ->groupBy('item_id');

        if ($warehouseId) {
            $balanceQuery->where('warehouse_id', $warehouseId);
        }

        $balanceRows = $balanceQuery->get()->keyBy('item_id');

        // 2. استعلام الأصناف المفلترة
        $itemsQuery = Item::query()
            ->with(['category', 'baseUom', 'itemUnits.prices'])
            ->where('is_active', true);

        if ($categoryId) {
            $itemsQuery->where('category_id', $categoryId);
        }

        if ($search) {
            $itemsQuery->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                  ->orWhere('name_en', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        $items = $itemsQuery->orderBy('category_id')->orderBy('name_ar')->get();

        $rows = [];
        $grandTotalQty = 0.0;
        $grandTotalCost = 0.0;
        $grandTotalRetail = 0.0;

        $categoryBreakdown = [];
        $warehouseBreakdown = [];

        foreach ($items as $item) {
            $balance = $balanceRows->get($item->id);
            $qty = $balance ? (float) $balance->total_quantity : 0.0;
            $reserved = $balance ? (float) $balance->total_reserved : 0.0;
            $costVal = $balance ? (float) $balance->total_cost_value : 0.0;

            // إذا كان الفلتر محدد لمستودع ولا يوجد رصيد، يتم التجاوز
            if ($warehouseId && $qty <= 0) {
                continue;
            }

            $avgUnitCost = $qty > 0 ? round($costVal / $qty, 4) : (float) ($item->cost_price ?? 0.0);
            $costVal = $qty > 0 ? $costVal : 0.0;

            // استخراج سعر البيع عبر Price Tier
            $sellingPrice = 0.0;
            if ($item->base_uom_id) {
                $resolvedPrice = $this->itemService->resolvePrice($item, (int) $item->base_uom_id, $priceTier);
                if ($resolvedPrice) {
                    $sellingPrice = (float) $resolvedPrice->price;
                }
            }

            // في حال عدم وجود سعر في القائمة، استخدام fallback من أول سعر بيع نشط
            if ($sellingPrice <= 0.0) {
                $firstPrice = $item->prices->first();
                $sellingPrice = $firstPrice ? (float) $firstPrice->price : round($avgUnitCost * 1.25, 2);
            }

            $retailVal = round($qty * $sellingPrice, 4);
            $expectedMargin = round($retailVal - $costVal, 4);
            $marginPercent = $retailVal > 0 ? round(($expectedMargin / $retailVal) * 100, 2) : 0.0;

            $catName = $item->category?->name_ar ?? 'غير مصنف';
            $catId = $item->category_id ?? 0;

            $rows[] = [
                'item_id' => $item->id,
                'sku' => $item->sku,
                'barcode' => $item->barcode,
                'name_ar' => $item->name_ar,
                'name_en' => $item->name_en,
                'category_id' => $catId,
                'category_name' => $catName,
                'base_uom' => $item->baseUom?->name_ar ?? '—',
                'quantity_on_hand' => round($qty, 4),
                'quantity_available' => round(max(0.0, $qty - $reserved), 4),
                'quantity_reserved' => round($reserved, 4),
                'unit_cost' => round($avgUnitCost, 4),
                'total_cost_value' => round($costVal, 4),
                'selling_price' => round($sellingPrice, 4),
                'total_retail_value' => round($retailVal, 4),
                'expected_margin' => round($expectedMargin, 4),
                'margin_percent' => $marginPercent,
                'reorder_level' => (float) ($item->reorder_level ?? 0),
                'is_low_stock' => $qty <= (float) ($item->reorder_level ?? 0),
            ];

            $grandTotalQty += $qty;
            $grandTotalCost += $costVal;
            $grandTotalRetail += $retailVal;

            // إحصائيات الفئات
            if (!isset($categoryBreakdown[$catId])) {
                $categoryBreakdown[$catId] = [
                    'category_id' => $catId,
                    'category_name' => $catName,
                    'items_count' => 0,
                    'total_quantity' => 0.0,
                    'total_cost_value' => 0.0,
                    'total_retail_value' => 0.0,
                ];
            }
            $categoryBreakdown[$catId]['items_count']++;
            $categoryBreakdown[$catId]['total_quantity'] += $qty;
            $categoryBreakdown[$catId]['total_cost_value'] += $costVal;
            $categoryBreakdown[$catId]['total_retail_value'] += $retailVal;
        }

        // إحصائيات المستودعات إذا لم يكن الفلتر محددًا لمستودع معين
        if (!$warehouseId) {
            $whRows = StockBalance::query()
                ->join('warehouses', 'stock_balances.warehouse_id', '=', 'warehouses.id')
                ->select([
                    'warehouses.id as warehouse_id',
                    'warehouses.name as warehouse_name',
                    DB::raw('COUNT(DISTINCT stock_balances.item_id) as items_count'),
                    DB::raw('SUM(stock_balances.quantity) as total_quantity'),
                    DB::raw('SUM(stock_balances.quantity * stock_balances.unit_cost) as total_cost_value'),
                ])
                ->where('stock_balances.quantity', '>', 0)
                ->groupBy('warehouses.id', 'warehouses.name')
                ->get();

            foreach ($whRows as $wh) {
                $warehouseBreakdown[] = [
                    'warehouse_id' => $wh->warehouse_id,
                    'warehouse_name' => $wh->warehouse_name,
                    'items_count' => (int) $wh->items_count,
                    'total_quantity' => round((float) $wh->total_quantity, 4),
                    'total_cost_value' => round((float) $wh->total_cost_value, 4),
                ];
            }
        }

        $grandMargin = round($grandTotalRetail - $grandTotalCost, 4);
        $overallMarginPercent = $grandTotalRetail > 0 ? round(($grandMargin / $grandTotalRetail) * 100, 2) : 0.0;

        return [
            'filters' => [
                'warehouse_id' => $warehouseId,
                'category_id' => $categoryId,
                'price_tier' => $priceTier->value,
                'search' => $search,
            ],
            'summary' => [
                'total_skus' => count($rows),
                'total_quantity' => round($grandTotalQty, 4),
                'total_cost_value' => round($grandTotalCost, 4),
                'total_retail_value' => round($grandTotalRetail, 4),
                'total_expected_margin' => $grandMargin,
                'overall_margin_percent' => $overallMarginPercent,
            ],
            'items' => $rows,
            'category_breakdown' => array_values($categoryBreakdown),
            'warehouse_breakdown' => $warehouseBreakdown,
        ];
    }
}
