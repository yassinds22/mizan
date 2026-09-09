<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Core;

use App\Domains\Core\Services\BranchService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Core\StoreBranchRequest;
use App\Http\Requests\Api\V1\Core\UpdateBranchRequest;
use App\Http\Resources\Api\V1\Core\BranchResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BranchController extends Controller
{
    public function __construct(
        protected BranchService $branchService
    ) {}

    /**
     * عرض قائمة الفروع مع إمكانية الفلترة والبحث
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only(['search', 'is_active', 'city']);

        if ($request->boolean('paginate', false)) {
            $perPage = (int) $request->input('per_page', 15);
            $branches = $this->branchService->getPaginatedBranches($perPage, $filters);
        } else {
            $branches = $this->branchService->getAllBranches($filters);
        }

        return BranchResource::collection($branches);
    }

    /**
     * حفظ فرع جديد
     */
    public function store(StoreBranchRequest $request): JsonResponse
    {
        $branch = $this->branchService->createBranch($request->validated());

        return (new BranchResource($branch))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * عرض تفاصيل فرع محدد
     */
    public function show(int $id): BranchResource
    {
        $branch = $this->branchService->getBranchById($id);

        return new BranchResource($branch);
    }

    /**
     * تحديث بيانات فرع
     */
    public function update(UpdateBranchRequest $request, int $id): BranchResource
    {
        $branch = $this->branchService->updateBranch($id, $request->validated());

        return new BranchResource($branch);
    }

    /**
     * حذف فرع
     */
    public function destroy(int $id): JsonResponse
    {
        $this->branchService->deleteBranch($id);

        return response()->json([
            'message' => 'تم حذف الفرع بنجاح.',
        ]);
    }

    /**
     * تبديل حالة نشاط الفرع (تفعيل / تعطيل)
     */
    public function toggleActive(int $id): BranchResource
    {
        $branch = $this->branchService->toggleBranchStatus($id);

        return new BranchResource($branch);
    }
}
