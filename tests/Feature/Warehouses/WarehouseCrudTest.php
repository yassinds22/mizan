<?php

declare(strict_types=1);

namespace Tests\Feature\Warehouses;

use App\Domains\Core\Models\Branch;
use App\Domains\Warehouses\Enums\WarehouseType;
use App\Domains\Warehouses\Models\Warehouse;
use Database\Seeders\CoreSeeder;
use Database\Seeders\WarehouseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WarehouseCrudTest extends TestCase
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

    public function test_can_list_warehouses_via_api(): void
    {
        $response = $this->getJson('/api/v1/warehouses');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(4, 'data');

        $response->assertJsonFragment([
            'code' => 'WH-01',
            'name' => 'المستودع الرئيسي',
        ]);
    }

    public function test_can_filter_warehouses_by_search_and_active(): void
    {
        $response = $this->getJson('/api/v1/warehouses?search=الثلاجة');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data'); // الثلاجة 1 والثلاجة 2
    }

    public function test_can_create_warehouse_via_api(): void
    {
        $branch = Branch::first();

        $payload = [
            'branch_id' => $branch->id,
            'code' => 'WH-05',
            'name' => 'مستودع التمور الجاف',
            'type' => 'dry',
            'capacity' => 500,
            'notes' => 'مخصص لتخزين التمور الفاخرة',
        ];

        $response = $this->postJson('/api/v1/warehouses', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'WH-05')
            ->assertJsonPath('data.temp_range', '18–22°م'); // auto filled

        $this->assertDatabaseHas('warehouses', [
            'code' => 'WH-05',
            'name' => 'مستودع التمور الجاف',
        ]);
    }

    public function test_cannot_create_warehouse_with_duplicate_code(): void
    {
        $branch = Branch::first();

        $payload = [
            'branch_id' => $branch->id,
            'code' => 'WH-01', // Already exists in seeder
            'name' => 'مستودع مكرر',
            'type' => 'dry',
        ];

        $response = $this->postJson('/api/v1/warehouses', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_can_update_warehouse_via_api(): void
    {
        $warehouse = Warehouse::where('code', 'WH-02')->first();

        $payload = [
            'name' => 'ثلاجة الألبان الحديثة',
            'capacity' => 350,
            'temp_range' => '1–4°م',
        ];

        $response = $this->putJson("/api/v1/warehouses/{$warehouse->id}", $payload);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'ثلاجة الألبان الحديثة')
            ->assertJsonPath('data.capacity', 350)
            ->assertJsonPath('data.temp_range', '1–4°م');

        $this->assertDatabaseHas('warehouses', [
            'id' => $warehouse->id,
            'name' => 'ثلاجة الألبان الحديثة',
            'capacity' => 350,
        ]);
    }

    public function test_can_delete_warehouse_via_api(): void
    {
        $warehouse = Warehouse::where('code', 'WH-04')->first();

        $response = $this->deleteJson("/api/v1/warehouses/{$warehouse->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSoftDeleted('warehouses', [
            'id' => $warehouse->id,
        ]);
    }
}
