<?php

declare(strict_types=1);

namespace App\Domains\Core\Repositories\Eloquent;

use App\Domains\Core\Models\TaxCategory;
use App\Domains\Core\Models\TaxRate;
use App\Domains\Core\Repositories\Contracts\TaxCategoryRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class TaxCategoryRepository implements TaxCategoryRepositoryInterface
{
    public function all(array $filters = []): Collection
    {
        $query = TaxCategory::query()->with(['currentRate', 'rates' => function ($q) {
            $q->orderByDesc('valid_from');
        }]);

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', $search)
                  ->orWhere('code', 'like', $search);
            });
        }

        return $query->orderBy('id')->get();
    }

    public function findById(int $id): ?TaxCategory
    {
        return TaxCategory::with(['currentRate', 'rates' => function ($q) {
            $q->orderByDesc('valid_from');
        }])->find($id);
    }

    public function findByCode(string $code): ?TaxCategory
    {
        return TaxCategory::with(['currentRate', 'rates' => function ($q) {
            $q->orderByDesc('valid_from');
        }])->where('code', $code)->first();
    }

    public function getActiveRateForDate(int $categoryId, ?string $date = null): ?TaxRate
    {
        $effectiveDate = $date ?? now()->toDateString();

        return TaxRate::query()
            ->where('tax_category_id', $categoryId)
            ->where('is_active', true)
            ->where('valid_from', '<=', $effectiveDate)
            ->orderByDesc('valid_from')
            ->first();
    }

    public function addRate(int $categoryId, array $data): TaxRate
    {
        return TaxRate::create([
            'tax_category_id' => $categoryId,
            'rate' => $data['rate'],
            'valid_from' => $data['valid_from'] ?? now()->toDateString(),
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    public function update(int $id, array $data): TaxCategory
    {
        $category = TaxCategory::findOrFail($id);
        $category->update($data);
        return $category->fresh(['currentRate', 'rates']);
    }

    public function getRatesHistory(int $categoryId): Collection
    {
        return TaxRate::query()
            ->where('tax_category_id', $categoryId)
            ->orderByDesc('valid_from')
            ->get();
    }
}
