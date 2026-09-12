<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Services;

use App\Domains\Inventory\Enums\BatchStatus;
use App\Domains\Inventory\Models\ItemBatch;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class BatchService
{
    /**
     * استعلام وتصفية الدفعات
     */
    public function listBatches(array $filters = []): Collection
    {
        $query = ItemBatch::query()->with([
            'item.category',
            'item.baseUom',
            'stockBalances.warehouse',
            'stockBalances.location',
        ]);

        if (!empty($filters['item_id'])) {
            $query->where('item_id', (int) $filters['item_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['near_expiry'])) {
            $days = (int) $filters['near_expiry'];
            $query->nearExpiry($days > 0 ? $days : 7);
        }

        if (!empty($filters['fefo'])) {
            $query->fefo();
        } else {
            $query->orderBy('expiry_date', 'asc');
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('batch_number', 'like', $term)
                  ->orWhereHas('item', function ($iq) use ($term) {
                      $iq->where('name_ar', 'like', $term)
                         ->orWhere('sku', 'like', $term);
                  });
            });
        }

        return $query->get();
    }

    /**
     * جلب دفعات الصنف مرتبة بنظام FEFO (الأقرب انتهاءً أولاً)
     */
    public function getFefoBatchesForItem(int $itemId): Collection
    {
        return ItemBatch::where('item_id', $itemId)
            ->fefo()
            ->get();
    }

    /**
     * جلب دفعة محددة
     */
    public function findBatch(int $id): ItemBatch
    {
        return ItemBatch::with(['item'])->findOrFail($id);
    }

    /**
     * إنشاء دفعة جديدة لصنف
     */
    public function createBatch(array $data): ItemBatch
    {
        if (empty($data['batch_number'])) {
            $count = ItemBatch::where('item_id', $data['item_id'])->count() + 1;
            $data['batch_number'] = sprintf('B-%04d', 4400 + $count);
        }

        if (empty($data['status'])) {
            $data['status'] = BatchStatus::ACTIVE;
        }

        return ItemBatch::create($data);
    }

    /**
     * تحديث بيانات الدفعة
     */
    public function updateBatch(int $id, array $data): ItemBatch
    {
        $batch = $this->findBatch($id);
        $batch->update($data);

        return $batch->fresh(['item']);
    }

    /**
     * حذف دفعة (Soft delete)
     */
    public function deleteBatch(int $id): bool
    {
        $batch = $this->findBatch($id);
        return (bool) $batch->delete();
    }
}
