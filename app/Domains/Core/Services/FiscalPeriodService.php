<?php

declare(strict_types=1);

namespace App\Domains\Core\Services;

use App\Domains\Core\Enums\FiscalPeriodStatus;
use App\Domains\Core\Exceptions\FiscalPeriodClosedException;
use App\Domains\Core\Models\FiscalPeriod;
use App\Domains\Core\Models\FiscalYear;
use App\Domains\Core\Repositories\Contracts\FiscalYearRepositoryInterface;
use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FiscalPeriodService
{
    protected array $arabicMonthNames = [
        1 => 'يناير', 2 => 'فبراير', 3 => 'مارس', 4 => 'أبريل',
        5 => 'مايو', 6 => 'يونيو', 7 => 'يوليو', 8 => 'أغسطس',
        9 => 'سبتمبر', 10 => 'أكتوبر', 11 => 'نوفمبر', 12 => 'ديسمبر',
    ];

    public function __construct(
        protected FiscalYearRepositoryInterface $fiscalYearRepository
    ) {}

    public function getAllYears(array $filters = []): Collection
    {
        return $this->fiscalYearRepository->allYears($filters);
    }

    public function getAllPeriods(array $filters = []): Collection
    {
        return $this->fiscalYearRepository->allPeriods($filters);
    }

    public function getYearById(int $id): FiscalYear
    {
        $year = $this->fiscalYearRepository->findYearById($id);

        if (!$year) {
            throw ValidationException::withMessages([
                'fiscal_year' => ['السنة المالية المطلوبة غير موجودة.'],
            ]);
        }

        return $year;
    }

    public function getPeriodById(int $id): FiscalPeriod
    {
        $period = $this->fiscalYearRepository->findPeriodById($id);

        if (!$period) {
            throw ValidationException::withMessages([
                'fiscal_period' => ['الفترة المالية المطلوبة غير موجودة.'],
            ]);
        }

        return $period;
    }

    /**
     * التحقق الصارم من أن التاريخ يقع ضمن فترة مالية مفتوحة.
     * يُستدعى هذا الفحص قبل ترحيل أي قيد يومية أو فاتورة بيع أو استلام مشتريات.
     */
    public function assertDateInOpenPeriod(string|DateTimeInterface $date): FiscalPeriod
    {
        $formattedDate = $date instanceof DateTimeInterface ? $date->format('Y-m-d') : $date;
        $period = $this->fiscalYearRepository->findPeriodForDate($formattedDate);

        if (!$period) {
            throw new FiscalPeriodClosedException(
                $formattedDate,
                'not_found',
                "لا توجد فترة مالية معرفة في النظام تغطي التاريخ ({$formattedDate})."
            );
        }

        if ($period->isClosed()) {
            throw new FiscalPeriodClosedException($formattedDate, 'closed');
        }

        if ($period->isLocked()) {
            throw new FiscalPeriodClosedException($formattedDate, 'locked');
        }

        if ($period->fiscalYear && $period->fiscalYear->is_closed) {
            throw new FiscalPeriodClosedException(
                $formattedDate,
                'closed',
                "السنة المالية ({$period->fiscalYear->name}) مقفلة بالكامل."
            );
        }

        return $period;
    }

    public function getPeriodForDate(string|DateTimeInterface $date): ?FiscalPeriod
    {
        return $this->fiscalYearRepository->findPeriodForDate($date);
    }

    /**
     * إنشاء سنة مالية جديدة وتوليد الفترات الشهرية الـ 12 آلياً
     */
    public function createFiscalYearWithMonthlyPeriods(
        string $name,
        int $year,
        ?string $startDate = null,
        ?string $endDate = null
    ): FiscalYear {
        return DB::transaction(function () use ($name, $year, $startDate, $endDate) {
            $start = $startDate ?? "{$year}-01-01";
            $end = $endDate ?? "{$year}-12-31";

            $fiscalYear = $this->fiscalYearRepository->createYear([
                'name' => trim($name),
                'start_date' => $start,
                'end_date' => $end,
                'is_closed' => false,
            ]);

            for ($m = 1; $m <= 12; $m++) {
                $monthCarbon = Carbon::create($year, $m, 1);
                $monthStart = $monthCarbon->startOfMonth()->toDateString();
                $monthEnd = $monthCarbon->endOfMonth()->toDateString();
                $monthName = ($this->arabicMonthNames[$m] ?? "شهر {$m}") . " {$year}";

                $this->fiscalYearRepository->createPeriod($fiscalYear, [
                    'period_number' => $m,
                    'name' => $monthName,
                    'start_date' => $monthStart,
                    'end_date' => $monthEnd,
                    'status' => FiscalPeriodStatus::Open,
                ]);
            }

            return $this->getYearById($fiscalYear->id);
        });
    }

    /**
     * إقفال فترة شهرية
     */
    public function closePeriod(int $periodId): FiscalPeriod
    {
        $period = $this->getPeriodById($periodId);

        if ($period->isLocked()) {
            throw ValidationException::withMessages([
                'fiscal_period' => ['لا يمكن تغيير حالة فترة مجمدة نهائياً.'],
            ]);
        }

        return $this->fiscalYearRepository->updatePeriodStatus($period, FiscalPeriodStatus::Closed);
    }

    /**
     * إعادة فتح فترة شهرية مقفلة
     */
    public function reopenPeriod(int $periodId): FiscalPeriod
    {
        $period = $this->getPeriodById($periodId);

        if ($period->isLocked()) {
            throw ValidationException::withMessages([
                'fiscal_period' => ['لا يمكن إعادة فتح فترة مجمدة نهائياً.'],
            ]);
        }

        if ($period->fiscalYear && $period->fiscalYear->is_closed) {
            throw ValidationException::withMessages([
                'fiscal_period' => ['لا يمكن إعادة فتح فترة تتبع سنة مالية مقفلة نهائياً.'],
            ]);
        }

        return $this->fiscalYearRepository->updatePeriodStatus($period, FiscalPeriodStatus::Open);
    }

    /**
     * تجميد فترة شهرية (منع أي تعديل نهائياً حتى من المحاسبين)
     */
    public function lockPeriod(int $periodId): FiscalPeriod
    {
        $period = $this->getPeriodById($periodId);

        return $this->fiscalYearRepository->updatePeriodStatus($period, FiscalPeriodStatus::Locked);
    }

    /**
     * إقفال السنة المالية بالكامل (بعد التأكد من إقفال كافة فتراتها الـ 12)
     */
    public function closeFiscalYear(int $yearId): FiscalYear
    {
        return DB::transaction(function () use ($yearId) {
            $year = $this->getYearById($yearId);

            // التحقق من أن جميع الفترات مقفلة أو مجمدة
            $hasOpenPeriods = $year->periods()->where('status', FiscalPeriodStatus::Open->value)->exists();
            if ($hasOpenPeriods) {
                throw ValidationException::withMessages([
                    'fiscal_year' => ['لا يمكن إقفال السنة المالية قبل إقفال جميع الفترات الشهرية التابعة لها.'],
                ]);
            }

            return $this->fiscalYearRepository->updateYear($year, ['is_closed' => true]);
        });
    }
}
