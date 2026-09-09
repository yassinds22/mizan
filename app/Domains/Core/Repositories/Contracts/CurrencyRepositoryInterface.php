<?php

declare(strict_types=1);

namespace App\Domains\Core\Repositories\Contracts;

use App\Domains\Core\Models\Currency;
use App\Domains\Core\Models\ExchangeRate;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface CurrencyRepositoryInterface
{
    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, Currency>
     */
    public function all(array $filters = []): Collection;

    /**
     * @param int $perPage
     * @param array<string, mixed> $filters
     * @return LengthAwarePaginator<Currency>
     */
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator;

    public function findById(int $id): ?Currency;

    public function findByCode(string $code): ?Currency;

    public function getBaseCurrency(): ?Currency;

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): Currency;

    /**
     * @param Currency|int $currency
     * @param array<string, mixed> $data
     */
    public function update(Currency|int $currency, array $data): Currency;

    public function delete(Currency|int $currency): bool;

    public function toggleActive(Currency|int $currency): Currency;

    /**
     * @param Currency|int $currency
     * @param array<string, mixed> $rateData
     */
    public function addExchangeRate(Currency|int $currency, array $rateData): ExchangeRate;

    /**
     * @param Currency|int $currency
     * @return Collection<int, ExchangeRate>
     */
    public function getExchangeRatesHistory(Currency|int $currency): Collection;
}
