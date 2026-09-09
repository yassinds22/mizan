<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Core;

use App\Domains\Core\Services\SettingService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Core\UpdateSettingsRequest;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    public function __construct(
        private readonly SettingService $settingService
    ) {}

    public function index(): JsonResponse
    {
        $settings = $this->settingService->getAllSettings();

        return response()->json([
            'data' => $settings,
        ]);
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $updated = $this->settingService->saveSettings($request->validated());

        return response()->json([
            'message' => 'تم حفظ كافة الإعدادات بنجاح',
            'data' => $updated,
        ]);
    }
}
