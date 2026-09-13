<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // إعادة تعيين كاش الصلاحيات
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. مصفوفة الصلاحيات الـ 45+ المصنفة حسب النطاقات الـ 8
        $permissions = [
            // Core & Settings
            'users.view',
            'users.create',
            'users.update',
            'users.activate',
            'users.deactivate',
            'users.roles.assign',
            'users.permissions.manage',
            'roles.view',
            'roles.create',
            'roles.update',
            'roles.delete',
            'roles.permissions.manage',
            'settings.view',
            'settings.company.update',
            'settings.branches.manage',
            'settings.tax.manage',
            'settings.invoice_template.manage',
            'settings.currencies.manage',

            // Accounting & General Ledger
            'accounting.chart.view',
            'accounting.chart.manage',
            'accounting.journals.view',
            'accounting.journals.create',
            'accounting.journals.post',
            'accounting.journals.reverse',
            'accounting.period.close',
            'accounting.period.reopen',
            'accounting.statements.view',
            'accounting.ledger.view',

            // Products & Pricing
            'products.view',
            'products.create',
            'products.update',
            'products.prices.manage',
            'products.units.manage',

            // Inventory & Warehouses
            'inventory.view',
            'inventory.warehouses.manage',
            'inventory.locations.manage',
            'inventory.movements.view',
            'inventory.movements.create',
            'inventory.movements.post',
            'inventory.stocktake.manage',
            'inventory.stocktake.post',
            'inventory.waste.create',
            'inventory.waste.post',
            'inventory.valuation.view',

            // Purchases & Suppliers
            'purchases.suppliers.view',
            'purchases.suppliers.create',
            'purchases.suppliers.update',
            'purchases.invoices.view',
            'purchases.invoices.create',
            'purchases.invoices.post',
            'purchases.returns.view',
            'purchases.returns.create',
            'purchases.returns.post',

            // Sales & Customers
            'sales.customers.view',
            'sales.customers.create',
            'sales.customers.update',
            'sales.invoices.view',
            'sales.invoices.create',
            'sales.invoices.post',
            'sales.invoices.print',
            'sales.returns.view',
            'sales.returns.create',
            'sales.returns.post',
            'sales.discounts.manage',

            // Treasury & Cash
            'treasury.vouchers.view',
            'treasury.vouchers.create',
            'treasury.vouchers.post',
            'treasury.vouchers.reverse',

            // Expiry & FEFO
            'expiry.dashboard.view',
            'expiry.fefo.view',
            'inventory.fefo.override',

            // Financial & Analytical Reports
            'reports.trial_balance.view',
            'reports.profit_loss.view',
            'reports.balance_sheet.view',
            'reports.vat.view',
            'reports.aging.view',
            'reports.export',
        ];

        foreach ($permissions as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
        }

        // 2. إنشاء الأدوار الافتراضية الـ 6 وربط الصلاحيات بها
        $superAdminRole = Role::findOrCreate('super_admin', 'web');
        $superAdminRole->syncPermissions(Permission::all());

        $financeManagerRole = Role::findOrCreate('finance_manager', 'web');
        $financeManagerRole->syncPermissions([
            'settings.view',
            'settings.currencies.manage',
            'accounting.chart.view',
            'accounting.chart.manage',
            'accounting.journals.view',
            'accounting.journals.create',
            'accounting.journals.post',
            'accounting.journals.reverse',
            'accounting.period.close',
            'accounting.period.reopen',
            'accounting.statements.view',
            'accounting.ledger.view',
            'treasury.vouchers.view',
            'treasury.vouchers.create',
            'treasury.vouchers.post',
            'treasury.vouchers.reverse',
            'sales.invoices.view',
            'purchases.invoices.view',
            'inventory.valuation.view',
            'reports.trial_balance.view',
            'reports.profit_loss.view',
            'reports.balance_sheet.view',
            'reports.vat.view',
            'reports.aging.view',
            'reports.export',
        ]);

        $accountantRole = Role::findOrCreate('accountant', 'web');
        $accountantRole->syncPermissions([
            'accounting.chart.view',
            'accounting.journals.view',
            'accounting.journals.create',
            'accounting.statements.view',
            'accounting.ledger.view',
            'treasury.vouchers.view',
            'treasury.vouchers.create',
            'treasury.vouchers.post',
            'sales.invoices.view',
            'purchases.invoices.view',
            'reports.trial_balance.view',
            'reports.vat.view',
            'reports.aging.view',
        ]);

        $warehouseKeeperRole = Role::findOrCreate('warehouse_keeper', 'web');
        $warehouseKeeperRole->syncPermissions([
            'products.view',
            'inventory.view',
            'inventory.warehouses.manage',
            'inventory.locations.manage',
            'inventory.movements.view',
            'inventory.movements.create',
            'inventory.movements.post',
            'inventory.stocktake.manage',
            'inventory.waste.create',
            'inventory.waste.post',
            'expiry.dashboard.view',
            'expiry.fefo.view',
        ]);

        $salesRepRole = Role::findOrCreate('sales_representative', 'web');
        $salesRepRole->syncPermissions([
            'products.view',
            'sales.customers.view',
            'sales.customers.create',
            'sales.invoices.view',
            'sales.invoices.create',
            'sales.invoices.post',
            'sales.invoices.print',
            'treasury.vouchers.view',
            'treasury.vouchers.create',
        ]);

        $purchasingOfficerRole = Role::findOrCreate('purchasing_officer', 'web');
        $purchasingOfficerRole->syncPermissions([
            'products.view',
            'purchases.suppliers.view',
            'purchases.suppliers.create',
            'purchases.suppliers.update',
            'purchases.invoices.view',
            'purchases.invoices.create',
            'purchases.invoices.post',
            'purchases.returns.view',
            'purchases.returns.create',
        ]);

        // 3. تهيئة المستخدمين الافتراضيين للنظام وتعيين أدوارهم وفروعهم
        $mainBranch = \App\Domains\Core\Models\Branch::where('code', 'BR-RUH-01')->first();
        $branchId = $mainBranch?->id;

        $defaultUsers = [
            [
                'name' => 'المدير العام',
                'email' => 'admin@mizan.sa',
                'password' => Hash::make('password'),
                'is_active' => true,
                'is_super_admin' => true,
                'phone' => '0500000001',
                'branch_id' => $branchId,
                'role' => 'super_admin',
            ],
            [
                'name' => 'محاسب النظام',
                'email' => 'accountant@mizan.sa',
                'password' => Hash::make('password'),
                'is_active' => true,
                'is_super_admin' => false,
                'phone' => '0500000002',
                'branch_id' => $branchId,
                'role' => 'accountant',
            ],
            [
                'name' => 'كاشير مبيعات',
                'email' => 'cashier@mizan.sa',
                'password' => Hash::make('password'),
                'is_active' => true,
                'is_super_admin' => false,
                'phone' => '0500000003',
                'branch_id' => $branchId,
                'role' => 'sales_representative',
            ],
            [
                'name' => 'أمين المستودع',
                'email' => 'warehouse@mizan.sa',
                'password' => Hash::make('password'),
                'is_active' => true,
                'is_super_admin' => false,
                'phone' => '0500000004',
                'branch_id' => $branchId,
                'role' => 'warehouse_keeper',
            ],
            [
                'name' => 'مسؤول المشتريات',
                'email' => 'purchasing@mizan.sa',
                'password' => Hash::make('password'),
                'is_active' => true,
                'is_super_admin' => false,
                'phone' => '0500000005',
                'branch_id' => $branchId,
                'role' => 'purchasing_officer',
            ],
        ];

        foreach ($defaultUsers as $userData) {
            $roleName = $userData['role'];
            unset($userData['role']);

            $user = User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );

            $user->syncRoles([$roleName]);
        }
    }
}
