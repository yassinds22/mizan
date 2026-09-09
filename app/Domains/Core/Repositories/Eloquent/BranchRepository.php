<?php

declare(strict_types=1);

namespace App\Domains\Core\Repositories\Eloquent;

use App\Domains\Core\Models\Branch;
use App\Domains\Core\Repositories\Contracts\BranchRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class BranchRepository implements BranchRepositoryInterface
{
    public function all(array $filters = []): Collection
    {
        return $this->applyFilters(Branch::query(), $filters)
            ->orderBy('code')
            ->get();
    }

    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        return $this->applyFilters(Branch::query(), $filters)
            ->orderBy('code')
            ->paginate($perPage);
    }

    public function findById(int $id): ?Branch
    {
        return Branch::find($id);
    }

    public function findByCode(string $code): ?Branch
    {
        return Branch::where('code', $code)->first();
    }

    public function create(array $data): Branch
    {
        return Branch::create($data);
    }

    public function update(Branch|int $branch, array $data): Branch
    {
        $model = $branch instanceof Branch ? $branch : Branch::findOrFail($branch);
        $model->update($data);

        return $model->fresh();
    }

    public function delete(Branch|int $branch): bool
    {
        $model = $branch instanceof Branch ? $branch : Branch::findOrFail($branch);

        return (bool) $model->delete();
    }

    public function toggleActive(Branch|int $branch): Branch
    {
        $model = $branch instanceof Branch ? $branch : Branch::findOrFail($branch);
        $model->is_active = !$model->is_active;
        $model->save();

        return $model;
    }

    /**
     * @param Builder<Branch> $query
     * @param array<string, mixed> $filters
     * @return Builder<Branch>
     */
    private function applyFilters(Builder $query, array $filters): Builder
    {
        if (!empty($filters['search'])) {
            $search = (string) $filters['search'];
            $query->where(function (Builder $q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', (bool) $filters['is_active']);
        }

        if (!empty($filters['city'])) {
            $query->where('city', $filters['city']);
        }

        return $query;
    }
}
