<?php

declare(strict_types=1);

namespace Tests\Feature\Products;

use App\Domains\Accounting\Enums\AccountNature;
use App\Domains\Accounting\Enums\AccountType;
use App\Domains\Accounting\Models\Account;
use App\Domains\Products\Enums\PriceTier;
use App\Domains\Products\Enums\StorageCondition;
use App\Domains\Products\Models\Item;
use App\Domains\Products\Models\ItemCategory;
use App\Domains\Products\Models\ItemUnit;
use App\Domains\Products\Models\UnitOfMeasure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ItemApiTest extends TestCase
{
    use RefreshDatabase;

    private Account $invAccount;
    private Account $cogsAccount;
    private Account $revAccount;
    private UnitOfMeasure $piece;
    private UnitOfMeasure $carton;
    private ItemCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->invAccount = Account::create([
            'code' => '113101',
            'name_ar' => 'مخزون مواد غذائية جافة',
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
            'level' => 3,
            'is_leaf' => true,
            'is_active' => true,
        ]);

        $this->cogsAccount = Account::create([
            'code' => '511001',
            'name_ar' => 'تكلفة مبيعات المواد الجافة',
            'type' => AccountType::Expense,
            'nature' => AccountNature::Debit,
            'level' => 3,
            'is_leaf' => true,
            'is_active' => true,
        ]);

        $this->revAccount = Account::create([
            'code' => '411001',
            'name_ar' => 'إيراد مبيعات الأغذية الجافة',
            'type' => AccountType::Revenue,
            'nature' => AccountNature::Credit,
            'level' => 3,
            'is_leaf' => true,
            'is_active' => true,
        ]);

        $this->piece = UnitOfMeasure::create([
            'code' => 'PCS',
            'name_ar' => 'حبة',
            'symbol' => 'حبة',
        ]);

        $this->carton = UnitOfMeasure::create([
            'code' => 'CTN',
            'name_ar' => 'كرتونة',
            'symbol' => 'كرتونة',
        ]);

        $this->category = ItemCategory::create([
            'code' => 'DRY',
            'name_ar' => 'أغذية جافة',
            'inventory_account_id' => $this->invAccount->id,
            'cogs_account_id' => $this->cogsAccount->id,
            'revenue_account_id' => $this->revAccount->id,
        ]);
    }

    public function test_can_list_and_create_units_of_measure(): void
    {
        $response = $this->getJson('/api/v1/products/units-of-measure');
        $response->assertOk()
            ->assertJsonCount(2, 'data');

        $createRes = $this->postJson('/api/v1/products/units-of-measure', [
            'code' => 'KG',
            'name_ar' => 'كيلوغرام',
            'symbol' => 'كغ',
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.code', 'KG');

        $this->assertDatabaseHas('units_of_measure', ['code' => 'KG']);
    }

    public function test_can_list_and_create_categories_and_view_tree(): void
    {
        $createRes = $this->postJson('/api/v1/products/categories', [
            'code' => 'RICE',
            'name_ar' => 'أرز وبقوليات',
            'parent_id' => $this->category->id,
            'inventory_account_id' => $this->invAccount->id,
            'cogs_account_id' => $this->cogsAccount->id,
            'revenue_account_id' => $this->revAccount->id,
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.code', 'RICE')
            ->assertJsonPath('data.parent_id', $this->category->id);

        $treeRes = $this->getJson('/api/v1/products/categories/tree');
        $treeRes->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.children.0.code', 'RICE');
    }

    public function test_can_create_item_with_multi_uom_and_prices_via_api(): void
    {
        $payload = [
            'sku' => 'PASTA-500G',
            'barcode' => '6281001002001',
            'name_ar' => 'مكرونة قودي 500 جرام',
            'category_id' => $this->category->id,
            'base_uom_id' => $this->piece->id,
            'storage_condition' => StorageCondition::Ambient->value,
            'cost_price' => 3.50,
            'units' => [
                [
                    'uom_id' => $this->piece->id,
                    'conversion_factor' => 1.0,
                    'barcode' => '6281001002001',
                    'is_base_unit' => true,
                    'prices' => [
                        [
                            'price_tier' => PriceTier::Retail->value,
                            'price' => 5.00,
                        ],
                        [
                            'price_tier' => PriceTier::Wholesale->value,
                            'price' => 4.20,
                        ],
                    ],
                ],
                [
                    'uom_id' => $this->carton->id,
                    'conversion_factor' => 20.0,
                    'barcode' => '6281001002020',
                    'is_base_unit' => false,
                    'prices' => [
                        [
                            'price_tier' => PriceTier::Retail->value,
                            'price' => 95.00,
                        ],
                        [
                            'price_tier' => PriceTier::Wholesale->value,
                            'price' => 80.00,
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/products/items', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.sku', 'PASTA-500G')
            ->assertJsonCount(2, 'data.units');

        $this->assertDatabaseHas('items', ['sku' => 'PASTA-500G']);
        $this->assertDatabaseHas('item_units', ['barcode' => '6281001002020']);
        $this->assertDatabaseHas('item_prices', ['price' => 80.00]);
    }

    public function test_can_find_item_by_barcode(): void
    {
        $item = Item::create([
            'sku' => 'BISCUIT-01',
            'barcode' => '6289999990001',
            'name_ar' => 'بسكويت شاي',
            'category_id' => $this->category->id,
            'base_uom_id' => $this->piece->id,
            'storage_condition' => StorageCondition::Ambient,
        ]);

        $unitCtn = ItemUnit::create([
            'item_id' => $item->id,
            'uom_id' => $this->carton->id,
            'conversion_factor' => 24.0,
            'barcode' => '6289999990024',
            'is_base_unit' => false,
        ]);

        // البحث بباركود الصنف الرئيسي
        $res1 = $this->getJson('/api/v1/products/items/barcode/6289999990001');
        $res1->assertOk()
            ->assertJsonPath('item.sku', 'BISCUIT-01');

        // البحث بباركود الكرتونة المخصص
        $res2 = $this->getJson('/api/v1/products/items/barcode/6289999990024');
        $res2->assertOk()
            ->assertJsonPath('item.sku', 'BISCUIT-01')
            ->assertJsonPath('matched_unit.barcode', '6289999990024');
    }

    public function test_can_convert_quantity_api(): void
    {
        $item = Item::create([
            'sku' => 'SUGAR-50K',
            'name_ar' => 'سكر ناعم',
            'category_id' => $this->category->id,
            'base_uom_id' => $this->piece->id,
            'storage_condition' => StorageCondition::Ambient,
        ]);

        ItemUnit::create([
            'item_id' => $item->id,
            'uom_id' => $this->piece->id,
            'conversion_factor' => 1.0,
            'is_base_unit' => true,
        ]);

        ItemUnit::create([
            'item_id' => $item->id,
            'uom_id' => $this->carton->id,
            'conversion_factor' => 10.0,
            'is_base_unit' => false,
        ]);

        // تحويل 5 كراتين إلى حبات => 50 حبة
        $response = $this->postJson("/api/v1/products/items/{$item->id}/convert-quantity", [
            'quantity' => 5,
            'from_uom_id' => $this->carton->id,
            'to_uom_id' => $this->piece->id,
        ]);

        $response->assertOk()
            ->assertJsonPath('original_quantity', 5)
            ->assertJsonPath('converted_quantity', 50);
    }
}
