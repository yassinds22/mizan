<?php

declare(strict_types=1);

namespace Tests\Feature\Accounting;

use App\Domains\Accounting\Enums\AccountNature;
use App\Domains\Accounting\Enums\AccountType;
use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Services\AccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AccountServiceTest extends TestCase
{
    use RefreshDatabase;

    private AccountService $accountService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->accountService = app(AccountService::class);
    }

    public function test_can_create_root_account_at_level_1(): void
    {
        $root = $this->accountService->createAccount([
            'code' => '1000',
            'name_ar' => 'الأصول',
            'name_en' => 'Assets',
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
        ]);

        $this->assertEquals(1, $root->level);
        $this->assertTrue($root->isRoot());
        $this->assertTrue($root->is_leaf);
    }

    public function test_creating_child_account_inherits_type_nature_sets_level_and_updates_parent_leaf_status(): void
    {
        $assets = $this->accountService->createAccount([
            'code' => '1000',
            'name_ar' => 'الأصول',
            'name_en' => 'Assets',
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
        ]);

        $this->assertTrue($assets->is_leaf);

        $currentAssets = $this->accountService->createAccount([
            'code' => '1100',
            'name_ar' => 'الأصول المتداولة',
            'name_en' => 'Current Assets',
            'parent_id' => $assets->id,
        ]);

        $assets->refresh();

        $this->assertFalse($assets->is_leaf, 'Parent account must no longer be a leaf once it has children');
        $this->assertEquals(2, $currentAssets->level);
        $this->assertEquals(AccountType::Asset, $currentAssets->type);
        $this->assertEquals(AccountNature::Debit, $currentAssets->nature);
        $this->assertTrue($currentAssets->is_leaf);
    }

    public function test_cannot_create_duplicate_account_code(): void
    {
        $this->accountService->createAccount([
            'code' => '1000',
            'name_ar' => 'الأصول',
            'name_en' => 'Assets',
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
        ]);

        $this->expectException(ValidationException::class);

        $this->accountService->createAccount([
            'code' => '1000',
            'name_ar' => 'أصول مكررة',
            'name_en' => 'Duplicate Assets',
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
        ]);
    }

    public function test_cannot_set_parent_to_self_or_descendant(): void
    {
        $assets = $this->accountService->createAccount([
            'code' => '1000',
            'name_ar' => 'الأصول',
            'name_en' => 'Assets',
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
        ]);

        $subAssets = $this->accountService->createAccount([
            'code' => '1100',
            'name_ar' => 'الأصول المتداولة',
            'name_en' => 'Current Assets',
            'parent_id' => $assets->id,
        ]);

        // Self parent attempt
        try {
            $this->accountService->updateAccount($assets->id, ['parent_id' => $assets->id]);
            $this->fail('Setting account as parent of itself should fail');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('parent_id', $e->errors());
        }

        // Circular descendant parent attempt
        try {
            $this->accountService->updateAccount($assets->id, ['parent_id' => $subAssets->id]);
            $this->fail('Setting child account as parent of its root should fail');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('parent_id', $e->errors());
        }
    }

    public function test_cannot_delete_account_with_children(): void
    {
        $assets = $this->accountService->createAccount([
            'code' => '1000',
            'name_ar' => 'الأصول',
            'name_en' => 'Assets',
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
        ]);

        $this->accountService->createAccount([
            'code' => '1100',
            'name_ar' => 'الأصول المتداولة',
            'name_en' => 'Current Assets',
            'parent_id' => $assets->id,
        ]);

        $this->expectException(ValidationException::class);
        $this->accountService->deleteAccount($assets->id);
    }

    public function test_deleting_child_reverts_parent_to_leaf_if_no_more_children(): void
    {
        $parent = $this->accountService->createAccount([
            'code' => '1000',
            'name_ar' => 'الأصول',
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
        ]);

        $child = $this->accountService->createAccount([
            'code' => '1100',
            'name_ar' => 'الأصول المتداولة',
            'parent_id' => $parent->id,
        ]);

        $parent->refresh();
        $this->assertFalse($parent->is_leaf);

        $this->accountService->deleteAccount($child->id);

        $parent->refresh();
        $this->assertTrue($parent->is_leaf, 'Parent must revert to leaf if all children are removed');
    }

    public function test_assert_can_post_enforces_active_and_leaf_rules(): void
    {
        $parent = $this->accountService->createAccount([
            'code' => '1000',
            'name_ar' => 'الأصول',
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
            'is_leaf' => false,
        ]);

        $inactiveLeaf = $this->accountService->createAccount([
            'code' => '1101',
            'name_ar' => 'حساب خامل',
            'parent_id' => $parent->id,
            'is_leaf' => true,
            'is_active' => false,
        ]);

        $activeLeaf = $this->accountService->createAccount([
            'code' => '1102',
            'name_ar' => 'حساب نشط تحليلي',
            'parent_id' => $parent->id,
            'is_leaf' => true,
            'is_active' => true,
        ]);

        // Attempt posting to parent -> fails
        try {
            $this->accountService->assertCanPost($parent);
            $this->fail('Posting to parent/aggregate account must fail');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('account', $e->errors());
        }

        // Attempt posting to inactive leaf -> fails
        try {
            $this->accountService->assertCanPost($inactiveLeaf);
            $this->fail('Posting to inactive account must fail');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('account', $e->errors());
        }

        // Active leaf -> succeeds
        $verified = $this->accountService->assertCanPost($activeLeaf);
        $this->assertEquals($activeLeaf->id, $verified->id);
    }
}
