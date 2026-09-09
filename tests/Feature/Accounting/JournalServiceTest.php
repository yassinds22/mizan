<?php

declare(strict_types=1);

namespace Tests\Feature\Accounting;

use App\Domains\Accounting\Enums\AccountNature;
use App\Domains\Accounting\Enums\AccountType;
use App\Domains\Accounting\Enums\JournalEntrySourceType;
use App\Domains\Accounting\Enums\JournalEntryStatus;
use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Accounting\Services\AccountService;
use App\Domains\Accounting\Services\JournalService;
use App\Domains\Core\Exceptions\FiscalPeriodClosedException;
use App\Domains\Core\Models\Branch;
use App\Domains\Core\Services\FiscalPeriodService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class JournalServiceTest extends TestCase
{
    use RefreshDatabase;

    private JournalService $journalService;
    private AccountService $accountService;
    private FiscalPeriodService $fiscalPeriodService;

    private Branch $branch;
    private Account $cashAccount;
    private Account $salesAccount;
    private Account $parentAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->journalService = app(JournalService::class);
        $this->accountService = app(AccountService::class);
        $this->fiscalPeriodService = app(FiscalPeriodService::class);

        // 1. Create a branch
        $this->branch = Branch::create([
            'code' => 'BR-01',
            'name' => 'الفرع الرئيسي',
            'city' => 'الرياض',
            'is_active' => true,
        ]);

        // 2. Create fiscal year 2026 with 12 open monthly periods
        $this->fiscalPeriodService->createFiscalYearWithMonthlyPeriods('السنة المالية 2026', 2026);

        // 3. Create Root & Leaf accounts
        $this->parentAccount = $this->accountService->createAccount([
            'code' => '1000',
            'name_ar' => 'الأصول',
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
        ]);

        $this->cashAccount = $this->accountService->createAccount([
            'code' => '1111',
            'name_ar' => 'الصندوق الرئيسي',
            'parent_id' => $this->parentAccount->id,
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
        ]);

        $revParent = $this->accountService->createAccount([
            'code' => '4000',
            'name_ar' => 'الإيرادات',
            'type' => AccountType::Revenue,
            'nature' => AccountNature::Credit,
        ]);

        $this->salesAccount = $this->accountService->createAccount([
            'code' => '4110',
            'name_ar' => 'إيراد المبيعات',
            'parent_id' => $revParent->id,
            'type' => AccountType::Revenue,
            'nature' => AccountNature::Credit,
        ]);
    }

    public function test_can_create_draft_and_post_balanced_journal_entry(): void
    {
        $lines = [
            [
                'account_id' => $this->cashAccount->id,
                'debit' => 1500.50,
                'credit' => 0,
                'description' => 'استلام نقدي للمبيعات',
            ],
            [
                'account_id' => $this->salesAccount->id,
                'debit' => 0,
                'credit' => 1500.50,
                'description' => 'إثبات مبيعات نقدية',
            ],
        ];

        $draft = $this->journalService->createDraft([
            'date' => '2026-03-15',
            'branch_id' => $this->branch->id,
            'source_type' => JournalEntrySourceType::Manual,
            'description' => 'قيد مبيعات نقدية تجريبي',
        ], $lines);

        $this->assertTrue($draft->isDraft());
        $this->assertEquals(1500.50, (float) $draft->total_debit);
        $this->assertEquals(1500.50, (float) $draft->total_credit);
        $this->assertTrue($draft->isBalanced());

        // Now post it
        $posted = $this->journalService->postEntry($draft);

        $this->assertTrue($posted->isPosted());
        $this->assertNotNull($posted->posted_at);
    }

    public function test_cannot_post_unbalanced_journal_entry(): void
    {
        $lines = [
            [
                'account_id' => $this->cashAccount->id,
                'debit' => 2000.00,
                'credit' => 0,
            ],
            [
                'account_id' => $this->salesAccount->id,
                'debit' => 0,
                'credit' => 1500.00, // Unbalanced!
            ],
        ];

        $draft = $this->journalService->createDraft([
            'date' => '2026-03-15',
            'branch_id' => $this->branch->id,
        ], $lines);

        $this->expectException(ValidationException::class);
        $this->journalService->postEntry($draft);
    }

    public function test_cannot_post_entry_with_parent_aggregate_account(): void
    {
        // $this->parentAccount is not a leaf
        $lines = [
            [
                'account_id' => $this->parentAccount->id,
                'debit' => 500.00,
                'credit' => 0,
            ],
            [
                'account_id' => $this->salesAccount->id,
                'debit' => 0,
                'credit' => 500.00,
            ],
        ];

        $this->expectException(ValidationException::class);
        $this->journalService->createDraft([
            'date' => '2026-03-15',
            'branch_id' => $this->branch->id,
        ], $lines);
    }

    public function test_cannot_create_or_post_in_date_with_closed_period(): void
    {
        // 2025 has no defined fiscal year/period
        $lines = [
            [
                'account_id' => $this->cashAccount->id,
                'debit' => 100.00,
                'credit' => 0,
            ],
            [
                'account_id' => $this->salesAccount->id,
                'debit' => 0,
                'credit' => 100.00,
            ],
        ];

        $this->expectException(FiscalPeriodClosedException::class);
        $this->journalService->createDraft([
            'date' => '2025-01-10', // Closed / not found
            'branch_id' => $this->branch->id,
        ], $lines);
    }

    public function test_posted_entries_are_strictly_immutable(): void
    {
        $lines = [
            [
                'account_id' => $this->cashAccount->id,
                'debit' => 750.00,
                'credit' => 0,
            ],
            [
                'account_id' => $this->salesAccount->id,
                'debit' => 0,
                'credit' => 750.00,
            ],
        ];

        $posted = $this->journalService->createAndPost([
            'date' => '2026-05-10',
            'branch_id' => $this->branch->id,
            'description' => 'قيد معتمد نهائي',
        ], $lines);

        // Attempt to update via Service
        try {
            $this->journalService->updateDraft($posted->id, ['description' => 'تعديل غير قانوني']);
            $this->fail('Updating posted journal entry via service must throw');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('journal_entry', $e->errors());
        }

        // Attempt to update via Model directly
        try {
            $posted->description = 'تعديل مباشر على الموديل';
            $posted->save();
            $this->fail('Updating posted journal entry directly on model must throw');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('journal_entry', $e->errors());
        }

        // Attempt to delete via Service
        try {
            $this->journalService->deleteDraft($posted->id);
            $this->fail('Deleting posted journal entry via service must throw');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('journal_entry', $e->errors());
        }

        // Attempt to delete via Model
        try {
            $posted->delete();
            $this->fail('Deleting posted journal entry directly on model must throw');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('journal_entry', $e->errors());
        }
    }

    public function test_can_reverse_posted_entry_and_verifies_reversal_integrity(): void
    {
        $lines = [
            [
                'account_id' => $this->cashAccount->id,
                'debit' => 3000.00,
                'credit' => 0,
                'description' => 'قبض مبيعات نقدية',
            ],
            [
                'account_id' => $this->salesAccount->id,
                'debit' => 0,
                'credit' => 3000.00,
                'description' => 'إيراد مبيعات تموين',
            ],
        ];

        $original = $this->journalService->createAndPost([
            'date' => '2026-06-01',
            'branch_id' => $this->branch->id,
            'description' => 'قيد بيع خطأ يتطلب العكس',
        ], $lines);

        // Reverse the posted entry
        $reversal = $this->journalService->reverseEntry(
            $original,
            'خطأ في إدخال السند الأصلي',
            '2026-06-02'
        );

        $original->refresh();

        // Check original state
        $this->assertTrue($original->isReversed());
        $this->assertEquals($reversal->id, $original->reversed_by_id);

        // Check reversal state
        $this->assertTrue($reversal->isPosted());
        $this->assertEquals($original->id, $reversal->reversal_of_id);
        $this->assertEquals(3000.00, (float) $reversal->total_debit);
        $this->assertEquals(3000.00, (float) $reversal->total_credit);

        // Check reversed lines (debit and credit must be inverted!)
        $revLines = $reversal->lines;
        $this->assertCount(2, $revLines);

        $revCashLine = $revLines->where('account_id', $this->cashAccount->id)->first();
        $this->assertEquals(0.00, (float) $revCashLine->debit);
        $this->assertEquals(3000.00, (float) $revCashLine->credit); // Inverted to Credit

        $revSalesLine = $revLines->where('account_id', $this->salesAccount->id)->first();
        $this->assertEquals(3000.00, (float) $revSalesLine->debit); // Inverted to Debit
        $this->assertEquals(0.00, (float) $revSalesLine->credit);

        // Attempting to reverse an already reversed entry must fail
        try {
            $this->journalService->reverseEntry($original, 'محاولة عكس مرة ثانية');
            $this->fail('Reversing an already reversed entry must fail');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('journal_entry', $e->errors());
        }
    }
}
