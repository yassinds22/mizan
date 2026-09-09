<?php

declare(strict_types=1);

namespace App\Domains\Sales\Services;

use App\Domains\Sales\Models\Customer;
use App\Domains\Sales\Repositories\Contracts\CustomerRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class CustomerService
{
    public function __construct(
        private readonly CustomerRepositoryInterface $customerRepository,
    ) {}

    public function listCustomers(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        return $this->customerRepository->paginate($filters, $perPage);
    }

    public function getAllActive(): Collection
    {
        return $this->customerRepository->getAllActive();
    }

    public function getCustomer(int $id): Customer
    {
        $customer = $this->customerRepository->findById($id);
        if (!$customer) {
            throw ValidationException::withMessages([
                'customer_id' => ["العميل غير موجود (معرف: {$id})"],
            ]);
        }
        return $customer;
    }

    public function createCustomer(array $data): Customer
    {
        if (empty($data['code'])) {
            $count = Customer::count();
            $data['code'] = 'C-' . str_pad((string) ($count + 1), 3, '0', STR_PAD_LEFT);
        }

        return $this->customerRepository->create($data);
    }

    public function updateCustomer(int $id, array $data): Customer
    {
        $customer = $this->getCustomer($id);
        return $this->customerRepository->update($customer, $data);
    }

    public function adjustBalance(int $id, float $amount): Customer
    {
        $customer = $this->getCustomer($id);
        $newBalance = bcadd((string) $customer->balance, (string) $amount, 4);
        return $this->customerRepository->update($customer, ['balance' => $newBalance]);
    }
}
