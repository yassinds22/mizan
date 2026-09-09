<?php

declare(strict_types=1);

namespace Tests\Feature\Sales;

use App\Domains\Core\Models\Branch;
use App\Domains\Products\Models\Item;
use App\Domains\Sales\Enums\InvoiceStatus;
use App\Domains\Sales\Models\Customer;
use App\Domains\Sales\Models\SalesInvoice;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\CustomerSeeder;
use Database\Seeders\ProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesInvoiceApiTest extends TestCase
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

    public function test_can_list_customers(): void
    {
        $response = $this->getJson('/api/v1/sales/customers');
        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => [['id', 'code', 'name_ar']]]);
    }

    public function test_can_create_draft_sales_invoice_via_api(): void
    {
        $branch = Branch::first();
        $customer = Customer::where('code', 'C-101')->first();
        $item = Item::with('units')->first();

        $payload = [
            'invoice_date' => '2026-09-09',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'payment_method' => 'cash',
            'lines' => [
                [
                    'item_id' => $item->id,
                    'item_unit_id' => $item->units->first()?->id,
                    'unit_name' => 'كرتون',
                    'conversion_factor' => 24.0,
                    'quantity' => 2,
                    'unit_price' => 100.0,
                    'discount_rate' => 10.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/sales/invoices', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('data.status.value', 'draft');
        $response->assertJsonPath('data.customer_name', $customer->name_ar);
        // Subtotal: 2 * 100 = 200, Discount 10% = 20, Taxable: 180, Tax 15% = 27, Total = 207
        $response->assertJsonPath('data.subtotal', 200);
        $response->assertJsonPath('data.discount_amount', 20);
        $response->assertJsonPath('data.tax_amount', 27);
        $response->assertJsonPath('data.total_amount', 207);

        $this->assertDatabaseHas('sales_invoices', [
            'customer_id' => $customer->id,
            'total_amount' => 207.0000,
            'status' => InvoiceStatus::DRAFT->value,
        ]);
    }

    public function test_can_create_and_post_sales_invoice_with_automatic_balanced_journal_entry(): void
    {
        $branch = Branch::first();
        $customer = Customer::where('code', 'C-102')->first();
        $item = Item::first();

        $payload = [
            'invoice_date' => '2026-09-09',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'payment_method' => 'credit',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 10,
                    'unit_price' => 50.0,
                    'discount_rate' => 0.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/sales/invoices', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('data.status.value', 'posted');

        $invoiceId = $response->json('data.id');
        $invoice = SalesInvoice::with('journalEntry.lines')->find($invoiceId);

        $this->assertNotNull($invoice->journal_entry_id);
        $this->assertNotNull($invoice->zatca_qr_payload);

        // Verify Journal Entry exists and is balanced
        $journalEntry = $invoice->journalEntry;
        $this->assertNotNull($journalEntry);
        $this->assertEquals(0, bccomp((string) $journalEntry->total_debit, (string) $journalEntry->total_credit, 4));

        // Subtotal: 500, Tax: 75, Total: 575
        $this->assertEquals('575.0000', (string) $invoice->total_amount);

        // Verify Customer balance adjusted for credit sale
        $customer->refresh();
        $this->assertEquals('575.0000', (string) $customer->balance);
    }
}
