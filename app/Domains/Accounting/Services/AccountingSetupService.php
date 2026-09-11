<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Services;

use App\Domains\Core\Enums\FiscalPeriodStatus;
use App\Domains\Core\Enums\TaxCategoryCode;
use App\Domains\Core\Models\Currency;
use App\Domains\Core\Models\FiscalPeriod;
use App\Domains\Core\Models\FiscalYear;
use App\Domains\Core\Models\TaxCategory;
use App\Domains\Core\Models\TaxRate;
use Carbon\Carbon;
use Database\Seeders\AccountingSeeder;
use Illuminate\Support\Facades\DB;

class AccountingSetupService
{
    /**
     * تثبيت وإعداد البيئة المحاسبية الافتراضية بشكل Idempotent (آمن عند التكرار)
     */
    public function setupAccountingDefaults(string $baseCurrency = 'SAR', float $vatRate = 15.0, ?int $year = null): array
    {
        $year = $year ?? (int) date('Y');

        $this->seedDefaultChartOfAccounts();
        $this->seedTaxConfiguration($vatRate);
        $this->seedCurrenciesAndPeriods($baseCurrency, $year);

        return [
            'chart_of_accounts_ready' => true,
            'tax_configured' => true,
            'vat_rate' => $vatRate,
            'base_currency' => $baseCurrency,
            'fiscal_year' => $year,
        ];
    }

    /**
     * زرع أو تحديث دليل الحسابات القياسي المعتمد دون تكرار
     */
    public function seedDefaultChartOfAccounts(): void
    {
        $seeder = new AccountingSeeder();
        $seeder->run();
    }

    /**
     * ضبط الفئات الضريبية المعتمدة لضريبة القيمة المضافة
     */
    public function seedTaxConfiguration(float $standardRate = 15.0): void
    {
        // 1. الفئة القياسية (Standard VAT)
        $standard = TaxCategory::updateOrCreate(
            ['code' => TaxCategoryCode::Standard->value],
            [
                'name' => 'النسبة الأساسية (VAT)',
                'description' => 'ضريبة القيمة المضافة بالنسبة الأساسية 15%',
            ]
        );

        TaxRate::updateOrCreate(
            [
                'tax_category_id' => $standard->id,
                'valid_from' => '2020-07-01',
            ],
            [
                'rate' => $standardRate,
                'is_active' => true,
            ]
        );

        // 2. الفئة الصفرية (Zero Rated)
        $zero = TaxCategory::updateOrCreate(
            ['code' => TaxCategoryCode::Zero->value],
            [
                'name' => 'النسبة الصفرية',
                'description' => 'السلع والخدمات الخاضعة لنسبة 0%',
            ]
        );

        TaxRate::updateOrCreate(
            [
                'tax_category_id' => $zero->id,
                'valid_from' => '2020-07-01',
            ],
            [
                'rate' => 0.00,
                'is_active' => true,
            ]
        );

        // 3. المعفاة (Exempt)
        TaxCategory::updateOrCreate(
            ['code' => TaxCategoryCode::Exempt->value],
            [
                'name' => 'معفى من الضريبة',
                'description' => 'التوريدات المعفاة تماماً من ضريبة القيمة المضافة',
            ]
        );
    }

    /**
     * ضبط العملات الأساسية والفترات المالية
     */
    public function seedCurrenciesAndPeriods(string $baseCurrency = 'SAR', int $year = 2026): void
    {
        // 1. ضمان وجود العملات الافتراضية
        Currency::firstOrCreate(
            ['code' => 'SAR'],
            [
                'name' => 'ريال سعودي',
                'symbol' => 'ر.س',
                'decimal_places' => 2,
                'is_active' => true,
            ]
        );

        Currency::firstOrCreate(
            ['code' => 'USD'],
            [
                'name' => 'دولار أمريكي',
                'symbol' => '$',
                'decimal_places' => 2,
                'is_active' => true,
            ]
        );

        // 2. تفعيل العملة الأساسية المختارة
        Currency::query()->update(['is_base_currency' => false]);
        Currency::where('code', $baseCurrency)->update([
            'is_base_currency' => true,
            'is_active' => true,
        ]);

        // السنة المالية
        $fiscalYear = FiscalYear::updateOrCreate(
            ['name' => "السنة المالية {$year}"],
            [
                'start_date' => "{$year}-01-01",
                'end_date' => "{$year}-12-31",
                'is_closed' => false,
            ]
        );

        // 12 فترة محاسبية
        for ($m = 1; $m <= 12; $m++) {
            $startDate = Carbon::create($year, $m, 1)->startOfMonth();
            $endDate = (clone $startDate)->endOfMonth();
            $monthFormatted = sprintf('%02d', $m);

            FiscalPeriod::updateOrCreate(
                [
                    'fiscal_year_id' => $fiscalYear->id,
                    'period_number' => $m,
                ],
                [
                    'name' => "فترة شهر {$monthFormatted}/{$year}",
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                    'status' => FiscalPeriodStatus::Open,
                ]
            );
        }
    }
}
