<?php

declare(strict_types=1);

namespace Tests\Feature\Purchases;

use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Accounting\Services\PartyStatementService;
use App\Domains\Core\Models\Branch;
use App\Domains\Products\Models\Item;
use App\Domains\Purchases\Models\PurchaseInvoice;
use App\Domains\Purchases\Models\PurchaseReturn;
use App\Domains\Purchases\Models\Supplier;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\ProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseReturnTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            CoreSeeder::class,
            AccountingSeeder::class,
            ProductSeeder::class,
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

    private function createAndPostPurchaseInvoice(
        Supplier $supplier,
        Item $item,
        float $quantity = 10.0,
        float $unitPrice = 50.0,
        string $paymentMethod = 'credit'
    ): array {
        $branch = Branch::first();

        $res = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-11',
            'supplier_id' => $supplier->id,
            'branch_id' => $branch->id,
            'payment_method' => $paymentMethod,
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);

        $res->assertStatus(201);
        return [$res->json('data.id'), $res->json('data.lines.0.id')];
    }

    public function test_can_get_returnable_lines_for_posted_purchase_invoice(): void
    {
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        [$invoiceId, $lineId] = $this->createAndPostPurchaseInvoice($supplier, $item, 10.0, 50.0);

        $res = $this->getJson("/api/v1/purchases/invoices/{$invoiceId}/returnable-lines");
        $res->assertStatus(200);
        $res->assertJsonPath('data.lines.0.purchase_invoice_line_id', $lineId);
        $res->assertJsonPath('data.lines.0.original_quantity', 10);
        $res->assertJsonPath('data.lines.0.already_returned_quantity', 0);
        $res->assertJsonPath('data.lines.0.remaining_quantity', 10);
    }

    public function test_partial_and_full_purchase_return_with_stock_deduction_and_gl(): void
    {
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $initialStock = (float) $item->stock_quantity;
        $initialSupplierBalance = (float) $supplier->balance;

        // شراء 10 حبات بسعر 50 (المجموع = 500 + 75 ضريبة = 575)
        [$invoiceId, $lineId] = $this->createAndPostPurchaseInvoice($supplier, $item, 10.0, 50.0, 'credit');

        $supplier->refresh();
        $item->refresh();
        // رصيد المورد بعد الشراء الآجل زاد بـ 575
        $this->assertEquals($initialSupplierBalance + 575.0, (float) $supplier->balance);
        $this->assertEquals($initialStock + 10.0, (float) $item->stock_quantity);

        // 1. مردود جزئي: إرجاع 4 حبات (4 × 50 = 200 + 30 ضريبة = 230)
        $returnRes = $this->postJson('/api/v1/purchases/returns', [
            'purchase_invoice_id' => $invoiceId,
            'return_date' => '2026-09-12',
            'refund_method' => 'credit',
            'reason' => 'بضاعة غير مطابقة للمواصفات',
            'lines' => [
                [
                    'purchase_invoice_line_id' => $lineId,
                    'quantity' => 4,
                ],
            ],
        ]);

        $returnRes->assertStatus(201);
        $returnRes->assertJsonPath('data.status', 'posted');
        $returnRes->assertJsonPath('data.subtotal', 200);
        $returnRes->assertJsonPath('data.tax_amount', 30);
        $returnRes->assertJsonPath('data.total_amount', 230);

        // فحص المخزون: نقص بـ 4
        $item->refresh();
        $this->assertEquals($initialStock + 6.0, (float) $item->stock_quantity);

        // فحص رصيد المورد: نقص بـ 230
        $supplier->refresh();
        $this->assertEquals($initialSupplierBalance + 575.0 - 230.0, (float) $supplier->balance);

        // فحص المتبقي للإرجاع
        $linesRes = $this->getJson("/api/v1/purchases/invoices/{$invoiceId}/returnable-lines");
        $linesRes->assertStatus(200);
        $linesRes->assertJsonPath('data.lines.0.already_returned_quantity', 4);
        $linesRes->assertJsonPath('data.lines.0.remaining_quantity', 6);

        // 2. إرجاع باقي الكمية (6 حبات)
        $returnRes2 = $this->postJson('/api/v1/purchases/returns', [
            'purchase_invoice_id' => $invoiceId,
            'return_date' => '2026-09-12',
            'refund_method' => 'credit',
            'reason' => 'إرجاع باقي الدفعة',
            'lines' => [
                [
                    'purchase_invoice_line_id' => $lineId,
                    'quantity' => 6,
                ],
            ],
        ]);
        $returnRes2->assertStatus(201);

        // المخزون عاد لرصيده الأصلي ورصيد المورد عاد لرصيده الأصلي
        $item->refresh();
        $supplier->refresh();
        $this->assertEquals($initialStock, (float) $item->stock_quantity);
        $this->assertEquals($initialSupplierBalance, (float) $supplier->balance);

        // المتبقي للإرجاع أصبح 0
        $linesRes2 = $this->getJson("/api/v1/purchases/invoices/{$invoiceId}/returnable-lines");
        $linesRes2->assertJsonPath('data.lines.0.remaining_quantity', 0);
    }

    public function test_over_return_is_rejected(): void
    {
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        [$invoiceId, $lineId] = $this->createAndPostPurchaseInvoice($supplier, $item, 5.0, 40.0);

        // محاولة إرجاع 6 حبات والمشترى فقط 5
        $res = $this->postJson('/api/v1/purchases/returns', [
            'purchase_invoice_id' => $invoiceId,
            'refund_method' => 'credit',
            'lines' => [
                [
                    'purchase_invoice_line_id' => $lineId,
                    'quantity' => 6,
                ],
            ],
        ]);

        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['lines']);
    }

    public function test_stock_shortage_rejects_purchase_return(): void
    {
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        [$invoiceId, $lineId] = $this->createAndPostPurchaseInvoice($supplier, $item, 10.0, 50.0);

        // تصفير رصيد المخزون كأن البضاعة بيعت بالكامل
        $item->update(['stock_quantity' => 0.0]);

        // محاولة إرجاع للمورد بدون وجود رصيد في المستودع
        $res = $this->postJson('/api/v1/purchases/returns', [
            'purchase_invoice_id' => $invoiceId,
            'refund_method' => 'credit',
            'lines' => [
                [
                    'purchase_invoice_line_id' => $lineId,
                    'quantity' => 5,
                ],
            ],
        ]);

        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['lines']);
    }

    public function test_cash_and_bank_refund_methods_affect_treasury_without_altering_supplier_balance(): void
    {
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $initialSupplierBalance = (float) $supplier->balance;

        [$invoiceId, $lineId] = $this->createAndPostPurchaseInvoice($supplier, $item, 10.0, 100.0, 'cash');

        // عمل مردود نقدي (كاش مسترد للصندوق)
        $res = $this->postJson('/api/v1/purchases/returns', [
            'purchase_invoice_id' => $invoiceId,
            'return_date' => '2026-09-12',
            'refund_method' => 'cash',
            'lines' => [
                [
                    'purchase_invoice_line_id' => $lineId,
                    'quantity' => 2, // 2 * 100 = 200 + 30 tax = 230
                ],
            ],
        ]);

        $res->assertStatus(201);
        $jeId = $res->json('data.journal_entry_id');
        $this->assertNotNull($jeId);

        // القيد يجب أن يكون: مدين الصندوق 1111 بـ 230، دائن المخزون بـ 200، دائن الضريبة بـ 30
        $je = JournalEntry::with('lines.account')->findOrFail($jeId);
        $this->assertTrue($je->isPosted());
        $cashLine = $je->lines->first(fn ($l) => $l->account->code === '1111');
        $this->assertNotNull($cashLine);
        $this->assertEquals(230.0, (float) $cashLine->debit);

        // رصيد المورد لا يتأثر لأن المسترد نقدي
        $supplier->refresh();
        $this->assertEquals($initialSupplierBalance, (float) $supplier->balance);
    }

    public function test_can_cancel_return_restoring_stock_and_reversing_journal(): void
    {
        $supplier = $this->createTestSupplier();
        $item = Item::first();
        $initialStock = (float) $item->stock_quantity;
        $initialSupplierBalance = (float) $supplier->balance;

        [$invoiceId, $lineId] = $this->createAndPostPurchaseInvoice($supplier, $item, 10.0, 50.0, 'credit');
        $supplier->refresh();
        $item->refresh();

        // 1. ترحيل مردود 4 حبات
        $res = $this->postJson('/api/v1/purchases/returns', [
            'purchase_invoice_id' => $invoiceId,
            'refund_method' => 'credit',
            'lines' => [
                [
                    'purchase_invoice_line_id' => $lineId,
                    'quantity' => 4,
                ],
            ],
        ]);
        $returnId = $res->json('data.id');

        // فحص المخزون نقص
        $item->refresh();
        $this->assertEquals($initialStock + 6.0, (float) $item->stock_quantity);

        // 2. إلغاء المردود
        $cancelRes = $this->postJson("/api/v1/purchases/returns/{$returnId}/cancel", [
            'reason' => 'خطأ في إدخال المردود',
        ]);
        $cancelRes->assertStatus(200);
        $cancelRes->assertJsonPath('data.status', 'cancelled');

        // فحص المخزون تم إرجاعه
        $item->refresh();
        $this->assertEquals($initialStock + 10.0, (float) $item->stock_quantity);

        // فحص رصيد المورد تم إرجاعه
        $supplier->refresh();
        $this->assertEquals($initialSupplierBalance + 575.0, (float) $supplier->balance);

        // محاولة إلغائه مرة ثانية ترفض
        $cancelAgainRes = $this->postJson("/api/v1/purchases/returns/{$returnId}/cancel");
        $cancelAgainRes->assertStatus(422);
    }

    public function test_purchase_return_integrates_and_reconciles_with_party_statement(): void
    {
        $supplier = $this->createTestSupplier();
        $item = Item::first();

        // إنشاء فاتورة شراء بـ 575
        [$invoiceId, $lineId] = $this->createAndPostPurchaseInvoice($supplier, $item, 10.0, 50.0, 'credit');

        // مردود بـ 230
        $this->postJson('/api/v1/purchases/returns', [
            'purchase_invoice_id' => $invoiceId,
            'refund_method' => 'credit',
            'lines' => [
                [
                    'purchase_invoice_line_id' => $lineId,
                    'quantity' => 4,
                ],
            ],
        ]);

        // استعلام كشف حساب المورد
        $statementService = app(PartyStatementService::class);
        $statement = $statementService->getStatement('supplier', $supplier->id);

        $this->assertTrue($statement['reconciliation']['is_reconciled']);
        $this->assertEquals(345.0, $statement['closing_balance']); // 575 - 230 = 345
        $this->assertEquals(345.0, $statement['party']['operational_balance']);

        // التحقق من وجود سطر المردود الإشعار المدين في كشف الحساب
        $transactions = collect($statement['transactions']);
        $returnTx = $transactions->first(fn ($t) => $t['document_type'] === 'purchase_return');
        $this->assertNotNull($returnTx);
        $this->assertEquals(230.0, (float) $returnTx['debit']);
        $this->assertEquals(0.0, (float) $returnTx['credit']);
    }
}
