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
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->string('entry_number', 50)->unique()->index();
            $table->date('date')->index();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('fiscal_period_id')->constrained('fiscal_periods')->restrictOnDelete();
            $table->string('status', 20)->default('draft')->index();
            $table->string('source_type', 50)->default('manual')->index();
            $table->unsignedBigInteger('source_id')->nullable()->index();
            $table->string('source_reference')->nullable();
            $table->foreignId('reversal_of_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('reversed_by_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->decimal('total_debit', 19, 4)->default(0.0000);
            $table->decimal('total_credit', 19, 4)->default(0.0000);
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('journal_entry_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_entry_id')->constrained('journal_entries')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('chart_of_accounts')->restrictOnDelete();
            $table->foreignId('cost_center_id')->nullable()->constrained('cost_centers')->nullOnDelete();
            $table->decimal('debit', 19, 4)->default(0.0000);
            $table->decimal('credit', 19, 4)->default(0.0000);
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete();
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);
            $table->decimal('foreign_debit', 19, 4)->nullable();
            $table->decimal('foreign_credit', 19, 4)->nullable();
            $table->string('description')->nullable();
            $table->integer('line_order')->default(0);
            $table->timestamps();

            $table->index(['journal_entry_id', 'line_order']);
            $table->index(['account_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journal_entry_lines');
        Schema::dropIfExists('journal_entries');
    }
};
