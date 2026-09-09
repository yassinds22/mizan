<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Services;

use App\Domains\Accounting\Enums\AccountNature;
use App\Domains\Accounting\Enums\AccountType;
use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Repositories\Contracts\AccountRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AccountService
{
    public function __construct(
        private readonly AccountRepositoryInterface $accountRepository
    ) {}

    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, Account>
     */
    public function listAccounts(array $filters = []): Collection
    {
        return $this->accountRepository->all($filters);
    }

    /**
     * جلب دليل الحسابات كاملاً كشجرة هرمية متعددة المستويات
     *
     * @return Collection<int, Account>
     */
    public function getTree(): Collection
    {
        return $this->accountRepository->getTree();
    }

    public function getAccount(int $id): Account
    {
        $account = $this->accountRepository->findById($id);

        if (!$account) {
            throw ValidationException::withMessages([
                'account' => ["الحساب المالي غير موجود (معرف: {$id})"],
            ]);
        }

        return $account;
    }

    public function getAccountByCode(string $code): Account
    {
        $account = $this->accountRepository->findByCode($code);

        if (!$account) {
            throw ValidationException::withMessages([
                'account' => ["الحساب ذو الكود [{$code}] غير موجود في دليل الحسابات"],
            ]);
        }

        return $account;
    }

    /**
     * الحسابات التحليلية فقط المسموح بالترحيل المباشر عليها
     *
     * @return Collection<int, Account>
     */
    public function getLeafAccounts(): Collection
    {
        return $this->accountRepository->getLeafAccounts();
    }

    /**
     * إنشاء حساب مالي جديد وضبط المستوى والشجرة
     *
     * @param array<string, mixed> $data
     */
    public function createAccount(array $data): Account
    {
        return DB::transaction(function () use ($data) {
            $code = trim($data['code']);
            if ($this->accountRepository->findByCode($code)) {
                throw ValidationException::withMessages([
                    'code' => ["كود الحساب [{$code}] مسجل مسبقاً، يجب أن يكون الكود فريداً."],
                ]);
            }

            $parentId = !empty($data['parent_id']) ? (int) $data['parent_id'] : null;
            $parent = null;

            if ($parentId) {
                $parent = $this->getAccount($parentId);

                // يرث المستوى من الأب (+1)
                $data['level'] = $parent->level + 1;

                // يرث النوع والطبيعة من الأب إن لم تُحدد صراحة
                $data['type'] = $data['type'] ?? $parent->type;
                $data['nature'] = $data['nature'] ?? $parent->nature;

                // الحساب الأب لم يعد Leaf لأن لديه ابن الآن
                if ($parent->is_leaf) {
                    $this->accountRepository->update($parent, ['is_leaf' => false]);
                }
            } else {
                $data['level'] = 1;
            }

            // افتراضياً الحساب الجديد هو Leaf (يقبل الترحيل) ما لم يُحدد غير ذلك
            if (!array_key_exists('is_leaf', $data)) {
                $data['is_leaf'] = true;
            }

            // ضمان حفظ الـ Enums بشكل صحيح
            if (isset($data['type']) && is_string($data['type'])) {
                $data['type'] = AccountType::from($data['type']);
            }
            if (isset($data['nature']) && is_string($data['nature'])) {
                $data['nature'] = AccountNature::from($data['nature']);
            }

            return $this->accountRepository->create($data);
        });
    }

    /**
     * تحديث بيانات الحساب مع منع الحلقات الدائرية في الشجرة
     *
     * @param array<string, mixed> $data
     */
    public function updateAccount(int $id, array $data): Account
    {
        return DB::transaction(function () use ($id, $data) {
            $account = $this->getAccount($id);

            // التحقق من كود الحساب
            if (!empty($data['code']) && $data['code'] !== $account->code) {
                $existing = $this->accountRepository->findByCode(trim($data['code']));
                if ($existing && $existing->id !== $account->id) {
                    throw ValidationException::withMessages([
                        'code' => ["كود الحساب [{$data['code']}] مسجل مسبقاً لحساب آخر."],
                    ]);
                }
            }

            // التحقق من منع تعيين الحساب كأب لنفسه أو لأحد أبنائه
            if (array_key_exists('parent_id', $data)) {
                $newParentId = !empty($data['parent_id']) ? (int) $data['parent_id'] : null;

                if ($newParentId === $account->id) {
                    throw ValidationException::withMessages([
                        'parent_id' => ['لا يمكن تعيين الحساب كأب لنفسه.'],
                    ]);
                }

                if ($newParentId && $this->isDescendantOf($newParentId, $account->id)) {
                    throw ValidationException::withMessages([
                        'parent_id' => ['لا يمكن تعيين حساب فرعي كأب لحسابه الرئيسي (حلقة شجرية دائرية).'],
                    ]);
                }

                if ($newParentId !== $account->parent_id) {
                    $oldParent = $account->parent;

                    if ($newParentId) {
                        $newParent = $this->getAccount($newParentId);
                        $data['level'] = $newParent->level + 1;
                        if ($newParent->is_leaf) {
                            $this->accountRepository->update($newParent, ['is_leaf' => false]);
                        }
                    } else {
                        $data['level'] = 1;
                    }

                    // تحديث الأب القديم إن لم يبقَ لديه أبناء آخرين
                    if ($oldParent && $oldParent->children()->where('id', '!=', $account->id)->count() === 0) {
                        $this->accountRepository->update($oldParent, ['is_leaf' => true]);
                    }
                }
            }

            return $this->accountRepository->update($account, $data);
        });
    }

    /**
     * حذف حساب مالي (بشرط عدم وجود أبناء تابعة له)
     */
    public function deleteAccount(int $id): bool
    {
        return DB::transaction(function () use ($id) {
            $account = $this->getAccount($id);

            if ($account->children()->count() > 0) {
                throw ValidationException::withMessages([
                    'account' => ['لا يمكن حذف الحساب لوجود حسابات فرعية تابعة له في الشجرة. يرجى حذف أو نقل الحسابات الفرعية أولاً.'],
                ]);
            }

            $parent = $account->parent;
            $deleted = $this->accountRepository->delete($account);

            // إذا كان الأب ليس لديه أبناء آخرين بعد الحذف، نرجعه إلى Leaf
            if ($parent && $parent->children()->count() === 0) {
                $this->accountRepository->update($parent, ['is_leaf' => true]);
            }

            return $deleted;
        });
    }

    /**
     * صمام الأمان المحاسبي: التحقق الصارم من أهلية الحساب للترحيل المباشر
     *
     * @throws ValidationException
     */
    public function assertCanPost(Account|int $account): Account
    {
        $acc = is_int($account) ? $this->getAccount($account) : $account;

        if (!$acc->is_active) {
            throw ValidationException::withMessages([
                'account' => ["الحساب [{$acc->code} - {$acc->name_ar}] معطل، لا يمكن الترحيل عليه."],
            ]);
        }

        if (!$acc->is_leaf) {
            throw ValidationException::withMessages([
                'account' => ["الحساب [{$acc->code} - {$acc->name_ar}] هو حساب رئيسي/تجميعي (غير تحليلي)، ويُحظر الترحيل المباشر عليه نهائياً طبقاً للأصول المحاسبية."],
            ]);
        }

        return $acc;
    }

    /**
     * فحص هل الحساب المعطى يقع ضمن شجرة أبناء حساب آخر
     */
    private function isDescendantOf(int $candidateId, int $ancestorId): bool
    {
        $current = Account::find($candidateId);

        while ($current && $current->parent_id !== null) {
            if ($current->parent_id === $ancestorId) {
                return true;
            }
            $current = $current->parent;
        }

        return false;
    }
}
