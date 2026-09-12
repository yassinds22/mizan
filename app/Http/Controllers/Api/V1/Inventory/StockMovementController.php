<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Domains\Core\Models\Branch;
use App\Domains\Inventory\Enums\MovementType;
use App\Domains\Inventory\Services\StockMovementService;
use App\Domains\Warehouses\Models\Warehouse;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockMovementController extends Controller
{
    public function __construct(
        private readonly StockMovementService $stockMovementService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->has('type') && !$request->has('movement_type')) {
            $request->merge(['movement_type' => $request->input('type')]);
        }

        $filters = $request->only([
            'movement_type',
            'status',
            'warehouse_id',
            'search',
        ]);

        $perPage = (int) $request->input('per_page', 25);
        $movements = $this->stockMovementService->listMovements($filters, $perPage);

        return response()->json([
            'success' => true,
            'data' => $movements->items(),
            'meta' => [
                'current_page' => $movements->currentPage(),
                'last_page' => $movements->lastPage(),
                'per_page' => $movements->perPage(),
                'total' => $movements->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $movement = $this->stockMovementService->getMovement($id);

        return response()->json([
            'success' => true,
            'data' => $movement,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // Support either 'type' or 'movement_type' seamlessly
        if ($request->has('type') && !$request->has('movement_type')) {
            $request->merge(['movement_type' => $request->input('type')]);
        }

        // Auto-assign branch_id from warehouse if not specified
        if (!$request->filled('branch_id')) {
            $branchId = null;
            if ($request->filled('from_warehouse_id')) {
                $wh = Warehouse::find($request->input('from_warehouse_id'));
                $branchId = $wh?->branch_id;
            }
            if (!$branchId && $request->filled('to_warehouse_id')) {
                $wh = Warehouse::find($request->input('to_warehouse_id'));
                $branchId = $wh?->branch_id;
            }
            if (!$branchId) {
                $branchId = Branch::first()?->id ?? 1;
            }
            $request->merge(['branch_id' => $branchId]);
        }

        $validated = $request->validate([
            'movement_type' => ['required', Rule::enum(MovementType::class)],
            'movement_date' => ['nullable', 'date'],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'from_warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'to_warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'reason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_id' => ['required', 'integer', 'exists:items,id'],
            'lines.*.from_location_id' => ['nullable', 'integer', 'exists:warehouse_locations,id'],
            'lines.*.to_location_id' => ['nullable', 'integer', 'exists:warehouse_locations,id'],
            'lines.*.batch_id' => ['nullable', 'integer', 'exists:item_batches,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
            'lines.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $header = [
            'movement_type' => $validated['movement_type'],
            'movement_date' => $validated['movement_date'] ?? null,
            'branch_id' => (int) $validated['branch_id'],
            'from_warehouse_id' => !empty($validated['from_warehouse_id']) ? (int) $validated['from_warehouse_id'] : null,
            'to_warehouse_id' => !empty($validated['to_warehouse_id']) ? (int) $validated['to_warehouse_id'] : null,
            'reason' => $validated['reason'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ];

        $movement = $this->stockMovementService->createMovement($header, $validated['lines']);

        // إذا طُلب الترحيل المباشر
        if ($request->boolean('auto_post')) {
            $movement = $this->stockMovementService->postMovement($movement->id);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم حفظ حركة المخزون بنجاح',
            'data' => $movement,
        ], 201);
    }

    public function post(int $id): JsonResponse
    {
        $movement = $this->stockMovementService->postMovement($id);

        return response()->json([
            'success' => true,
            'message' => 'تم ترحيل حركة المخزون وتحديث الأرصدة ودفتر الأستاذ بنجاح',
            'data' => $movement,
        ]);
    }

    public function cancel(int $id): JsonResponse
    {
        $movement = $this->stockMovementService->cancelMovement($id);

        return response()->json([
            'success' => true,
            'message' => 'تم إلغاء حركة المخزون وعكس أثرها بنجاح',
            'data' => $movement,
        ]);
    }
}
