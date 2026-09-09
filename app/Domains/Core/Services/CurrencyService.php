<?php

declare(strict_types=1);

namespace App\Domains\Core\Services;

use App\Domains\Core\Models\Currency;
use App\Domains\Core\Models\ExchangeRate;
use App\Domains\Core\Repositories\Contracts\CurrencyRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CurrencyService
{
    public function __construct(
        protected CurrencyRepositoryInterface $currencyRepository
    ) {}

    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, Currency>
     */
    public function getAllCurrencies(array $filters = []): Collection
    {
        return $this->currencyRepository->all($filters);
    }

    /**
     * @param int $perPage
     * @param array<string, mixed> $filters
     * @return LengthAwarePaginator<Currency>
     */
    public function getPaginatedCurrencies(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        return $this->currencyRepository->paginate($perPage, $filters);
    }

    public function getCurrencyById(int $id): Currency
    {
        $currency = $this->currencyRepository->findById($id);

        if (!$currency) {
            throw ValidationException::withMessages([
                'currency' => ['العملة المطلوبة غير موجودة.'],
            ]);
        }

        return $currency;
    }

    public function getBaseCurrency(): Currency
    {
        $base = $this->currencyRepository->getBaseCurrency();

        if (!$base) {
            throw ValidationException::withMessages([
                'currency' => ['لم يتم تعيين عملة أساسية للنظام بعد.'],
            ]);
        }

        return $base;
    }

    /**
     * @param array<string, mixed> $data
     */
    public function createCurrency(array $data): Currency
    {
        return DB::transaction(function () use ($data) {
            $data['code'] = strtoupper(trim($data['code']));
            $data['name'] = trim($data['name']);
            $data['symbol'] = trim($data['symbol']);
            $data['decimal_places'] = (int) ($data['decimal_places'] ?? 2);

            $isBase = (bool) ($data['is_base_currency'] ?? false);
            if ($isBase) {
                Currency::query()->update(['is_base_currency' => false]);
            }

            if (!array_key_exists('is_active', $data) || $data['is_active'] === null) {
                $data['is_active'] = true;
            }

            $currency = $this->currencyRepository->create([
                'code' => $data['code'],
                'name' => $data['name'],
                'symbol' => $data['symbol'],
                'decimal_places' => $data['decimal_places'],
                'is_base_currency' => $isBase,
                'is_active' => (bool) $data['is_active'],
            ]);

            // إضافة سعر صرف أولي إذا تم تمريره ولم تكن العملة هي الأساسية
            if (!$isBase && !empty($data['initial_rate'])) {
                $this->currencyRepository->addExchangeRate($currency, [
                    'rate' => (float) $data['initial_rate'],
                    'valid_from' => $data['valid_from'] ?? now()->toDateString(),
                ]);
            }

            return $this->getCurrencyById($currency->id);
        });
    }

    /**
     * @param int $id
     * @param array<string, mixed> $data
     */
    public function updateCurrency(int $id, array $data): Currency
    {
        return DB::transaction(function () use ($id, $data) {
            $currency = $this->getCurrencyById($id);

            if (isset($data['code'])) {
                $data['code'] = strtoupper(trim($data['code']));
            }

            if (isset($data['name'])) {
                $data['name'] = trim($data['name']);
            }

            if (isset($data['symbol'])) {
                $data['symbol'] = trim($data['symbol']);
            }

            // التحقق من تعيين العملة كأساسية
            if (isset($data['is_base_currency'])) {
                $isBase = (bool) $data['is_base_currency'];
                if ($isBase && !$currency->is_base_currency) {
                    Currency::query()->update(['is_base_currency' => false]);
                } elseif (!$isBase && $currency->is_base_currency) {
                    throw ValidationException::withMessages([
                        'is_base_currency' => ['لا يمكن إلغاء صفة العملة الأساسية إلا بتعيين عملة أخرى بدلاً منها.'],
                    ]);
                }
            }

            // منع تعطيل العملة الأساسية
            if (isset($data['is_active']) && !$data['is_active'] && $currency->is_base_currency) {
                throw ValidationException::withMessages([
                    'is_active' => ['لا يمكن تعطيل العملة الأساسية للنظام.'],
                ]);
            }

            return $this->currencyRepository->update($currency, $data);
        });
    }

    public function deleteCurrency(int $id): bool
    {
        $currency = $this->getCurrencyById($id);

        if ($currency->is_base_currency) {
            throw ValidationException::withMessages([
                'currency' => ['لا يمكن حذف العملة الأساسية للنظام.'],
            ]);
        }

        return $this->currencyRepository->delete($currency);
    }

    public function toggleCurrencyStatus(int $id): Currency
    {
        $currency = $this->getCurrencyById($id);

        if ($currency->is_base_currency && $currency->is_active) {
            throw ValidationException::withMessages([
                'currency' => ['لا يمكن تعطيل العملة الأساسية للنظام.'],
            ]);
        }

        return $this->currencyRepository->toggleActive($currency);
    }

    /**
     * @param int $currencyId
     * @param array<string, mixed> $rateData
     */
    public function addExchangeRate(int $currencyId, array $rateData): ExchangeRate
    {
        $currency = $this->getCurrencyById($currencyId);

        if ($currency->is_base_currency) {
            throw ValidationException::withMessages([
                'currency' => ['لا يمكن تسجيل سعر صرف للعملة الأساسية للنظام؛ سعرها دائماً 1.000000.'],
            ]);
        }

        $rate = (float) $rateData['rate'];
        if ($rate <= 0) {
            throw ValidationException::withMessages([
                'rate' => ['سعر الصرف يجب أن يكون أكبر من الصفر.'],
            ]);
        }

        return $this->currencyRepository->addExchangeRate($currency, [
            'rate' => $rate,
            'valid_from' => $rateData['valid_from'] ?? now()->toDateString(),
        ]);
    }

    /**
     * @param int $currencyId
     * @return Collection<int, ExchangeRate>
     */
    public function getExchangeRatesHistory(int $currencyId): Collection
    {
        $currency = $this->getCurrencyById($currencyId);

        return $this->currencyRepository->getExchangeRatesHistory($currency);
    }
}
