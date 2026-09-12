<?php

declare(strict_types=1);

namespace Tests\Feature\Treasury;

use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Core\Models\Branch;
use App\Domains\Core\Models\FiscalPeriod;
use App\Domains\Purchases\Models\Supplier;
use App\Domains\Sales\Models\Customer;
use App\Domains\Sales\Models\SalesInvoice;
use App\Domains\Treasury\Enums\VoucherStatus;
use App\Domains\Treasury\Enums\VoucherType;
use App\Domains\Treasury\Models\Voucher;
use App\Domains\Treasury\Models\VoucherAllocation;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\CustomerSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\SupplierSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class VoucherTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            CoreSeeder::class,
            AccountingSeeder::class,
            ProductSeeder::class,
            CustomerSeeder::class,
        ]);

        Supplier::create([
            'code' => 'SUP-0001',
            'name_ar' => 'شركة المراعي للتوزيع',
            'tax_number' => '310000000000003',
            'phone' => '0501234567',
            'city' => 'الرياض',
            'payment_terms_days' => 30,
            'balance' => 0.0,
            'is_active' => true,
        ]);
    }


    /** 1. السند المسودة ليس له أي أثر مالي ولا ينشئ قيوداً */
    public function test_draft_voucher_has_no_financial_effect(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $treasury = Account::where('code', '1111')->first();
        $initialBalance = (float) $customer->balance;

        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 500.0,
            'notes' => 'مسودة سند قبض',
            'post_immediately' => false,
        ]);

        $response->assertStatus(201);
        $voucherId = $response->json('data.id');

        $voucher = Voucher::find($voucherId);
        $this->assertEquals(VoucherStatus::DRAFT, $voucher->status);
        $this->assertNull($voucher->journal_entry_id);

        // لم يتغير رصيد العميل
        $customer->refresh();
        $this->assertEquals($initialBalance, (float) $customer->balance);
    }

    /** 2. ترحيل سند قبض عميل يحدد حساب تحكم العملاء تلقائياً ويخفض رصيد المديونية */
    public function test_post_customer_receipt_voucher(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $customer->update(['balance' => 2000.0]);
        $treasury = Account::where('code', '1111')->first();

        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 800.0,
            'post_immediately' => true,
        ]);

        $response->assertStatus(201);
        $voucher = Voucher::find($response->json('data.id'));

        $this->assertEquals(VoucherStatus::POSTED, $voucher->status);
        $this->assertNotNull($voucher->journal_entry_id);

        // الحساب المقابل محدد تلقائياً كحساب العملاء 1121
        $customerControlAccount = Account::where('code', '1121')->first();
        $this->assertEquals($customerControlAccount->id, $voucher->counter_account_id);

        // تخفيض مديونية العميل
        $customer->refresh();
        $this->assertEquals(1200.0, (float) $customer->balance);

        // التحقق من توازن قيد اليومية
        $journal = JournalEntry::with('lines')->find($voucher->journal_entry_id);
        $this->assertEquals('posted', $journal->status->value);
        $this->assertEquals(800.0, (float) $journal->total_debit);
        $this->assertEquals(800.0, (float) $journal->total_credit);

        // النقدية مدين والعملاء دائن
        $debitLine = $journal->lines->where('debit', '>', 0)->first();
        $creditLine = $journal->lines->where('credit', '>', 0)->first();
        $this->assertEquals($treasury->id, $debitLine->account_id);
        $this->assertEquals($customerControlAccount->id, $creditLine->account_id);
    }

    /** 3. ترحيل سند صرف مورد يحدد حساب تحكم الموردين تلقائياً ويخفض الالتزام */
    public function test_post_supplier_payment_voucher(): void
    {
        $branch = Branch::first();
        $supplier = Supplier::first();
        $supplier->update(['balance' => 5000.0]);
        $bank = Account::where('code', '1114')->first();

        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'payment',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'supplier',
            'party_id' => $supplier->id,
            'treasury_account_id' => $bank->id,
            'amount' => 1500.0,
            'post_immediately' => true,
        ]);

        $response->assertStatus(201);
        $voucher = Voucher::find($response->json('data.id'));

        $this->assertEquals(VoucherStatus::POSTED, $voucher->status);

        // الحساب المقابل محدد تلقائياً كحساب الموردين 2110
        $supplierControlAccount = Account::where('code', '2110')->first();
        $this->assertEquals($supplierControlAccount->id, $voucher->counter_account_id);

        // تخفيض مديونية/مستحقات المورد
        $supplier->refresh();
        $this->assertEquals(3500.0, (float) $supplier->balance);

        // التحقق من القيد: المورد مدين والبنك دائن
        $journal = JournalEntry::with('lines')->find($voucher->journal_entry_id);
        $debitLine = $journal->lines->where('debit', '>', 0)->first();
        $creditLine = $journal->lines->where('credit', '>', 0)->first();
        $this->assertEquals($supplierControlAccount->id, $debitLine->account_id);
        $this->assertEquals($bank->id, $creditLine->account_id);
    }

    /** 4. ترحيل سند صرف لمصروف مباشر من دليل الحسابات */
    public function test_post_direct_expense_voucher(): void
    {
        $branch = Branch::first();
        $treasury = Account::where('code', '1111')->first();
        $expenseAccount = Account::where('code', '5210')->first(); // محروقات وصيانة سيارات التوزيع

        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'payment',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'account',
            'counter_account_id' => $expenseAccount->id,
            'party_name' => 'محطة وقود التوزيع',
            'treasury_account_id' => $treasury->id,
            'amount' => 450.0,
            'post_immediately' => true,
        ]);

        $response->assertStatus(201);
        $voucher = Voucher::find($response->json('data.id'));

        $this->assertEquals(VoucherStatus::POSTED, $voucher->status);

        $journal = JournalEntry::with('lines')->find($voucher->journal_entry_id);
        $debitLine = $journal->lines->where('debit', '>', 0)->first();
        $creditLine = $journal->lines->where('credit', '>', 0)->first();
        $this->assertEquals($expenseAccount->id, $debitLine->account_id);
        $this->assertEquals($treasury->id, $creditLine->account_id);
    }

    /** 5. تخصيص السداد لفاتورة مبيعات يقلل المتبقي منها بدقة */
    public function test_post_voucher_with_invoice_allocation(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $treasury = Account::where('code', '1111')->first();

        // إنشاء فاتورة مبيعات بمبلغ 1000
        $invoice = SalesInvoice::create([
            'invoice_number' => 'INV-TEST-001',
            'invoice_date' => '2026-09-12',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'customer_name' => $customer->name_ar,
            'payment_method' => 'credit',
            'status' => 'posted',
            'subtotal' => 1000.0,
            'total_amount' => 1000.0,
            'paid_amount' => 0.0,
            'remaining_amount' => 1000.0,
        ]);

        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 600.0,
            'allocations' => [
                [
                    'invoice_type' => 'sales_invoice',
                    'invoice_id' => $invoice->id,
                    'allocated_amount' => 600.0,
                ],
            ],
            'post_immediately' => true,
        ]);

        $response->assertStatus(201);

        $invoice->refresh();
        $this->assertEquals(600.0, (float) $invoice->paid_amount);
        $this->assertEquals(400.0, (float) $invoice->remaining_amount);
    }

    /** 6. إلغاء السند يعكس القيد والأثر المالي ويحتفظ بسجلات التخصيص للأرشيف */
    public function test_cancel_posted_voucher_reverses_journal_and_preserves_allocations(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $customer->update(['balance' => 1000.0]);
        $treasury = Account::where('code', '1111')->first();

        $invoice = SalesInvoice::create([
            'invoice_number' => 'INV-TEST-002',
            'invoice_date' => '2026-09-12',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'customer_name' => $customer->name_ar,
            'payment_method' => 'credit',
            'status' => 'posted',
            'total_amount' => 1000.0,
            'paid_amount' => 0.0,
            'remaining_amount' => 1000.0,
        ]);

        // 1. ترحيل السند
        $createRes = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 700.0,
            'allocations' => [
                [
                    'invoice_type' => 'sales_invoice',
                    'invoice_id' => $invoice->id,
                    'allocated_amount' => 700.0,
                ],
            ],
            'post_immediately' => true,
        ]);

        $createRes->assertStatus(201);
        $voucherId = $createRes->json('data.id');

        // 2. إلغاء السند
        $cancelRes = $this->postJson("/api/v1/treasury/vouchers/{$voucherId}/cancel", [
            'reason' => 'إلغاء شيك بدون رصيد',
        ]);

        $cancelRes->assertStatus(200);

        $voucher = Voucher::find($voucherId);
        $this->assertEquals(VoucherStatus::CANCELLED, $voucher->status);

        // سجلات التخصيص لا زالت محفوظة للأرشيف
        $this->assertCount(1, $voucher->allocations);

        // استرجاع رصيد الفاتورة
        $invoice->refresh();
        $this->assertEquals(0.0, (float) $invoice->paid_amount);
        $this->assertEquals(1000.0, (float) $invoice->remaining_amount);

        // استرجاع رصيد العميل
        $customer->refresh();
        $this->assertEquals(1000.0, (float) $customer->balance);
    }

    /** 7. منع ترحيل السند في فترة مالية مغلقة */
    public function test_cannot_post_in_closed_fiscal_period(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $treasury = Account::where('code', '1111')->first();

        // إقفال فترة شهر يناير 2026
        $period = FiscalPeriod::where('period_number', 1)->first();
        $period->update(['status' => 'closed']);

        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-01-15',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 300.0,
            'post_immediately' => true,
        ]);

        $response->assertStatus(422);
    }

    /** 8. منع ترحيل نفس السند مرتين (Idempotency) */
    public function test_cannot_post_voucher_twice(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $treasury = Account::where('code', '1111')->first();

        $createRes = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 500.0,
            'post_immediately' => true,
        ]);

        $voucherId = $createRes->json('data.id');

        // محاولة إعادة الترحيل مرة ثانية
        $secondPost = $this->postJson("/api/v1/treasury/vouchers/{$voucherId}/post");
        $secondPost->assertStatus(422);
    }

    /** 9. منع إلغاء السند الملغى مسبقاً */
    public function test_cannot_cancel_voucher_twice(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $treasury = Account::where('code', '1111')->first();

        $createRes = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 500.0,
            'post_immediately' => true,
        ]);

        $voucherId = $createRes->json('data.id');

        $this->postJson("/api/v1/treasury/vouchers/{$voucherId}/cancel");
        $secondCancel = $this->postJson("/api/v1/treasury/vouchers/{$voucherId}/cancel");

        $secondCancel->assertStatus(422);
    }

    /** 10. التحقق من رفض المبالغ السالبة أو الصفرية */
    public function test_validation_rejects_negative_or_zero_amounts(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $treasury = Account::where('code', '1111')->first();

        $responseZero = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 0.0,
        ]);
        $responseZero->assertStatus(422);

        $responseNeg = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => -100.0,
        ]);
        $responseNeg->assertStatus(422);
    }

    /** 11. منع تخصيص مبلغ يتجاوز المتبقي من الفاتورة */
    public function test_cannot_allocate_more_than_invoice_remaining(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $treasury = Account::where('code', '1111')->first();

        $invoice = SalesInvoice::create([
            'invoice_number' => 'INV-TEST-003',
            'invoice_date' => '2026-09-12',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'customer_name' => $customer->name_ar,
            'payment_method' => 'credit',
            'status' => 'posted',
            'total_amount' => 500.0,
            'paid_amount' => 300.0,
            'remaining_amount' => 200.0,
        ]);

        // محاولة تخصيص 250 في حين المتبقي فقط 200
        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 300.0,
            'allocations' => [
                [
                    'invoice_type' => 'sales_invoice',
                    'invoice_id' => $invoice->id,
                    'allocated_amount' => 250.0,
                ],
            ],
            'post_immediately' => true,
        ]);

        $response->assertStatus(422);
    }

    /** 12. منع تخصيص فاتورة تخص عميلاً أو مورداً آخر */
    public function test_cannot_allocate_invoice_belonging_to_another_party(): void
    {
        $branch = Branch::first();
        $customerA = Customer::first();
        $customerB = Customer::skip(1)->first();
        $treasury = Account::where('code', '1111')->first();

        // فاتورة تخص العميل B
        $invoiceB = SalesInvoice::create([
            'invoice_number' => 'INV-TEST-B',
            'invoice_date' => '2026-09-12',
            'branch_id' => $branch->id,
            'customer_id' => $customerB->id,
            'customer_name' => $customerB->name_ar,
            'payment_method' => 'credit',
            'status' => 'posted',
            'total_amount' => 1000.0,
            'paid_amount' => 0.0,
            'remaining_amount' => 1000.0,
        ]);

        // محاولة سداد فاتورة B بسند يخص العميل A
        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customerA->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 500.0,
            'allocations' => [
                [
                    'invoice_type' => 'sales_invoice',
                    'invoice_id' => $invoiceB->id,
                    'allocated_amount' => 500.0,
                ],
            ],
            'post_immediately' => true,
        ]);

        $response->assertStatus(422);
    }

    /** 13. مجموع التخصيصات لا يمكن أن يتجاوز مبلغ السند */
    public function test_allocation_total_cannot_exceed_voucher_amount(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $treasury = Account::where('code', '1111')->first();

        $invoice = SalesInvoice::create([
            'invoice_number' => 'INV-TEST-004',
            'invoice_date' => '2026-09-12',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'customer_name' => $customer->name_ar,
            'payment_method' => 'credit',
            'status' => 'posted',
            'total_amount' => 1000.0,
            'paid_amount' => 0.0,
            'remaining_amount' => 1000.0,
        ]);

        // السند 400 والتخصيص 500
        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 400.0,
            'allocations' => [
                [
                    'invoice_type' => 'sales_invoice',
                    'invoice_id' => $invoice->id,
                    'allocated_amount' => 500.0,
                ],
            ],
            'post_immediately' => true,
        ]);

        $response->assertStatus(422);
    }

    /** 14. التحقق من أن حساب الخزينة يجب أن يكون نقدياً أو بنكياً صالحاً (رفض المصروفات والأصول الأخرى) */
    public function test_treasury_account_must_be_valid_cash_or_bank_account(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $expenseAccount = Account::where('code', '5210')->first();

        // محاولة استخدام حساب مصروفات كخزينة
        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $expenseAccount->id,
            'amount' => 500.0,
        ]);

        $response->assertStatus(422);
    }

    /** 15. سند قبض العميل لا ينشئ إيراد مبيعات جديداً في الأستاذ العام */
    public function test_customer_receipt_must_not_create_revenue(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $treasury = Account::where('code', '1111')->first();

        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 1000.0,
            'post_immediately' => true,
        ]);

        $response->assertStatus(201);
        $voucher = Voucher::find($response->json('data.id'));

        $journal = JournalEntry::with('lines.account')->find($voucher->journal_entry_id);
        // التحقق من عدم وجود أي سطر إيراد (نوع الحساب revenue)
        $hasRevenue = $journal->lines->contains(fn ($l) => $l->account->type->value === 'revenue');
        $this->assertFalse($hasRevenue, 'سند قبض العميل يجب ألا يحتوي على أي حساب إيرادات.');
    }

    /** 16. سند صرف المورد لا ينشئ تكلفة أو مشتريات جديدة في الأستاذ العام */
    public function test_supplier_payment_must_not_create_purchase_or_expense(): void
    {
        $branch = Branch::first();
        $supplier = Supplier::first();
        $treasury = Account::where('code', '1111')->first();

        $response = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'payment',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'supplier',
            'party_id' => $supplier->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 1200.0,
            'post_immediately' => true,
        ]);

        $response->assertStatus(201);
        $voucher = Voucher::find($response->json('data.id'));

        $journal = JournalEntry::with('lines.account')->find($voucher->journal_entry_id);
        // التحقق من عدم وجود أي سطر مصروف أو تكلفة (نوع الحساب expense)
        $hasExpense = $journal->lines->contains(fn ($l) => $l->account->type->value === 'expense');
        $this->assertFalse($hasExpense, 'سند صرف المورد يجب ألا يحتوي على أي حساب مصروفات أو تكلفة.');
    }

    /** 17. السداد المتزامن للفاتورة لا يمكن أن يتجاوز رصيدها (Concurrency Protection) */
    public function test_concurrent_posting_cannot_double_allocate_invoice(): void
    {
        $branch = Branch::first();
        $customer = Customer::first();
        $treasury = Account::where('code', '1111')->first();

        $invoice = SalesInvoice::create([
            'invoice_number' => 'INV-CONCURRENCY-1',
            'invoice_date' => '2026-09-12',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'customer_name' => $customer->name_ar,
            'payment_method' => 'credit',
            'status' => 'posted',
            'total_amount' => 500.0,
            'paid_amount' => 0.0,
            'remaining_amount' => 500.0,
        ]);

        // السند الأول يستوفي الفاتورة بالكامل
        $res1 = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 500.0,
            'allocations' => [
                [
                    'invoice_type' => 'sales_invoice',
                    'invoice_id' => $invoice->id,
                    'allocated_amount' => 500.0,
                ],
            ],
            'post_immediately' => true,
        ]);
        $res1->assertStatus(201);

        // محاولة ترحيل سند ثانٍ يحاول سداد نفس الفاتورة المسددة بالكامل
        $res2 = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-12',
            'branch_id' => $branch->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'treasury_account_id' => $treasury->id,
            'amount' => 500.0,
            'allocations' => [
                [
                    'invoice_type' => 'sales_invoice',
                    'invoice_id' => $invoice->id,
                    'allocated_amount' => 500.0,
                ],
            ],
            'post_immediately' => true,
        ]);

        $res2->assertStatus(422);
    }
}
