<?php

declare(strict_types=1);

namespace App\Domains\Core\Services;

use App\Domains\Core\Repositories\Contracts\CurrencyRepositoryInterface;
use App\Domains\Core\Repositories\Contracts\SettingRepositoryInterface;
use Illuminate\Support\Facades\DB;

class SettingService
{
    public function __construct(
        private readonly SettingRepositoryInterface $settingRepository,
        private readonly CurrencyService $currencyService,
        private readonly CurrencyRepositoryInterface $currencyRepository
    ) {}

    /**
     * @return array<string, string|null>
     */
    public function getAllSettings(): array
    {
        $settings = $this->settingRepository->allAsKeyValue();

        // Ensure base currency is attached
        $baseCurrency = $this->currencyRepository->getBaseCurrency();
        if ($baseCurrency) {
            $settings['base_currency_code'] = $baseCurrency->code;
            $settings['base_currency_name'] = $baseCurrency->name;
            $settings['base_currency_symbol'] = $baseCurrency->symbol;
        }

        return $settings;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, string|null>
     */
    public function saveSettings(array $payload): array
    {
        return DB::transaction(function () use ($payload) {
            // Check if base currency switch was requested
            if (!empty($payload['selected_currency']) || !empty($payload['base_currency_code'])) {
                $currencyCode = $payload['selected_currency'] ?? $payload['base_currency_code'];
                $currency = $this->currencyRepository->findByCode($currencyCode);

                if ($currency && !$currency->is_base_currency) {
                    $this->currencyService->updateCurrency($currency->id, [
                        'is_base_currency' => true,
                    ]);
                }
            }

            // Map settings with their groups
            $groupMap = [
                'company_name' => 'company',
                'tax_number' => 'company',
                'cr_number' => 'company',
                'city' => 'company',
                'address' => 'company',

                'logo_text' => 'print',
                'footer_text' => 'print',
                'legal_note' => 'print',
                'paper_type' => 'print',
                'show_qr' => 'print',

                'vat_rate' => 'fiscal',
                'fiscal_start_date' => 'fiscal',
                'stock_policy' => 'fiscal',
            ];

            $toSave = [];
            foreach ($payload as $key => $val) {
                // Ignore transient keys
                if (in_array($key, ['base_currency_name', 'base_currency_symbol'])) {
                    continue;
                }

                $valueStr = is_bool($val) ? ($val ? '1' : '0') : ($val !== null ? (string) $val : null);
                $group = $groupMap[$key] ?? 'general';

                $toSave[$key] = [
                    'value' => $valueStr,
                    'group' => $group,
                ];
            }

            if (!empty($toSave)) {
                $this->settingRepository->saveMany($toSave);
            }

            return $this->getAllSettings();
        });
    }
}
