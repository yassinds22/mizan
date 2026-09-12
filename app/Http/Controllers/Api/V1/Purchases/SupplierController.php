<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Purchases;

use App\Domains\Purchases\Models\Supplier;
use App\Domains\Purchases\Services\SupplierService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Purchases\StoreSupplierRequest;
use App\Http\Requests\Api\V1\Purchases\UpdateSupplierRequest;
use App\Http\Resources\Api\V1\Purchases\SupplierResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SupplierController extends Controller
{
    public function __construct(
        private readonly SupplierService $supplierService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $suppliers = $this->supplierService->getSuppliers($request->all());
        return SupplierResource::collection($suppliers);
    }

    public function allActive(): AnonymousResourceCollection
    {
        $suppliers = $this->supplierService->getAllActive();
        return SupplierResource::collection($suppliers);
    }

    public function store(StoreSupplierRequest $request): JsonResponse
    {
        $supplier = $this->supplierService->createSupplier($request->validated());

        return (new SupplierResource($supplier))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): SupplierResource
    {
        $supplier = Supplier::findOrFail($id);
        return new SupplierResource($supplier);
    }

    public function update(UpdateSupplierRequest $request, int $id): SupplierResource
    {
        $supplier = Supplier::findOrFail($id);
        $updated = $this->supplierService->updateSupplier($supplier, $request->validated());

        return new SupplierResource($updated);
    }
}
