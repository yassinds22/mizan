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
        Schema::create('item_categories', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique()->index();
            $table->string('name_ar', 255);
            $table->string('name_en', 255)->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('item_categories')->nullOnDelete();
            
            // الربط المحاسبي التلقائي بالتصنيف
            $table->foreignId('inventory_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignId('cogs_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignId('revenue_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();

            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_categories');
    }
};
