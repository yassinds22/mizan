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
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->string('movement_number', 50)->unique();
            $table->string('movement_type', 50); // transfer, waste, adjustment, issue, receipt
            $table->date('movement_date');
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('from_warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('to_warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->string('reason', 255)->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 50)->default('draft'); // draft, posted, cancelled
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['movement_type', 'status']);
            $table->index('movement_date');
            $table->index('from_warehouse_id');
            $table->index('to_warehouse_id');
        });

        Schema::create('stock_movement_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_movement_id')->constrained('stock_movements')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->foreignId('from_location_id')->nullable()->constrained('warehouse_locations')->nullOnDelete();
            $table->foreignId('to_location_id')->nullable()->constrained('warehouse_locations')->nullOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('item_batches')->nullOnDelete();
            $table->decimal('quantity', 15, 4);
            $table->decimal('unit_cost', 15, 4)->default(0.0000);
            $table->decimal('total_cost', 15, 4)->default(0.0000);
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->index(['stock_movement_id', 'item_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movement_lines');
        Schema::dropIfExists('stock_movements');
    }
};
