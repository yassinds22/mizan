<?php

declare(strict_types=1);

namespace App\Domains\Products\Repositories\Eloquent;

use App\Domains\Products\Models\ItemCategory;
use App\Domains\Products\Repositories\Contracts\ItemCategoryRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class ItemCategoryRepository implements ItemCategoryRepositoryInterface
{
    public function all(array $filters = []): Collection
    {
        $query = ItemCategory::query()
            ->with(['parent', 'inventoryAccount', 'cogsAccount', 'revenueAccount']);

        if (isset($filters['is_active'])) {
            $query->where('is_active', (bool) $filters['is_active']);
        }

        if (!empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('code')->get();
    }

    public function getTree(): Collection
    {
        return ItemCategory::roots()
            ->with([
                'children.children',
                'inventoryAccount',
                'cogsAccount',
                'revenueAccount',
            ])
            ->where('is_active', true)
            ->orderBy('code')
            ->get();
    }

    public function findById(int $id): ?ItemCategory
    {
        return ItemCategory::with(['parent', 'inventoryAccount', 'cogsAccount', 'revenueAccount'])->find($id);
    }

    public function findByCode(string $code): ?ItemCategory
    {
        return ItemCategory::with(['parent', 'inventoryAccount', 'cogsAccount', 'revenueAccount'])
            ->where('code', $code)
            ->first();
    }

    public function create(array $data): ItemCategory
    {
        return ItemCategory::create($data);
    }

    public function update(ItemCategory $category, array $data): ItemCategory
    {
        $category->update($data);
        return $category->fresh(['parent', 'inventoryAccount', 'cogsAccount', 'revenueAccount']);
    }

    public function delete(ItemCategory $category): bool
    {
        return (bool) $category->delete();
    }
}
