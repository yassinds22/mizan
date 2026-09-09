<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Accounting\Enums\AccountNature;
use App\Domains\Accounting\Enums\AccountType;
use App\Domains\Accounting\Models\Account;
use Illuminate\Database\Seeder;

class AccountingSeeder extends Seeder
{
    /**
     * Run the database seeds for standard Food & Beverage Chart of Accounts.
     */
    public function run(): void
    {
        $accounts = [
            // ==========================================
            // 1000 - الأصول (ASSETS)
            // ==========================================
            [
                'code' => '1000',
                'name_ar' => 'الأصول',
                'name_en' => 'Assets',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 1,
                'is_leaf' => false,
                'parent_code' => null,
            ],
            // 1100 - الأصول المتداولة
            [
                'code' => '1100',
                'name_ar' => 'الأصول المتداولة',
                'name_en' => 'Current Assets',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 2,
                'is_leaf' => false,
                'parent_code' => '1000',
            ],
            // 1110 - النقدية وما في حكمها
            [
                'code' => '1110',
                'name_ar' => 'النقدية وما في حكمها',
                'name_en' => 'Cash & Cash Equivalents',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => false,
                'parent_code' => '1100',
            ],
            [
                'code' => '1111',
                'name_ar' => 'الصندوق الرئيسي',
                'name_en' => 'Main Cash Box',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1110',
            ],
            [
                'code' => '1112',
                'name_ar' => 'عهدة مناديب وسيارات التوزيع',
                'name_en' => 'Van Sales Cash Custody',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1110',
            ],
            [
                'code' => '1113',
                'name_ar' => 'البنك الأهلي السعودي - جاري',
                'name_en' => 'SNB Operating Bank Account',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1110',
            ],
            [
                'code' => '1114',
                'name_ar' => 'مصرف الراجحي - جاري',
                'name_en' => 'Al Rajhi Operating Bank Account',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1110',
            ],
            // 1120 - ذمم مدينة / العملاء
            [
                'code' => '1120',
                'name_ar' => 'المدينون والعملاء التجاريون',
                'name_en' => 'Accounts Receivable - Trade Debtors',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => false,
                'parent_code' => '1100',
            ],
            [
                'code' => '1121',
                'name_ar' => 'عملاء الجملة والتجزئة - تموين',
                'name_en' => 'Wholesale & Grocery Customers Control',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1120',
            ],
            [
                'code' => '1122',
                'name_ar' => 'عملاء السوبرماركت والأسواق الكبرى (كبار العملاء)',
                'name_en' => 'Modern Trade & Key Accounts',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1120',
            ],
            [
                'code' => '1129',
                'name_ar' => 'مخصص الديون المشكوك في تحصيلها',
                'name_en' => 'Allowance for Doubtful Accounts',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Credit, // Contra-Asset
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1120',
            ],
            // 1130 - المخزون الغذائي
            [
                'code' => '1130',
                'name_ar' => 'المخزون السلعي للمواد الغذائية',
                'name_en' => 'Inventory - Food & Beverage',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => false,
                'parent_code' => '1100',
            ],
            [
                'code' => '1131',
                'name_ar' => 'مخزون الأغذية الجافة والمعلبات',
                'name_en' => 'Dry & Canned Food Inventory',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1130',
            ],
            [
                'code' => '1132',
                'name_ar' => 'مخزون الأغذية المبردة والمجمدة',
                'name_en' => 'Chilled & Frozen Food Inventory',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1130',
            ],
            [
                'code' => '1133',
                'name_ar' => 'مخزون سيارات وفانات التوزيع',
                'name_en' => 'Van Sales Floating Stock',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1130',
            ],
            [
                'code' => '1139',
                'name_ar' => 'بضاعة بالطريق واعتمادات مستندية',
                'name_en' => 'Goods in Transit & Letters of Credit',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1130',
            ],
            // 1140 - أرصدة مدينة أخرى
            [
                'code' => '1140',
                'name_ar' => 'أرصدة مدينة أخرى',
                'name_en' => 'Other Debit Balances',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => false,
                'parent_code' => '1100',
            ],
            [
                'code' => '1141',
                'name_ar' => 'ضريبة القيمة المضافة المدخلات (مشتريات 15%)',
                'name_en' => 'Input VAT (Purchases 15%)',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1140',
            ],
            [
                'code' => '1142',
                'name_ar' => 'مصروفات مدفوعة مقدماً وسلف تشغيلية',
                'name_en' => 'Prepaid Expenses & Operational Advances',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 4,
                'is_leaf' => true,
                'parent_code' => '1140',
            ],
            // 1200 - الأصول الثابتة
            [
                'code' => '1200',
                'name_ar' => 'الأصول غير المتداولة / الثابتة',
                'name_en' => 'Fixed Assets',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 2,
                'is_leaf' => false,
                'parent_code' => '1000',
            ],
            [
                'code' => '1210',
                'name_ar' => 'شاحنات وسيارات أسطول التوزيع',
                'name_en' => 'Distribution Trucks & Fleet',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '1200',
            ],
            [
                'code' => '1219',
                'name_ar' => 'مجمع إهلاك شاحنات وسيارات التوزيع',
                'name_en' => 'Acc. Depreciation - Distribution Fleet',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Credit, // Contra-Asset
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '1200',
            ],
            [
                'code' => '1220',
                'name_ar' => 'غرف التبريد وثلاجات حفظ المواد الغذائية',
                'name_en' => 'Cold Storage & Industrial Freezers',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '1200',
            ],
            [
                'code' => '1229',
                'name_ar' => 'مجمع إهلاك غرف وثلاجات التبريد',
                'name_en' => 'Acc. Depreciation - Cold Storage',
                'type' => AccountType::Asset,
                'nature' => AccountNature::Credit, // Contra-Asset
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '1200',
            ],

            // ==========================================
            // 2000 - الالتزامات (LIABILITIES)
            // ==========================================
            [
                'code' => '2000',
                'name_ar' => 'الالتزامات / الخصوم',
                'name_en' => 'Liabilities',
                'type' => AccountType::Liability,
                'nature' => AccountNature::Credit,
                'level' => 1,
                'is_leaf' => false,
                'parent_code' => null,
            ],
            [
                'code' => '2100',
                'name_ar' => 'الالتزامات المتداولة',
                'name_en' => 'Current Liabilities',
                'type' => AccountType::Liability,
                'nature' => AccountNature::Credit,
                'level' => 2,
                'is_leaf' => false,
                'parent_code' => '2000',
            ],
            [
                'code' => '2110',
                'name_ar' => 'الدائنون وموردو المواد الغذائية',
                'name_en' => 'Accounts Payable - Food Suppliers',
                'type' => AccountType::Liability,
                'nature' => AccountNature::Credit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '2100',
            ],
            [
                'code' => '2120',
                'name_ar' => 'بضائع مستلمة لم تفوتر بعد (GRNI)',
                'name_en' => 'Goods Received Not Invoiced (GRNI)',
                'type' => AccountType::Liability,
                'nature' => AccountNature::Credit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '2100',
            ],
            [
                'code' => '2130',
                'name_ar' => 'ضريبة القيمة المضافة المخرجات (مبيعات 15%)',
                'name_en' => 'Output VAT (Sales 15%)',
                'type' => AccountType::Liability,
                'nature' => AccountNature::Credit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '2100',
            ],
            [
                'code' => '2140',
                'name_ar' => 'مستحقات هيئة الزكاة والضريبة والجمارك (ZATCA)',
                'name_en' => 'ZATCA Tax Settlement Clearing',
                'type' => AccountType::Liability,
                'nature' => AccountNature::Credit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '2100',
            ],
            [
                'code' => '2150',
                'name_ar' => 'رواتب وأجور ومستحقات موظفين مستحقة',
                'name_en' => 'Accrued Salaries & Benefits Payable',
                'type' => AccountType::Liability,
                'nature' => AccountNature::Credit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '2100',
            ],

            // ==========================================
            // 3000 - حقوق الملكية (EQUITY)
            // ==========================================
            [
                'code' => '3000',
                'name_ar' => 'حقوق الملكية',
                'name_en' => 'Equity',
                'type' => AccountType::Equity,
                'nature' => AccountNature::Credit,
                'level' => 1,
                'is_leaf' => false,
                'parent_code' => null,
            ],
            [
                'code' => '3100',
                'name_ar' => 'رأس المال المدفوع',
                'name_en' => 'Paid-in Capital',
                'type' => AccountType::Equity,
                'nature' => AccountNature::Credit,
                'level' => 2,
                'is_leaf' => true,
                'parent_code' => '3000',
            ],
            [
                'code' => '3200',
                'name_ar' => 'الأرباح المبقاة / المحتجزة',
                'name_en' => 'Retained Earnings',
                'type' => AccountType::Equity,
                'nature' => AccountNature::Credit,
                'level' => 2,
                'is_leaf' => true,
                'parent_code' => '3000',
            ],
            [
                'code' => '3300',
                'name_ar' => 'ملخص دخل وأرباح العام الحالي',
                'name_en' => 'Current Year Income Summary / P&L',
                'type' => AccountType::Equity,
                'nature' => AccountNature::Credit,
                'level' => 2,
                'is_leaf' => true,
                'parent_code' => '3000',
            ],

            // ==========================================
            // 4000 - الإيرادات (REVENUES)
            // ==========================================
            [
                'code' => '4000',
                'name_ar' => 'الإيرادات والمبيعات',
                'name_en' => 'Revenues',
                'type' => AccountType::Revenue,
                'nature' => AccountNature::Credit,
                'level' => 1,
                'is_leaf' => false,
                'parent_code' => null,
            ],
            [
                'code' => '4100',
                'name_ar' => 'إيرادات مبيعات المواد الغذائية',
                'name_en' => 'Food Sales Revenues',
                'type' => AccountType::Revenue,
                'nature' => AccountNature::Credit,
                'level' => 2,
                'is_leaf' => false,
                'parent_code' => '4000',
            ],
            [
                'code' => '4110',
                'name_ar' => 'مبيعات المواد الغذائية الجافة والمعلبات',
                'name_en' => 'Dry & Canned Food Sales',
                'type' => AccountType::Revenue,
                'nature' => AccountNature::Credit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '4100',
            ],
            [
                'code' => '4120',
                'name_ar' => 'مبيعات المواد الغذائية المبردة والمجمدة',
                'name_en' => 'Chilled & Frozen Food Sales',
                'type' => AccountType::Revenue,
                'nature' => AccountNature::Credit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '4100',
            ],
            [
                'code' => '4130',
                'name_ar' => 'مبيعات التوزيع المباشر (سيارات الفان)',
                'name_en' => 'Van Sales Direct Revenue',
                'type' => AccountType::Revenue,
                'nature' => AccountNature::Credit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '4100',
            ],
            [
                'code' => '4190',
                'name_ar' => 'مردودات ومسموحات المبيعات',
                'name_en' => 'Sales Returns & Allowances',
                'type' => AccountType::Revenue,
                'nature' => AccountNature::Debit, // Contra-Revenue
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '4100',
            ],
            [
                'code' => '4195',
                'name_ar' => 'خصم مسموح به وتعجيل دفع',
                'name_en' => 'Sales Discounts Allowed',
                'type' => AccountType::Revenue,
                'nature' => AccountNature::Debit, // Contra-Revenue
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '4100',
            ],

            // ==========================================
            // 5000 - المصروفات وتكلفة المبيعات (EXPENSES)
            // ==========================================
            [
                'code' => '5000',
                'name_ar' => 'المصروفات وتكلفة البضاعة',
                'name_en' => 'Expenses & Cost of Goods Sold',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 1,
                'is_leaf' => false,
                'parent_code' => null,
            ],
            // 5100 - تكلفة المبيعات
            [
                'code' => '5100',
                'name_ar' => 'تكلفة البضاعة المباعة (COGS)',
                'name_en' => 'Cost of Goods Sold (COGS)',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 2,
                'is_leaf' => false,
                'parent_code' => '5000',
            ],
            [
                'code' => '5110',
                'name_ar' => 'تكلفة مبيعات المواد الجافة',
                'name_en' => 'COGS - Dry Foods',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '5100',
            ],
            [
                'code' => '5120',
                'name_ar' => 'تكلفة مبيعات المواد المبردة والمجمدة',
                'name_en' => 'COGS - Chilled & Frozen',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '5100',
            ],
            [
                'code' => '5130',
                'name_ar' => 'تالف وفواقد الأغذية ومنتهية الصلاحية',
                'name_en' => 'Expired, Spoiled & Damaged Goods Loss',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '5100',
            ],
            [
                'code' => '5140',
                'name_ar' => 'فروقات وعجز تسويات الجرد المخزني',
                'name_en' => 'Inventory Shrinkage & Variance',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '5100',
            ],
            // 5200 - مصاريف البيع والتوزيع
            [
                'code' => '5200',
                'name_ar' => 'مصاريف البيع والتسويق والتوزيع',
                'name_en' => 'Selling & Distribution Expenses',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 2,
                'is_leaf' => false,
                'parent_code' => '5000',
            ],
            [
                'code' => '5210',
                'name_ar' => 'محروقات وصيانة سيارات وشاحنات التوزيع',
                'name_en' => 'Distribution Fleet Fuel & Maintenance',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '5200',
            ],
            [
                'code' => '5220',
                'name_ar' => 'عمولات وحوافز مناديب ومشرفي المبيعات',
                'name_en' => 'Sales Commission & Incentives',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '5200',
            ],
            [
                'code' => '5230',
                'name_ar' => 'كهرباء ومصاريف تشغيل غرف ومستودعات التبريد',
                'name_en' => 'Cold Storage Utilities & Electricity',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '5200',
            ],
            // 5300 - المصاريف الإدارية
            [
                'code' => '5300',
                'name_ar' => 'المصاريف الإدارية والعمومية',
                'name_en' => 'General & Administrative Expenses',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 2,
                'is_leaf' => false,
                'parent_code' => '5000',
            ],
            [
                'code' => '5310',
                'name_ar' => 'رواتب ومكافآت الإدارة العامة',
                'name_en' => 'Administrative Salaries & Benefits',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '5300',
            ],
            [
                'code' => '5320',
                'name_ar' => 'إيجارات المستودعات والمقرات الإدارية',
                'name_en' => 'Rent - Warehouses & Offices',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '5300',
            ],
            [
                'code' => '5330',
                'name_ar' => 'إهلاك الأصول الثابتة',
                'name_en' => 'Depreciation Expense',
                'type' => AccountType::Expense,
                'nature' => AccountNature::Debit,
                'level' => 3,
                'is_leaf' => true,
                'parent_code' => '5300',
            ],
        ];

        $codeToIdMap = [];

        foreach ($accounts as $data) {
            $parentId = null;
            if (!empty($data['parent_code']) && isset($codeToIdMap[$data['parent_code']])) {
                $parentId = $codeToIdMap[$data['parent_code']];
            }

            $account = Account::updateOrCreate(
                ['code' => $data['code']],
                [
                    'name_ar' => $data['name_ar'],
                    'name_en' => $data['name_en'],
                    'parent_id' => $parentId,
                    'type' => $data['type'],
                    'nature' => $data['nature'],
                    'level' => $data['level'],
                    'is_leaf' => $data['is_leaf'],
                    'is_active' => true,
                    'description' => $data['name_ar'],
                ]
            );

            $codeToIdMap[$data['code']] = $account->id;
        }
    }
}
