<?php

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
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('sku', 50)->unique()->index();
            $table->string('barcode', 100)->nullable()->index();
            $table->string('name_ar', 255);
            $table->string('name_en', 255)->nullable();
            $table->foreignId('category_id')->constrained('item_categories')->restrictOnDelete();
            $table->foreignId('tax_category_id')->nullable()->constrained('tax_categories')->nullOnDelete();
            $table->foreignId('base_uom_id')->constrained('units_of_measure')->restrictOnDelete();
            $table->string('storage_condition', 20)->default('ambient')->index();
            $table->boolean('is_perishable')->default(true)->index();
            $table->unsignedInteger('shelf_life_days')->nullable();
            $table->decimal('reorder_level', 15, 4)->default(0.0000);
            $table->decimal('cost_price', 19, 4)->default(0.0000);
            $table->boolean('is_active')->default(true)->index();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
