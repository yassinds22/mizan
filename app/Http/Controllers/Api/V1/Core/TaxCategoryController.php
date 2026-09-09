<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Core;

use App\Domains\Core\Services\TaxCategoryService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Core\AddTaxRateRequest;
use App\Http\Requests\Api\V1\Core\UpdateTaxCategoryRequest;
use App\Http\Resources\Api\V1\Core\TaxCategoryResource;
use App\Http\Resources\Api\V1\Core\TaxRateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TaxCategoryController extends Controller
{
    public function __construct(
        private readonly TaxCategoryService $taxCategoryService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $categories = $this->taxCategoryService->listCategories($request->query());

        return TaxCategoryResource::collection($categories);
    }

    public function show(int $id): JsonResponse
    {
        $category = $this->taxCategoryService->getCategory($id);

        return response()->json([
            'data' => new TaxCategoryResource($category),
        ]);
    }

    public function update(UpdateTaxCategoryRequest $request, int $id): JsonResponse
    {
        $updated = $this->taxCategoryService->updateCategory($id, $request->validated());

        return response()->json([
            'message' => 'تم تحديث فئة الضريبة بنجاح',
            'data' => new TaxCategoryResource($updated),
        ]);
    }

    public function addRate(AddTaxRateRequest $request, int $id): JsonResponse
    {
        $validated = $request->validated();
        $rate = $this->taxCategoryService->addRate(
            $id,
            (float) $validated['rate'],
            (string) $validated['valid_from'],
            (bool) ($validated['is_active'] ?? true)
        );

        return response()->json([
            'message' => 'تم إضافة نسبة الضريبة وتفعيل تاريخ السريان بنجاح',
            'data' => new TaxRateResource($rate),
        ], 201);
    }

    public function rates(int $id): AnonymousResourceCollection
    {
        $rates = $this->taxCategoryService->getRatesHistory($id);

        return TaxRateResource::collection($rates);
    }

    public function calculate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'taxable_amount' => ['required', 'numeric', 'min:0'],
            'category' => ['required'],
            'date' => ['nullable', 'date'],
        ]);

        $result = $this->taxCategoryService->calculateTax(
            (float) $validated['taxable_amount'],
            $validated['category'],
            $validated['date'] ?? null
        );

        return response()->json([
            'data' => $result,
        ]);
    }
}
