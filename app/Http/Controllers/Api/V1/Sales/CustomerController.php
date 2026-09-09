<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Sales;

use App\Domains\Sales\Services\CustomerService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Sales\StoreCustomerRequest;
use App\Http\Resources\Api\V1\Sales\CustomerResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CustomerController extends Controller
{
    public function __construct(
        private readonly CustomerService $customerService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) $request->get('per_page', 25);
        $customers = $this->customerService->listCustomers($request->all(), $perPage);

        return CustomerResource::collection($customers);
    }

    public function allActive(): AnonymousResourceCollection
    {
        $customers = $this->customerService->getAllActive();
        return CustomerResource::collection($customers);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $customer = $this->customerService->createCustomer($request->validated());

        return (new CustomerResource($customer))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): CustomerResource
    {
        $customer = $this->customerService->getCustomer($id);
        return new CustomerResource($customer);
    }

    public function update(StoreCustomerRequest $request, int $id): CustomerResource
    {
        $customer = $this->customerService->updateCustomer($id, $request->validated());
        return new CustomerResource($customer);
    }
}
