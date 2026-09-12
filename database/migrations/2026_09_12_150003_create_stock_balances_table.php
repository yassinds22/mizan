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
        Schema::create('stock_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignId('location_id')->nullable()->constrained('warehouse_locations')->nullOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('item_batches')->nullOnDelete();
            $table->decimal('quantity', 15, 4)->default(0.0000);
            $table->decimal('reserved_quantity', 15, 4)->default(0.0000);
            $table->decimal('unit_cost', 15, 4)->default(0.0000);
            $table->timestamps();

            $table->index(['item_id', 'warehouse_id']);
            $table->index(['warehouse_id', 'location_id']);
            $table->index(['item_id', 'batch_id']);
            $table->index('quantity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_balances');
    }
};
