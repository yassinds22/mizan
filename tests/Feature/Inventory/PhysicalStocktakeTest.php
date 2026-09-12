<?php

declare(strict_types=1);

namespace Tests\Feature\Inventory;

use App\Domains\Accounting\Models\Account;
use App\Domains\Core\Models\Branch;
use App\Domains\Inventory\Enums\StocktakeStatus;
use App\Domains\Inventory\Models\ItemBatch;
use App\Domains\Inventory\Models\PhysicalStocktake;
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

class PhysicalStocktakeTest extends TestCase
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

    public function test_can_create_stocktake_session_and_snapshot_book_quantities(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();

        $response = $this->postJson('/api/v1/inventory/stocktakes', [
            'warehouse_id' => $warehouse->id,
            'stocktake_date' => '2026-09-12',
            'scope' => 'full',
            'supervisor_name' => 'لجنة الجرد السنوي',
            'notes' => 'جرد تجريبي شامل',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.warehouse_id', $warehouse->id)
            ->assertJsonPath('data.status', 'in_progress');

        $this->assertDatabaseHas('physical_stocktakes', [
            'warehouse_id' => $warehouse->id,
            'status' => 'in_progress',
        ]);

        $stocktake = PhysicalStocktake::first();
        $this->assertGreaterThan(0, $stocktake->lines()->count());
        $this->assertNotNull($stocktake->lines()->first()->book_quantity);
    }

    public function test_can_update_physical_counts_with_shortage_and_surplus(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();

        $session = $this->postJson('/api/v1/inventory/stocktakes', [
            'warehouse_id' => $warehouse->id,
            'stocktake_date' => '2026-09-12',
        ])->json('data');

        /** @var PhysicalStocktake $stocktake */
        $stocktake = PhysicalStocktake::findOrFail($session['id']);
        $lines = $stocktake->lines;
        $this->assertGreaterThanOrEqual(1, $lines->count());

        $firstLine = $lines[0];
        $bookQty = (float) $firstLine->book_quantity;
        // افتعال عجز بـ 5 وحدات
        $newCount = max(0, $bookQty - 5.0);

        $countsPayload = [
            'counts' => [
                [
                    'line_id' => $firstLine->id,
                    'counted_quantity' => $newCount,
                    'variance_reason' => 'سوء تخزين وتلف رطوبة',
                    'notes' => 'تم الفحص بحضور أمين المستودع',
                ],
            ],
        ];

        $updateRes = $this->putJson("/api/v1/inventory/stocktakes/{$stocktake->id}/counts", $countsPayload);
        $updateRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $firstLine->refresh();
        $this->assertEquals($newCount, (float) $firstLine->counted_quantity);
        $this->assertEquals($newCount - $bookQty, (float) $firstLine->difference_quantity);
        $this->assertEquals('سوء تخزين وتلف رطوبة', $firstLine->variance_reason);

        $stocktake->refresh();
        $this->assertGreaterThan(0, (float) $stocktake->total_shortage_value);
    }

    public function test_can_post_stocktake_reconcile_balances_and_generate_balanced_gl_journal(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();

        /** @var PhysicalStocktake $stocktake */
        $stocktake = PhysicalStocktake::create([
            'stocktake_number' => 'STK-2026-TEST',
            'branch_id' => Branch::first()->id,
            'warehouse_id' => $warehouse->id,
            'stocktake_date' => '2026-09-12',
            'status' => StocktakeStatus::IN_PROGRESS,
            'scope' => 'full',
        ]);

        $item1 = Item::where('name_ar', 'like', '%سكر%')->first() ?? Item::first();
        $item2 = Item::where('id', '!=', $item1->id)->first();

        // سطر 1: عجز (Book = 50, Counted = 45 -> Diff = -5)
        $lineShortage = $stocktake->lines()->create([
            'item_id' => $item1->id,
            'book_quantity' => 50.0,
            'counted_quantity' => 45.0,
            'difference_quantity' => -5.0,
            'unit_cost' => 10.0,
            'difference_value' => -50.0,
            'variance_reason' => 'عجز جرد',
        ]);

        // سطر 2: فائض (Book = 20, Counted = 23 -> Diff = +3)
        $lineSurplus = $stocktake->lines()->create([
            'item_id' => $item2->id,
            'book_quantity' => 20.0,
            'counted_quantity' => 23.0,
            'difference_quantity' => 3.0,
            'unit_cost' => 15.0,
            'difference_value' => 45.0,
            'variance_reason' => 'فائض جرد',
        ]);

        // تهيئة أرصدة ابتدائية للأصناف
        StockBalance::updateOrCreate(
            ['item_id' => $item1->id, 'warehouse_id' => $warehouse->id, 'location_id' => null, 'batch_id' => null],
            ['quantity' => 50.0, 'reserved_quantity' => 0, 'unit_cost' => 10.0]
        );
        StockBalance::updateOrCreate(
            ['item_id' => $item2->id, 'warehouse_id' => $warehouse->id, 'location_id' => null, 'batch_id' => null],
            ['quantity' => 20.0, 'reserved_quantity' => 0, 'unit_cost' => 15.0]
        );

        // تنفيذ الترحيل الفعلي
        $postRes = $this->postJson("/api/v1/inventory/stocktakes/{$stocktake->id}/post");
        $postRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'posted');

        $stocktake->refresh();
        $this->assertEquals(StocktakeStatus::POSTED, $stocktake->status);
        $this->assertNotNull($stocktake->posted_at);
        $this->assertNotNull($stocktake->stock_movement_id);

        // التحقق من تحديث الأرصدة إلى الكميات المجرودة الفعلية تماماً
        $bal1 = StockBalance::where('item_id', $item1->id)->where('warehouse_id', $warehouse->id)->whereNull('location_id')->whereNull('batch_id')->first();
        $bal2 = StockBalance::where('item_id', $item2->id)->where('warehouse_id', $warehouse->id)->whereNull('location_id')->whereNull('batch_id')->first();
        $this->assertEquals(45.0, (float) $bal1->quantity);
        $this->assertEquals(23.0, (float) $bal2->quantity);

        // التحقق من تسجيل الحركات في دفتر أستاذ المخزون (Stock Ledger)
        $this->assertDatabaseHas('stock_ledger_entries', [
            'item_id' => $item1->id,
            'warehouse_id' => $warehouse->id,
            'quantity_delta' => -5.0,
        ]);
        $this->assertDatabaseHas('stock_ledger_entries', [
            'item_id' => $item2->id,
            'warehouse_id' => $warehouse->id,
            'quantity_delta' => 3.0,
        ]);

        // التحقق من سلامة القيد المحاسبي المزدوج (حساب 5140 للعجز، وحساب 4210 للفائض)
        $shortageAccount = Account::where('code', '5140')->first();
        $surplusAccount = Account::where('code', '4210')->first();
        $inventoryAccount = Account::where('code', '1131')->first();

        $this->assertDatabaseHas('journal_entry_lines', [
            'account_id' => $shortageAccount->id,
            'debit' => 50.0,
            'credit' => 0.0,
        ]);
        $this->assertDatabaseHas('journal_entry_lines', [
            'account_id' => $inventoryAccount->id,
            'debit' => 0.0,
            'credit' => 50.0,
        ]);
        $this->assertDatabaseHas('journal_entry_lines', [
            'account_id' => $inventoryAccount->id,
            'debit' => 45.0,
            'credit' => 0.0,
        ]);
        $this->assertDatabaseHas('journal_entry_lines', [
            'account_id' => $surplusAccount->id,
            'debit' => 0.0,
            'credit' => 45.0,
        ]);
    }

    public function test_strict_immutability_rejects_double_post(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();

        $stocktake = PhysicalStocktake::create([
            'stocktake_number' => 'STK-2026-DOUBLE',
            'branch_id' => Branch::first()->id,
            'warehouse_id' => $warehouse->id,
            'stocktake_date' => '2026-09-12',
            'status' => StocktakeStatus::IN_PROGRESS,
        ]);

        // الترحيل الأول: ينجح
        $res1 = $this->postJson("/api/v1/inventory/stocktakes/{$stocktake->id}/post");
        $res1->assertStatus(200);

        // الترحيل الثاني: يجب أن يُرفض قطعاً برمز 422
        $res2 = $this->postJson("/api/v1/inventory/stocktakes/{$stocktake->id}/post");
        $res2->assertStatus(422);
    }

    public function test_strict_immutability_rejects_editing_counts_on_posted_stocktake(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();

        $stocktake = PhysicalStocktake::create([
            'stocktake_number' => 'STK-2026-LOCKED',
            'branch_id' => Branch::first()->id,
            'warehouse_id' => $warehouse->id,
            'stocktake_date' => '2026-09-12',
            'status' => StocktakeStatus::POSTED,
            'posted_at' => now(),
        ]);

        $line = $stocktake->lines()->create([
            'item_id' => Item::first()->id,
            'book_quantity' => 10.0,
            'counted_quantity' => 10.0,
            'difference_quantity' => 0.0,
            'unit_cost' => 5.0,
            'difference_value' => 0.0,
        ]);

        // محاولة تعديل العد بعد الترحيل: ترفض
        $res = $this->putJson("/api/v1/inventory/stocktakes/{$stocktake->id}/counts", [
            'counts' => [
                ['line_id' => $line->id, 'counted_quantity' => 9.0],
            ],
        ]);

        $res->assertStatus(422);
    }

    public function test_cannot_post_cancelled_stocktake(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();

        $stocktake = PhysicalStocktake::create([
            'stocktake_number' => 'STK-2026-CANCELLED',
            'branch_id' => Branch::first()->id,
            'warehouse_id' => $warehouse->id,
            'stocktake_date' => '2026-09-12',
            'status' => StocktakeStatus::CANCELLED,
        ]);

        $res = $this->postJson("/api/v1/inventory/stocktakes/{$stocktake->id}/post");
        $res->assertStatus(422);
    }

    public function test_blind_counting_starts_with_zero_counted_quantity(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();

        $response = $this->postJson('/api/v1/inventory/stocktakes', [
            'warehouse_id' => $warehouse->id,
            'stocktake_date' => '2026-09-12',
            'is_blind' => true,
        ]);

        $response->assertStatus(201);
        $stocktake = PhysicalStocktake::where('is_blind', true)->first();
        $this->assertNotNull($stocktake);

        if ($stocktake->lines()->count() > 0) {
            $this->assertEquals(0.0, (float) $stocktake->lines()->first()->counted_quantity);
        }
    }
}
