<?php

declare(strict_types=1);

namespace App\Domains\Core\Repositories\Contracts;

use App\Domains\Core\Models\TaxCategory;
use App\Domains\Core\Models\TaxRate;
use Illuminate\Database\Eloquent\Collection;

interface TaxCategoryRepositoryInterface
{
    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, TaxCategory>
     */
    public function all(array $filters = []): Collection;

    public function findById(int $id): ?TaxCategory;

    public function findByCode(string $code): ?TaxCategory;

    public function getActiveRateForDate(int $categoryId, ?string $date = null): ?TaxRate;

    /**
     * @param array<string, mixed> $data
     */
    public function addRate(int $categoryId, array $data): TaxRate;

    /**
     * @param array<string, mixed> $data
     */
    public function update(int $id, array $data): TaxCategory;

    /**
     * @return Collection<int, TaxRate>
     */
    public function getRatesHistory(int $categoryId): Collection;
}
