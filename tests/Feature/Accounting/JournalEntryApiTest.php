<?php

declare(strict_types=1);

namespace Tests\Feature\Accounting;

use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Models\CostCenter;
use App\Domains\Core\Models\Branch;
use App\Domains\Core\Services\FiscalPeriodService;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalEntryApiTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;
    private Account $cashAccount;
    private Account $salesAccount;
    private CostCenter $costCenter;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AccountingSeeder::class);

        // Branch
        $this->branch = Branch::create([
            'code' => 'BR-01',
            'name' => 'الفرع الرئيسي',
            'city' => 'الرياض',
            'is_active' => true,
        ]);

        // Fiscal Year 2026
        app(FiscalPeriodService::class)->createFiscalYearWithMonthlyPeriods('السنة المالية 2026', 2026);

        // Accounts from seeder
        $this->cashAccount = Account::where('code', '1111')->firstOrFail();
        $this->salesAccount = Account::where('code', '4110')->firstOrFail();

        // Cost Center
        $this->costCenter = CostCenter::create([
            'code' => 'CC-01',
            'name_ar' => 'أسطول التوزيع الرئيسي',
            'branch_id' => $this->branch->id,
            'is_active' => true,
        ]);
    }

    public function test_can_create_draft_journal_entry_via_api(): void
    {
        $payload = [
            'date' => '2026-04-10',
            'branch_id' => $this->branch->id,
            'description' => 'قيد مبيعات تجريبي عبر الـ API',
            'lines' => [
                [
                    'account_id' => $this->cashAccount->id,
                    'cost_center_id' => $this->costCenter->id,
                    'debit' => 2500.00,
                    'credit' => 0,
                    'description' => 'قبض مبيعات نقدية',
                ],
                [
                    'account_id' => $this->salesAccount->id,
                    'cost_center_id' => $this->costCenter->id,
                    'debit' => 0,
                    'credit' => 2500.00,
                    'description' => 'إثبات مبيعات بضاعة جافة',
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/accounting/journal-entries', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.status.value', 'draft')
            ->assertJsonPath('data.total_debit', 2500)
            ->assertJsonPath('data.total_credit', 2500)
            ->assertJsonPath('data.is_balanced', true);

        $this->assertDatabaseHas('journal_entries', [
            'branch_id' => $this->branch->id,
            'status' => 'draft',
        ]);
    }

    public function test_can_create_and_post_journal_entry_immediately_via_api(): void
    {
        $payload = [
            'date' => '2026-04-12',
            'branch_id' => $this->branch->id,
            'description' => 'قيد مرحل فوراً عبر الـ API',
            'post_now' => true,
            'lines' => [
                [
                    'account_id' => $this->cashAccount->id,
                    'debit' => 1000.00,
                    'credit' => 0,
                ],
                [
                    'account_id' => $this->salesAccount->id,
                    'debit' => 0,
                    'credit' => 1000.00,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/accounting/journal-entries', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.status.value', 'posted')
            ->assertJsonPath('data.status.is_posted', true);

        $this->assertDatabaseHas('journal_entries', [
            'branch_id' => $this->branch->id,
            'status' => 'posted',
        ]);
    }

    public function test_can_post_existing_draft_entry_via_api(): void
    {
        $createResponse = $this->postJson('/api/v1/accounting/journal-entries', [
            'date' => '2026-04-15',
            'branch_id' => $this->branch->id,
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 500, 'credit' => 0],
                ['account_id' => $this->salesAccount->id, 'debit' => 0, 'credit' => 500],
            ],
        ]);

        $entryId = $createResponse->json('data.id');

        $postResponse = $this->postJson("/api/v1/accounting/journal-entries/{$entryId}/post");

        $postResponse->assertOk()
            ->assertJsonPath('data.status.value', 'posted');
    }

    public function test_can_reverse_posted_journal_entry_via_api(): void
    {
        // 1. Create and post entry
        $createResponse = $this->postJson('/api/v1/accounting/journal-entries', [
            'date' => '2026-05-01',
            'branch_id' => $this->branch->id,
            'post_now' => true,
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 800, 'credit' => 0],
                ['account_id' => $this->salesAccount->id, 'debit' => 0, 'credit' => 800],
            ],
        ]);

        $originalId = $createResponse->json('data.id');

        // 2. Reverse it
        $reverseResponse = $this->postJson("/api/v1/accounting/journal-entries/{$originalId}/reverse", [
            'reason' => 'عكس قيد تجريبي بسبب خطأ في الإدخال',
            'reversal_date' => '2026-05-02',
        ]);

        $reverseResponse->assertCreated()
            ->assertJsonPath('data.status.value', 'posted')
            ->assertJsonPath('data.reversal_of_id', $originalId);

        // 3. Verify original entry is now reversed
        $originalResponse = $this->getJson("/api/v1/accounting/journal-entries/{$originalId}");
        $originalResponse->assertOk()
            ->assertJsonPath('data.status.value', 'reversed')
            ->assertJsonPath('data.reversed_by_id', $reverseResponse->json('data.id'));
    }

    public function test_cannot_delete_posted_entry_via_api(): void
    {
        $createResponse = $this->postJson('/api/v1/accounting/journal-entries', [
            'date' => '2026-05-10',
            'branch_id' => $this->branch->id,
            'post_now' => true,
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 300, 'credit' => 0],
                ['account_id' => $this->salesAccount->id, 'debit' => 0, 'credit' => 300],
            ],
        ]);

        $entryId = $createResponse->json('data.id');

        $deleteResponse = $this->deleteJson("/api/v1/accounting/journal-entries/{$entryId}");

        $deleteResponse->assertStatus(422)
            ->assertJsonValidationErrors(['journal_entry']);
    }
}
