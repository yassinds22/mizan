<?php

declare(strict_types=1);

namespace Tests\Feature\Inventory;

use App\Domains\Inventory\Models\ItemBatch;
use App\Domains\Inventory\Models\StockBalance;
use App\Domains\Inventory\Services\StockBalanceService;
use App\Domains\Products\Models\Item;
use App\Domains\Warehouses\Models\Warehouse;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\ItemBatchSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\StockBalanceSeeder;
use Database\Seeders\WarehouseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class StockBalanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            CoreSeeder::class,
            AccountingSeeder::class,
            ProductSeeder::class,
            WarehouseSeeder::class,
            ItemBatchSeeder::class,
            StockBalanceSeeder::class,
        ]);
    }

    public function test_can_list_stock_balances_via_api(): void
    {
        $response = $this->getJson('/api/v1/inventory/balances');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertArrayHasKey('available_quantity', $data[0]);
        $this->assertArrayHasKey('total_value', $data[0]);
    }

    public function test_can_filter_balances_by_warehouse(): void
    {
        $warehouse = Warehouse::where('code', 'WH-02')->first();

        $response = $this->getJson("/api/v1/inventory/balances?warehouse_id={$warehouse->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        foreach ($data as $row) {
            $this->assertEquals($warehouse->id, $row['warehouse_id']);
        }
    }

    public function test_can_get_item_stock_summary_via_api(): void
    {
        $item = Item::where('name_ar', 'like', '%حليب%')->first();

        $response = $this->getJson("/api/v1/inventory/balances/item/{$item->id}/summary");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.item_id', $item->id);

        $this->assertEquals(100.0, (float) $response->json('data.total_quantity')); // 40 + 60
    }

    public function test_adjust_balance_adds_and_deducts_accurately(): void
    {
        $service = app(StockBalanceService::class);
        $item = Item::first();
        $warehouse = Warehouse::first();

        // Initial add: +50
        $balance = $service->adjustBalance($item->id, $warehouse->id, null, null, 50.0, 10.0);
        $this->assertEquals(50.0, (float) $balance->quantity);

        // Deduct: -20
        $balance = $service->adjustBalance($item->id, $warehouse->id, null, null, -20.0);
        $this->assertEquals(30.0, (float) $balance->quantity);
    }

    public function test_cannot_deduct_more_than_available_balance(): void
    {
        $this->expectException(ValidationException::class);

        $service = app(StockBalanceService::class);
        $item = Item::first();
        $warehouse = Warehouse::first();

        // Attempting to deduct 9999 from zero or insufficient balance
        $service->adjustBalance($item->id, $warehouse->id, null, null, -9999.0);
    }

    public function test_syncs_item_stock_quantity_cache(): void
    {
        $service = app(StockBalanceService::class);
        $item = Item::where('name_ar', 'like', '%حليب%')->first();

        $this->assertEquals(100.0, (float) $item->fresh()->stock_quantity);

        $batch = ItemBatch::where('batch_number', 'B-4491')->first();
        $existing = StockBalance::where('item_id', $item->id)->where('batch_id', $batch->id)->first();

        // Deduct 10 from B-4491 at its location
        $service->adjustBalance($item->id, $existing->warehouse_id, $existing->location_id, $batch->id, -10.0);

        $this->assertEquals(90.0, (float) $item->fresh()->stock_quantity);
    }

    public function test_fefo_allocation_picks_earliest_expiring_batches(): void
    {
        $service = app(StockBalanceService::class);
        $item = Item::where('name_ar', 'like', '%حليب%')->first();

        // B-4491 (expires 2026-09-10, qty 40) vs B-4518 (expires 2026-10-02, qty 60)
        // Request 50 units
        $result = $service->allocateFefo($item->id, null, 50.0);

        $this->assertTrue($result['is_fully_allocated']);
        $this->assertEquals(50.0, $result['total_allocated']);
        $this->assertEquals(0.0, $result['shortage']);
        $this->assertCount(2, $result['allocations']);

        // First allocation must be B-4491 (earlier expiry)
        $this->assertEquals('B-4491', $result['allocations'][0]['batch_number']);
        $this->assertEquals(40.0, $result['allocations'][0]['allocated_quantity']);

        // Second allocation must be B-4518
        $this->assertEquals('B-4518', $result['allocations'][1]['batch_number']);
        $this->assertEquals(10.0, $result['allocations'][1]['allocated_quantity']);
    }

    public function test_fefo_allocation_api_endpoint(): void
    {
        $item = Item::where('name_ar', 'like', '%حليب%')->first();

        $response = $this->getJson("/api/v1/inventory/balances/allocate-fefo?item_id={$item->id}&quantity=25");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_fully_allocated', true)
            ->assertJsonPath('data.total_allocated', 25)
            ->assertJsonPath('data.allocations.0.batch_number', 'B-4491')
            ->assertJsonPath('data.allocations.0.allocated_quantity', 25);
    }
}

