<?php

declare(strict_types=1);

namespace App\Domains\Products\Repositories\Eloquent;

use App\Domains\Products\Models\UnitOfMeasure;
use App\Domains\Products\Repositories\Contracts\UnitOfMeasureRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class UnitOfMeasureRepository implements UnitOfMeasureRepositoryInterface
{
    public function all(array $filters = []): Collection
    {
        $query = UnitOfMeasure::query();

        if (isset($filters['is_active'])) {
            $query->where('is_active', (bool) $filters['is_active']);
        }

        return $query->orderBy('name_ar')->get();
    }

    public function findById(int $id): ?UnitOfMeasure
    {
        return UnitOfMeasure::find($id);
    }

    public function findByCode(string $code): ?UnitOfMeasure
    {
        return UnitOfMeasure::where('code', $code)->first();
    }

    public function create(array $data): UnitOfMeasure
    {
        return UnitOfMeasure::create($data);
    }

    public function update(UnitOfMeasure $uom, array $data): UnitOfMeasure
    {
        $uom->update($data);
        return $uom->fresh();
    }

    public function delete(UnitOfMeasure $uom): bool
    {
        return (bool) $uom->delete();
    }
}
