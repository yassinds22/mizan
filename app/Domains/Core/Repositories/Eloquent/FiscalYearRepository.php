<?php

declare(strict_types=1);

namespace App\Domains\Core\Repositories\Eloquent;

use App\Domains\Core\Enums\FiscalPeriodStatus;
use App\Domains\Core\Models\FiscalPeriod;
use App\Domains\Core\Models\FiscalYear;
use App\Domains\Core\Repositories\Contracts\FiscalYearRepositoryInterface;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class FiscalYearRepository implements FiscalYearRepositoryInterface
{
    public function allYears(array $filters = []): Collection
    {
        $query = FiscalYear::query()->with(['periods']);

        if (isset($filters['is_closed'])) {
            $query->where('is_closed', (bool) $filters['is_closed']);
        }

        return $query->orderByDesc('start_date')->get();
    }

    public function findYearById(int $id): ?FiscalYear
    {
        return FiscalYear::with(['periods'])->find($id);
    }

    public function findYearByName(string $name): ?FiscalYear
    {
        return FiscalYear::with(['periods'])->where('name', $name)->first();
    }

    public function createYear(array $data): FiscalYear
    {
        return FiscalYear::create($data);
    }

    public function updateYear(FiscalYear|int $year, array $data): FiscalYear
    {
        $model = $year instanceof FiscalYear ? $year : FiscalYear::findOrFail($year);
        $model->update($data);

        return $model->fresh(['periods']);
    }

    public function deleteYear(FiscalYear|int $year): bool
    {
        $model = $year instanceof FiscalYear ? $year : FiscalYear::findOrFail($year);

        return (bool) $model->delete();
    }

    public function allPeriods(array $filters = []): Collection
    {
        $query = FiscalPeriod::query()->with(['fiscalYear']);

        if (!empty($filters['fiscal_year_id'])) {
            $query->where('fiscal_year_id', $filters['fiscal_year_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderBy('start_date')->get();
    }

    public function findPeriodById(int $id): ?FiscalPeriod
    {
        return FiscalPeriod::with(['fiscalYear'])->find($id);
    }

    public function findPeriodForDate(string|DateTimeInterface $date): ?FiscalPeriod
    {
        $formatted = $date instanceof DateTimeInterface ? $date->format('Y-m-d') : $date;

        return FiscalPeriod::with(['fiscalYear'])
            ->whereDate('start_date', '<=', $formatted)
            ->whereDate('end_date', '>=', $formatted)
            ->first();
    }

    public function updatePeriodStatus(FiscalPeriod|int $period, FiscalPeriodStatus|string $status): FiscalPeriod
    {
        $model = $period instanceof FiscalPeriod ? $period : FiscalPeriod::findOrFail($period);
        $statusValue = $status instanceof FiscalPeriodStatus ? $status : FiscalPeriodStatus::from((string) $status);

        $model->status = $statusValue;
        $model->save();

        return $model->fresh(['fiscalYear']);
    }

    public function createPeriod(FiscalYear|int $year, array $periodData): FiscalPeriod
    {
        $model = $year instanceof FiscalYear ? $year : FiscalYear::findOrFail($year);

        return $model->periods()->create($periodData);
    }
}
