<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Accounting\Models\Account;
use App\Domains\Core\Models\TaxCategory;
use App\Domains\Products\Enums\PriceTier;
use App\Domains\Products\Enums\StorageCondition;
use App\Domains\Products\Models\ItemCategory;
use App\Domains\Products\Models\UnitOfMeasure;
use App\Domains\Products\Services\ItemService;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $itemService = app(ItemService::class);

        // 1. إنشاء وحدات القياس القياسية لقطاع الأغذية
        $uomList = [
            ['code' => 'PCS', 'name_ar' => 'حبة', 'name_en' => 'Piece'],
            ['code' => 'BOX', 'name_ar' => 'كرتون', 'name_en' => 'Carton / Box'],
            ['code' => 'PACK', 'name_ar' => 'شدة / باكت', 'name_en' => 'Pack'],
            ['code' => 'BAG', 'name_ar' => 'كيس / شوال', 'name_en' => 'Bag / Sack'],
            ['code' => 'KG', 'name_ar' => 'كيلوجرام', 'name_en' => 'Kilogram'],
        ];

        $uoms = [];
        foreach ($uomList as $u) {
            $uoms[$u['code']] = UnitOfMeasure::updateOrCreate(['code' => $u['code']], $u);
        }

        // 2. ربط الحسابات المحاسبية من شجرة الحسابات (المرحلة 2)
        $dryInventoryAcc = Account::where('code', '1131')->first();
        $coldInventoryAcc = Account::where('code', '1132')->first();

        $dryCogsAcc = Account::where('code', '5110')->first();
        $coldCogsAcc = Account::where('code', '5120')->first();

        $dryRevAcc = Account::where('code', '4110')->first();
        $coldRevAcc = Account::where('code', '4120')->first();

        // 3. تصنيفات المواد الغذائية
        $categoriesData = [
            [
                'code' => 'DRY',
                'name_ar' => 'الأغذية الجافة والمعلبات',
                'name_en' => 'Dry Foods & Canned Goods',
                'inventory_account_id' => $dryInventoryAcc?->id,
                'cogs_account_id' => $dryCogsAcc?->id,
                'revenue_account_id' => $dryRevAcc?->id,
            ],
            [
                'code' => 'COLD',
                'name_ar' => 'الألبان والمبردات',
                'name_en' => 'Dairy & Chilled Foods',
                'inventory_account_id' => $coldInventoryAcc?->id,
                'cogs_account_id' => $coldCogsAcc?->id,
                'revenue_account_id' => $coldRevAcc?->id,
            ],
            [
                'code' => 'FROZEN',
                'name_ar' => 'اللحوم والدواجن المجمدة',
                'name_en' => 'Frozen Meat & Poultry',
                'inventory_account_id' => $coldInventoryAcc?->id,
                'cogs_account_id' => $coldCogsAcc?->id,
                'revenue_account_id' => $coldRevAcc?->id,
            ],
            [
                'code' => 'BEV',
                'name_ar' => 'المشروبات والعصائر',
                'name_en' => 'Beverages & Juices',
                'inventory_account_id' => $dryInventoryAcc?->id,
                'cogs_account_id' => $dryCogsAcc?->id,
                'revenue_account_id' => $dryRevAcc?->id,
            ],
        ];

        $categories = [];
        foreach ($categoriesData as $cat) {
            $categories[$cat['code']] = ItemCategory::updateOrCreate(['code' => $cat['code']], $cat);
        }

        // 4. جلب فئة الضريبة 15%
        $taxStandard = TaxCategory::where('code', 'STANDARD')->first()
            ?? TaxCategory::create(['code' => 'STANDARD', 'name' => 'ضريبة القيمة المضافة 15%', 'is_active' => true]);

        // 5. إنشاء الأصناف النموذجية المتكاملة
        $foodItems = [
            // صنف 1: أرز بسمتي 5 كجم
            [
                'item' => [
                    'sku' => 'RICE-SHAALAN-5KG',
                    'barcode' => '6281001110011',
                    'name_ar' => 'أرز سيلا بسمتي الشعلان 5 كجم',
                    'name_en' => 'Al Shaalan Basmati Rice 5kg',
                    'category_id' => $categories['DRY']->id,
                    'tax_category_id' => $taxStandard->id,
                    'base_uom_id' => $uoms['BAG']->id,
                    'storage_condition' => StorageCondition::Ambient,
                    'is_perishable' => true,
                    'shelf_life_days' => 730,
                    'reorder_level' => 30.0000,
                    'cost_price' => 34.0000,
                    'is_active' => true,
                    'description' => 'أرز عنبر سيلا بسمتي هندي نخب أول معبأ في أكياس 5 كجم',
                ],
                'units' => [
                    [
                        'uom_id' => $uoms['BAG']->id,
                        'conversion_factor' => 1.0000,
                        'barcode' => '6281001110011',
                        'is_base_unit' => true,
                    ],
                    [
                        'uom_id' => $uoms['BOX']->id,
                        'conversion_factor' => 4.0000, // كرتون = 4 أكياس
                        'barcode' => '6281001110012',
                        'is_base_unit' => false,
                    ],
                ],
                'prices' => [
                    ['uom_id' => $uoms['BAG']->id, 'price_tier' => PriceTier::Retail, 'price' => 42.0000],
                    ['uom_id' => $uoms['BAG']->id, 'price_tier' => PriceTier::Wholesale, 'price' => 38.0000],
                    ['uom_id' => $uoms['BOX']->id, 'price_tier' => PriceTier::Retail, 'price' => 165.0000],
                    ['uom_id' => $uoms['BOX']->id, 'price_tier' => PriceTier::Wholesale, 'price' => 148.0000],
                ],
            ],

            // صنف 2: زيت ذرة عافية 1.5 لتر
            [
                'item' => [
                    'sku' => 'OIL-AFIA-1.5L',
                    'barcode' => '6281002220021',
                    'name_ar' => 'زيت ذرة عافية نقي 1.5 لتر',
                    'name_en' => 'Afia Pure Corn Oil 1.5L',
                    'category_id' => $categories['DRY']->id,
                    'tax_category_id' => $taxStandard->id,
                    'base_uom_id' => $uoms['PCS']->id,
                    'storage_condition' => StorageCondition::Ambient,
                    'is_perishable' => true,
                    'shelf_life_days' => 730,
                    'reorder_level' => 50.0000,
                    'cost_price' => 12.5000,
                    'is_active' => true,
                    'description' => 'زيت ذرة صافي عالي الجودة للطهي والقلي',
                ],
                'units' => [
                    [
                        'uom_id' => $uoms['PCS']->id,
                        'conversion_factor' => 1.0000,
                        'barcode' => '6281002220021',
                        'is_base_unit' => true,
                    ],
                    [
                        'uom_id' => $uoms['BOX']->id,
                        'conversion_factor' => 6.0000, // كرتون = 6 حبات
                        'barcode' => '6281002220022',
                        'is_base_unit' => false,
                    ],
                ],
                'prices' => [
                    ['uom_id' => $uoms['PCS']->id, 'price_tier' => PriceTier::Retail, 'price' => 16.5000],
                    ['uom_id' => $uoms['PCS']->id, 'price_tier' => PriceTier::Wholesale, 'price' => 15.0000],
                    ['uom_id' => $uoms['BOX']->id, 'price_tier' => PriceTier::Retail, 'price' => 96.0000],
                    ['uom_id' => $uoms['BOX']->id, 'price_tier' => PriceTier::Wholesale, 'price' => 88.0000],
                ],
            ],

            // صنف 3: حليب نادك طازج 1 لتر (مبرد)
            [
                'item' => [
                    'sku' => 'MILK-NADEC-1L',
                    'barcode' => '6281003330031',
                    'name_ar' => 'حليب نادك طازج كامل الدسم 1 لتر',
                    'name_en' => 'Nadec Fresh Milk Full Fat 1L',
                    'category_id' => $categories['COLD']->id,
                    'tax_category_id' => $taxStandard->id,
                    'base_uom_id' => $uoms['PCS']->id,
                    'storage_condition' => StorageCondition::Chilled,
                    'is_perishable' => true,
                    'shelf_life_days' => 7,
                    'reorder_level' => 100.0000,
                    'cost_price' => 4.2000,
                    'is_active' => true,
                    'description' => 'حليب أبقار طازج مبستر كامل الدسم يحفظ في الثلاجة بين 2 إلى 5 درجات',
                ],
                'units' => [
                    [
                        'uom_id' => $uoms['PCS']->id,
                        'conversion_factor' => 1.0000,
                        'barcode' => '6281003330031',
                        'is_base_unit' => true,
                    ],
                    [
                        'uom_id' => $uoms['PACK']->id,
                        'conversion_factor' => 12.0000, // شدة = 12 عبوة
                        'barcode' => '6281003330032',
                        'is_base_unit' => false,
                    ],
                ],
                'prices' => [
                    ['uom_id' => $uoms['PCS']->id, 'price_tier' => PriceTier::Retail, 'price' => 5.5000],
                    ['uom_id' => $uoms['PCS']->id, 'price_tier' => PriceTier::Wholesale, 'price' => 5.0000],
                    ['uom_id' => $uoms['PACK']->id, 'price_tier' => PriceTier::Retail, 'price' => 64.0000],
                    ['uom_id' => $uoms['PACK']->id, 'price_tier' => PriceTier::Wholesale, 'price' => 58.0000],
                ],
            ],

            // صنف 4: دجاج دو مجمد 1000 جم (مجمد)
            [
                'item' => [
                    'sku' => 'CHICKEN-DOUX-1000G',
                    'barcode' => '6281004440041',
                    'name_ar' => 'دجاج دو مجمد فرنسي 1000 جم',
                    'name_en' => 'Doux Frozen French Chicken 1000g',
                    'category_id' => $categories['FROZEN']->id,
                    'tax_category_id' => $taxStandard->id,
                    'base_uom_id' => $uoms['PCS']->id,
                    'storage_condition' => StorageCondition::Frozen,
                    'is_perishable' => true,
                    'shelf_life_days' => 365,
                    'reorder_level' => 40.0000,
                    'cost_price' => 13.8000,
                    'is_active' => true,
                    'description' => 'دجاج فرنسي مجمد نخب أول بدون أحشاء يحفظ في المجمد عند -18 درجة مئوية',
                ],
                'units' => [
                    [
                        'uom_id' => $uoms['PCS']->id,
                        'conversion_factor' => 1.0000,
                        'barcode' => '6281004440041',
                        'is_base_unit' => true,
                    ],
                    [
                        'uom_id' => $uoms['BOX']->id,
                        'conversion_factor' => 10.0000, // كرتون = 10 حبات
                        'barcode' => '6281004440042',
                        'is_base_unit' => false,
                    ],
                ],
                'prices' => [
                    ['uom_id' => $uoms['PCS']->id, 'price_tier' => PriceTier::Retail, 'price' => 18.0000],
                    ['uom_id' => $uoms['PCS']->id, 'price_tier' => PriceTier::Wholesale, 'price' => 16.0000],
                    ['uom_id' => $uoms['BOX']->id, 'price_tier' => PriceTier::Retail, 'price' => 175.0000],
                    ['uom_id' => $uoms['BOX']->id, 'price_tier' => PriceTier::Wholesale, 'price' => 155.0000],
                ],
            ],

            // صنف 5: عصير ربيع برتقال 250 مل
            [
                'item' => [
                    'sku' => 'JUICE-RABEA-250ML',
                    'barcode' => '6281005550051',
                    'name_ar' => 'عصير ربيع برتقال طبيعي 250 مل',
                    'name_en' => 'Rabea Natural Orange Juice 250ml',
                    'category_id' => $categories['BEV']->id,
                    'tax_category_id' => $taxStandard->id,
                    'base_uom_id' => $uoms['PCS']->id,
                    'storage_condition' => StorageCondition::Ambient,
                    'is_perishable' => true,
                    'shelf_life_days' => 365,
                    'reorder_level' => 60.0000,
                    'cost_price' => 1.6500,
                    'is_active' => true,
                    'description' => 'عصير برتقال طبيعي 100% معبأ في تتراباك 250 مل',
                ],
                'units' => [
                    [
                        'uom_id' => $uoms['PCS']->id,
                        'conversion_factor' => 1.0000,
                        'barcode' => '6281005550051',
                        'is_base_unit' => true,
                    ],
                    [
                        'uom_id' => $uoms['BOX']->id,
                        'conversion_factor' => 27.0000, // كرتون = 27 عبوة
                        'barcode' => '6281005550052',
                        'is_base_unit' => false,
                    ],
                ],
                'prices' => [
                    ['uom_id' => $uoms['PCS']->id, 'price_tier' => PriceTier::Retail, 'price' => 2.5000],
                    ['uom_id' => $uoms['PCS']->id, 'price_tier' => PriceTier::Wholesale, 'price' => 2.0000],
                    ['uom_id' => $uoms['BOX']->id, 'price_tier' => PriceTier::Retail, 'price' => 62.0000],
                    ['uom_id' => $uoms['BOX']->id, 'price_tier' => PriceTier::Wholesale, 'price' => 52.0000],
                ],
            ],
        ];

        foreach ($foodItems as $food) {
            $existing = $itemService->getItemByBarcode($food['item']['barcode']);
            if (!$existing) {
                $itemService->createItem($food['item'], $food['units'], $food['prices']);
            }
        }
    }
}
