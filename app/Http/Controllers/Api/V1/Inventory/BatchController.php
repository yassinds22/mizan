<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Domains\Inventory\Enums\BatchStatus;
use App\Domains\Inventory\Services\BatchService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BatchController extends Controller
{
    public function __construct(
        private readonly BatchService $batchService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'item_id',
            'status',
            'near_expiry',
            'fefo',
            'search',
        ]);

        $batches = $this->batchService->listBatches($filters);

        return response()->json([
            'success' => true,
            'data' => $batches->map(function ($b) {
                return array_merge($b->toArray(), [
                    'days_until_expiry' => $b->daysUntilExpiry(),
                    'is_expired' => $b->isExpired(),
                    'is_near_expiry' => $b->isNearExpiry(),
                ]);
            }),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $batch = $this->batchService->findBatch($id);

        return response()->json([
            'success' => true,
            'data' => array_merge($batch->toArray(), [
                'days_until_expiry' => $batch->daysUntilExpiry(),
                'is_expired' => $batch->isExpired(),
                'is_near_expiry' => $batch->isNearExpiry(),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $itemId = (int) $request->input('item_id');

        $validated = $request->validate([
            'item_id' => ['required', 'integer', 'exists:items,id'],
            'batch_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('item_batches', 'batch_number')->where('item_id', $itemId),
            ],
            'production_date' => ['nullable', 'date'],
            'expiry_date' => ['required', 'date'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', Rule::enum(BatchStatus::class)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $batch = $this->batchService->createBatch($validated);

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء الدفعة بنجاح',
            'data' => $batch,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $batch = $this->batchService->findBatch($id);

        $validated = $request->validate([
            'batch_number' => [
                'sometimes',
                'string',
                'max:100',
                Rule::unique('item_batches', 'batch_number')
                    ->where('item_id', $batch->item_id)
                    ->ignore($id),
            ],
            'production_date' => ['nullable', 'date'],
            'expiry_date' => ['sometimes', 'date'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', Rule::enum(BatchStatus::class)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->batchService->updateBatch($id, $validated);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث بيانات الدفعة بنجاح',
            'data' => $updated,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->batchService->deleteBatch($id);

        return response()->json([
            'success' => true,
            'message' => 'تم حذف الدفعة بنجاح',
        ]);
    }
}
