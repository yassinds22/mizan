<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Domains\Inventory\Services\StockLedgerService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockLedgerController extends Controller
{
    public function __construct(
        private readonly StockLedgerService $stockLedgerService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'item_id',
            'warehouse_id',
            'batch_id',
            'voucher_type',
            'date_from',
            'date_to',
        ]);

        $perPage = (int) $request->input('per_page', 50);
        $entries = $this->stockLedgerService->listLedger($filters, $perPage);

        return response()->json([
            'success' => true,
            'data' => $entries->items(),
            'meta' => [
                'current_page' => $entries->currentPage(),
                'last_page' => $entries->lastPage(),
                'per_page' => $entries->perPage(),
                'total' => $entries->total(),
            ],
        ]);
    }
}
