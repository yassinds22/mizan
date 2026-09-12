<?php

declare(strict_types=1);

namespace App\Domains\Purchases\Services;

use App\Domains\Purchases\Models\Supplier;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SupplierService
{
    /**
     * @param array<string, mixed> $filters
     * @return LengthAwarePaginator<Supplier>
     */
    public function getSuppliers(array $filters = []): LengthAwarePaginator
    {
        $query = Supplier::query();

        if (!empty($filters['search'])) {
            $term = '%' . trim((string) $filters['search']) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name_ar', 'like', $term)
                    ->orWhere('name_en', 'like', $term)
                    ->orWhere('code', 'like', $term)
                    ->orWhere('tax_number', 'like', $term)
                    ->orWhere('phone', 'like', $term);
            });
        }

        if (isset($filters['is_active']) && $filters['is_active'] !== '' && $filters['is_active'] !== 'all') {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        $perPage = !empty($filters['per_page']) ? (int) $filters['per_page'] : 25;

        return $query->orderBy('id', 'desc')->paginate($perPage);
    }

    /**
     * @return Collection<int, Supplier>
     */
    public function getAllActive(): Collection
    {
        return Supplier::where('is_active', true)->orderBy('name_ar')->get();
    }

    /**
     * @param array<string, mixed> $data
     */
    public function createSupplier(array $data): Supplier
    {
        if (empty($data['code'])) {
            $lastId = Supplier::max('id') ?? 0;
            $data['code'] = sprintf('SUP-%04d', $lastId + 1);
        }

        return Supplier::create($data);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function updateSupplier(Supplier $supplier, array $data): Supplier
    {
        $supplier->update($data);
        return $supplier->fresh();
    }

    /**
     * تعديل رصيد المورد تزامناً مع القيد المحاسبي
     */
    public function adjustBalance(int $supplierId, float $delta): Supplier
    {
        return DB::transaction(function () use ($supplierId, $delta) {
            $supplier = Supplier::lockForUpdate()->findOrFail($supplierId);
            $newBalance = (float) bcadd((string) $supplier->balance, (string) $delta, 4);
            $supplier->update(['balance' => $newBalance]);

            return $supplier;
        });
    }
}
