<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Sales;

use App\Domains\Sales\Services\SalesInvoiceService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Sales\StoreSalesInvoiceRequest;
use App\Http\Resources\Api\V1\Sales\SalesInvoiceResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SalesInvoiceController extends Controller
{
    public function __construct(
        private readonly SalesInvoiceService $invoiceService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) $request->get('per_page', 25);
        $invoices = $this->invoiceService->listInvoices($request->all(), $perPage);

        return SalesInvoiceResource::collection($invoices);
    }

    public function store(StoreSalesInvoiceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $lines = $data['lines'] ?? [];
        $postImmediately = !empty($data['post_immediately']);
        unset($data['lines'], $data['post_immediately']);

        $invoice = $this->invoiceService->createInvoice($data, $lines, $postImmediately);

        return (new SalesInvoiceResource($invoice))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): SalesInvoiceResource
    {
        $invoice = $this->invoiceService->getInvoice($id);
        return new SalesInvoiceResource($invoice);
    }

    public function post(int $id): SalesInvoiceResource
    {
        $invoice = $this->invoiceService->postInvoice($id);
        return new SalesInvoiceResource($invoice);
    }

    public function cancel(Request $request, int $id): SalesInvoiceResource
    {
        $reason = (string) $request->get('reason', 'إلغاء فاتورة من الواجهة');
        $invoice = $this->invoiceService->cancelInvoice($id, $reason);
        return new SalesInvoiceResource($invoice);
    }
}
