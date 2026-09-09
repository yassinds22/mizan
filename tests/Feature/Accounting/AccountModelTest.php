<?php

declare(strict_types=1);

namespace Tests\Feature\Accounting;

use App\Domains\Accounting\Enums\AccountNature;
use App\Domains\Accounting\Enums\AccountType;
use App\Domains\Accounting\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_root_and_child_accounts_with_proper_attributes(): void
    {
        // 1. Root Asset Account
        $assets = Account::create([
            'code' => '1000',
            'name_ar' => 'الأصول',
            'name_en' => 'Assets',
            'parent_id' => null,
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
            'level' => 1,
            'is_leaf' => false, // Head account, cannot post
            'is_active' => true,
        ]);

        $this->assertTrue($assets->isRoot());
        $this->assertFalse($assets->canPost());
        $this->assertEquals(AccountType::Asset, $assets->type);
        $this->assertEquals(AccountNature::Debit, $assets->nature);

        // 2. Sub Account: Current Assets
        $currentAssets = Account::create([
            'code' => '1100',
            'name_ar' => 'الأصول المتداولة',
            'name_en' => 'Current Assets',
            'parent_id' => $assets->id,
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
            'level' => 2,
            'is_leaf' => false,
            'is_active' => true,
        ]);

        // 3. Analytical Leaf Account: Main Cash
        $mainCash = Account::create([
            'code' => '1110',
            'name_ar' => 'الصندوق الرئيسي',
            'name_en' => 'Main Cash Box',
            'parent_id' => $currentAssets->id,
            'type' => AccountType::Asset,
            'nature' => AccountNature::Debit,
            'level' => 3,
            'is_leaf' => true, // Posting allowed
            'is_active' => true,
        ]);

        $this->assertTrue($mainCash->canPost());
        $this->assertFalse($mainCash->isRoot());
        $this->assertEquals($currentAssets->id, $mainCash->parent->id);
        $this->assertCount(1, $currentAssets->children);
        $this->assertEquals('1110', $currentAssets->children->first()->code);

        // Test scopes
        $this->assertCount(1, Account::root()->get());
        $this->assertCount(1, Account::leaf()->get());
        $this->assertCount(3, Account::ofType(AccountType::Asset)->get());
    }
}
