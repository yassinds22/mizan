<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Sales;

use App\Domains\Sales\Models\SalesReturn;
use App\Domains\Sales\Services\SalesReturnService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Sales\StoreSalesReturnRequest;
use App\Http\Resources\Api\V1\Sales\SalesReturnResource;
use Illuminate\Http\JsonResponse;

class SalesReturnController extends Controller
{
    public function __construct(
        private readonly SalesReturnService $salesReturnService,
    ) {}

    public function returnableLines(int $invoiceId): JsonResponse
    {
        $data = $this->salesReturnService->getReturnableLines($invoiceId);
        return response()->json([
            'data' => $data,
        ]);
    }

    public function store(StoreSalesReturnRequest $request): JsonResponse
    {
        $salesReturn = $this->salesReturnService->createAndPostReturn($request->validated());

        return (new SalesReturnResource($salesReturn))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): SalesReturnResource
    {
        $salesReturn = SalesReturn::with(['lines.item', 'lines.itemUnit', 'customer', 'branch', 'journalEntry', 'invoice'])
            ->findOrFail($id);

        return new SalesReturnResource($salesReturn);
    }
}
