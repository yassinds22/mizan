<?php

declare(strict_types=1);

namespace Tests\Feature\Core;

use App\Domains\Core\Models\TaxCategory;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaxCategoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
    }

    public function test_can_list_tax_categories(): void
    {
        $response = $this->getJson('/api/v1/core/tax-categories');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'code', 'name', 'label', 'current_rate', 'rates']
                ]
            ]);
    }

    public function test_can_calculate_tax(): void
    {
        $response = $this->postJson('/api/v1/core/tax-categories/calculate', [
            'taxable_amount' => 1000,
            'category' => 'STANDARD',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'rate' => 15,
                    'tax_amount' => 150,
                    'total_with_tax' => 1150,
                    'category_code' => 'STANDARD',
                ]
            ]);
    }

    public function test_can_add_new_tax_rate(): void
    {
        $standard = TaxCategory::where('code', 'STANDARD')->first();

        $response = $this->postJson("/api/v1/core/tax-categories/{$standard->id}/rates", [
            'rate' => 18.00,
            'valid_from' => '2027-01-01',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'rate' => '18.00',
                    'rate_float' => 18,
                    'valid_from' => '2027-01-01',
                ]
            ]);
    }

    public function test_can_update_tax_category_description(): void
    {
        $standard = TaxCategory::where('code', 'STANDARD')->first();

        $response = $this->putJson("/api/v1/core/tax-categories/{$standard->id}", [
            'name' => 'ضريبة القيمة المضافة العامة المحدثة',
            'description' => 'تحديث وصف الضريبة العامة',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'name' => 'ضريبة القيمة المضافة العامة المحدثة',
                ]
            ]);
    }
}
