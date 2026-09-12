<?php

declare(strict_types=1);

namespace Tests\Feature\Accounting;

use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Models\JournalEntryLine;
use App\Domains\Core\Models\Branch;
use App\Domains\Purchases\Models\Supplier;
use App\Domains\Purchases\Services\PurchaseInvoiceService;
use App\Domains\Sales\Models\Customer;
use App\Domains\Sales\Services\SalesInvoiceService;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\CustomerSeeder;
use Database\Seeders\ProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartyStatementReconciliationTest extends TestCase
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
    }

    /**
     * اختبار التطابق المحاسبي الثلاثي للمورد:
     * Statement Closing Balance == GL Control Account Balance == Supplier Operational Balance
     */
    public function test_supplier_statement_reconciles_perfectly_with_gl_and_operational_balance(): void
    {
        $branch = Branch::first();
        $supplier = Supplier::create([
            'code' => 'SUP-TEST-01',
            'name_ar' => 'شركة الأغذية المتحدة',
            'tax_number' => '310000000000003',
            'phone' => '0501234567',
            'city' => 'الرياض',
            'payment_terms_days' => 30,
            'balance' => 0.0,
            'is_active' => true,
        ]);

        $item = \App\Domains\Products\Models\Item::first();
        $itemUnit = $item->units->first();

        // 1. إنشاء وترحيل فاتورة مشتريات آجلة بقيمة 10,000 ريال
        /** @var PurchaseInvoiceService $purchaseService */
        $purchaseService = app(PurchaseInvoiceService::class);
        $invoice = $purchaseService->createInvoice([
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'invoice_date' => '2026-09-01',
            'payment_method' => 'credit',
            'notes' => 'فاتورة مشتريات بضاعة آجلة',
            'lines' => [
                [
                    'item_id' => $item->id,
                    'item_unit_id' => $itemUnit->id,
                    'quantity' => 100,
                    'unit_price' => 100.0,
                    'discount_amount' => 0,
                    'tax_rate' => 0,
                ],
            ],
        ]);
        $purchaseService->postInvoice($invoice->id);

        // 2. إنشاء وترحيل سند صرف للمورد بقيمة 3,500 ريال عبر الـ API
        $voucherRes = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'payment',
            'date' => '2026-09-05',
            'branch_id' => $branch->id,
            'treasury_account_id' => Account::where('code', '1111')->first()->id,
            'party_type' => 'supplier',
            'party_id' => $supplier->id,
            'amount' => 3500.0,
            'payment_method' => 'cash',
            'notes' => 'دفعة نقدية تحت الحساب',
            'post_immediately' => true,
        ]);
        $voucherRes->assertStatus(201);

        // 3. استدعاء API كشف حساب المورد
        $response = $this->getJson("/api/v1/accounting/statements/party?party_type=supplier&party_id={$supplier->id}");
        $response->assertStatus(200);
        $response->assertJsonPath('success', true);

        $data = $response->json('data');

        $statementClosingBalance = (float) $data['closing_balance'];
        $supplierOperationalBalance = (float) $supplier->fresh()->balance;

        // 4. استخراج رصيد حساب مراقبة الموردين (2110) من دفتر الأستاذ العام (GL)
        $supplierControlAccount = Account::where('code', '2110')->first();
        $glSupplierLines = JournalEntryLine::where('account_id', $supplierControlAccount->id)->get();
        $glBalance = (float) ($glSupplierLines->sum('credit') - $glSupplierLines->sum('debit'));

        // 5. الفحص المحاسبي الثلاثي الصارم:
        // الرصيد المتوقع = 10,000 - 3,500 = 6,500
        $this->assertEquals(6500.00, $statementClosingBalance, 'Statement Closing Balance must be 6500.00');
        $this->assertEquals(6500.00, $supplierOperationalBalance, 'Supplier Operational Balance must be 6500.00');
        $this->assertEquals(6500.00, $glBalance, 'GL Control Account Net Balance must be 6500.00');

        // التأكد من تطابق الثلاثة معاً
        $this->assertEquals($statementClosingBalance, $supplierOperationalBalance);
        $this->assertEquals($statementClosingBalance, $glBalance);
        $this->assertTrue($data['reconciliation']['is_reconciled']);

        // التحقق من الحركات
        $this->assertCount(2, $data['transactions']);
        $this->assertEquals(0.00, $data['opening_balance']);
        $this->assertEquals(3500.00, (float) $data['total_debit']);
        $this->assertEquals(10000.00, (float) $data['total_credit']);
    }

    /**
     * اختبار التطابق المحاسبي الثلاثي للعميل:
     * Statement Closing Balance == GL Control Account Balance == Customer Operational Balance
     */
    public function test_customer_statement_reconciles_perfectly_with_gl_and_operational_balance(): void
    {
        $branch = Branch::first();
        $customer = Customer::create([
            'code' => 'CUST-TEST-01',
            'name_ar' => 'أسواق النخبة للتجارة',
            'phone' => '0559876543',
            'city' => 'جدة',
            'credit_limit' => 50000.0,
            'balance' => 0.0,
            'is_active' => true,
        ]);

        $item = \App\Domains\Products\Models\Item::first();
        $itemUnit = $item->units->first();

        // 1. إنشاء وترحيل فاتورة مبيعات آجلة بقيمة 12,000 ريال
        /** @var SalesInvoiceService $salesService */
        $salesService = app(SalesInvoiceService::class);
        $invoice = $salesService->createInvoice(
            [
                'branch_id' => $branch->id,
                'customer_id' => $customer->id,
                'invoice_date' => '2026-09-02',
                'payment_method' => 'credit',
                'notes' => 'فاتورة مبيعات جملة',
            ],
            [
                [
                    'item_id' => $item->id,
                    'item_unit_id' => $itemUnit->id,
                    'quantity' => 50,
                    'unit_price' => 200.0,
                    'discount_amount' => 0,
                    'tax_rate' => 0,
                ],
            ]
        );
        $salesService->postInvoice($invoice->id);

        // 2. إنشاء وترحيل سند قبض من العميل بقيمة 4,000 ريال عبر الـ API
        $voucherRes = $this->postJson('/api/v1/treasury/vouchers', [
            'voucher_type' => 'receipt',
            'date' => '2026-09-06',
            'branch_id' => $branch->id,
            'treasury_account_id' => Account::where('code', '1111')->first()->id,
            'party_type' => 'customer',
            'party_id' => $customer->id,
            'amount' => 4000.0,
            'payment_method' => 'cash',
            'notes' => 'تحصيل دفعة نقدية',
            'post_immediately' => true,
        ]);
        $voucherRes->assertStatus(201);

        // 3. استدعاء API كشف حساب العميل
        $response = $this->getJson("/api/v1/accounting/statements/party?party_type=customer&party_id={$customer->id}");
        $response->assertStatus(200);
        $response->assertJsonPath('success', true);

        $data = $response->json('data');

        $statementClosingBalance = (float) $data['closing_balance'];
        $customerOperationalBalance = (float) $customer->fresh()->balance;

        // 4. استخراج رصيد حساب مراقبة العملاء (1121) من دفتر الأستاذ العام
        $customerControlAccount = Account::where('code', '1121')->first();
        $glCustomerLines = JournalEntryLine::where('account_id', $customerControlAccount->id)->get();
        $glBalance = (float) ($glCustomerLines->sum('debit') - $glCustomerLines->sum('credit'));

        // 5. الفحص المحاسبي الثلاثي:
        // الرصيد المتوقع = 10,000 - 4,000 = 6,000
        $this->assertEquals(6000.00, $statementClosingBalance, 'Statement Closing Balance must be 6000.00');
        $this->assertEquals(6000.00, $customerOperationalBalance, 'Customer Operational Balance must be 6000.00');
        $this->assertEquals(6000.00, $glBalance, 'GL Control Account Net Balance must be 6000.00');

        $this->assertEquals($statementClosingBalance, $customerOperationalBalance);
        $this->assertEquals($statementClosingBalance, $glBalance);
        $this->assertTrue($data['reconciliation']['is_reconciled']);

        // التحقق من الحركات والمجاميع
        $this->assertCount(2, $data['transactions']);
        $this->assertEquals(10000.00, (float) $data['total_debit']);
        $this->assertEquals(4000.00, (float) $data['total_credit']);
    }

    /**
     * اختبار صحة احتساب الرصيد الافتتاحي ما قبل تاريخ البداية
     */
    public function test_statement_opening_balance_calculation_with_date_filters(): void
    {
        $branch = Branch::first();
        $supplier = Supplier::create([
            'code' => 'SUP-TEST-DATE',
            'name_ar' => 'مورد اختبار التواريخ',
            'phone' => '0500000000',
            'city' => 'الرياض',
            'balance' => 0.0,
            'is_active' => true,
        ]);

        $item = \App\Domains\Products\Models\Item::first();
        $itemUnit = $item->units->first();

        /** @var PurchaseInvoiceService $purchaseService */
        $purchaseService = app(PurchaseInvoiceService::class);

        // حركة 1: فاتورة مشتريات بتاريخ 2026-08-15 بقيمة 5,000 ريال
        $inv1 = $purchaseService->createInvoice([
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'invoice_date' => '2026-08-15',
            'payment_method' => 'credit',
            'lines' => [
                ['item_id' => $item->id, 'item_unit_id' => $itemUnit->id, 'quantity' => 50, 'unit_price' => 100.0, 'tax_rate' => 0],
            ],
        ]);
        $purchaseService->postInvoice($inv1->id);

        // حركة 2: فاتورة مشتريات بتاريخ 2026-09-10 بقيمة 3,000 ريال
        $inv2 = $purchaseService->createInvoice([
            'branch_id' => $branch->id,
            'supplier_id' => $supplier->id,
            'invoice_date' => '2026-09-10',
            'payment_method' => 'credit',
            'lines' => [
                ['item_id' => $item->id, 'item_unit_id' => $itemUnit->id, 'quantity' => 30, 'unit_price' => 100.0, 'tax_rate' => 0],
            ],
        ]);
        $purchaseService->postInvoice($inv2->id);

        // الاستعلام عن الفترة من 2026-09-01 إلى 2026-09-30
        $response = $this->getJson("/api/v1/accounting/statements/party?party_type=supplier&party_id={$supplier->id}&date_from=2026-09-01&date_to=2026-09-30");
        $response->assertStatus(200);

        $data = $response->json('data');

        // الرصيد الافتتاحي قبل 2026-09-01 يجب أن يكون 5,000.00 (فاتورة شهر 8)
        $this->assertEquals(5000.00, (float) $data['opening_balance']);
        // حركات الفترة يجب أن تحتوي فقط على فاتورة شهر 9
        $this->assertCount(1, $data['transactions']);
        $this->assertEquals(3000.00, (float) $data['total_credit']);
        // الرصيد الختامي يجب أن يكون 5,000 + 3,000 = 8,000
        $this->assertEquals(8000.00, (float) $data['closing_balance']);
        // الرصيد التشغيلي الإجمالي لا يزال 8,000
        $this->assertEquals(8000.00, (float) $supplier->fresh()->balance);
    }
}
