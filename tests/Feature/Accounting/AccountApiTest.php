<?php

declare(strict_types=1);

namespace Tests\Feature\Accounting;

use App\Domains\Accounting\Enums\AccountNature;
use App\Domains\Accounting\Enums\AccountType;
use App\Domains\Accounting\Models\Account;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountingSeeder::class);
    }

    public function test_can_list_accounts_with_filters(): void
    {
        $response = $this->getJson('/api/v1/accounting/accounts?type=asset');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'code',
                        'name_ar',
                        'name_en',
                        'type',
                        'nature',
                        'level',
                        'is_leaf',
                        'is_active',
                        'can_post',
                    ],
                ],
            ]);

        $this->assertNotEmpty($response->json('data'));
    }

    public function test_can_get_hierarchical_account_tree(): void
    {
        $response = $this->getJson('/api/v1/accounting/accounts/tree');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'code',
                        'name_ar',
                        'level',
                        'children',
                    ],
                ],
            ]);

        // Level 1 accounts should be roots (Assets, Liabilities, Equity, Revenues, Expenses)
        $this->assertCount(5, $response->json('data'));
    }

    public function test_can_get_leaf_accounts_only(): void
    {
        $response = $this->getJson('/api/v1/accounting/accounts/leaf');

        $response->assertOk();
        $accounts = $response->json('data');
        $this->assertNotEmpty($accounts);

        foreach ($accounts as $acc) {
            $this->assertTrue($acc['is_leaf']);
            $this->assertTrue($acc['is_active']);
            $this->assertTrue($acc['can_post']);
        }
    }

    public function test_can_create_new_sub_account_via_api(): void
    {
        $parent = Account::where('code', '1110')->firstOrFail();

        $payload = [
            'code' => '1115',
            'name_ar' => 'بنك الرياض - حساب جاري',
            'name_en' => 'Riyad Bank Operating Account',
            'parent_id' => $parent->id,
            'is_leaf' => true,
            'is_active' => true,
        ];

        $response = $this->postJson('/api/v1/accounting/accounts', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.code', '1115')
            ->assertJsonPath('data.name_ar', 'بنك الرياض - حساب جاري')
            ->assertJsonPath('data.level', $parent->level + 1);

        $this->assertDatabaseHas('chart_of_accounts', ['code' => '1115']);
    }

    public function test_can_show_and_update_account_via_api(): void
    {
        $account = Account::where('code', '1111')->firstOrFail();

        $showResponse = $this->getJson("/api/v1/accounting/accounts/{$account->id}");
        $showResponse->assertOk()
            ->assertJsonPath('data.code', '1111');

        $updateResponse = $this->putJson("/api/v1/accounting/accounts/{$account->id}", [
            'name_ar' => 'الصندوق الرئيسي المحدث',
        ]);

        $updateResponse->assertOk()
            ->assertJsonPath('data.name_ar', 'الصندوق الرئيسي المحدث');

        $this->assertDatabaseHas('chart_of_accounts', [
            'id' => $account->id,
            'name_ar' => 'الصندوق الرئيسي المحدث',
        ]);
    }

    public function test_cannot_delete_parent_account_with_children(): void
    {
        $root = Account::where('code', '1000')->firstOrFail();

        $response = $this->deleteJson("/api/v1/accounting/accounts/{$root->id}");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['account']);
    }
}
