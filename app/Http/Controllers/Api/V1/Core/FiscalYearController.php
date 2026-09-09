<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Core;

use App\Domains\Core\Enums\FiscalPeriodStatus;
use App\Domains\Core\Services\FiscalPeriodService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Core\StoreFiscalYearRequest;
use App\Http\Requests\Api\V1\Core\UpdateFiscalPeriodStatusRequest;
use App\Http\Resources\Api\V1\Core\FiscalPeriodResource;
use App\Http\Resources\Api\V1\Core\FiscalYearResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FiscalYearController extends Controller
{
    public function __construct(
        protected FiscalPeriodService $fiscalPeriodService
    ) {}

    /**
     * عرض قائمة السنوات المالية مع فتراتها
     */
    public function indexYears(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only(['is_closed']);
        $years = $this->fiscalPeriodService->getAllYears($filters);

        return FiscalYearResource::collection($years);
    }

    /**
     * إنشاء سنة مالية جديدة مع التوليد الآلي لفتراتها الـ 12
     */
    public function storeYear(StoreFiscalYearRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $year = $this->fiscalPeriodService->createFiscalYearWithMonthlyPeriods(
            $validated['name'],
            (int) $validated['year'],
            $validated['start_date'] ?? null,
            $validated['end_date'] ?? null
        );

        return (new FiscalYearResource($year))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * عرض تفاصيل سنة مالية محددة
     */
    public function showYear(int $id): FiscalYearResource
    {
        $year = $this->fiscalPeriodService->getYearById($id);

        return new FiscalYearResource($year);
    }

    /**
     * إقفال سنة مالية بالكامل
     */
    public function closeYear(int $id): FiscalYearResource
    {
        $year = $this->fiscalPeriodService->closeFiscalYear($id);

        return new FiscalYearResource($year);
    }

    /**
     * عرض قائمة الفترات المالية
     */
    public function indexPeriods(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only(['fiscal_year_id', 'status']);
        $periods = $this->fiscalPeriodService->getAllPeriods($filters);

        return FiscalPeriodResource::collection($periods);
    }

    /**
     * عرض تفاصيل فترة مالية محددة
     */
    public function showPeriod(int $id): FiscalPeriodResource
    {
        $period = $this->fiscalPeriodService->getPeriodById($id);

        return new FiscalPeriodResource($period);
    }

    /**
     * تحديث حالة فترة مالية (مفتوحة / مغلقة / مجمدة)
     */
    public function updatePeriodStatus(UpdateFiscalPeriodStatusRequest $request, int $id): FiscalPeriodResource
    {
        $status = FiscalPeriodStatus::from($request->validated('status'));

        $period = match ($status) {
            FiscalPeriodStatus::Open => $this->fiscalPeriodService->reopenPeriod($id),
            FiscalPeriodStatus::Closed => $this->fiscalPeriodService->closePeriod($id),
            FiscalPeriodStatus::Locked => $this->fiscalPeriodService->lockPeriod($id),
        };

        return new FiscalPeriodResource($period);
    }

    /**
     * إقفال سريع لفترة شهرية
     */
    public function closePeriod(int $id): FiscalPeriodResource
    {
        $period = $this->fiscalPeriodService->closePeriod($id);

        return new FiscalPeriodResource($period);
    }

    /**
     * إعادة فتح سريعة لفترة شهرية
     */
    public function reopenPeriod(int $id): FiscalPeriodResource
    {
        $period = $this->fiscalPeriodService->reopenPeriod($id);

        return new FiscalPeriodResource($period);
    }

    /**
     * فحص وتحقق استباقي من صلاحية تاريخ معين للترحيل المحاسبي
     */
    public function checkDate(Request $request): JsonResponse
    {
        $request->validate([
            'date' => ['required', 'date'],
        ]);

        $date = (string) $request->input('date');

        try {
            $period = $this->fiscalPeriodService->assertDateInOpenPeriod($date);

            return response()->json([
                'allowed' => true,
                'message' => 'التاريخ يقع ضمن فترة مالية مفتوحة وصالحة للترحيل.',
                'period' => new FiscalPeriodResource($period),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'allowed' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
