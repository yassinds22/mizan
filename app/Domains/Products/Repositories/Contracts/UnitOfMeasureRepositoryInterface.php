<?php

declare(strict_types=1);

namespace App\Domains\Products\Repositories\Contracts;

use App\Domains\Products\Models\UnitOfMeasure;
use Illuminate\Database\Eloquent\Collection;

interface UnitOfMeasureRepositoryInterface
{
    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, UnitOfMeasure>
     */
    public function all(array $filters = []): Collection;

    public function findById(int $id): ?UnitOfMeasure;

    public function findByCode(string $code): ?UnitOfMeasure;

    public function create(array $data): UnitOfMeasure;

    public function update(UnitOfMeasure $uom, array $data): UnitOfMeasure;

    public function delete(UnitOfMeasure $uom): bool;
}
