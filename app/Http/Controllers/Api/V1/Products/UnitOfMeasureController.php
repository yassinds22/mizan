<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Products;

use App\Domains\Products\Services\UnitOfMeasureService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Products\StoreUnitOfMeasureRequest;
use App\Http\Resources\Api\V1\Products\UnitOfMeasureResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UnitOfMeasureController extends Controller
{
    public function __construct(
        protected UnitOfMeasureService $uomService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $units = $this->uomService->listUnits($request->all());

        return UnitOfMeasureResource::collection($units);
    }

    public function store(StoreUnitOfMeasureRequest $request): JsonResponse
    {
        $unit = $this->uomService->createUnit($request->validated());

        return (new UnitOfMeasureResource($unit))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): UnitOfMeasureResource
    {
        $unit = $this->uomService->getUnit($id);

        return new UnitOfMeasureResource($unit);
    }

    public function update(Request $request, int $id): UnitOfMeasureResource
    {
        $data = $request->validate([
            'code' => ['sometimes', 'string', 'max:20'],
            'name_ar' => ['sometimes', 'string', 'max:100'],
            'name_en' => ['nullable', 'string', 'max:100'],
            'symbol' => ['nullable', 'string', 'max:20'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $unit = $this->uomService->updateUnit($id, $data);

        return new UnitOfMeasureResource($unit);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->uomService->deleteUnit($id);

        return response()->json([
            'message' => 'تم حذف وحدة القياس بنجاح.',
        ]);
    }
}
