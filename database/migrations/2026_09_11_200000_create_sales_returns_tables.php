<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_number', 50)->unique();
            $table->foreignId('sales_invoice_id')->constrained('sales_invoices')->restrictOnDelete();
            $table->date('return_date');
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('customer_name')->nullable();
            $table->string('refund_method', 30)->default('cash'); // cash, credit, bank_transfer
            $table->string('status', 30)->default('posted'); // posted, cancelled
            $table->decimal('subtotal', 15, 4)->default(0.0000);
            $table->decimal('tax_amount', 15, 4)->default(0.0000);
            $table->decimal('total_amount', 15, 4)->default(0.0000);
            $table->text('reason')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->text('zatca_qr_payload')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();

            $table->index(['return_date', 'status']);
            $table->index('sales_invoice_id');
        });

        Schema::create('sales_return_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_return_id')->constrained('sales_returns')->cascadeOnDelete();
            $table->foreignId('sales_invoice_line_id')->constrained('sales_invoice_lines')->restrictOnDelete();
            $table->foreignId('item_id')->constrained('items')->restrictOnDelete();
            $table->foreignId('item_unit_id')->nullable()->constrained('item_units')->nullOnDelete();
            $table->string('unit_name', 50);
            $table->decimal('conversion_factor', 12, 4)->default(1.0000);
            $table->decimal('quantity', 12, 4);
            $table->decimal('base_quantity', 12, 4);
            $table->decimal('unit_price', 15, 4);
            $table->decimal('cost_price', 15, 4)->default(0.0000);
            $table->decimal('tax_rate', 5, 2)->default(15.00);
            $table->decimal('tax_amount', 15, 4)->default(0.0000);
            $table->decimal('subtotal', 15, 4);
            $table->decimal('total', 15, 4);
            $table->timestamps();

            $table->index('sales_invoice_line_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_return_lines');
        Schema::dropIfExists('sales_returns');
    }
};
