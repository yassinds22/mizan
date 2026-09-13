<?php

declare(strict_types=1);

namespace Tests\Feature\Inventory;

use App\Domains\Core\Models\Branch;
use App\Domains\Inventory\Models\ItemBatch;
use App\Domains\Inventory\Models\StockBalance;
use App\Domains\Inventory\Models\StockLedgerEntry;
use App\Domains\Products\Models\Item;
use App\Domains\Warehouses\Models\Warehouse;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\ItemBatchSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\StockBalanceSeeder;
use Database\Seeders\WarehouseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryReportTest extends TestCase
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

    public function test_item_card_calculates_opening_balance_and_running_balance_deterministically(): void
    {
        $item = Item::first();
        $warehouse = Warehouse::first();

        // 1. إنشاء حركات في دفتر أستاذ المخزون
        // حركة ما قبل تاريخ البحث (لتكوين الرصيد الافتتاحي)
        StockLedgerEntry::create([
            'entry_number' => 'SLE-TEST-0001',
            'entry_date' => '2026-01-10',
            'item_id' => $item->id,
            'warehouse_id' => $warehouse->id,
            'voucher_type' => 'stock_movement',
            'voucher_id' => 1,
            'quantity_delta' => 100.0,
            'balance_after' => 100.0,
            'unit_cost' => 10.0,
            'total_value_delta' => 1000.0,
            'notes' => 'رصيد سابق دخول',
            'created_at' => '2026-01-10 10:00:00',
        ]);

        StockLedgerEntry::create([
            'entry_number' => 'SLE-TEST-0002',
            'entry_date' => '2026-01-20',
            'item_id' => $item->id,
            'warehouse_id' => $warehouse->id,
            'voucher_type' => 'stock_movement',
            'voucher_id' => 2,
            'quantity_delta' => -20.0,
            'balance_after' => 80.0,
            'unit_cost' => 10.0,
            'total_value_delta' => -200.0,
            'notes' => 'صرف سابق',
            'created_at' => '2026-01-20 12:00:00',
        ]);

        // حركتان داخل فترة التقرير المحددة (من 2026-02-01 إلى 2026-02-28)
        StockLedgerEntry::create([
            'entry_number' => 'SLE-TEST-0003',
            'entry_date' => '2026-02-05',
            'item_id' => $item->id,
            'warehouse_id' => $warehouse->id,
            'voucher_type' => 'stock_movement',
            'voucher_id' => 3,
            'quantity_delta' => 50.0,
            'balance_after' => 130.0,
            'unit_cost' => 12.0,
            'total_value_delta' => 600.0,
            'notes' => 'استلام فبراير',
            'created_at' => '2026-02-05 09:00:00',
        ]);

        StockLedgerEntry::create([
            'entry_number' => 'SLE-TEST-0004',
            'entry_date' => '2026-02-15',
            'item_id' => $item->id,
            'warehouse_id' => $warehouse->id,
            'voucher_type' => 'stock_movement',
            'voucher_id' => 4,
            'quantity_delta' => -30.0,
            'balance_after' => 100.0,
            'unit_cost' => 10.0,
            'total_value_delta' => -300.0,
            'notes' => 'صرف فبراير',
            'created_at' => '2026-02-15 14:00:00',
        ]);

        $response = $this->getJson("/api/v1/inventory/reports/item-card/{$item->id}?date_from=2026-02-01&date_to=2026-02-28&warehouse_id={$warehouse->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.summary.opening_quantity', 80)
            ->assertJsonPath('data.summary.opening_value', 800)
            ->assertJsonPath('data.summary.total_in_quantity', 50)
            ->assertJsonPath('data.summary.total_out_quantity', 30)
            ->assertJsonPath('data.summary.closing_quantity', 100)
            ->assertJsonPath('data.summary.closing_value', 1100);

        $transactions = $response->json('data.transactions');
        $this->assertCount(2, $transactions);
        $this->assertEquals(130, $transactions[0]['running_balance']);
        $this->assertEquals(100, $transactions[1]['running_balance']);
    }

    public function test_inventory_valuation_computes_cost_retail_and_margins(): void
    {
        $response = $this->getJson('/api/v1/inventory/reports/valuation');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertGreaterThan(0, $data['summary']['total_skus']);
        $this->assertGreaterThan(0, $data['summary']['total_quantity']);
        $this->assertGreaterThan(0, $data['summary']['total_cost_value']);
        $this->assertGreaterThan(0, $data['summary']['total_retail_value']);
        $this->assertNotEmpty($data['category_breakdown']);
    }

    public function test_inventory_reconciliation_dynamically_queries_inventory_accounts(): void
    {
        $response = $this->getJson('/api/v1/inventory/reports/reconciliation');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertArrayHasKey('status', $data);
        $this->assertArrayHasKey('summary', $data);
        $this->assertNotEmpty($data['accounts']);

        // التأكد من شمول الحسابات المخزنية ديناميكياً
        $accountCodes = collect($data['accounts'])->pluck('account_code')->all();
        $this->assertContains('1131', $accountCodes);
    }

    public function test_inventory_analytics_identifies_reorder_alerts_and_slow_moving_stock(): void
    {
        // تجهيز صنف تحت حد إعادة الطلب
        $item = Item::first();
        $item->update(['reorder_level' => 99999.0]);

        $response = $this->getJson('/api/v1/inventory/reports/analytics?days_threshold=30');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertArrayHasKey('summary', $data);
        $this->assertArrayHasKey('reorder_alerts', $data);
        $this->assertArrayHasKey('slow_moving_stock', $data);

        // الصنف ذو الحد العالي يجب أن يظهر في تنبيهات إعادة الطلب
        $alertItemIds = collect($data['reorder_alerts'])->pluck('item_id')->all();
        $this->assertContains($item->id, $alertItemIds);
    }
}
