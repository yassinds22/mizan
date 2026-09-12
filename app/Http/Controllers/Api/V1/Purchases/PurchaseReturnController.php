<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Purchases;

use App\Domains\Purchases\Services\PurchaseReturnService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Purchases\StorePurchaseReturnRequest;
use App\Http\Resources\Api\V1\Purchases\PurchaseReturnResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PurchaseReturnController extends Controller
{
    public function __construct(
        private readonly PurchaseReturnService $purchaseReturnService
    ) {}

    /**
     * استعراض قائمة مردودات المشتريات
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $returns = $this->purchaseReturnService->getReturns(
            $request->only(['search', 'status', 'supplier_id', 'branch_id', 'date_from', 'date_to']),
            (int) $request->input('per_page', 25)
        );

        return PurchaseReturnResource::collection($returns);
    }

    /**
     * جلب أسطر فاتورة المشتريات القابلة للإرجاع مع المتبقي لكل سطر
     */
    public function returnableLines(int $invoiceId): JsonResponse
    {
        $data = $this->purchaseReturnService->getReturnableLines($invoiceId);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * إنشاء وترحيل مردود مشتريات جديد
     */
    public function store(StorePurchaseReturnRequest $request): JsonResponse
    {
        $purchaseReturn = $this->purchaseReturnService->createAndPostReturn($request->validated());

        return response()->json([
            'message' => 'تم ترحيل مردود المشتريات وإصدار الإشعار المدين بنجاح.',
            'data' => new PurchaseReturnResource($purchaseReturn),
        ], 201);
    }

    /**
     * تفاصيل مردود مشتريات محدد
     */
    public function show(int $id): JsonResponse
    {
        $purchaseReturn = $this->purchaseReturnService->getReturnById($id);

        return response()->json([
            'data' => new PurchaseReturnResource($purchaseReturn),
        ]);
    }

    /**
     * إلغاء مردود مشتريات مرحل وعكس قيده المحاسبي
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $reason = $request->input('reason', 'إلغاء المردود بناءً على طلب المستخدم');
        $cancelledReturn = $this->purchaseReturnService->cancelReturn($id, $reason);

        return response()->json([
            'message' => 'تم إلغاء مردود المشتريات وعكس القيد المحاسبي وإعادة البضاعة للمخزن بنجاح.',
            'data' => new PurchaseReturnResource($cancelledReturn),
        ]);
    }
}
