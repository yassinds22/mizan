<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Domains\Inventory\Models\PhysicalStocktake;
use App\Domains\Inventory\Services\PhysicalStocktakeService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PhysicalStocktakeController extends Controller
{
    public function __construct(
        private readonly PhysicalStocktakeService $stocktakeService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = PhysicalStocktake::with(['warehouse', 'branch', 'location', 'category'])
            ->latest('stocktake_date')
            ->latest('id');

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->integer('warehouse_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(function ($q) use ($s) {
                $q->where('stocktake_number', 'like', "%{$s}%")
                    ->orWhere('supervisor_name', 'like', "%{$s}%")
                    ->orWhere('notes', 'like', "%{$s}%");
            });
        }

        $perPage = (int) $request->input('per_page', 25);
        $stocktakes = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $stocktakes->items(),
            'meta' => [
                'current_page' => $stocktakes->currentPage(),
                'last_page' => $stocktakes->lastPage(),
                'per_page' => $stocktakes->perPage(),
                'total' => $stocktakes->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'location_id' => ['nullable', 'integer', 'exists:warehouse_locations,id'],
            'category_id' => ['nullable', 'integer', 'exists:item_categories,id'],
            'stocktake_date' => ['nullable', 'date'],
            'scope' => ['nullable', 'string', 'in:full,partial'],
            'is_blind' => ['nullable', 'boolean'],
            'freeze_movements' => ['nullable', 'boolean'],
            'supervisor_name' => ['nullable', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $stocktake = $this->stocktakeService->createStocktake($validated);

        return response()->json([
            'success' => true,
            'message' => 'تم بدء جلسة الجرد المخزني وأخذ اللقطة الدفترية بنجاح',
            'data' => $stocktake,
        ], 201);
    }

    public function show(PhysicalStocktake $physicalStocktake): JsonResponse
    {
        $physicalStocktake->load([
            'lines.item.baseUom',
            'lines.batch',
            'lines.location',
            'warehouse',
            'branch',
            'location',
            'category',
            'stockMovement',
            'journalEntry.lines.account',
        ]);

        return response()->json([
            'success' => true,
            'data' => $physicalStocktake,
        ]);
    }

    public function updateCounts(Request $request, PhysicalStocktake $physicalStocktake): JsonResponse
    {
        $validated = $request->validate([
            'counts' => ['required', 'array', 'min:1'],
            'counts.*.line_id' => ['required', 'integer'],
            'counts.*.counted_quantity' => ['required', 'numeric', 'min:0'],
            'counts.*.variance_reason' => ['nullable', 'string', 'max:255'],
            'counts.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $updated = $this->stocktakeService->updateCounts($physicalStocktake, $validated['counts']);

        return response()->json([
            'success' => true,
            'message' => 'تم حفظ تحديثات العد الفعلي بنجاح',
            'data' => $updated,
        ]);
    }

    public function post(PhysicalStocktake $physicalStocktake): JsonResponse
    {
        $posted = $this->stocktakeService->postStocktake($physicalStocktake);

        return response()->json([
            'success' => true,
            'message' => "تم اعتماد وترحيل محضر الجرد {$posted->stocktake_number} وتسوية الفروقات محاسبياً ومخزنياً بنجاح",
            'data' => $posted,
        ]);
    }

    public function cancel(PhysicalStocktake $physicalStocktake): JsonResponse
    {
        $cancelled = $this->stocktakeService->cancelStocktake($physicalStocktake);

        return response()->json([
            'success' => true,
            'message' => "تم إلغاء محضر الجرد {$cancelled->stocktake_number} بنجاح",
            'data' => $cancelled,
        ]);
    }
}
