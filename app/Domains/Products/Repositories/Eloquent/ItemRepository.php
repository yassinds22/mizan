<?php

declare(strict_types=1);

namespace App\Domains\Products\Repositories\Eloquent;

use App\Domains\Products\Models\Item;
use App\Domains\Products\Repositories\Contracts\ItemRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class ItemRepository implements ItemRepositoryInterface
{
    public function paginate(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        return $this->applyFilters($filters)
            ->with(['category', 'taxCategory', 'baseUom', 'itemUnits.uom', 'itemUnits.prices'])
            ->latest('id')
            ->paginate($perPage);
    }

    public function all(array $filters = []): Collection
    {
        return $this->applyFilters($filters)
            ->with(['category', 'taxCategory', 'baseUom', 'itemUnits.uom', 'itemUnits.prices'])
            ->latest('id')
            ->get();
    }

    public function findById(int $id, array $with = ['category', 'taxCategory', 'baseUom', 'itemUnits.uom', 'itemUnits.prices']): ?Item
    {
        return Item::with($with)->find($id);
    }

    public function findBySku(string $sku): ?Item
    {
        return Item::with(['category', 'taxCategory', 'baseUom', 'itemUnits.uom', 'itemUnits.prices'])
            ->where('sku', trim($sku))
            ->first();
    }

    public function findByBarcode(string $barcode): ?Item
    {
        $clean = trim($barcode);

        // أولاً: البحث في باركود الصنف الرئيسي
        $item = Item::with(['category', 'taxCategory', 'baseUom', 'itemUnits.uom', 'itemUnits.prices'])
            ->where('barcode', $clean)
            ->first();

        if ($item) {
            return $item;
        }

        // ثانياً: البحث في باركودات الوحدات الفرعية (مثل كرتون أو شدة)
        return Item::with(['category', 'taxCategory', 'baseUom', 'itemUnits.uom', 'itemUnits.prices'])
            ->whereHas('itemUnits', function (Builder $q) use ($clean) {
                $q->where('barcode', $clean);
            })
            ->first();
    }

    public function create(array $data): Item
    {
        return Item::create($data);
    }

    public function update(Item $item, array $data): Item
    {
        $item->update($data);
        return $item->fresh(['category', 'taxCategory', 'baseUom', 'itemUnits.uom', 'itemUnits.prices']);
    }

    public function delete(Item $item): bool
    {
        return (bool) $item->delete();
    }

    private function applyFilters(array $filters): Builder
    {
        $query = Item::query();

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (!empty($filters['storage_condition'])) {
            $query->where('storage_condition', $filters['storage_condition']);
        }

        if (isset($filters['is_perishable'])) {
            $query->where('is_perishable', (bool) $filters['is_perishable']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', (bool) $filters['is_active']);
        }

        if (!empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $query->where(function (Builder $q) use ($search) {
                $q->where('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                    ->orWhere('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhereHas('itemUnits', function (Builder $uq) use ($search) {
                        $uq->where('barcode', 'like', "%{$search}%");
                    });
            });
        }

        return $query;
    }
}
