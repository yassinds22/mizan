<?php

declare(strict_types=1);

namespace Tests\Feature\Products;

use App\Domains\Accounting\Enums\AccountNature;
use App\Domains\Accounting\Enums\AccountType;
use App\Domains\Accounting\Models\Account;
use App\Domains\Core\Models\TaxCategory;
use App\Domains\Products\Enums\PriceTier;
use App\Domains\Products\Enums\StorageCondition;
use App\Domains\Products\Models\Item;
use App\Domains\Products\Models\ItemCategory;
use App\Domains\Products\Models\ItemPrice;
use App\Domains\Products\Models\ItemUnit;
use App\Domains\Products\Models\UnitOfMeasure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ItemModelTest extends TestCase
{
    use RefreshDatabase;

    private ItemCategory $category;
    private UnitOfMeasure $pcsUom;
    private UnitOfMeasure $boxUom;
    private TaxCategory $taxCategory;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Setup GL Accounts for category linkage
        $inventoryAcc = Account::create([
            'code' => '1131',
            'name_ar' => 'مخزون الأغذية الجافة',
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
            'is_leaf' => true,
            'is_active' => true,
        ]);

        $cogsAcc = Account::create([
            'code' => '5110',
            'name_ar' => 'تكلفة مبيعات الأغذية الجافة',
            'type' => AccountType::Expense,
            'nature' => AccountNature::Debit,
            'is_leaf' => true,
            'is_active' => true,
        ]);

        $revAcc = Account::create([
            'code' => '4110',
            'name_ar' => 'مبيعات الأغذية الجافة',
            'type' => AccountType::Revenue,
            'nature' => AccountNature::Credit,
            'is_leaf' => true,
            'is_active' => true,
        ]);

        // 2. Setup Category with GL accounts
        $this->category = ItemCategory::create([
            'code' => 'DRY',
            'name_ar' => 'المواد الغذائية الجافة والمعلبات',
            'inventory_account_id' => $inventoryAcc->id,
            'cogs_account_id' => $cogsAcc->id,
            'revenue_account_id' => $revAcc->id,
            'is_active' => true,
        ]);

        // 3. Setup Units of Measure
        $this->pcsUom = UnitOfMeasure::create([
            'code' => 'PCS',
            'name_ar' => 'حبة',
            'name_en' => 'Piece',
            'is_active' => true,
        ]);

        $this->boxUom = UnitOfMeasure::create([
            'code' => 'BOX',
            'name_ar' => 'كرتون',
            'name_en' => 'Box',
            'is_active' => true,
        ]);

        // 4. Setup Tax Category
        $this->taxCategory = TaxCategory::create([
            'code' => 'STANDARD',
            'name' => 'ضريبة القيمة المضافة القياسية 15%',
            'is_active' => true,
        ]);
    }

    public function test_can_create_food_item_with_multi_uom_prices_and_relationships(): void
    {
        // 1. Create Item
        $item = Item::create([
            'sku' => 'OIL-CORN-1.5L',
            'barcode' => '6281001001001',
            'name_ar' => 'زيت ذرة عافية 1.5 لتر',
            'name_en' => 'Afia Corn Oil 1.5L',
            'category_id' => $this->category->id,
            'tax_category_id' => $this->taxCategory->id,
            'base_uom_id' => $this->pcsUom->id,
            'storage_condition' => StorageCondition::Ambient,
            'is_perishable' => true,
            'shelf_life_days' => 730,
            'reorder_level' => 20.0000,
            'cost_price' => 12.5000,
            'is_active' => true,
        ]);

        // Verify relationships
        $this->assertEquals($this->category->id, $item->category->id);
        $this->assertEquals('1131', $item->category->inventoryAccount->code);
        $this->assertEquals($this->taxCategory->id, $item->taxCategory->id);
        $this->assertEquals($this->pcsUom->id, $item->baseUom->id);
        $this->assertTrue($item->is_perishable);
        $this->assertEquals(StorageCondition::Ambient, $item->storage_condition);

        // 2. Add Base Unit (Piece)
        $pieceUnit = ItemUnit::create([
            'item_id' => $item->id,
            'uom_id' => $this->pcsUom->id,
            'conversion_factor' => 1.0000,
            'barcode' => '6281001001001',
            'is_base_unit' => true,
        ]);

        // 3. Add Secondary Unit (Box = 6 Pieces)
        $boxUnit = ItemUnit::create([
            'item_id' => $item->id,
            'uom_id' => $this->boxUom->id,
            'conversion_factor' => 6.0000,
            'barcode' => '6281001001002',
            'is_base_unit' => false,
        ]);

        // 4. Add Pricing Tiers
        ItemPrice::create([
            'item_unit_id' => $pieceUnit->id,
            'price_tier' => PriceTier::Retail,
            'price' => 16.5000,
        ]);

        ItemPrice::create([
            'item_unit_id' => $boxUnit->id,
            'price_tier' => PriceTier::Retail,
            'price' => 96.0000,
        ]);

        ItemPrice::create([
            'item_unit_id' => $boxUnit->id,
            'price_tier' => PriceTier::Wholesale,
            'price' => 88.0000,
        ]);

        // Refresh and test relationships
        $item->refresh();

        $this->assertCount(2, $item->itemUnits);
        $this->assertCount(2, $item->units);
        $this->assertCount(3, $item->prices);

        // Test Multi-UOM conversion
        // 5 Boxes -> Pieces: 5 * 6 = 30.0000
        $convertedToPcs = $item->convertQuantity(5, $this->boxUom->id, $this->pcsUom->id);
        $this->assertEquals('30.0000', $convertedToPcs);

        // 18 Pieces -> Boxes: 18 / 6 = 3.0000
        $convertedToBoxes = $item->convertQuantity(18, $this->pcsUom->id, $this->boxUom->id);
        $this->assertEquals('3.0000', $convertedToBoxes);

        // Test barcode lookup on ItemUnit
        $foundUnit = $item->findUnitByBarcode('6281001001002');
        $this->assertNotNull($foundUnit);
        $this->assertEquals($this->boxUom->id, $foundUnit->uom_id);

        // Test price for tier lookup
        $wholesalePrice = $boxUnit->priceForTier(PriceTier::Wholesale);
        $this->assertNotNull($wholesalePrice);
        $this->assertEquals(88.00, (float) $wholesalePrice->price);
    }
}
