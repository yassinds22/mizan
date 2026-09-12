<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stock_ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->string('entry_number', 50)->unique();
            $table->date('entry_date');
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignId('location_id')->nullable()->constrained('warehouse_locations')->nullOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('item_batches')->nullOnDelete();
            $table->string('voucher_type', 50); // stock_movement, sales_invoice, sales_return, purchase_invoice, purchase_return
            $table->unsignedBigInteger('voucher_id');
            $table->unsignedBigInteger('voucher_line_id')->nullable();
            $table->decimal('quantity_delta', 15, 4); // + for IN, - for OUT
            $table->decimal('balance_after', 15, 4);
            $table->decimal('unit_cost', 15, 4)->default(0.0000);
            $table->decimal('total_value_delta', 15, 4)->default(0.0000);
            $table->string('notes', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['item_id', 'warehouse_id', 'entry_date']);
            $table->index(['item_id', 'batch_id']);
            $table->index(['voucher_type', 'voucher_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_ledger_entries');
    }
};
