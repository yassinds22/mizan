<?php

declare(strict_types=1);

namespace App\Domains\Core\Repositories\Contracts;

use App\Domains\Core\Enums\FiscalPeriodStatus;
use App\Domains\Core\Models\FiscalPeriod;
use App\Domains\Core\Models\FiscalYear;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Collection;

interface FiscalYearRepositoryInterface
{
    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, FiscalYear>
     */
    public function allYears(array $filters = []): Collection;

    public function findYearById(int $id): ?FiscalYear;

    public function findYearByName(string $name): ?FiscalYear;

    /**
     * @param array<string, mixed> $data
     */
    public function createYear(array $data): FiscalYear;

    /**
     * @param FiscalYear|int $year
     * @param array<string, mixed> $data
     */
    public function updateYear(FiscalYear|int $year, array $data): FiscalYear;

    public function deleteYear(FiscalYear|int $year): bool;

    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, FiscalPeriod>
     */
    public function allPeriods(array $filters = []): Collection;

    public function findPeriodById(int $id): ?FiscalPeriod;

    public function findPeriodForDate(string|DateTimeInterface $date): ?FiscalPeriod;

    public function updatePeriodStatus(FiscalPeriod|int $period, FiscalPeriodStatus|string $status): FiscalPeriod;

    /**
     * @param FiscalYear|int $year
     * @param array<string, mixed> $periodData
     */
    public function createPeriod(FiscalYear|int $year, array $periodData): FiscalPeriod;
}
