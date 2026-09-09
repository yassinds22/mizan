<?php

declare(strict_types=1);

namespace App\Domains\Sales\Repositories\Contracts;

use App\Domains\Sales\Models\Customer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface CustomerRepositoryInterface
{
    /**
     * @param array<string, mixed> $filters
     */
    public function paginate(array $filters = [], int $perPage = 25): LengthAwarePaginator;

    /**
     * @return Collection<int, Customer>
     */
    public function getAllActive(): Collection;

    public function findById(int $id): ?Customer;

    public function findByCode(string $code): ?Customer;

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): Customer;

    /**
     * @param array<string, mixed> $data
     */
    public function update(Customer $customer, array $data): Customer;

    public function delete(Customer $customer): bool;
}
