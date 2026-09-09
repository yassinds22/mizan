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
        Schema::create('item_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->foreignId('uom_id')->constrained('units_of_measure')->restrictOnDelete();
            $table->decimal('conversion_factor', 15, 4)->default(1.0000);
            $table->string('barcode', 100)->nullable()->index();
            $table->boolean('is_base_unit')->default(false);
            $table->timestamps();

            $table->unique(['item_id', 'uom_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_units');
    }
};
