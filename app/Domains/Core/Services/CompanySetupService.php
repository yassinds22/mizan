<?php

declare(strict_types=1);

namespace App\Domains\Core\Services;

use App\Domains\Accounting\Services\AccountingSetupService;
use App\Domains\Core\Models\Branch;
use Illuminate\Support\Facades\DB;

class CompanySetupService
{
    public function __construct(
        protected AccountingSetupService $accountingSetupService
    ) {}

    /**
     * تهيئة وتحديث بيانات المنشأة والفرع الأساسي وإعداد البيئة المحاسبية بشكل متكامل
     */
    public function setupCompany(array $companyData, string $branchName = 'الفرع الرئيسي'): array
    {
        return DB::transaction(function () use ($companyData, $branchName) {
            // 1. إعداد البيئة المحاسبية والضريبية والفترات المالية (Idempotent)
            $vatRate = isset($companyData['vat_rate']) ? (float)$companyData['vat_rate'] : 15.0;
            $currency = $companyData['base_currency'] ?? 'SAR';
            $accountingResult = $this->accountingSetupService->setupAccountingDefaults($currency, $vatRate);

            // 2. إنشاء أو تحديث الفرع الرئيسي الأول
            $city = $companyData['city'] ?? 'الرياض';
            $address = $companyData['address'] ?? "المملكة العربية السعودية - {$city}";

            $mainBranch = Branch::updateOrCreate(
                ['code' => 'BR-001'],
                [
                    'name' => $branchName,
                    'city' => $city,
                    'address' => $address,
                    'is_active' => true,
                ]
            );

            // 3. حفظ بيانات الهوية التجارية وإعدادات المنشأة
            $settingsToPersist = [
                'company_name' => $companyData['company_name'],
                'legal_name' => $companyData['legal_name'] ?? $companyData['company_name'],
                'vat_number' => $companyData['vat_number'] ?? '300000000000003',
                'commercial_register' => $companyData['commercial_register'] ?? '1010123456',
                'city' => $city,
                'address' => $address,
                'phone' => $companyData['phone'] ?? '0500000000',
                'base_currency_code' => $currency,
                'vat_rate' => (string) $vatRate,
                'setup_completed' => '1',
                'setup_completed_at' => now()->toDateTimeString(),
            ];

            if (!empty($companyData['footer_text'])) {
                $settingsToPersist['footer_text'] = $companyData['footer_text'];
            }
            if (!empty($companyData['legal_note'])) {
                $settingsToPersist['legal_note'] = $companyData['legal_note'];
            }

            foreach ($settingsToPersist as $key => $val) {
                DB::table('system_settings')->updateOrInsert(
                    ['key' => $key],
                    [
                        'value' => (string)$val,
                        'group' => 'general',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }

            $logPath = storage_path('logs/system_audit.log');
            $entry = [
                'timestamp' => now()->toIso8601String(),
                'action' => 'COMPANY_SETUP_UPDATED',
                'payload' => [
                    'company_name' => $companyData['company_name'],
                    'branch' => $branchName,
                    'vat_number' => $companyData['vat_number'] ?? null,
                    'ip' => request()->ip() ?? 'CLI',
                ],
            ];
            @file_put_contents($logPath, json_encode($entry, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND);

            return [
                'success' => true,
                'message' => "تم تهيئة وإعداد نظام ميزان بنجاح لمنشأة [{$companyData['company_name']}]",
                'company' => $settingsToPersist,
                'branch' => [
                    'id' => $mainBranch->id,
                    'code' => $mainBranch->code,
                    'name' => $mainBranch->name,
                ],
                'accounting' => $accountingResult,
            ];
        });
    }

    /**
     * التحقق هل تم إعداد المنشأة مسبقاً
     */
    public function isSetupCompleted(): bool
    {
        $status = DB::table('system_settings')
            ->where('key', 'setup_completed')
            ->value('value');

        return $status === '1' || $status === 'true';
    }

    /**
     * استرجاع ملخص بيانات المنشأة الحالية
     */
    public function getCompanyProfile(): array
    {
        $records = DB::table('system_settings')->pluck('value', 'key')->toArray();

        return [
            'company_name' => $records['company_name'] ?? 'ميزان للتجارة',
            'legal_name' => $records['legal_name'] ?? ($records['company_name'] ?? ''),
            'vat_number' => $records['vat_number'] ?? '',
            'commercial_register' => $records['commercial_register'] ?? '',
            'city' => $records['city'] ?? 'الرياض',
            'address' => $records['address'] ?? '',
            'phone' => $records['phone'] ?? '',
            'setup_completed' => ($records['setup_completed'] ?? '0') === '1',
            'setup_completed_at' => $records['setup_completed_at'] ?? null,
        ];
    }
}
