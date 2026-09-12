<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Domains\Inventory\Services\StockBalanceService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockBalanceController extends Controller
{
    public function __construct(
        private readonly StockBalanceService $stockBalanceService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'item_id',
            'warehouse_id',
            'location_id',
            'batch_id',
            'in_stock_only',
        ]);

        $balances = $this->stockBalanceService->listBalances($filters);

        return response()->json([
            'success' => true,
            'data' => $balances->map(fn ($b) => array_merge($b->toArray(), [
                'available_quantity' => $b->available_quantity,
                'total_value' => round($b->total_value, 2),
            ])),
        ]);
    }

    public function summary(int $itemId): JsonResponse
    {
        $summary = $this->stockBalanceService->getItemSummary($itemId);

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    public function allocateFefo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_id' => 'required|integer|exists:items,id',
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'quantity' => 'required|numeric|min:0.0001',
        ]);

        $result = $this->stockBalanceService->allocateFefo(
            (int) $validated['item_id'],
            isset($validated['warehouse_id']) ? (int) $validated['warehouse_id'] : null,
            (float) $validated['quantity']
        );

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}
