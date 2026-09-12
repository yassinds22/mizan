<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Purchases;

use App\Domains\Purchases\Services\PurchaseInvoiceService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Purchases\StorePurchaseInvoiceRequest;
use App\Http\Resources\Api\V1\Purchases\PurchaseInvoiceResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PurchaseInvoiceController extends Controller
{
    public function __construct(
        private readonly PurchaseInvoiceService $purchaseInvoiceService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $invoices = $this->purchaseInvoiceService->getInvoices($request->all());
        return PurchaseInvoiceResource::collection($invoices);
    }

    public function store(StorePurchaseInvoiceRequest $request): JsonResponse
    {
        $invoice = $this->purchaseInvoiceService->createInvoice($request->validated());

        return (new PurchaseInvoiceResource($invoice))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): PurchaseInvoiceResource
    {
        $invoice = $this->purchaseInvoiceService->getInvoice($id);
        return new PurchaseInvoiceResource($invoice);
    }

    public function post(int $id): PurchaseInvoiceResource
    {
        $invoice = $this->purchaseInvoiceService->postInvoice($id);
        return new PurchaseInvoiceResource($invoice);
    }

    public function cancel(Request $request, int $id): PurchaseInvoiceResource
    {
        $reason = $request->input('reason');
        $invoice = $this->purchaseInvoiceService->cancelInvoice($id, $reason ? (string) $reason : null);
        return new PurchaseInvoiceResource($invoice);
    }
}
