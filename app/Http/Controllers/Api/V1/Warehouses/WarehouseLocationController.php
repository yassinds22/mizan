<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Warehouses;

use App\Domains\Warehouses\Services\WarehouseService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WarehouseLocationController extends Controller
{
    public function __construct(
        private readonly WarehouseService $warehouseService,
    ) {}

    public function index(int $warehouseId, Request $request): JsonResponse
    {
        $isActive = $request->has('is_active') ? filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN) : null;

        $locations = $this->warehouseService->listLocations($warehouseId, $isActive);

        return response()->json([
            'success' => true,
            'data' => $locations,
        ]);
    }

    public function store(int $warehouseId, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('warehouse_locations', 'code')->where('warehouse_id', $warehouseId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', Rule::in(['rack', 'floor', 'shelf', 'dock', 'bin'])],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $location = $this->warehouseService->createLocation($warehouseId, $validated);

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء الموقع التخزيني بنجاح',
            'data' => $location,
        ], 201);
    }

    public function update(int $warehouseId, int $locationId, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('warehouse_locations', 'code')
                    ->where('warehouse_id', $warehouseId)
                    ->ignore($locationId),
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'string', Rule::in(['rack', 'floor', 'shelf', 'dock', 'bin'])],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $location = $this->warehouseService->updateLocation($locationId, $validated);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث بيانات الموقع بنجاح',
            'data' => $location,
        ]);
    }

    public function destroy(int $warehouseId, int $locationId): JsonResponse
    {
        $this->warehouseService->deleteLocation($locationId);

        return response()->json([
            'success' => true,
            'message' => 'تم حذف الموقع التخزيني بنجاح',
        ]);
    }
}
