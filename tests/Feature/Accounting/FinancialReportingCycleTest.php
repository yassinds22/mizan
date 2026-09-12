<?php

declare(strict_types=1);

namespace Tests\Feature\Accounting;

use App\Domains\Accounting\Enums\JournalEntryStatus;
use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Accounting\Services\FinancialReportService;
use App\Domains\Accounting\Services\JournalService;
use App\Domains\Core\Models\Branch;
use App\Domains\Products\Models\Item;
use App\Domains\Purchases\Models\Supplier;
use App\Domains\Sales\Models\Customer;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CoreSeeder;
use Database\Seeders\CustomerSeeder;
use Database\Seeders\ProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialReportingCycleTest extends TestCase
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

    private function createTestSupplier(): Supplier
    {
        return Supplier::create([
            'code' => 'SUP-0001',
            'name_ar' => 'شركة التوريد الغذائي العالمية',
            'tax_number' => '310000000000003',
            'phone' => '0501234567',
            'city' => 'الرياض',
            'payment_terms_days' => 30,
            'balance' => 0.0,
            'is_active' => true,
        ]);
    }

    public function test_complete_financial_reporting_cycle_trial_balance_pnl_balance_sheet_and_vat(): void
    {
        $branch = Branch::first();
        $supplier = $this->createTestSupplier();
        $customer = Customer::first();
        $item = Item::first();
        $journalService = app(JournalService::class);
        $reportService = app(FinancialReportService::class);

        // 1. قيد إثبات رأس المال المودع في البنك: 200,000 ريال
        // مدين: البنك الراجحي (1114) / دائن: رأس المال (3100)
        $bankAccount = Account::where('code', '1114')->firstOrFail();
        $capitalAccount = Account::where('code', '3100')->firstOrFail();

        $journalService->createAndPost([
            'branch_id' => $branch->id,
            'date' => '2026-09-01',
            'description' => 'إثبات رأس المال الافتتاحي في البنك',
            'reference' => 'CAP-001',
        ], [
            [
                'account_id' => $bankAccount->id,
                'description' => 'إيداع رأس المال في مصرف الراجحي',
                'debit' => 200000.0,
                'credit' => 0.0,
            ],
            [
                'account_id' => $capitalAccount->id,
                'description' => 'رأس المال المدفوع للمؤسسة',
                'debit' => 0.0,
                'credit' => 200000.0,
            ],
        ]);

        // 2. فاتورة مشتريات آجلة: شراء 1,000 حبة بسعر 50 ريال = 50,000 + 7,500 ضريبة = 57,500
        $purchaseRes = $this->postJson('/api/v1/purchases/invoices', [
            'invoice_date' => '2026-09-02',
            'supplier_id' => $supplier->id,
            'branch_id' => $branch->id,
            'payment_method' => 'credit',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 1000,
                    'unit_price' => 50.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);
        $purchaseRes->assertStatus(201);

        // 3. فاتورة مبيعات نقدية: بيع 400 حبة بسعر 100 ريال وتكلفة 50 ريال
        // المبيعات = 40,000 + 6,000 ضريبة = 46,000 نقدية
        // COGS = 400 × 50 = 20,000
        $saleRes = $this->postJson('/api/v1/sales/invoices', [
            'invoice_date' => '2026-09-03',
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'payment_method' => 'cash',
            'post_immediately' => true,
            'lines' => [
                [
                    'item_id' => $item->id,
                    'unit_name' => 'حبة',
                    'conversion_factor' => 1.0,
                    'quantity' => 400,
                    'unit_price' => 100.0,
                    'cost_price' => 50.0,
                    'tax_rate' => 15.0,
                ],
            ],
        ]);
        $saleRes->assertStatus(201);

        // 4. قيد سداد مصروف إيجار من البنك: 5,000 ريال
        // مدين: إيجارات المقرات (5320) / دائن: البنك (1114)
        $rentAccount = Account::where('code', '5320')->firstOrFail();
        $journalService->createAndPost([
            'branch_id' => $branch->id,
            'date' => '2026-09-04',
            'description' => 'سداد إيجار المقر والمستودع',
            'reference' => 'EXP-001',
        ], [
            [
                'account_id' => $rentAccount->id,
                'description' => 'مصروف إيجار المقر لشهر سبتمبر',
                'debit' => 5000.0,
                'credit' => 0.0,
            ],
            [
                'account_id' => $bankAccount->id,
                'description' => 'تحويل من مصرف الراجحي',
                'debit' => 0.0,
                'credit' => 5000.0,
            ],
        ]);

        // ==========================================
        // 5. التحقق من ميزان المراجعة (Trial Balance)
        // ==========================================
        $trialBalance = $reportService->getTrialBalance([
            'date_from' => '2026-09-01',
            'date_to' => '2026-09-05',
        ]);

        $this->assertTrue($trialBalance['is_balanced'], 'ميزان المراجعة يجب أن يكون متوازناً تماماً.');
        $this->assertEquals(0.0, $trialBalance['totals']['difference']);
        $this->assertEquals($trialBalance['totals']['period_debit'], $trialBalance['totals']['period_credit']);
        $this->assertEquals($trialBalance['totals']['closing_debit'], $trialBalance['totals']['closing_credit']);

        // ==========================================
        // 6. التحقق من كشف دفتر الأستاذ العام (Account Ledger)
        // ==========================================
        // كشف حساب البنك (1114): إيداع رأس مال 200,000 - سداد إيجار 5,000 = 195,000
        $bankLedger = $reportService->getAccountLedger($bankAccount->id, [
            'date_from' => '2026-09-01',
            'date_to' => '2026-09-05',
        ]);
        $this->assertEquals(195000.0, $bankLedger['closing_balance']);
        $this->assertCount(2, $bankLedger['transactions']);

        // كشف حساب المخزون (1131): شراء 50,000 - مبيعات (COGS) 20,000 = 30,000
        $inventoryAccount = Account::where('code', '1131')->firstOrFail();
        $inventoryLedger = $reportService->getAccountLedger($inventoryAccount->id, [
            'date_from' => '2026-09-01',
            'date_to' => '2026-09-05',
        ]);
        $this->assertEquals(30000.0, $inventoryLedger['closing_balance']);

        // ==========================================
        // 7. التحقق من قائمة الدخل والأرباح والخسائر (Income Statement)
        // ==========================================
        $incomeStatement = $reportService->getIncomeStatement([
            'date_from' => '2026-09-01',
            'date_to' => '2026-09-05',
        ]);

        $this->assertEquals(40000.0, $incomeStatement['revenues']['total'], 'إجمالي الإيرادات يجب أن يكون 40,000');
        $this->assertEquals(20000.0, $incomeStatement['cogs']['total'], 'تكلفة البضاعة المباعة يجب أن تكون 20,000');
        $this->assertEquals(20000.0, $incomeStatement['gross_profit'], 'مجمل الربح يجب أن يكون 20,000 (40,000 - 20,000)');
        $this->assertEquals(50.0, $incomeStatement['gross_margin_percent'], 'هامش مجمل الربح 50%');
        $this->assertEquals(5000.0, $incomeStatement['operating_expenses']['total'], 'المصروفات التشغيلية يجب أن تكون 5,000');
        $this->assertEquals(15000.0, $incomeStatement['net_profit'], 'صافي الربح يجب أن يكون 15,000 (20,000 - 5,000)');

        // ==========================================
        // 8. التحقق من الميزانية العمومية (Balance Sheet) والمعادلة الذهبية
        // Assets = Liabilities + Equity
        // ==========================================
        $balanceSheet = $reportService->getBalanceSheet([
            'date_to' => '2026-09-05',
        ]);

        $this->assertTrue($balanceSheet['is_balanced'], 'الميزانية العمومية يجب أن تكون متوازنة: الأصول = الالتزامات + حقوق الملكية.');
        $this->assertEquals(0.0, $balanceSheet['difference']);

        // الأصول = بنك 195,000 + نقدية 46,000 + مخزون 30,000 + ضريبة مدخلات 7,500 = 278,500
        $this->assertEquals(278500.0, $balanceSheet['assets']['total']);

        // الخصوم = مورد 57,500 + ضريبة مخرجات 6,000 = 63,500
        $this->assertEquals(63500.0, $balanceSheet['liabilities']['total']);

        // حقوق الملكية = رأس المال 200,000 + صافي أرباح الفترة 15,000 = 215,000
        $this->assertEquals(15000.0, $balanceSheet['equity']['current_period_net_profit']);
        $this->assertEquals(215000.0, $balanceSheet['equity']['total_equity']);

        // مجموع الخصوم وحقوق الملكية = 63,500 + 215,000 = 278,500
        $this->assertEquals(278500.0, $balanceSheet['total_liabilities_and_equity']);

        // ==========================================
        // 9. التحقق من تقرير الموقف الضريبي (VAT Position Report)
        // ==========================================
        $vatReport = $reportService->getVatPositionReport([
            'date_from' => '2026-09-01',
            'date_to' => '2026-09-05',
        ]);

        $this->assertEquals(6000.0, $vatReport['output_vat']['net_tax'], 'ضريبة المخرجات يجب أن تكون 6,000');
        $this->assertEquals(7500.0, $vatReport['input_vat']['net_tax'], 'ضريبة المدخلات يجب أن تكون 7,500');
        $this->assertEquals(1500.0, $vatReport['net_vat_position']['amount']);
        $this->assertEquals('refundable', $vatReport['net_vat_position']['status'], 'الضريبة يجب أن تكون رصيد دائن مسترد');
    }
}
