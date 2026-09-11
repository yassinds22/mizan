<?php

use App\Domains\Core\Services\CompanySetupService;
use App\Domains\Core\Services\DataResetService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/**
 * أمر تهيئة وتخصيص النظام لعميل جديد (يستخدم نفس كلاس الخدمة المشترك)
 */
Artisan::command('mizan:init-client {--name=} {--vat=} {--cr=} {--branch=} {--city=الرياض}', function (CompanySetupService $companySetupService) {
    $this->info("=========================================");
    $this->info("   مرحباً بك في معالج تهيئة نظام ميزان    ");
    $this->info("=========================================");

    $name = $this->option('name') ?: $this->ask('اسم منشأة العميل التجارية (الشركة/المؤسسة)', 'مؤسسة الأفق للمواد الغذائية');
    $vat = $this->option('vat') ?: $this->ask('الرقم الضريبي للمنشأة (15 خانة)', '300000000000003');
    $cr = $this->option('cr') ?: $this->ask('رقم السجل التجاري (10 أرقام)', '1010123456');
    $city = $this->option('city') ?: $this->ask('المدينة الرئيسية', 'الرياض');
    $branchName = $this->option('branch') ?: $this->ask('اسم الفرع / المعرض الرئيسي', 'الفرع الرئيسي');

    $this->warn("جاري تهيئة النظام وإعداده للمنشأة [{$name}] عبر CompanySetupService...");

    $result = $companySetupService->setupCompany([
        'company_name' => $name,
        'vat_number' => $vat,
        'commercial_register' => $cr,
        'city' => $city,
        'address' => "المملكة العربية السعودية - {$city}",
        'phone' => '0500000000',
    ], $branchName);

    $this->info("✅ {$result['message']}");
    $this->info("📍 الفرع الرئيسي المعتمد: [{$branchName}]");
    $this->info("💼 شجرة الحسابات والضريبة 15% والفترات المالية مفعلة 100%");
})->purpose('تهيئة وتخصيص نظام ميزان لمنشأة / عميل جديد');

/**
 * أمر تصفير الحركات التشغيلية (مع نسخ احتياطي إلزامي وتأكيد اسم المنشأة)
 */
Artisan::command('mizan:reset-data {--confirm=} {--dry-run}', function (DataResetService $dataResetService) {
    $dryRun = $dataResetService->getDryRunSummary();

    $this->warn("=== ملخص الحركات التشغيلية في النظام ===");
    $this->line("المنشأة الحالية: " . $dryRun['company_name']);
    $this->line("الفواتير: " . $dryRun['counts']['sales_invoices']);
    $this->line("سطور الفواتير: " . $dryRun['counts']['sales_invoice_items']);
    $this->line("القيود اليومية: " . $dryRun['counts']['journal_entries']);
    $this->line("سطور القيود: " . $dryRun['counts']['journal_entry_lines']);
    $this->line("إجمالي السجلات التي سيتم تصفيرها: " . $dryRun['total_records_to_wipe']);

    if ($this->option('dry-run')) {
        $this->info("انتهاء المعاينة (Dry Run). لم يتم حذف أي سجل.");
        return;
    }

    $confirm = $this->option('confirm') ?: $this->ask("لتأكيد التصفير، اكتب اسم المنشأة بالضبط [{$dryRun['company_name']}]");

    try {
        $this->warn("جاري أخذ نسخة احتياطية وتصفير الحركات...");
        $res = $dataResetService->resetTransactionalData($confirm);
        $this->info("✅ {$res['message']}");
        $this->info("📁 تم حفظ النسخة الاحتياطية: {$res['backup']['filename']} ({$res['backup']['size_kb']} KB)");
    } catch (\Throwable $e) {
        $this->error("❌ فشلت العملية: " . $e->getMessage());
    }
})->purpose('تصفير الحركات التشغيلية السابقة بأمان مع أخذ نسخة احتياطية مسبقة');
