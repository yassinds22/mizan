<?php

declare(strict_types=1);

namespace App\Domains\Products\Repositories\Contracts;

use App\Domains\Products\Models\ItemCategory;
use Illuminate\Database\Eloquent\Collection;

interface ItemCategoryRepositoryInterface
{
    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, ItemCategory>
     */
    public function all(array $filters = []): Collection;

    /**
     * جلب تصنيفات الأصناف الشجرية
     *
     * @return Collection<int, ItemCategory>
     */
    public function getTree(): Collection;

    public function findById(int $id): ?ItemCategory;

    public function findByCode(string $code): ?ItemCategory;

    public function create(array $data): ItemCategory;

    public function update(ItemCategory $category, array $data): ItemCategory;

    public function delete(ItemCategory $category): bool;
}
