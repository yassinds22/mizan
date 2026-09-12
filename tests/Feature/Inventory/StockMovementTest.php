<?php

declare(strict_types=1);

namespace Tests\Feature\Inventory;

use App\Domains\Core\Models\Branch;
use App\Domains\Inventory\Enums\MovementStatus;
use App\Domains\Inventory\Enums\MovementType;
use App\Domains\Inventory\Models\ItemBatch;
use App\Domains\Inventory\Models\StockBalance;
use App\Domains\Inventory\Models\StockLedgerEntry;
use App\Domains\Inventory\Models\StockMovement;
use App\Domains\Inventory\Services\StockBalanceService;
use App\Domains\Inventory\Services\StockMovementService;
use App\Domains\Products\Models\Item;
use App\Domains\Warehouses\Models\Warehouse;
use App\Domains\Warehouses\Models\WarehouseLocation;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\ItemBatchSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\StockBalanceSeeder;
use Database\Seeders\WarehouseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class StockMovementTest extends TestCase
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

    public function test_can_create_draft_stock_movement_with_lines_via_api(): void
    {
        $branch = Branch::first();
        $wh1 = Warehouse::where('code', 'WH-01')->first();
        $wh2 = Warehouse::where('code', 'WH-02')->first();
        $item = Item::where('name_ar', 'like', '%زيت%')->first();
        $batch = ItemBatch::where('item_id', $item->id)->first();

        $payload = [
            'movement_type' => 'transfer',
            'movement_date' => '2026-09-12',
            'branch_id' => $branch->id,
            'from_warehouse_id' => $wh1->id,
            'to_warehouse_id' => $wh2->id,
            'reason' => 'إعادة توزيع بين المستودعات',
            'lines' => [
                [
                    'item_id' => $item->id,
                    'batch_id' => $batch?->id,
                    'quantity' => 15,
                    'unit_cost' => 18.0,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/inventory/movements', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.lines.0.quantity', '15.0000');

        $this->assertDatabaseHas('stock_movements', [
            'movement_type' => 'transfer',
            'status' => 'draft',
        ]);
    }

    public function test_post_transfer_movement_moves_stock_and_creates_ledger_entries(): void
    {
        $service = app(StockMovementService::class);
        $branch = Branch::first();
        $whMain = Warehouse::where('code', 'WH-01')->first();
        $whChiller = Warehouse::where('code', 'WH-02')->first();

        $oil = Item::where('name_ar', 'like', '%زيت%')->first();
        $initialBalance = StockBalance::where('item_id', $oil->id)
            ->where('warehouse_id', $whMain->id)
            ->first();

        $this->assertNotNull($initialBalance);
        $this->assertEquals(120.0, (float) $initialBalance->quantity);

        // Create and post transfer of 20 units to WH-02
        $movement = $service->createMovement([
            'movement_type' => MovementType::TRANSFER,
            'movement_date' => '2026-09-12',
            'branch_id' => $branch->id,
            'from_warehouse_id' => $whMain->id,
            'to_warehouse_id' => $whChiller->id,
            'reason' => 'تحويل زيت إلى الثلاجة',
        ], [
            [
                'item_id' => $oil->id,
                'from_location_id' => $initialBalance->location_id,
                'to_location_id' => null,
                'batch_id' => $initialBalance->batch_id,
                'quantity' => 20.0,
                'unit_cost' => 18.0,
            ],
        ]);

        $posted = $service->postMovement($movement->id);

        $this->assertEquals(MovementStatus::POSTED, $posted->status);
        $this->assertNull($posted->journal_entry_id); // No P&L effect for internal transfers

        // Verify balances
        $afterWh1 = StockBalance::where('item_id', $oil->id)
            ->where('warehouse_id', $whMain->id)
            ->where('batch_id', $initialBalance->batch_id)
            ->value('quantity');
        $afterWh2 = StockBalance::where('item_id', $oil->id)
            ->where('warehouse_id', $whChiller->id)
            ->where('batch_id', $initialBalance->batch_id)
            ->value('quantity');

        $this->assertEquals(100.0, (float) $afterWh1);
        $this->assertEquals(20.0, (float) $afterWh2);

        // Verify Stock Ledger Entries (2 entries: -20 in WH1, +20 in WH2)
        $this->assertDatabaseHas('stock_ledger_entries', [
            'voucher_type' => 'stock_movement',
            'voucher_id' => $posted->id,
            'warehouse_id' => $whMain->id,
            'quantity_delta' => -20.0,
        ]);

        $this->assertDatabaseHas('stock_ledger_entries', [
            'voucher_type' => 'stock_movement',
            'voucher_id' => $posted->id,
            'warehouse_id' => $whChiller->id,
            'quantity_delta' => 20.0,
        ]);
    }

    public function test_post_waste_movement_deducts_stock_and_creates_balanced_journal_entry(): void
    {
        $service = app(StockMovementService::class);
        $branch = Branch::first();
        $whChiller = Warehouse::where('code', 'WH-02')->first();
        $milk = Item::where('name_ar', 'like', '%حليب%')->first();
        $batch = ItemBatch::where('batch_number', 'B-4491')->first();
        $loc = WarehouseLocation::where('code', 'LOC-C01')->first();

        // 1. Create and post waste of 10 units of expired milk
        $movement = $service->createMovement([
            'movement_type' => MovementType::WASTE,
            'movement_date' => '2026-09-12',
            'branch_id' => $branch->id,
            'from_warehouse_id' => $whChiller->id,
            'to_warehouse_id' => null,
            'reason' => 'إهلاك دفعة منتهية الصلاحية B-4491',
        ], [
            [
                'item_id' => $milk->id,
                'from_location_id' => $loc?->id,
                'batch_id' => $batch->id,
                'quantity' => 10.0,
                'unit_cost' => 4.50,
            ],
        ]);

        $posted = $service->postMovement($movement->id);

        $this->assertEquals(MovementStatus::POSTED, $posted->status);
        $this->assertNotNull($posted->journal_entry_id);

        // 2. Verify Journal Entry
        $journal = $posted->journalEntry;
        $this->assertNotNull($journal);
        $this->assertEquals(45.0, (float) $journal->total_debit);
        $this->assertEquals(45.0, (float) $journal->total_credit);

        // Debit: Spoilage / Waste (5130)
        $this->assertTrue(
            $journal->lines->contains(fn ($l) => $l->account->code === '5130' && (float) $l->debit === 45.0)
        );

        // Credit: Inventory (1131)
        $this->assertTrue(
            $journal->lines->contains(fn ($l) => $l->account->code === '1131' && (float) $l->credit === 45.0)
        );

        // 3. Verify Stock Ledger has negative entry
        $this->assertDatabaseHas('stock_ledger_entries', [
            'voucher_type' => 'stock_movement',
            'voucher_id' => $posted->id,
            'quantity_delta' => -10.0,
        ]);
    }

    public function test_shortage_prevention_rejects_movement_if_quantity_exceeds_available(): void
    {
        $this->expectException(ValidationException::class);

        $service = app(StockMovementService::class);
        $branch = Branch::first();
        $wh = Warehouse::where('code', 'WH-01')->first();
        $item = Item::first();

        // Attempt to move 99,999 units
        $movement = $service->createMovement([
            'movement_type' => MovementType::TRANSFER,
            'movement_date' => '2026-09-12',
            'branch_id' => $branch->id,
            'from_warehouse_id' => $wh->id,
            'to_warehouse_id' => null,
        ], [
            [
                'item_id' => $item->id,
                'quantity' => 99999.0,
            ],
        ]);

        $service->postMovement($movement->id);
    }

    public function test_can_cancel_posted_movement_and_reverse_inventory_and_journal(): void
    {
        $service = app(StockMovementService::class);
        $branch = Branch::first();
        $whChiller = Warehouse::where('code', 'WH-02')->first();
        $milk = Item::where('name_ar', 'like', '%حليب%')->first();
        $batch = ItemBatch::where('batch_number', 'B-4491')->first();
        $loc = WarehouseLocation::where('code', 'LOC-C01')->first();

        // Post waste of 5 units
        $movement = $service->createMovement([
            'movement_type' => MovementType::WASTE,
            'movement_date' => '2026-09-12',
            'branch_id' => $branch->id,
            'from_warehouse_id' => $whChiller->id,
        ], [
            [
                'item_id' => $milk->id,
                'from_location_id' => $loc?->id,
                'batch_id' => $batch->id,
                'quantity' => 5.0,
                'unit_cost' => 4.50,
            ],
        ]);

        $posted = $service->postMovement($movement->id);
        $journalId = $posted->journal_entry_id;

        // Now Cancel the movement
        $cancelled = $service->cancelMovement($posted->id);

        $this->assertEquals(MovementStatus::CANCELLED, $cancelled->status);

        // Journal Entry should be reversed
        $this->assertDatabaseHas('journal_entries', [
            'id' => $journalId,
            'status' => 'reversed',
        ]);

        // Stock Ledger should have offsetting reversal entry (+5.0)
        $this->assertDatabaseHas('stock_ledger_entries', [
            'voucher_type' => 'stock_movement_cancel',
            'voucher_id' => $posted->id,
            'quantity_delta' => 5.0,
        ]);
    }

    public function test_can_view_stock_ledger_via_api(): void
    {
        $response = $this->getJson('/api/v1/inventory/ledger');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'total'],
            ]);
    }
}
