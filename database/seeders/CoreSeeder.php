<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Core\Enums\FiscalPeriodStatus;
use App\Domains\Core\Enums\TaxCategoryCode;
use App\Domains\Core\Models\Branch;
use App\Domains\Core\Models\Currency;
use App\Domains\Core\Models\ExchangeRate;
use App\Domains\Core\Models\FiscalPeriod;
use App\Domains\Core\Models\FiscalYear;
use App\Domains\Core\Models\TaxCategory;
use App\Domains\Core\Models\TaxRate;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class CoreSeeder extends Seeder
{
    public function run(): void
    {
        // 1. الفروع
        Branch::firstOrCreate(
            ['code' => 'BR-RUH-01'],
            [
                'name' => 'الفرع الرئيسي — مستودع الرياض المركزي',
                'city' => 'الرياض',
                'address' => 'حي السلي، مخرج 18، طريق هارون الرشيد',
                'is_active' => true,
            ]
        );

        Branch::firstOrCreate(
            ['code' => 'BR-JED-02'],
            [
                'name' => 'فرع جدة — مركز التوزيع الغربي',
                'city' => 'جدة',
                'address' => 'منطقة الخمرة اللوجستية',
                'is_active' => true,
            ]
        );

        // 2. العملات
        $sar = Currency::firstOrCreate(
            ['code' => 'SAR'],
            [
                'name' => 'ريال سعودي',
                'symbol' => 'ر.س',
                'decimal_places' => 2,
                'is_base_currency' => true,
                'is_active' => true,
            ]
        );

        $usd = Currency::firstOrCreate(
            ['code' => 'USD'],
            [
                'name' => 'دولار أمريكي',
                'symbol' => '$',
                'decimal_places' => 2,
                'is_base_currency' => false,
                'is_active' => true,
            ]
        );

        $aed = Currency::firstOrCreate(
            ['code' => 'AED'],
            [
                'name' => 'درهم إماراتي',
                'symbol' => 'د.إ',
                'decimal_places' => 2,
                'is_base_currency' => false,
                'is_active' => true,
            ]
        );

        // أسعار الصرف (مقابل الريال السعودي)
        ExchangeRate::firstOrCreate(
            ['currency_id' => $usd->id, 'valid_from' => '2026-01-01'],
            ['rate' => 3.750000]
        );

        ExchangeRate::firstOrCreate(
            ['currency_id' => $aed->id, 'valid_from' => '2026-01-01'],
            ['rate' => 1.021000]
        );

        // 3. السنة والفترات المالية (2026)
        $fy2026 = FiscalYear::firstOrCreate(
            ['name' => 'FY-2026'],
            [
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
                'is_closed' => false,
            ]
        );

        $arabicMonths = [
            1 => 'يناير', 2 => 'فبراير', 3 => 'مارس', 4 => 'أبريل',
            5 => 'مايو', 6 => 'يونيو', 7 => 'يوليو', 8 => 'أغسطس',
            9 => 'سبتمبر', 10 => 'أكتوبر', 11 => 'نوفمبر', 12 => 'ديسمبر',
        ];

        for ($m = 1; $m <= 12; $m++) {
            $startDate = Carbon::create(2026, $m, 1)->startOfMonth()->toDateString();
            $endDate = Carbon::create(2026, $m, 1)->endOfMonth()->toDateString();

            FiscalPeriod::firstOrCreate(
                [
                    'fiscal_year_id' => $fy2026->id,
                    'period_number' => $m,
                ],
                [
                    'name' => $arabicMonths[$m] . ' 2026',
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'status' => FiscalPeriodStatus::Open,
                ]
            );
        }

        // 4. فئات الضرائب
        $standardTax = TaxCategory::firstOrCreate(
            ['code' => TaxCategoryCode::Standard->value],
            [
                'name' => 'ضريبة القيمة المضافة القياسية',
                'description' => 'النسبة المطبقة على معظم السلع والخدمات الغذائية الخاضعة للضريبة',
            ]
        );

        TaxRate::firstOrCreate(
            ['tax_category_id' => $standardTax->id, 'valid_from' => '2020-07-01'],
            ['rate' => 15.00, 'is_active' => true]
        );

        $zeroTax = TaxCategory::firstOrCreate(
            ['code' => TaxCategoryCode::Zero->value],
            [
                'name' => 'ضريبة بنسبة صفر بالمائة',
                'description' => 'الصادرات والسلع المؤهلة للنسبة الصفرية',
            ]
        );

        TaxRate::firstOrCreate(
            ['tax_category_id' => $zeroTax->id, 'valid_from' => '2018-01-01'],
            ['rate' => 0.00, 'is_active' => true]
        );

        $exemptTax = TaxCategory::firstOrCreate(
            ['code' => TaxCategoryCode::Exempt->value],
            [
                'name' => 'معفاة من الضريبة',
                'description' => 'الخدمات والمنتجات المعفاة بموجب اللائحة',
            ]
        );

        TaxRate::firstOrCreate(
            ['tax_category_id' => $exemptTax->id, 'valid_from' => '2018-01-01'],
            ['rate' => 0.00, 'is_active' => true]
        );

        // 5. إعدادات المنشأة والسياسات الافتراضية
        $defaultSettings = [
            ['key' => 'company_name', 'value' => 'ميزان للتجارة الغذائية', 'group' => 'company'],
            ['key' => 'tax_number', 'value' => '310123456700003', 'group' => 'company'],
            ['key' => 'cr_number', 'value' => '1010123456', 'group' => 'company'],
            ['key' => 'city', 'value' => 'الرياض', 'group' => 'company'],
            ['key' => 'address', 'value' => 'حي الصناعية، طريق الخرج، الرياض', 'group' => 'company'],

            ['key' => 'logo_text', 'value' => 'ميزان للتجارة الغذائية', 'group' => 'print'],
            ['key' => 'footer_text', 'value' => 'شكراً لتعاملكم معنا — نسعد بخدمتكم دائماً', 'group' => 'print'],
            ['key' => 'legal_note', 'value' => 'فاتورة ضريبية مبسطة صادرة طبقاً لأحكام ولائحة الفوترة الإلكترونية بالمملكة العربية السعودية.', 'group' => 'print'],
            ['key' => 'paper_type', 'value' => 'thermal', 'group' => 'print'],
            ['key' => 'show_qr', 'value' => '1', 'group' => 'print'],

            ['key' => 'vat_rate', 'value' => '15', 'group' => 'fiscal'],
            ['key' => 'fiscal_start_date', 'value' => '2026-01-01', 'group' => 'fiscal'],
            ['key' => 'stock_policy', 'value' => 'FEFO', 'group' => 'fiscal'],
        ];

        foreach ($defaultSettings as $setting) {
            \App\Domains\Core\Models\SystemSetting::firstOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value'], 'group' => $setting['group']]
            );
        }
    }
}
