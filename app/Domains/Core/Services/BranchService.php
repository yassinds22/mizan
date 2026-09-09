<?php

declare(strict_types=1);

namespace App\Domains\Core\Services;

use App\Domains\Core\Models\Branch;
use App\Domains\Core\Repositories\Contracts\BranchRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class BranchService
{
    public function __construct(
        protected BranchRepositoryInterface $branchRepository
    ) {}

    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, Branch>
     */
    public function getAllBranches(array $filters = []): Collection
    {
        return $this->branchRepository->all($filters);
    }

    /**
     * @param int $perPage
     * @param array<string, mixed> $filters
     * @return LengthAwarePaginator<Branch>
     */
    public function getPaginatedBranches(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        return $this->branchRepository->paginate($perPage, $filters);
    }

    public function getBranchById(int $id): Branch
    {
        $branch = $this->branchRepository->findById($id);

        if (!$branch) {
            throw ValidationException::withMessages([
                'branch' => ['الفرع المطلوب غير موجود.'],
            ]);
        }

        return $branch;
    }

    /**
     * @param array<string, mixed> $data
     */
    public function createBranch(array $data): Branch
    {
        $data['code'] = strtoupper(trim($data['code']));
        $data['name'] = trim($data['name']);

        if (isset($data['city'])) {
            $data['city'] = trim($data['city']);
        }

        if (!array_key_exists('is_active', $data) || $data['is_active'] === null) {
            $data['is_active'] = true;
        }

        return $this->branchRepository->create($data);
    }

    /**
     * @param int $id
     * @param array<string, mixed> $data
     */
    public function updateBranch(int $id, array $data): Branch
    {
        $branch = $this->getBranchById($id);

        if (isset($data['code'])) {
            $data['code'] = strtoupper(trim($data['code']));
        }

        if (isset($data['name'])) {
            $data['name'] = trim($data['name']);
        }

        if (isset($data['city'])) {
            $data['city'] = trim($data['city']);
        }

        return $this->branchRepository->update($branch, $data);
    }

    public function deleteBranch(int $id): bool
    {
        $branch = $this->getBranchById($id);

        // حماية: منع حذف الفرع إذا كان هو الفرع الوحيد في النظام
        $totalBranches = $this->branchRepository->all()->count();
        if ($totalBranches <= 1) {
            throw ValidationException::withMessages([
                'branch' => ['لا يمكن حذف الفرع الوحيد المتبقي في النظام.'],
            ]);
        }

        return $this->branchRepository->delete($branch);
    }

    public function toggleBranchStatus(int $id): Branch
    {
        $branch = $this->getBranchById($id);

        // حماية: إذا كان الفرع نشطاً وهو الفرع النشط الوحيد، لا نسمح بتعطيله
        if ($branch->is_active) {
            $activeBranchesCount = $this->branchRepository->all(['is_active' => true])->count();
            if ($activeBranchesCount <= 1) {
                throw ValidationException::withMessages([
                    'branch' => ['لا يمكن تعطيل الفرع النشط الوحيد في النظام.'],
                ]);
            }
        }

        return $this->branchRepository->toggleActive($branch);
    }
}
