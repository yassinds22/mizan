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
        Schema::create('item_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_unit_id')->constrained('item_units')->cascadeOnDelete();
            $table->string('price_tier', 50)->default('retail')->index();
            $table->decimal('price', 19, 4);
            $table->decimal('min_quantity', 15, 4)->default(1.0000);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['item_unit_id', 'price_tier']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_prices');
    }
};
