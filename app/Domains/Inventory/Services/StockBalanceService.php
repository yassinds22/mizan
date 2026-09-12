<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Services;

use App\Domains\Inventory\Models\StockBalance;
use App\Domains\Products\Models\Item;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockBalanceService
{
    /**
     * استعلام الأرصدة اللحظية مع التصفية
     */
    public function listBalances(array $filters = []): Collection
    {
        $query = StockBalance::query()->with([
            'item.category',
            'item.baseUom',
            'warehouse',
            'location',
            'batch',
        ]);

        if (!empty($filters['item_id'])) {
            $query->where('item_id', (int) $filters['item_id']);
        }

        if (!empty($filters['warehouse_id'])) {
            $query->where('warehouse_id', (int) $filters['warehouse_id']);
        }

        if (!empty($filters['location_id'])) {
            $query->where('location_id', (int) $filters['location_id']);
        }

        if (!empty($filters['batch_id'])) {
            $query->where('batch_id', (int) $filters['batch_id']);
        }

        if (!empty($filters['in_stock_only'])) {
            $query->inStock();
        }

        return $query->orderBy('item_id')->get();
    }

    /**
     * ملخص رصيد صنف عبر جميع المستودعات والدفعات
     */
    public function getItemSummary(int $itemId): array
    {
        $balances = StockBalance::with(['warehouse', 'location', 'batch'])
            ->where('item_id', $itemId)
            ->get();

        $totalQty = $balances->sum(fn ($b) => (float) $b->quantity);
        $reservedQty = $balances->sum(fn ($b) => (float) $b->reserved_quantity);
        $totalVal = $balances->sum(fn ($b) => (float) $b->total_value);

        return [
            'item_id' => $itemId,
            'total_quantity' => $totalQty,
            'reserved_quantity' => $reservedQty,
            'available_quantity' => max(0.0, $totalQty - $reservedQty),
            'total_value' => $totalVal,
            'breakdown' => $balances,
        ];
    }

    /**
     * تعديل أو تحديث رصيد مخزني (إضافة أو خصم)
     *
     * @throws ValidationException إذا كان الرصيد غير كافٍ للخصم
     */
    public function adjustBalance(
        int $itemId,
        int $warehouseId,
        ?int $locationId,
        ?int $batchId,
        float $quantityDelta,
        float $unitCost = 0.0
    ): StockBalance {
        return DB::transaction(function () use (
            $itemId,
            $warehouseId,
            $locationId,
            $batchId,
            $quantityDelta,
            $unitCost
        ) {
            $query = StockBalance::where('item_id', $itemId)
                ->where('warehouse_id', $warehouseId);

            if ($locationId !== null) {
                $query->where('location_id', $locationId);
            } else {
                $query->whereNull('location_id');
            }

            if ($batchId !== null) {
                $query->where('batch_id', $batchId);
            } else {
                $query->whereNull('batch_id');
            }

            /** @var StockBalance|null $balance */
            $balance = $query->lockForUpdate()->first();

            if (! $balance) {
                if ($quantityDelta < 0) {
                    throw ValidationException::withMessages([
                        'quantity' => ['الرصيد المتاح غير كافٍ للصرف أو التحويل (الرصيد الحالي: 0).'],
                    ]);
                }

                $balance = new StockBalance([
                    'item_id' => $itemId,
                    'warehouse_id' => $warehouseId,
                    'location_id' => $locationId,
                    'batch_id' => $batchId,
                    'quantity' => 0.0,
                    'reserved_quantity' => 0.0,
                    'unit_cost' => $unitCost,
                ]);
            }

            $newQty = (float) $balance->quantity + $quantityDelta;

            if ($newQty < -0.0001) {
                throw ValidationException::withMessages([
                    'quantity' => [
                        sprintf(
                            'الكمية المطلوبة (%.2f) تفوق الرصيد المتاح (%.2f) في هذا الموقع.',
                            abs($quantityDelta),
                            (float) $balance->quantity
                        ),
                    ],
                ]);
            }

            $balance->quantity = max(0.0, $newQty);

            if ($quantityDelta > 0 && $unitCost > 0) {
                $balance->unit_cost = $unitCost;
            }

            $balance->save();

            // مزامنة رصيد الصنف الإجمالي كـ Cache في جدول items
            $totalStock = StockBalance::where('item_id', $itemId)->sum('quantity');
            Item::where('id', $itemId)->update(['stock_quantity' => $totalStock]);

            return $balance->fresh(['item', 'warehouse', 'location', 'batch']);
        });
    }

    /**
     * محرك تخصيص المخزون الذكي وفق مبدأ ما ينتهي أولاً يخرج أولاً (FEFO)
     *
     * @param int $itemId معرف الصنف
     * @param int|null $warehouseId معرف المستودع (اختياري، إن وجد يخصص منه فقط)
     * @param float $requiredQty الكمية المطلوبة للتخصيص
     * @return array نتيجة التخصيص بما فيها الدفعات والمواقع والكميات المخصصة
     */
    public function allocateFefo(int $itemId, ?int $warehouseId, float $requiredQty): array
    {
        $query = StockBalance::with(['warehouse', 'location', 'batch'])
            ->leftJoin('item_batches', 'stock_balances.batch_id', '=', 'item_batches.id')
            ->select('stock_balances.*')
            ->where('stock_balances.item_id', $itemId)
            ->whereRaw('(stock_balances.quantity - stock_balances.reserved_quantity) > 0.0001');

        if ($warehouseId !== null) {
            $query->where('stock_balances.warehouse_id', $warehouseId);
        }

        // فقط الدفعات النشطة إن وجدت، أو بدون دفعة
        $query->where(function ($q) {
            $q->whereNull('stock_balances.batch_id')
              ->orWhere('item_batches.status', '=', 'active');
        });

        // ترتيب FEFO: تاريخ الانتهاء الأقرب أولاً، ثم تاريخ الإنتاج، ثم ID
        $query->orderByRaw('CASE WHEN item_batches.expiry_date IS NULL THEN 1 ELSE 0 END, item_batches.expiry_date ASC')
              ->orderBy('item_batches.production_date', 'asc')
              ->orderBy('stock_balances.id', 'asc');

        $balances = $query->get();

        $allocations = [];
        $remaining = $requiredQty;
        $totalAllocated = 0.0;

        foreach ($balances as $balance) {
            if ($remaining <= 0.0001) {
                break;
            }

            $available = (float) $balance->available_quantity;
            if ($available <= 0.0001) {
                continue;
            }

            $allocated = min($remaining, $available);
            $allocations[] = [
                'stock_balance_id' => $balance->id,
                'batch_id' => $balance->batch_id,
                'batch_number' => $balance->batch?->batch_number,
                'expiry_date' => $balance->batch?->expiry_date?->format('Y-m-d'),
                'days_until_expiry' => $balance->batch?->days_until_expiry,
                'is_near_expiry' => $balance->batch?->is_near_expiry ?? false,
                'warehouse_id' => $balance->warehouse_id,
                'warehouse_name' => $balance->warehouse?->name,
                'location_id' => $balance->location_id,
                'location_code' => $balance->location?->code,
                'available_quantity' => round($available, 4),
                'allocated_quantity' => round($allocated, 4),
                'unit_cost' => (float) $balance->unit_cost,
                'line_total_cost' => round($allocated * (float) $balance->unit_cost, 2),
            ];

            $totalAllocated += $allocated;
            $remaining -= $allocated;
        }

        return [
            'item_id' => $itemId,
            'warehouse_id' => $warehouseId,
            'required_quantity' => round($requiredQty, 4),
            'total_allocated' => round($totalAllocated, 4),
            'is_fully_allocated' => ($remaining <= 0.0001),
            'shortage' => max(0.0, round($remaining, 4)),
            'allocations' => $allocations,
        ];
    }
}

