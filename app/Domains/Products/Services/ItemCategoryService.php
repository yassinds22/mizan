<?php

declare(strict_types=1);

namespace App\Domains\Products\Services;

use App\Domains\Accounting\Services\AccountService;
use App\Domains\Products\Models\ItemCategory;
use App\Domains\Products\Repositories\Contracts\ItemCategoryRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ItemCategoryService
{
    public function __construct(
        private readonly ItemCategoryRepositoryInterface $categoryRepository,
        private readonly AccountService $accountService
    ) {}

    public function listCategories(array $filters = []): Collection
    {
        return $this->categoryRepository->all($filters);
    }

    public function getTree(): Collection
    {
        return $this->categoryRepository->getTree();
    }

    public function getCategory(int $id): ItemCategory
    {
        $category = $this->categoryRepository->findById($id);

        if (!$category) {
            throw ValidationException::withMessages([
                'category' => ["تصنيف الأصناف غير موجود (معرف: {$id})."],
            ]);
        }

        return $category;
    }

    public function createCategory(array $data): ItemCategory
    {
        return DB::transaction(function () use ($data) {
            $code = strtoupper(trim($data['code']));

            if ($this->categoryRepository->findByCode($code)) {
                throw ValidationException::withMessages([
                    'code' => ["كود التصنيف [{$code}] مسجل مسبقاً."],
                ]);
            }
            $data['code'] = $code;

            // صمامات الأمان: التأكد من أن الحسابات المحاسبية المرتبطة حسابات تحليلية نشطة
            $this->validateGlAccounts($data);

            return $this->categoryRepository->create($data);
        });
    }

    public function updateCategory(int $id, array $data): ItemCategory
    {
        return DB::transaction(function () use ($id, $data) {
            $category = $this->getCategory($id);

            if (!empty($data['code'])) {
                $code = strtoupper(trim($data['code']));
                $existing = $this->categoryRepository->findByCode($code);
                if ($existing && $existing->id !== $category->id) {
                    throw ValidationException::withMessages([
                        'code' => ["كود التصنيف [{$code}] مسجل مسبقاً لتصنيف آخر."],
                    ]);
                }
                $data['code'] = $code;
            }

            // منع تعيين التصنيف كأب لنفسه
            if (isset($data['parent_id']) && (int) $data['parent_id'] === $category->id) {
                throw ValidationException::withMessages([
                    'parent_id' => ['لا يمكن تعيين التصنيف كأب لنفسه.'],
                ]);
            }

            $this->validateGlAccounts($data);

            return $this->categoryRepository->update($category, $data);
        });
    }

    public function deleteCategory(int $id): bool
    {
        $category = $this->getCategory($id);

        if ($category->children()->exists()) {
            throw ValidationException::withMessages([
                'category' => ['لا يمكن حذف التصنيف لوجود تصنيفات فرعية تابعة له في الشجرة.'],
            ]);
        }

        if ($category->items()->exists()) {
            throw ValidationException::withMessages([
                'category' => ['لا يمكن حذف التصنيف لأنه مرتبط بأصناف ومنتجات غذائية مسجلة في النظام.'],
            ]);
        }

        return $this->categoryRepository->delete($category);
    }

    private function validateGlAccounts(array $data): void
    {
        if (!empty($data['inventory_account_id'])) {
            $this->accountService->assertCanPost((int) $data['inventory_account_id']);
        }

        if (!empty($data['cogs_account_id'])) {
            $this->accountService->assertCanPost((int) $data['cogs_account_id']);
        }

        if (!empty($data['revenue_account_id'])) {
            $this->accountService->assertCanPost((int) $data['revenue_account_id']);
        }
    }
}
