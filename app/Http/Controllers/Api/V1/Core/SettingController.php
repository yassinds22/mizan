<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Core;

use App\Domains\Core\Services\CompanySetupService;
use App\Domains\Core\Services\DataResetService;
use App\Domains\Core\Services\SettingService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Core\UpdateSettingsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function __construct(
        private readonly SettingService $settingService,
        private readonly CompanySetupService $companySetupService,
        private readonly DataResetService $dataResetService
    ) {}

    /**
     * استعراض كافة إعدادات النظام الحالية
     */
    public function index(): JsonResponse
    {
        $settings = $this->settingService->getAllSettings();

        return response()->json([
            'data' => $settings,
        ]);
    }

    /**
     * تحديث الإعدادات والسياسات العامة
     */
    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $updated = $this->settingService->saveSettings($request->validated());

        return response()->json([
            'message' => 'تم حفظ كافة الإعدادات بنجاح',
            'data' => $updated,
        ]);
    }

    /**
     * حالة تهيئة النظام وهوية المنشأة
     */
    public function status(): JsonResponse
    {
        return response()->json([
            'data' => $this->companySetupService->getCompanyProfile(),
        ]);
    }

    /**
     * معالج تهيئة منشأة جديدة (Onboarding Setup)
     */
    public function initClient(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'legal_name' => 'nullable|string|max:255',
            'vat_number' => 'nullable|string|max:50',
            'commercial_register' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'branch_name' => 'nullable|string|max:255',
            'base_currency' => 'nullable|string|max:10',
            'vat_rate' => 'nullable|numeric',
        ]);

        $branchName = $validated['branch_name'] ?? 'الفرع الرئيسي';

        $result = $this->companySetupService->setupCompany($validated, $branchName);

        return response()->json($result);
    }

    /**
     * معاينة الحركات التشغيلية قبل التصفير (Dry-run Preview)
     */
    public function resetPreview(): JsonResponse
    {
        return response()->json([
            'data' => $this->dataResetService->getDryRunSummary(),
        ]);
    }

    /**
     * تصفير الحركات التشغيلية والبدء من جديد بأمان
     */
    public function resetData(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'confirmation_name' => 'required|string|max:255',
        ]);

        $result = $this->dataResetService->resetTransactionalData($validated['confirmation_name']);

        return response()->json($result);
    }
}
