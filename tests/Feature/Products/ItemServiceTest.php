<?php

declare(strict_types=1);

namespace Tests\Feature\Products;

use App\Domains\Accounting\Models\Account;
use App\Domains\Core\Models\TaxCategory;
use App\Domains\Products\Enums\PriceTier;
use App\Domains\Products\Enums\StorageCondition;
use App\Domains\Products\Models\Item;
use App\Domains\Products\Models\ItemCategory;
use App\Domains\Products\Models\UnitOfMeasure;
use App\Domains\Products\Services\ItemCategoryService;
use App\Domains\Products\Services\ItemService;
use App\Domains\Products\Services\UnitOfMeasureService;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ItemServiceTest extends TestCase
{
    use RefreshDatabase;

    private ItemService $itemService;
    private ItemCategoryService $categoryService;
    private UnitOfMeasureService $uomService;

    private ItemCategory $category;
    private UnitOfMeasure $pcsUom;
    private UnitOfMeasure $boxUom;
    private TaxCategory $taxCategory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            CoreSeeder::class,
            AccountingSeeder::class,
        ]);

        $this->itemService = app(ItemService::class);
        $this->categoryService = app(ItemCategoryService::class);
        $this->uomService = app(UnitOfMeasureService::class);

        $invAccount = Account::where('code', '1131')->firstOrFail();
        $cogsAccount = Account::where('code', '5110')->firstOrFail();
        $revAccount = Account::where('code', '4110')->firstOrFail();

        $this->category = $this->categoryService->createCategory([
            'code' => 'DRY-TEST',
            'name_ar' => 'أغذية جافة تجريبية',
            'inventory_account_id' => $invAccount->id,
            'cogs_account_id' => $cogsAccount->id,
            'revenue_account_id' => $revAccount->id,
        ]);

        $this->pcsUom = $this->uomService->createUnit([
            'code' => 'PCS',
            'name_ar' => 'حبة',
        ]);

        $this->boxUom = $this->uomService->createUnit([
            'code' => 'BOX',
            'name_ar' => 'كرتون',
        ]);

        $this->taxCategory = TaxCategory::where('code', 'STANDARD')->firstOrFail();
    }

    public function test_can_create_item_with_multi_uom_and_prices_via_service(): void
    {
        $itemData = [
            'sku' => 'SUGAR-10KG',
            'barcode' => '6289990001111',
            'name_ar' => 'سكر الأسرة ناعم 10 كجم',
            'name_en' => 'Al Osra Fine Sugar 10kg',
            'category_id' => $this->category->id,
            'tax_category_id' => $this->taxCategory->id,
            'base_uom_id' => $this->pcsUom->id,
            'storage_condition' => StorageCondition::Ambient,
            'is_perishable' => false,
            'reorder_level' => 15.0000,
            'cost_price' => 28.0000,
        ];

        $units = [
            [
                'uom_id' => $this->pcsUom->id,
                'conversion_factor' => 1.0000,
                'barcode' => '6289990001111',
                'is_base_unit' => true,
            ],
            [
                'uom_id' => $this->boxUom->id,
                'conversion_factor' => 5.0000, // كرتون = 5 حبات
                'barcode' => '6289990001112',
                'is_base_unit' => false,
            ],
        ];

        $prices = [
            ['uom_id' => $this->pcsUom->id, 'price_tier' => PriceTier::Retail, 'price' => 35.0000],
            ['uom_id' => $this->pcsUom->id, 'price_tier' => PriceTier::Wholesale, 'price' => 31.0000],
            ['uom_id' => $this->boxUom->id, 'price_tier' => PriceTier::Retail, 'price' => 170.0000],
            ['uom_id' => $this->boxUom->id, 'price_tier' => PriceTier::Wholesale, 'price' => 150.0000],
        ];

        $item = $this->itemService->createItem($itemData, $units, $prices);

        $this->assertEquals('SUGAR-10KG', $item->sku);
        $this->assertCount(2, $item->itemUnits);
        $this->assertCount(4, $item->prices);

        // Test barcode lookup for secondary unit
        $found = $this->itemService->getItemByBarcode('6289990001112');
        $this->assertNotNull($found);
        $this->assertEquals($item->id, $found->id);
    }

    public function test_auto_creates_base_unit_if_not_in_units_array(): void
    {
        $item = $this->itemService->createItem([
            'sku' => 'SALT-1KG',
            'barcode' => '6289990002222',
            'name_ar' => 'ملح طعام ناعم 1 كجم',
            'category_id' => $this->category->id,
            'tax_category_id' => $this->taxCategory->id,
            'base_uom_id' => $this->pcsUom->id,
        ]);

        $this->assertCount(1, $item->itemUnits);
        $baseUnit = $item->getBaseItemUnit();
        $this->assertNotNull($baseUnit);
        $this->assertEquals($this->pcsUom->id, $baseUnit->uom_id);
        $this->assertTrue($baseUnit->is_base_unit);
    }

    public function test_cannot_create_duplicate_sku(): void
    {
        $this->itemService->createItem([
            'sku' => 'PASTA-500G',
            'name_ar' => 'مكرونة قودي 500 جم',
            'category_id' => $this->category->id,
            'tax_category_id' => $this->taxCategory->id,
            'base_uom_id' => $this->pcsUom->id,
        ]);

        $this->expectException(ValidationException::class);

        $this->itemService->createItem([
            'sku' => 'PASTA-500G',
            'name_ar' => 'مكرونة مكررة',
            'category_id' => $this->category->id,
            'tax_category_id' => $this->taxCategory->id,
            'base_uom_id' => $this->pcsUom->id,
        ]);
    }

    public function test_can_convert_quantity_between_different_uoms(): void
    {
        $item = $this->itemService->createItem(
            [
                'sku' => 'TUNA-185G',
                'name_ar' => 'تونا ريو ماري 185 جم',
                'category_id' => $this->category->id,
                'tax_category_id' => $this->taxCategory->id,
                'base_uom_id' => $this->pcsUom->id,
            ],
            [
                ['uom_id' => $this->pcsUom->id, 'conversion_factor' => 1.0, 'is_base_unit' => true],
                ['uom_id' => $this->boxUom->id, 'conversion_factor' => 24.0, 'is_base_unit' => false],
            ]
        );

        // 3 Boxes -> Pieces (3 * 24 = 72)
        $pcs = $this->itemService->convertQuantity($item, 3, $this->boxUom->id, $this->pcsUom->id);
        $this->assertEquals('72.0000', $pcs);

        // 48 Pieces -> Boxes (48 / 24 = 2)
        $boxes = $this->itemService->convertQuantity($item, 48, $this->pcsUom->id, $this->boxUom->id);
        $this->assertEquals('2.0000', $boxes);
    }

    public function test_can_resolve_price_for_tier(): void
    {
        $item = $this->itemService->createItem(
            [
                'sku' => 'CHEESE-500G',
                'name_ar' => 'جبنة كرافت 500 جم',
                'category_id' => $this->category->id,
                'tax_category_id' => $this->taxCategory->id,
                'base_uom_id' => $this->pcsUom->id,
            ],
            [
                ['uom_id' => $this->pcsUom->id, 'conversion_factor' => 1.0, 'is_base_unit' => true],
            ],
            [
                ['uom_id' => $this->pcsUom->id, 'price_tier' => PriceTier::Retail, 'price' => 22.0000],
                ['uom_id' => $this->pcsUom->id, 'price_tier' => PriceTier::Wholesale, 'price' => 19.5000],
            ]
        );

        $retail = $this->itemService->resolvePrice($item, $this->pcsUom->id, PriceTier::Retail);
        $this->assertNotNull($retail);
        $this->assertEquals(22.00, (float) $retail->price);

        $wholesale = $this->itemService->resolvePrice($item, $this->pcsUom->id, PriceTier::Wholesale);
        $this->assertNotNull($wholesale);
        $this->assertEquals(19.50, (float) $wholesale->price);
    }

    public function test_cannot_delete_category_with_existing_items(): void
    {
        $this->itemService->createItem([
            'sku' => 'ITEM-IN-CAT',
            'name_ar' => 'صنف مرتبط بالتصنيف',
            'category_id' => $this->category->id,
            'tax_category_id' => $this->taxCategory->id,
            'base_uom_id' => $this->pcsUom->id,
        ]);

        $this->expectException(ValidationException::class);
        $this->categoryService->deleteCategory($this->category->id);
    }
}
