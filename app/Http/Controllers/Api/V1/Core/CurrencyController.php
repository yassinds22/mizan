<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Core;

use App\Domains\Core\Services\CurrencyService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Core\AddExchangeRateRequest;
use App\Http\Requests\Api\V1\Core\StoreCurrencyRequest;
use App\Http\Requests\Api\V1\Core\UpdateCurrencyRequest;
use App\Http\Resources\Api\V1\Core\CurrencyResource;
use App\Http\Resources\Api\V1\Core\ExchangeRateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CurrencyController extends Controller
{
    public function __construct(
        protected CurrencyService $currencyService
    ) {}

    /**
     * عرض قائمة العملات
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only(['search', 'is_active', 'is_base_currency']);

        if ($request->boolean('paginate', false)) {
            $perPage = (int) $request->input('per_page', 15);
            $currencies = $this->currencyService->getPaginatedCurrencies($perPage, $filters);
        } else {
            $currencies = $this->currencyService->getAllCurrencies($filters);
        }

        return CurrencyResource::collection($currencies);
    }

    /**
     * إنشاء عملة جديدة
     */
    public function store(StoreCurrencyRequest $request): JsonResponse
    {
        $currency = $this->currencyService->createCurrency($request->validated());

        return (new CurrencyResource($currency))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * عرض تفاصيل عملة محددة
     */
    public function show(int $id): CurrencyResource
    {
        $currency = $this->currencyService->getCurrencyById($id);

        return new CurrencyResource($currency);
    }

    /**
     * تحديث بيانات عملة
     */
    public function update(UpdateCurrencyRequest $request, int $id): CurrencyResource
    {
        $currency = $this->currencyService->updateCurrency($id, $request->validated());

        return new CurrencyResource($currency);
    }

    /**
     * حذف عملة
     */
    public function destroy(int $id): JsonResponse
    {
        $this->currencyService->deleteCurrency($id);

        return response()->json([
            'message' => 'تم حذف العملة بنجاح.',
        ]);
    }

    /**
     * تفعيل / تعطيل عملة
     */
    public function toggleActive(int $id): CurrencyResource
    {
        $currency = $this->currencyService->toggleCurrencyStatus($id);

        return new CurrencyResource($currency);
    }

    /**
     * إضافة وتثبيت سعر صرف جديد لعملة معينة
     */
    public function addRate(AddExchangeRateRequest $request, int $id): JsonResponse
    {
        $rate = $this->currencyService->addExchangeRate($id, $request->validated());

        return (new ExchangeRateResource($rate))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * عرض السجل التاريخي لأسعار صرف عملة معينة
     */
    public function ratesHistory(int $id): AnonymousResourceCollection
    {
        $history = $this->currencyService->getExchangeRatesHistory($id);

        return ExchangeRateResource::collection($history);
    }
}
