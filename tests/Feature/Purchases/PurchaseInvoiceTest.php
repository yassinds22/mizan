<?php

declare(strict_types=1);

namespace Tests\Feature\Purchases;

use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Core\Models\Branch;
use App\Domains\Products\Models\Item;
use App\Domains\Purchases\Models\Supplier;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\CustomerSeeder;
use Database\Seeders\ProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseInvoiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            CoreSeeder::class,
            AccountingSeeder::class,
            ProductSeeder::class,
            CustomerSeeder::class,
        ]);
    }

    private function createTestSupplier(): Supplier
    {
        return Supplier::create([
            'code' => 'SUP-0001',
            'name_ar' => 'شركة المراعي للتوزيع',
            'tax_number' => '310000000000003',
            'phone' => '0501234567',
            'city' => 'الرياض',
            'payment_terms_days' => 30,
            'balance' => 0.0,
            'is_active' => true,
        ]);
    }

    public function test_can_create_and_manage_suppliers(): void
    {
        $res = $this->postJson('/api/v1/purchases/suppliers', [
            'name_ar' => 'مؤسسة الغذاء المثالي',
            'tax_number' => '300000000000002',
            'phone' => '0555555555',
            'payment_terms_days' => 45,
        ]);

        $res->assertStatus(201);
        $res->assertJsonPath('data.name_ar', 'مؤسسة الغذاء المثالي');
        $this->assertNotEmpty($res->json('data.code'));

        $supplierId = $res->json('data.id');
        $listRes = $this->getJson('/api/v1/purchases/suppliers/all-active');
        $listRes->assertStatus(200);
        $this->assertTrue(collect($listRes->json('data'))->contains('id', $supplierId));
    }

    public function test_draft_purchase_does_not_change_stock(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $item->update(['stock_quantity' => 50.0]);

        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => false,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 20,
                    'unit_price' => 35.0,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $res->assertJsonPath('data.status.value', 'draft');

        $item->refresh();
        $this->assertEquals(50.0, (float) $item->stock_quantity);
    }

    public function test_draft_purchase_does_not_create_journal(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();

        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'credit',
            'post_immediately' => false,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 15,
                    'unit_price' => 40.0,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $this->assertNull($res->json('data.journal_entry_id'));
    }

    public function test_post_cash_purchase_increases_stock(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $item->update(['stock_quantity' => 10.0]);

        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 25,
                    'unit_price' => 20.0,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $res->assertJsonPath('data.status.value', 'posted');

        $item->refresh();
        $this->assertEquals(35.0, (float) $item->stock_quantity);
    }

    public function test_post_cash_purchase_creates_balanced_journal(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();

        // شراء 10 حبات بـ 100 ريال = 1000 + ضريبة 150 = 1150
        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 10,
                    'unit_price' => 100.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $journalId = $res->json('data.journal_entry_id');
        $this->assertNotNull($journalId);

        $entry = JournalEntry::with('lines')->find($journalId);
        $this->assertTrue($entry->isPosted());
        $this->assertEquals((float) $entry->total_debit, (float) $entry->total_credit);
        $this->assertEquals(1150.0, (float) $entry->total_debit);

        // التحقق من أن الطرف الدائن هو الصندوق الرئيسي (1111)
        $cashAcc = Account::where('code', '1111')->first();
        $cashLine = $entry->lines->firstWhere('account_id', $cashAcc->id);
        $this->assertNotNull($cashLine);
        $this->assertEquals(1150.0, (float) $cashLine->credit);

        // التحقق من أن مدين المخزون هو 1000 ومدين الضريبة 150
        $invAcc = Account::where('code', '1131')->first();
        $taxAcc = Account::where('code', '1141')->first();
        $invLine = $entry->lines->firstWhere('account_id', $invAcc->id);
        $taxLine = $entry->lines->firstWhere('account_id', $taxAcc->id);

        $this->assertEquals(1000.0, (float) $invLine->debit);
        $this->assertEquals(150.0, (float) $taxLine->debit);
    }

    public function test_post_credit_purchase_increases_supplier_balance(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();

        $initialBalance = (float) $supplier->balance; // 0.0

        // شراء آجل بإجمالي 230 (200 + 30 ضريبة)
        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'credit',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 2,
                    'unit_price' => 100.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);

        $res->assertStatus(201);

        $supplier->refresh();
        $this->assertEquals($initialBalance + 230.0, (float) $supplier->balance);
    }

    public function test_post_credit_purchase_credits_supplier_account(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();

        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'credit',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 5,
                    'unit_price' => 50.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $journalId = $res->json('data.journal_entry_id');
        $entry = JournalEntry::with('lines')->find($journalId);

        // الطرف الدائن هو حساب موردو المواد الغذائية (2110)
        $supplierAcc = Account::where('code', '2110')->first();
        $supLine = $entry->lines->firstWhere('account_id', $supplierAcc->id);
        $this->assertNotNull($supLine);
        $this->assertEquals(287.5, (float) $supLine->credit); // 250 + 37.5 = 287.5
    }

    public function test_purchase_increases_stock_using_conversion_factor(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $item->update(['stock_quantity' => 0.0]);

        // شراء 10 كراتين وكل كرتون يحتوي 12 حبة = 120 حبة
        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'كرتون',
                    'conversion_factor' => 12.0,
                    'quantity' => 10,
                    'unit_price' => 60.0,
                ],
            ],
        ]);

        $res->assertStatus(201);

        $item->refresh();
        $this->assertEquals(120.0, (float) $item->stock_quantity);
    }

    public function test_purchase_updates_last_purchase_cost(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $item->update(['cost_price' => 25.0]);

        // شراء بسعر 45 ريال للحبة
        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 10,
                    'unit_price' => 45.0,
                ],
            ],
        ]);

        $res->assertStatus(201);

        $item->refresh();
        $this->assertEquals(45.0, (float) $item->cost_price);
    }

    public function test_discount_reduces_inventory_debit_cost(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();

        // 10 حبات بـ 100 = 1000، مع خصم 100 = صافي 900
        // ضريبة 15% على 900 = 135
        // إجمالي = 1035
        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 10,
                    'unit_price' => 100.0,
                    'discount_amount' => 100.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $res->assertJsonPath('data.subtotal', 1000);
        $res->assertJsonPath('data.discount_amount', 100);
        $res->assertJsonPath('data.tax_amount', 135);
        $res->assertJsonPath('data.total_amount', 1035);

        $journalId = $res->json('data.journal_entry_id');
        $entry = JournalEntry::with('lines')->find($journalId);

        // المخزون مدين بالصافي 900
        $invAcc = Account::where('code', '1131')->first();
        $invLine = $entry->lines->firstWhere('account_id', $invAcc->id);
        $this->assertEquals(900.0, (float) $invLine->debit);

        // القيد متوازن
        $this->assertEquals(1035.0, (float) $entry->total_debit);
        $this->assertEquals(1035.0, (float) $entry->total_credit);
    }

    public function test_cancel_purchase_reduces_stock(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $item->update(['stock_quantity' => 20.0]);

        // شراء 10 حبات -> المخزون يصبح 30
        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 10,
                    'unit_price' => 50.0,
                ],
            ],
        ]);
        $res->assertStatus(201);
        $invoiceId = $res->json('data.id');

        $item->refresh();
        $this->assertEquals(30.0, (float) $item->stock_quantity);

        // إلغاء الفاتورة -> المخزون يعود 20
        $cancelRes = $this->postJson("/api/v1/purchases/invoices/{$invoiceId}/cancel", [
            'reason' => 'إلغاء لخطأ في الفاتورة',
        ]);
        $cancelRes->assertStatus(200);
        $cancelRes->assertJsonPath('data.status.value', 'cancelled');

        $item->refresh();
        $this->assertEquals(20.0, (float) $item->stock_quantity);
    }

    public function test_cancel_purchase_reverses_journal(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $item->update(['stock_quantity' => 50.0]);

        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 5,
                    'unit_price' => 40.0,
                ],
            ],
        ]);
        $invoiceId = $res->json('data.id');
        $origJournalId = $res->json('data.journal_entry_id');

        $cancelRes = $this->postJson("/api/v1/purchases/invoices/{$invoiceId}/cancel");
        $cancelRes->assertStatus(200);

        // التحقق من عكس القيد
        $origJournal = JournalEntry::find($origJournalId);
        $this->assertNotNull($origJournal->reversed_by_id);
    }

    public function test_cancel_purchase_reduces_supplier_balance(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $item->update(['stock_quantity' => 50.0]);

        // شراء آجل بمبلغ 230
        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'credit',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 2,
                    'unit_price' => 100.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);
        $invoiceId = $res->json('data.id');

        $supplier->refresh();
        $this->assertEquals(230.0, (float) $supplier->balance);

        // إلغاء الفاتورة -> يعود رصيد المورد إلى 0
        $this->postJson("/api/v1/purchases/invoices/{$invoiceId}/cancel")->assertStatus(200);

        $supplier->refresh();
        $this->assertEquals(0.0, (float) $supplier->balance);
    }

    public function test_cancel_purchase_fails_when_stock_is_insufficient(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $item->update(['stock_quantity' => 0.0]);

        // شراء 10 حبات -> المخزون يصبح 10
        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 10,
                    'unit_price' => 50.0,
                ],
            ],
        ]);
        $invoiceId = $res->json('data.id');

        // محاكاة سحب أو بيع 7 حبات -> المخزون المتبقي أصبح 3 فقط
        $item->update(['stock_quantity' => 3.0]);

        // محاولة إلغاء فاتورة الشراء الأصلية (المطلوب خصم 10 بينما المتاح 3)
        $cancelRes = $this->postJson("/api/v1/purchases/invoices/{$invoiceId}/cancel");
        $cancelRes->assertStatus(422);
        $this->assertStringContainsString('غير كافٍ لخصم الكمية المشتراة', $cancelRes->json('message'));

        // المخزون لم يتغير بالسالب
        $item->refresh();
        $this->assertEquals(3.0, (float) $item->stock_quantity);
    }

    public function test_purchase_cannot_be_posted_twice(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();

        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 5,
                    'unit_price' => 30.0,
                ],
            ],
        ]);
        $invoiceId = $res->json('data.id');

        // محاولة إعادة الترحيل
        $rePost = $this->postJson("/api/v1/purchases/invoices/{$invoiceId}/post");
        $rePost->assertStatus(422);
        $this->assertStringContainsString('مرحّلة مسبقاً', $rePost->json('message'));
    }

    public function test_cancelled_purchase_cannot_be_posted_again(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $item->update(['stock_quantity' => 50.0]);

        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 5,
                    'unit_price' => 30.0,
                ],
            ],
        ]);
        $invoiceId = $res->json('data.id');
        $this->postJson("/api/v1/purchases/invoices/{$invoiceId}/cancel")->assertStatus(200);

        // محاولة ترحيل الفاتورة بعد إلغائها
        $rePost = $this->postJson("/api/v1/purchases/invoices/{$invoiceId}/post");
        $rePost->assertStatus(422);
        $this->assertStringContainsString('ملغاة', $rePost->json('message'));
    }

    public function test_cancelled_purchase_cannot_be_cancelled_twice(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $item->update(['stock_quantity' => 50.0]);

        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 5,
                    'unit_price' => 30.0,
                ],
            ],
        ]);
        $invoiceId = $res->json('data.id');
        $this->postJson("/api/v1/purchases/invoices/{$invoiceId}/cancel")->assertStatus(200);

        // محاولة إلغائها مرة ثانية
        $secondCancel = $this->postJson("/api/v1/purchases/invoices/{$invoiceId}/cancel");
        $secondCancel->assertStatus(422);
        $this->assertStringContainsString('ملغاة مسبقاً', $secondCancel->json('message'));
    }
}
