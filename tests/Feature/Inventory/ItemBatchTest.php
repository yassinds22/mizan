<?php

declare(strict_types=1);

namespace Tests\Feature\Inventory;

use App\Domains\Inventory\Enums\BatchStatus;
use App\Domains\Inventory\Models\ItemBatch;
use App\Domains\Products\Models\Item;
use Carbon\Carbon;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\ItemBatchSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\WarehouseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ItemBatchTest extends TestCase
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
        ]);
    }

    public function test_can_list_batches_via_api(): void
    {
        $response = $this->getJson('/api/v1/inventory/batches');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertArrayHasKey('days_until_expiry', $data[0]);
        $this->assertArrayHasKey('is_expired', $data[0]);
        $this->assertArrayHasKey('is_near_expiry', $data[0]);
    }

    public function test_can_filter_batches_by_item_id(): void
    {
        $item = Item::first();

        $response = $this->getJson("/api/v1/inventory/batches?item_id={$item->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        foreach ($response->json('data') as $batch) {
            $this->assertEquals($item->id, $batch['item_id']);
        }
    }

    public function test_can_filter_near_expiry_batches(): void
    {
        $response = $this->getJson('/api/v1/inventory/batches?near_expiry=7');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertNotEmpty($data);

        foreach ($data as $batch) {
            $this->assertTrue($batch['is_near_expiry']);
        }
    }

    public function test_can_get_fefo_ordered_batches(): void
    {
        $milk = Item::where('name_ar', 'like', '%حليب%')->first();

        $response = $this->getJson("/api/v1/inventory/batches?item_id={$milk->id}&fefo=1");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        if (count($data) >= 2) {
            $this->assertLessThanOrEqual($data[1]['expiry_date'], $data[0]['expiry_date']);
        }
    }

    public function test_can_create_batch_via_api(): void
    {
        $item = Item::first();

        $payload = [
            'item_id' => $item->id,
            'batch_number' => 'LOT-2026-TEST',
            'production_date' => Carbon::now()->toDateString(),
            'expiry_date' => Carbon::now()->addDays(60)->toDateString(),
            'unit_cost' => 12.7500,
            'status' => 'active',
            'notes' => 'دفعة تجريبية جديدة',
        ];

        $response = $this->postJson('/api/v1/inventory/batches', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.batch_number', 'LOT-2026-TEST');

        $this->assertDatabaseHas('item_batches', [
            'item_id' => $item->id,
            'batch_number' => 'LOT-2026-TEST',
        ]);
    }

    public function test_cannot_create_duplicate_batch_number_for_same_item(): void
    {
        $batch = ItemBatch::first();

        $payload = [
            'item_id' => $batch->item_id,
            'batch_number' => $batch->batch_number, // duplicate
            'expiry_date' => Carbon::now()->addDays(30)->toDateString(),
        ];

        $response = $this->postJson('/api/v1/inventory/batches', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['batch_number']);
    }

    public function test_can_update_batch_via_api(): void
    {
        $batch = ItemBatch::first();

        $payload = [
            'unit_cost' => 19.5000,
            'notes' => 'تم تحديث تكلفة الشراء للدفعة',
        ];

        $response = $this->putJson("/api/v1/inventory/batches/{$batch->id}", $payload);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.unit_cost', '19.5000');

        $this->assertDatabaseHas('item_batches', [
            'id' => $batch->id,
            'unit_cost' => 19.5000,
        ]);
    }

    public function test_can_delete_batch_via_api(): void
    {
        $batch = ItemBatch::first();

        $response = $this->deleteJson("/api/v1/inventory/batches/{$batch->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSoftDeleted('item_batches', [
            'id' => $batch->id,
        ]);
    }
}
