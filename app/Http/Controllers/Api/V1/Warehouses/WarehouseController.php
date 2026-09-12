<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Warehouses;

use App\Domains\Warehouses\Enums\WarehouseType;
use App\Domains\Warehouses\Services\WarehouseService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WarehouseController extends Controller
{
    public function __construct(
        private readonly WarehouseService $warehouseService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $branchId = $request->has('branch_id') ? (int) $request->input('branch_id') : null;
        $isActive = $request->has('is_active') ? filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN) : null;
        $search = $request->input('search');

        $warehouses = $this->warehouseService->listWarehouses($branchId, $isActive, $search);

        return response()->json([
            'success' => true,
            'data' => $warehouses,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $warehouse = $this->warehouseService->findWarehouse($id);

        return response()->json([
            'success' => true,
            'data' => $warehouse,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'code' => ['nullable', 'string', 'max:50', 'unique:warehouses,code'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::enum(WarehouseType::class)],
            'temp_range' => ['nullable', 'string', 'max:100'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $warehouse = $this->warehouseService->createWarehouse($validated);

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء المستودع بنجاح',
            'data' => $warehouse,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => ['sometimes', 'integer', 'exists:branches,id'],
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('warehouses', 'code')->ignore($id)],
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', Rule::enum(WarehouseType::class)],
            'temp_range' => ['nullable', 'string', 'max:100'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $warehouse = $this->warehouseService->updateWarehouse($id, $validated);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث بيانات المستودع بنجاح',
            'data' => $warehouse,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->warehouseService->deleteWarehouse($id);

        return response()->json([
            'success' => true,
            'message' => 'تم حذف المستودع بنجاح',
        ]);
    }
}
