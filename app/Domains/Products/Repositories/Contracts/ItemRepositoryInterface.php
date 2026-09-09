<?php

declare(strict_types=1);

namespace App\Domains\Products\Repositories\Contracts;

use App\Domains\Products\Models\Item;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface ItemRepositoryInterface
{
    /**
     * @param array<string, mixed> $filters
     */
    public function paginate(array $filters = [], int $perPage = 25): LengthAwarePaginator;

    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, Item>
     */
    public function all(array $filters = []): Collection;

    public function findById(int $id, array $with = ['category', 'taxCategory', 'baseUom', 'itemUnits.uom', 'prices']): ?Item;

    public function findBySku(string $sku): ?Item;

    public function findByBarcode(string $barcode): ?Item;

    public function create(array $data): Item;

    public function update(Item $item, array $data): Item;

    public function delete(Item $item): bool;
}
