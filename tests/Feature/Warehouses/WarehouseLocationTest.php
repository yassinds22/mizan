<?php

declare(strict_types=1);

namespace Tests\Feature\Warehouses;

use App\Domains\Warehouses\Models\Warehouse;
use App\Domains\Warehouses\Models\WarehouseLocation;
use Database\Seeders\CoreSeeder;
use Database\Seeders\WarehouseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WarehouseLocationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            CoreSeeder::class,
            WarehouseSeeder::class,
        ]);
    }

    public function test_can_list_locations_for_warehouse_via_api(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();

        $response = $this->getJson("/api/v1/warehouses/{$warehouse->id}/locations");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data');

        $response->assertJsonFragment([
            'code' => 'LOC-A01',
            'name' => 'ممر أ — الرف الأول',
        ]);
    }

    public function test_can_create_location_in_warehouse(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();

        $payload = [
            'code' => 'LOC-A03',
            'name' => 'ممر أ — الرف الثالث العلوي',
            'type' => 'shelf',
            'capacity' => 120,
            'notes' => 'أصناف معلبات خفيفة',
        ];

        $response = $this->postJson("/api/v1/warehouses/{$warehouse->id}/locations", $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'LOC-A03')
            ->assertJsonPath('data.warehouse_id', $warehouse->id);

        $this->assertDatabaseHas('warehouse_locations', [
            'warehouse_id' => $warehouse->id,
            'code' => 'LOC-A03',
        ]);
    }

    public function test_cannot_create_duplicate_location_code_in_same_warehouse(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();

        $payload = [
            'code' => 'LOC-A01', // Already exists in WH-01
            'name' => 'موقع مكرر',
        ];

        $response = $this->postJson("/api/v1/warehouses/{$warehouse->id}/locations", $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_can_have_same_location_code_in_different_warehouses(): void
    {
        $wh1 = Warehouse::where('code', 'WH-01')->first();
        $wh2 = Warehouse::where('code', 'WH-02')->first();

        // LOC-A01 exists in WH-01, but does NOT exist in WH-02
        $payload = [
            'code' => 'LOC-A01',
            'name' => 'ممر أ في الثلاجة',
            'type' => 'shelf',
        ];

        $response = $this->postJson("/api/v1/warehouses/{$wh2->id}/locations", $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'LOC-A01')
            ->assertJsonPath('data.warehouse_id', $wh2->id);

        $this->assertDatabaseHas('warehouse_locations', [
            'warehouse_id' => $wh2->id,
            'code' => 'LOC-A01',
        ]);
    }

    public function test_can_update_location(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();
        $location = WarehouseLocation::where('warehouse_id', $warehouse->id)->where('code', 'LOC-A01')->first();

        $payload = [
            'name' => 'ممر أ — رف الوجبات الجافة',
            'capacity' => 250,
        ];

        $response = $this->putJson("/api/v1/warehouses/{$warehouse->id}/locations/{$location->id}", $payload);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'ممر أ — رف الوجبات الجافة')
            ->assertJsonPath('data.capacity', 250);

        $this->assertDatabaseHas('warehouse_locations', [
            'id' => $location->id,
            'name' => 'ممر أ — رف الوجبات الجافة',
            'capacity' => 250,
        ]);
    }

    public function test_can_delete_location(): void
    {
        $warehouse = Warehouse::where('code', 'WH-01')->first();
        $location = WarehouseLocation::where('warehouse_id', $warehouse->id)->where('code', 'LOC-B01')->first();

        $response = $this->deleteJson("/api/v1/warehouses/{$warehouse->id}/locations/{$location->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSoftDeleted('warehouse_locations', [
            'id' => $location->id,
        ]);
    }
}
