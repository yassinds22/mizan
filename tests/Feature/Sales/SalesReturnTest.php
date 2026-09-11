<?php

declare(strict_types=1);

namespace Tests\Feature\Sales;

use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Core\Models\Branch;
use App\Domains\Products\Models\Item;
use App\Domains\Sales\Models\Customer;
use App\Domains\Sales\Models\SalesInvoice;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\CustomerSeeder;
use Database\Seeders\ProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesReturnTest extends TestCase
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

    public function test_can_get_returnable_lines_for_posted_invoice(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $item = Item::first();

        // 1. إنشاء وترحيل فاتورة بيع بكمية 10
        $invoiceRes = $this->postJson('/api/v1/sales/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 10,
                    'unit_price' => 50.0,
                    'cost_price' => 30.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);

        $invoiceRes->assertStatus(201);
        $invoiceId = $invoiceRes->json('data.id');

        // 2. الاستعلام عن أسطر الفاتورة القابلة للإرجاع
        $returnableRes = $this->getJson("/api/v1/sales/invoices/{$invoiceId}/returnable-lines");
        $returnableRes->assertStatus(200);
        $returnableRes->assertJsonPath('data.lines.0.original_quantity', 10);
        $returnableRes->assertJsonPath('data.lines.0.already_returned_quantity', 0);
        $returnableRes->assertJsonPath('data.lines.0.remaining_quantity', 10);
    }

    public function test_can_create_and_post_sales_return_with_stock_and_journal_restoration(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $item = Item::first();

        // رصيد المخزون الابتدائي = 100
        $item->update(['stock_quantity' => 100.0]);

        // بيع 10 حبات بتكلفة 30 وسعر 50
        $invoiceRes = $this->postJson('/api/v1/sales/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 10,
                    'unit_price' => 50.0,
                    'cost_price' => 30.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);
        $invoiceRes->assertStatus(201);
        $invoiceId = $invoiceRes->json('data.id');
        $invoiceLineId = $invoiceRes->json('data.lines.0.id');

        // المخزون بعد البيع أصبح 90
        $item->refresh();
        $this->assertEquals(90.0, (float) $item->stock_quantity);

        // إرجاع 4 حبات من الفاتورة
        $returnRes = $this->postJson('/api/v1/sales/returns', [
            'sales_invoice_id' => $invoiceId,
            'refund_method' => 'cash',
            'reason' => 'بضاعة زائدة عن حاجة العميل',
            'lines' => [
                [
                    'sales_invoice_line_id' => $invoiceLineId,
                    'quantity' => 4,
                ],
            ],
        ]);

        $returnRes->assertStatus(201);
        $returnRes->assertJsonPath('data.subtotal', 200); // 4 * 50 = 200
        $returnRes->assertJsonPath('data.tax_amount', 30); // 15% of 200 = 30
        $returnRes->assertJsonPath('data.total_amount', 230);
        $this->assertNotEmpty($returnRes->json('data.zatca_qr_payload'));

        // التحقق من استعادة رصيد المخزون: 90 + 4 = 94
        $item->refresh();
        $this->assertEquals(94.0, (float) $item->stock_quantity);

        // التحقق من قيد اليومية وتوازنه والتكلفة الأصلية (4 * 30 = 120)
        $journalEntryId = $returnRes->json('data.journal_entry_id');
        $journalEntry = JournalEntry::with('lines')->find($journalEntryId);
        $this->assertNotNull($journalEntry);
        $this->assertTrue($journalEntry->isPosted());

        // التحقق من توازن القيد
        $this->assertEquals((float) $journalEntry->total_debit, (float) $journalEntry->total_credit);

        // التحقق من وجود سطر تكلفة البضاعة المباعة COGS بقيمة 120 (4 حبات * 30 تكلفة أصلية)
        $cogsAccount = \App\Domains\Accounting\Models\Account::where('code', '5110')->first();
        $cogsLine = $journalEntry->lines->firstWhere('account_id', $cogsAccount->id);
        $this->assertNotNull($cogsLine);
        $this->assertEquals(120.0, (float) $cogsLine->credit);
    }

    public function test_cannot_return_more_than_remaining_quantity_duplicate_prevention(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $item = Item::first();
        $item->update(['stock_quantity' => 50.0]);

        // بيع 10 حبات
        $invoiceRes = $this->postJson('/api/v1/sales/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 10,
                    'unit_price' => 100.0,
                    'cost_price' => 60.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);
        $invoiceId = $invoiceRes->json('data.id');
        $invoiceLineId = $invoiceRes->json('data.lines.0.id');

        // 1. إرجاع أول: 6 حبات (المتبقي يصبح 4)
        $firstReturn = $this->postJson('/api/v1/sales/returns', [
            'sales_invoice_id' => $invoiceId,
            'refund_method' => 'cash',
            'lines' => [
                [
                    'sales_invoice_line_id' => $invoiceLineId,
                    'quantity' => 6,
                ],
            ],
        ]);
        $firstReturn->assertStatus(201);

        // 2. محاولة إرجاع 5 حبات (أكبر من المتبقي 4) -> يجب أن ترفض
        $excessReturn = $this->postJson('/api/v1/sales/returns', [
            'sales_invoice_id' => $invoiceId,
            'refund_method' => 'cash',
            'lines' => [
                [
                    'sales_invoice_line_id' => $invoiceLineId,
                    'quantity' => 5,
                ],
            ],
        ]);
        $excessReturn->assertStatus(422);
        $this->assertStringContainsString('تتجاوز الكمية المتبقية القابلة للإرجاع (4', $excessReturn->json('message'));

        // 3. إرجاع الـ 4 المتبقية بالضبط -> تنجح
        $secondReturn = $this->postJson('/api/v1/sales/returns', [
            'sales_invoice_id' => $invoiceId,
            'refund_method' => 'cash',
            'lines' => [
                [
                    'sales_invoice_line_id' => $invoiceLineId,
                    'quantity' => 4,
                ],
            ],
        ]);
        $secondReturn->assertStatus(201);

        // 4. محاولة إرجاع أي كمية إضافية (المتبقي 0) -> ترفض فوراً
        $thirdReturn = $this->postJson('/api/v1/sales/returns', [
            'sales_invoice_id' => $invoiceId,
            'refund_method' => 'cash',
            'lines' => [
                [
                    'sales_invoice_line_id' => $invoiceLineId,
                    'quantity' => 1,
                ],
            ],
        ]);
        $thirdReturn->assertStatus(422);
        $this->assertStringContainsString('تتجاوز الكمية المتبقية القابلة للإرجاع (0', $thirdReturn->json('message'));
    }

    public function test_credit_sales_return_adjusts_customer_balance(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $item = Item::first();
        $item->update(['stock_quantity' => 50.0]);

        $initialBalance = (float) $customer->balance;

        // فاتورة بيع آجل بمبلغ إجمالي 230
        $invoiceRes = $this->postJson('/api/v1/sales/invoices', [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'payment_method' => 'credit',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 2,
                    'unit_price' => 100.0,
                    'cost_price' => 50.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);
        $invoiceRes->assertStatus(201);
        $invoiceId = $invoiceRes->json('data.id');
        $invoiceLineId = $invoiceRes->json('data.lines.0.id');

        // رصيد العميل زاد بـ 230
        $customer->refresh();
        $this->assertEquals($initialBalance + 230.0, (float) $customer->balance);

        // مرتجع آجل لحبة واحدة (إجمالي 115)
        $returnRes = $this->postJson('/api/v1/sales/returns', [
            'sales_invoice_id' => $invoiceId,
            'refund_method' => 'credit',
            'lines' => [
                [
                    'sales_invoice_line_id' => $invoiceLineId,
                    'quantity' => 1,
                ],
            ],
        ]);
        $returnRes->assertStatus(201);

        // رصيد العميل ينخفض بـ 115
        $customer->refresh();
        $this->assertEquals($initialBalance + 115.0, (float) $customer->balance);
    }
}
