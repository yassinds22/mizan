<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Accounting;

use App\Domains\Accounting\Models\CostCenter;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\Accounting\CostCenterResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CostCenterController extends Controller
{
    /**
     * عرض قائمة مراكز التكلفة
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = CostCenter::query()->with('branch');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        $costCenters = $query->orderBy('code')->get();

        return CostCenterResource::collection($costCenters);
    }

    /**
     * إضافة مركز تكلفة جديد
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:cost_centers,code'],
            'name_ar' => ['required', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'is_active' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $costCenter = CostCenter::create($validated);

        return (new CostCenterResource($costCenter->load('branch')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * عرض تفاصيل مركز تكلفة
     */
    public function show(int $id): CostCenterResource
    {
        $costCenter = CostCenter::with('branch')->findOrFail($id);

        return new CostCenterResource($costCenter);
    }

    /**
     * تحديث مركز تكلفة
     */
    public function update(Request $request, int $id): CostCenterResource
    {
        $costCenter = CostCenter::findOrFail($id);

        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50', Rule::unique('cost_centers', 'code')->ignore($costCenter->id)],
            'name_ar' => ['sometimes', 'required', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'is_active' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $costCenter->update($validated);

        return new CostCenterResource($costCenter->fresh('branch'));
    }

    /**
     * حذف مركز تكلفة
     */
    public function destroy(int $id): JsonResponse
    {
        $costCenter = CostCenter::findOrFail($id);
        $costCenter->delete();

        return response()->json([
            'message' => 'تم حذف مركز التكلفة بنجاح.',
        ]);
    }
}
