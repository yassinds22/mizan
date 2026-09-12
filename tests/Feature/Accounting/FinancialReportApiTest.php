<?php

declare(strict_types=1);

namespace Tests\Feature\Accounting;

use App\Domains\Accounting\Models\Account;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialReportApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            CoreSeeder::class,
            AccountingSeeder::class,
        ]);
    }

    public function test_can_fetch_trial_balance_via_api(): void
    {
        $response = $this->getJson('/api/v1/accounting/reports/trial-balance');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'filters',
                    'accounts',
                    'totals' => [
                        'opening_debit',
                        'opening_credit',
                        'period_debit',
                        'period_credit',
                        'closing_debit',
                        'closing_credit',
                        'difference',
                    ],
                    'is_balanced',
                ],
            ]);
    }

    public function test_can_fetch_account_ledger_via_api(): void
    {
        $account = Account::where('is_leaf', true)->firstOrFail();

        $response = $this->getJson("/api/v1/accounting/reports/account-ledger/{$account->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'account' => ['id', 'code', 'name_ar', 'nature'],
                    'filters',
                    'opening_balance',
                    'total_debit',
                    'total_credit',
                    'closing_balance',
                    'transactions',
                ],
            ]);
    }

    public function test_can_fetch_income_statement_via_api(): void
    {
        $response = $this->getJson('/api/v1/accounting/reports/income-statement');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'filters',
                    'revenues' => ['items', 'total'],
                    'cogs' => ['items', 'total'],
                    'gross_profit',
                    'gross_margin_percent',
                    'operating_expenses' => ['items', 'total'],
                    'net_profit',
                    'net_margin_percent',
                ],
            ]);
    }

    public function test_can_fetch_balance_sheet_via_api(): void
    {
        $response = $this->getJson('/api/v1/accounting/reports/balance-sheet');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'as_of_date',
                    'assets' => ['items', 'total'],
                    'liabilities' => ['items', 'total'],
                    'equity' => ['items', 'current_period_net_profit', 'total_equity'],
                    'total_liabilities_and_equity',
                    'is_balanced',
                    'difference',
                ],
            ]);
    }

    public function test_can_fetch_vat_position_via_api(): void
    {
        $response = $this->getJson('/api/v1/accounting/reports/vat-position');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'filters',
                    'output_vat' => ['gross_tax', 'net_tax'],
                    'input_vat' => ['gross_tax', 'net_tax'],
                    'net_vat_position' => ['amount', 'status', 'status_label'],
                ],
            ]);
    }
}
