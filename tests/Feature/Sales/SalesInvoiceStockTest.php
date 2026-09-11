<?php

declare(strict_types=1);

namespace Tests\Feature\Sales;

use App\Domains\Core\Models\Branch;
use App\Domains\Products\Models\Item;
use App\Domains\Sales\Models\Customer;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\CustomerSeeder;
use Database\Seeders\ProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesInvoiceStockTest extends TestCase
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

    public function test_cannot_create_sales_invoice_if_quantity_exceeds_available_stock(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $item = Item::first();

        // Set item stock to 5 units
        $item->update(['stock_quantity' => 5.0]);

        $payload = [
            'invoice_date' => '2026-09-11',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'payment_method' => 'cash',
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 10, // Exceeds 5
                    'unit_price' => 50.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/sales/invoices', $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['lines.0.quantity']);
        $errorMsg = $response->json('errors')['lines.0.quantity'][0] ?? '';
        $this->assertStringContainsString('الكمية المطلوبة', $errorMsg);
    }

    public function test_posting_sales_invoice_deducts_item_stock(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $item = Item::first();

        // Set initial stock to 10
        $item->update(['stock_quantity' => 10.0]);

        $payload = [
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
                    'quantity' => 3,
                    'unit_price' => 50.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/sales/invoices', $payload);
        $response->assertStatus(201);

        $item->refresh();
        $this->assertEquals(7.0, (float) $item->stock_quantity);
    }

    public function test_cancelling_posted_sales_invoice_restores_item_stock(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $item = Item::first();

        // Initial stock = 20
        $item->update(['stock_quantity' => 20.0]);

        $payload = [
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
                    'quantity' => 5,
                    'unit_price' => 50.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/sales/invoices', $payload);
        $response->assertStatus(201);

        $invoiceId = $response->json('data.id');

        $item->refresh();
        $this->assertEquals(15.0, (float) $item->stock_quantity);

        // Cancel the invoice
        $cancelResponse = $this->postJson("/api/v1/sales/invoices/{$invoiceId}/cancel", [
            'reason' => 'Customer returned item',
        ]);
        $cancelResponse->assertStatus(200);

        $item->refresh();
        $this->assertEquals(20.0, (float) $item->stock_quantity);
    }
}
