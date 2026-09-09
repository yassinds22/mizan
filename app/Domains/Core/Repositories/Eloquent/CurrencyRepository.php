<?php

declare(strict_types=1);

namespace App\Domains\Core\Repositories\Eloquent;

use App\Domains\Core\Models\Currency;
use App\Domains\Core\Models\ExchangeRate;
use App\Domains\Core\Repositories\Contracts\CurrencyRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class CurrencyRepository implements CurrencyRepositoryInterface
{
    public function all(array $filters = []): Collection
    {
        return $this->applyFilters(Currency::query(), $filters)
            ->with(['latestExchangeRate'])
            ->orderByDesc('is_base_currency')
            ->orderBy('code')
            ->get();
    }

    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        return $this->applyFilters(Currency::query(), $filters)
            ->with(['latestExchangeRate'])
            ->orderByDesc('is_base_currency')
            ->orderBy('code')
            ->paginate($perPage);
    }

    public function findById(int $id): ?Currency
    {
        return Currency::with(['latestExchangeRate'])->find($id);
    }

    public function findByCode(string $code): ?Currency
    {
        return Currency::with(['latestExchangeRate'])->where('code', strtoupper($code))->first();
    }

    public function getBaseCurrency(): ?Currency
    {
        return Currency::where('is_base_currency', true)->first();
    }

    public function create(array $data): Currency
    {
        return Currency::create($data);
    }

    public function update(Currency|int $currency, array $data): Currency
    {
        $model = $currency instanceof Currency ? $currency : Currency::findOrFail($currency);
        $model->update($data);

        return $model->fresh(['latestExchangeRate']);
    }

    public function delete(Currency|int $currency): bool
    {
        $model = $currency instanceof Currency ? $currency : Currency::findOrFail($currency);

        return (bool) $model->delete();
    }

    public function toggleActive(Currency|int $currency): Currency
    {
        $model = $currency instanceof Currency ? $currency : Currency::findOrFail($currency);
        $model->is_active = !$model->is_active;
        $model->save();

        return $model->fresh(['latestExchangeRate']);
    }

    public function addExchangeRate(Currency|int $currency, array $rateData): ExchangeRate
    {
        $model = $currency instanceof Currency ? $currency : Currency::findOrFail($currency);

        return $model->exchangeRates()->create($rateData);
    }

    public function getExchangeRatesHistory(Currency|int $currency): Collection
    {
        $model = $currency instanceof Currency ? $currency : Currency::findOrFail($currency);

        return $model->exchangeRates()
            ->orderByDesc('valid_from')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param Builder<Currency> $query
     * @param array<string, mixed> $filters
     * @return Builder<Currency>
     */
    private function applyFilters(Builder $query, array $filters): Builder
    {
        if (!empty($filters['search'])) {
            $search = (string) $filters['search'];
            $query->where(function (Builder $q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('symbol', 'like', "%{$search}%");
            });
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', (bool) $filters['is_active']);
        }

        if (isset($filters['is_base_currency'])) {
            $query->where('is_base_currency', (bool) $filters['is_base_currency']);
        }

        return $query;
    }
}
