<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_number', 50)->unique();
            $table->string('voucher_type', 20)->index(); // receipt, payment
            $table->date('date')->index();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('fiscal_period_id')->constrained('fiscal_periods')->restrictOnDelete();
            $table->string('party_type', 20)->index(); // customer, supplier, account
            $table->unsignedBigInteger('party_id')->nullable()->index();
            $table->string('party_name', 255);
            $table->foreignId('treasury_account_id')->constrained('chart_of_accounts')->restrictOnDelete();
            $table->foreignId('counter_account_id')->constrained('chart_of_accounts')->restrictOnDelete();
            $table->string('payment_method', 30)->default('cash'); // cash, bank_transfer, cheque, pos
            $table->string('reference_number', 100)->nullable();
            $table->decimal('amount', 15, 4);
            $table->foreignId('cost_center_id')->nullable()->constrained('cost_centers')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->string('received_from', 255)->nullable();
            $table->string('paid_to', 255)->nullable();
            $table->string('status', 20)->default('draft')->index(); // draft, posted, cancelled
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason', 255)->nullable();
            $table->timestamps();

            $table->index(['date', 'voucher_type', 'status']);
            $table->index(['party_type', 'party_id']);
        });

        Schema::create('voucher_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voucher_id')->constrained('vouchers')->cascadeOnDelete();
            $table->string('invoice_type', 30); // sales_invoice, purchase_invoice
            $table->unsignedBigInteger('invoice_id');
            $table->decimal('allocated_amount', 15, 4);
            $table->timestamps();

            $table->index(['voucher_id']);
            $table->index(['invoice_type', 'invoice_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher_allocations');
        Schema::dropIfExists('vouchers');
    }
};
