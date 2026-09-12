<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_number', 50)->unique();
            $table->string('debit_note_number', 50)->nullable();
            $table->foreignId('purchase_invoice_id')->constrained('purchase_invoices')->restrictOnDelete();
            $table->date('return_date');
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->string('supplier_name')->nullable();
            $table->string('refund_method', 30)->default('credit'); // credit, cash, bank_transfer
            $table->string('status', 30)->default('posted'); // posted, cancelled
            $table->decimal('subtotal', 19, 4)->default(0.0000);
            $table->decimal('tax_amount', 19, 4)->default(0.0000);
            $table->decimal('total_amount', 19, 4)->default(0.0000);
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['return_date', 'status']);
            $table->index('purchase_invoice_id');
            $table->index('supplier_id');
        });

        Schema::create('purchase_return_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_return_id')->constrained('purchase_returns')->cascadeOnDelete();
            $table->foreignId('purchase_invoice_line_id')->constrained('purchase_invoice_lines')->restrictOnDelete();
            $table->foreignId('item_id')->constrained('items')->restrictOnDelete();
            $table->foreignId('item_unit_id')->nullable()->constrained('item_units')->nullOnDelete();
            $table->string('unit_name', 50);
            $table->decimal('conversion_factor', 15, 4)->default(1.0000);
            $table->decimal('quantity', 15, 4);
            $table->decimal('base_quantity', 15, 4);
            $table->decimal('unit_price', 19, 4);
            $table->decimal('tax_rate', 5, 2)->default(15.00);
            $table->decimal('tax_amount', 19, 4)->default(0.0000);
            $table->decimal('subtotal', 19, 4);
            $table->decimal('total', 19, 4);
            $table->timestamps();

            $table->index('purchase_invoice_line_id');
            $table->index('item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_return_lines');
        Schema::dropIfExists('purchase_returns');
    }
};
