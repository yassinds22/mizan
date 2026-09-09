<?php

declare(strict_types=1);

namespace Tests\Feature\Core;

use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
    }

    public function test_can_get_settings(): void
    {
        $response = $this->getJson('/api/v1/core/settings');

        $response->assertStatus(200)
            ->assertJsonPath('data.company_name', 'ميزان للتجارة الغذائية')
            ->assertJsonPath('data.base_currency_code', 'SAR');
    }

    public function test_can_update_settings(): void
    {
        $response = $this->postJson('/api/v1/core/settings', [
            'company_name' => 'شركة ميزان العالمية المحدودة',
            'city' => 'الدمام',
            'stock_policy' => 'FIFO',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.company_name', 'شركة ميزان العالمية المحدودة')
            ->assertJsonPath('data.city', 'الدمام')
            ->assertJsonPath('data.stock_policy', 'FIFO');

        $this->assertDatabaseHas('system_settings', [
            'key' => 'company_name',
            'value' => 'شركة ميزان العالمية المحدودة',
        ]);
    }
}
