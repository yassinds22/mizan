<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Domains\Inventory\Services\Reports\InventoryAnalyticsService;
use App\Domains\Inventory\Services\Reports\InventoryReconciliationService;
use App\Domains\Inventory\Services\Reports\InventoryValuationService;
use App\Domains\Inventory\Services\Reports\ItemLedgerReportService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryReportController extends Controller
{
    public function __construct(
        private readonly ItemLedgerReportService $itemLedgerReportService,
        private readonly InventoryValuationService $inventoryValuationService,
        private readonly InventoryReconciliationService $inventoryReconciliationService,
        private readonly InventoryAnalyticsService $inventoryAnalyticsService,
    ) {}

    /**
     * كارت أستاذ المخزون للصنف (Item Ledger Card)
     */
    public function itemCard(Request $request, int $itemId): JsonResponse
    {
        $filters = $request->only(['date_from', 'date_to', 'warehouse_id', 'batch_id']);
        $result = $this->itemLedgerReportService->getItemCard($itemId, $filters);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * تقرير تقييم المخزون المالي (Inventory Valuation)
     */
    public function valuation(Request $request): JsonResponse
    {
        $filters = $request->only(['warehouse_id', 'category_id', 'search', 'price_tier']);
        $result = $this->inventoryValuationService->getValuation($filters);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * تقرير المطابقة المحاسبية مع الأستاذ العام (GL Reconciliation)
     */
    public function reconciliation(): JsonResponse
    {
        $result = $this->inventoryReconciliationService->getReconciliation();

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * تحليلات حركة المخزون: تنبيهات إعادة الطلب والأصناف الراكدة
     */
    public function analytics(Request $request): JsonResponse
    {
        $filters = $request->only(['warehouse_id', 'days_threshold']);
        $result = $this->inventoryAnalyticsService->getAnalytics($filters);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}
