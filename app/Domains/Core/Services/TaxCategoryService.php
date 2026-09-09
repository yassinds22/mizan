<?php

declare(strict_types=1);

namespace App\Domains\Core\Services;

use App\Domains\Core\Models\TaxCategory;
use App\Domains\Core\Models\TaxRate;
use App\Domains\Core\Repositories\Contracts\TaxCategoryRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use InvalidArgumentException;

class TaxCategoryService
{
    public function __construct(
        private readonly TaxCategoryRepositoryInterface $taxCategoryRepository
    ) {}

    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, TaxCategory>
     */
    public function listCategories(array $filters = []): Collection
    {
        return $this->taxCategoryRepository->all($filters);
    }

    public function getCategory(int $id): TaxCategory
    {
        $category = $this->taxCategoryRepository->findById($id);

        if (!$category) {
            throw new InvalidArgumentException("فئة الضريبة غير موجودة (معرف: {$id})");
        }

        return $category;
    }

    /**
     * @param array<string, mixed> $data
     */
    public function updateCategory(int $id, array $data): TaxCategory
    {
        $category = $this->getCategory($id);

        // Disallow changing canonical codes
        unset($data['code']);

        return $this->taxCategoryRepository->update($category->id, $data);
    }

    public function addRate(int $categoryId, float $rate, string $validFrom, bool $isActive = true): TaxRate
    {
        $category = $this->getCategory($categoryId);

        if ($rate < 0 || $rate > 100) {
            throw new InvalidArgumentException("نسبة الضريبة يجب أن تكون بين 0% و 100%");
        }

        return $this->taxCategoryRepository->addRate($category->id, [
            'rate' => $rate,
            'valid_from' => $validFrom,
            'is_active' => $isActive,
        ]);
    }

    /**
     * @return Collection<int, TaxRate>
     */
    public function getRatesHistory(int $categoryId): Collection
    {
        $category = $this->getCategory($categoryId);

        return $this->taxCategoryRepository->getRatesHistory($category->id);
    }

    /**
     * حساب مبلغ الضريبة لمبلغ خاضع للضريبة
     *
     * @return array{rate: float, tax_amount: float, total_with_tax: float, category_code: string}
     */
    public function calculateTax(float $taxableAmount, int|string $categoryIdentifier, ?string $date = null): array
    {
        $category = is_int($categoryIdentifier)
            ? $this->taxCategoryRepository->findById($categoryIdentifier)
            : $this->taxCategoryRepository->findByCode((string) $categoryIdentifier);

        if (!$category) {
            throw new InvalidArgumentException("فئة الضريبة المحددة غير موجودة");
        }

        $taxRate = $this->taxCategoryRepository->getActiveRateForDate($category->id, $date);
        $rate = $taxRate ? (float) $taxRate->rate : 0.00;

        $taxAmount = round(($taxableAmount * $rate) / 100, 2);
        $totalWithTax = round($taxableAmount + $taxAmount, 2);

        return [
            'rate' => $rate,
            'tax_amount' => $taxAmount,
            'total_with_tax' => $totalWithTax,
            'category_code' => $category->code,
        ];
    }
}
