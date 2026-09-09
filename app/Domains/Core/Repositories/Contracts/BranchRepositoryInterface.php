<?php

declare(strict_types=1);

namespace App\Domains\Core\Repositories\Contracts;

use App\Domains\Core\Models\Branch;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface BranchRepositoryInterface
{
    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, Branch>
     */
    public function all(array $filters = []): Collection;

    /**
     * @param int $perPage
     * @param array<string, mixed> $filters
     * @return LengthAwarePaginator<Branch>
     */
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator;

    public function findById(int $id): ?Branch;

    public function findByCode(string $code): ?Branch;

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): Branch;

    /**
     * @param Branch|int $branch
     * @param array<string, mixed> $data
     */
    public function update(Branch|int $branch, array $data): Branch;

    public function delete(Branch|int $branch): bool;

    public function toggleActive(Branch|int $branch): Branch;
}
