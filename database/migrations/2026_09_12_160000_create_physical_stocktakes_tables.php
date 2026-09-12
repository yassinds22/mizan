<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('physical_stocktakes', function (Blueprint $table) {
            $table->id();
            $table->string('stocktake_number', 50)->unique();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignId('location_id')->nullable()->constrained('warehouse_locations')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('item_categories')->nullOnDelete();
            $table->date('stocktake_date');
            $table->string('status', 30)->default('draft'); // draft, in_progress, posted, cancelled
            $table->string('scope', 30)->default('full'); // full, location, category
            $table->boolean('is_blind')->default(false); // الجرد الأعمى (إخفاء الرصيد الدفتري عن المدخل)
            $table->boolean('freeze_movements')->default(true); // تجميد الحركات على المستودع/الموقع أثناء الجرد
            
            // Statistics & Summary
            $table->unsignedInteger('total_items_count')->default(0);
            $table->unsignedInteger('matched_items_count')->default(0);
            $table->unsignedInteger('variance_items_count')->default(0);
            $table->decimal('total_shortage_value', 15, 4)->default(0.0000);
            $table->decimal('total_surplus_value', 15, 4)->default(0.0000);
            $table->decimal('net_variance_value', 15, 4)->default(0.0000);

            // References
            $table->foreignId('stock_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->string('supervisor_name', 150)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();

            $table->index(['warehouse_id', 'status']);
            $table->index('stocktake_date');
        });

        Schema::create('physical_stocktake_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('physical_stocktake_id')->constrained('physical_stocktakes')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('items')->restrictOnDelete();
            $table->foreignId('location_id')->nullable()->constrained('warehouse_locations')->nullOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('item_batches')->nullOnDelete();
            
            // Quantities
            $table->decimal('book_quantity', 15, 4)->default(0.0000);
            $table->decimal('counted_quantity', 15, 4)->default(0.0000);
            $table->decimal('difference_quantity', 15, 4)->default(0.0000); // counted - book
            $table->decimal('unit_cost', 15, 4)->default(0.0000);
            $table->decimal('difference_value', 15, 4)->default(0.0000); // difference_quantity * unit_cost

            // Status & Justification
            $table->string('variance_reason', 255)->nullable(); // سبب الفارق: تلف، خطأ إرسالية، عينات...
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->index(['physical_stocktake_id', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('physical_stocktake_lines');
        Schema::dropIfExists('physical_stocktakes');
    }
};
