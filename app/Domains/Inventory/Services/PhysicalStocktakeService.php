<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Services;

use App\Domains\Core\Models\Branch;
use App\Domains\Core\Services\FiscalPeriodService;
use App\Domains\Inventory\Enums\MovementType;
use App\Domains\Inventory\Enums\StocktakeStatus;
use App\Domains\Inventory\Models\ItemBatch;
use App\Domains\Inventory\Models\PhysicalStocktake;
use App\Domains\Inventory\Models\PhysicalStocktakeLine;
use App\Domains\Inventory\Models\StockBalance;
use App\Domains\Products\Models\Item;
use App\Domains\Warehouses\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PhysicalStocktakeService
{
    public function __construct(
        private readonly StockMovementService $stockMovementService,
        private readonly FiscalPeriodService $fiscalPeriodService,
    ) {}

    /**
     * بدء جلسة جرد مخزني جديدة وأخذ اللقطة الدفترية اللحظية (Snapshot)
     */
    public function createStocktake(array $data): PhysicalStocktake
    {
        return DB::transaction(function () use ($data) {
            $warehouse = Warehouse::findOrFail($data['warehouse_id']);
            $branchId = (int) ($data['branch_id'] ?? $warehouse->branch_id ?? Branch::first()?->id ?? 1);
            $date = $data['stocktake_date'] ?? Carbon::now()->toDateString();
            $year = Carbon::parse($date)->format('Y');

            // فحص عدم وجود جرد نشط آخر لنفس النطاق إن طُلب التجميد
            if (!empty($data['freeze_movements'])) {
                $hasActive = PhysicalStocktake::where('warehouse_id', $warehouse->id)
                    ->whereIn('status', [StocktakeStatus::DRAFT, StocktakeStatus::IN_PROGRESS])
                    ->exists();

                if ($hasActive) {
                    throw ValidationException::withMessages([
                        'warehouse_id' => ['يوجد محضر جرد نشط حالياً قيد العمل لهذا المستودع. يرجى إكماله أو إلغاؤه أولاً.'],
                    ]);
                }
            }

            // توليد كود المحضر الفريد
            $count = PhysicalStocktake::whereYear('stocktake_date', $year)->count() + 1;
            $stocktakeNumber = sprintf('STK-%s-%04d', $year, $count);

            /** @var PhysicalStocktake $stocktake */
            $stocktake = PhysicalStocktake::create([
                'stocktake_number' => $stocktakeNumber,
                'branch_id' => $branchId,
                'warehouse_id' => $warehouse->id,
                'location_id' => $data['location_id'] ?? null,
                'category_id' => $data['category_id'] ?? null,
                'stocktake_date' => $date,
                'status' => StocktakeStatus::IN_PROGRESS,
                'scope' => !empty($data['location_id']) ? 'partial' : ($data['scope'] ?? 'full'),
                'is_blind' => (bool) ($data['is_blind'] ?? false),
                'freeze_movements' => (bool) ($data['freeze_movements'] ?? true),
                'supervisor_name' => $data['supervisor_name'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // استعلام لقطة الأرصدة الدفترية اللحظية
            $balanceQuery = StockBalance::where('warehouse_id', $warehouse->id);

            if (!empty($data['location_id'])) {
                $balanceQuery->where('location_id', $data['location_id']);
            }

            if (!empty($data['category_id'])) {
                $balanceQuery->whereHas('item', function (Builder $q) use ($data) {
                    $q->where('category_id', $data['category_id']);
                });
            }

            $balances = $balanceQuery->with(['item', 'batch', 'location'])->get();

            $totalItems = 0;
            $matchedCount = 0;

            foreach ($balances as $bal) {
                if (!$bal->item) {
                    continue;
                }

                $bookQty = (float) $bal->quantity;
                // في الجرد الأعمى تبدأ الكمية المجرودة من صفر لإجبار الفريق على العد الميداني
                $countedQty = $stocktake->is_blind ? 0.0 : $bookQty;
                $diffQty = $countedQty - $bookQty;
                $unitCost = (float) ($bal->unit_cost > 0 ? $bal->unit_cost : ($bal->item->cost_price ?? 0));
                $diffVal = round($diffQty * $unitCost, 4);

                $stocktake->lines()->create([
                    'item_id' => $bal->item_id,
                    'location_id' => $bal->location_id,
                    'batch_id' => $bal->batch_id,
                    'book_quantity' => $bookQty,
                    'counted_quantity' => $countedQty,
                    'difference_quantity' => $diffQty,
                    'unit_cost' => $unitCost,
                    'difference_value' => $diffVal,
                ]);

                $totalItems++;
                if (abs($diffQty) < 0.0001) {
                    $matchedCount++;
                }
            }

            $stocktake->update([
                'total_items_count' => $totalItems,
                'matched_items_count' => $matchedCount,
                'variance_items_count' => $totalItems - $matchedCount,
            ]);

            return $stocktake->load(['lines.item', 'lines.batch', 'lines.location', 'warehouse', 'branch']);
        });
    }

    /**
     * تحديث كميات العد الفعلي للسطور وإعادة احتساب الفروقات
     */
    public function updateCounts(PhysicalStocktake $stocktake, array $counts): PhysicalStocktake
    {
        if ($stocktake->isPosted()) {
            throw ValidationException::withMessages([
                'status' => ['لا يمكن تعديل محضر جرد مرحل ومعتمد نهائياً.'],
            ]);
        }

        if ($stocktake->isCancelled()) {
            throw ValidationException::withMessages([
                'status' => ['لا يمكن تعديل محضر جرد ملغي.'],
            ]);
        }

        return DB::transaction(function () use ($stocktake, $counts) {
            foreach ($counts as $countData) {
                if (empty($countData['line_id'])) {
                    continue;
                }

                /** @var PhysicalStocktakeLine $line */
                $line = $stocktake->lines()->where('id', $countData['line_id'])->first();
                if (!$line) {
                    continue;
                }

                $countedQty = (float) $countData['counted_quantity'];
                $bookQty = (float) $line->book_quantity;
                $diffQty = $countedQty - $bookQty;
                $unitCost = (float) $line->unit_cost;
                $diffVal = round($diffQty * $unitCost, 4);

                $line->update([
                    'counted_quantity' => $countedQty,
                    'difference_quantity' => $diffQty,
                    'difference_value' => $diffVal,
                    'variance_reason' => $countData['variance_reason'] ?? $line->variance_reason,
                    'notes' => $countData['notes'] ?? $line->notes,
                ]);
            }

            // إعادة احتساب إجماليات الفروقات والإحصائيات
            $allLines = $stocktake->lines()->get();
            $totalCount = $allLines->count();
            $matchedCount = 0;
            $varianceCount = 0;
            $shortageVal = 0.0;
            $surplusVal = 0.0;

            foreach ($allLines as $line) {
                $diff = (float) $line->difference_quantity;
                $val = (float) $line->difference_value;

                if (abs($diff) < 0.0001) {
                    $matchedCount++;
                } else {
                    $varianceCount++;
                    if ($diff < 0) {
                        $shortageVal += abs($val);
                    } else {
                        $surplusVal += $val;
                    }
                }
            }

            $stocktake->update([
                'status' => StocktakeStatus::IN_PROGRESS,
                'total_items_count' => $totalCount,
                'matched_items_count' => $matchedCount,
                'variance_items_count' => $varianceCount,
                'total_shortage_value' => round($shortageVal, 4),
                'total_surplus_value' => round($surplusVal, 4),
                'net_variance_value' => round($surplusVal - $shortageVal, 4),
            ]);

            return $stocktake->fresh(['lines.item', 'lines.batch', 'lines.location', 'warehouse', 'branch']);
        });
    }

    /**
     * اعتماد وترحيل الجرد المخزني وتسوية الفروقات عبر محرك الحركات القائم
     */
    public function postStocktake(PhysicalStocktake $stocktake): PhysicalStocktake
    {
        return DB::transaction(function () use ($stocktake) {
            /** @var PhysicalStocktake $locked */
            $locked = PhysicalStocktake::where('id', $stocktake->id)->lockForUpdate()->firstOrFail();

            if ($locked->isPosted()) {
                throw ValidationException::withMessages([
                    'status' => ['محضر الجرد مرحل ومعتمد بالفعل ولا يمكن تكرار ترحيله.'],
                ]);
            }

            if ($locked->isCancelled()) {
                throw ValidationException::withMessages([
                    'status' => ['لا يمكن ترحيل محضر جرد ملغي.'],
                ]);
            }

            $dateStr = $locked->stocktake_date->toDateString();
            $this->fiscalPeriodService->assertDateInOpenPeriod($dateStr);

            $locked->load(['lines.item', 'lines.batch']);

            $shortageLines = [];
            $surplusLines = [];

            foreach ($locked->lines as $line) {
                $diffQty = (float) $line->difference_quantity;
                $cost = (float) $line->unit_cost;

                if ($diffQty < -0.0001) {
                    // عجز جرد (يخصم من المستودع)
                    $shortageLines[] = [
                        'item_id' => $line->item_id,
                        'from_location_id' => $line->location_id,
                        'to_location_id' => null,
                        'batch_id' => $line->batch_id,
                        'quantity' => abs($diffQty),
                        'unit_cost' => $cost,
                        'notes' => "عجز جرد - محضر #{$locked->stocktake_number}: " . ($line->variance_reason ?? ''),
                    ];
                } elseif ($diffQty > 0.0001) {
                    // فائض جرد (يضاف إلى المستودع)
                    $surplusLines[] = [
                        'item_id' => $line->item_id,
                        'from_location_id' => null,
                        'to_location_id' => $line->location_id,
                        'batch_id' => $line->batch_id,
                        'quantity' => $diffQty,
                        'unit_cost' => $cost,
                        'notes' => "فائض جرد - محضر #{$locked->stocktake_number}: " . ($line->variance_reason ?? ''),
                    ];
                }
            }

            $lastMovement = null;

            // 1. تسوية العجز عبر محرك الحركات (StockMovement ADJUSTMENT Shortage)
            if (!empty($shortageLines)) {
                $shortageMovement = $this->stockMovementService->createMovement([
                    'movement_type' => MovementType::ADJUSTMENT,
                    'movement_date' => $dateStr,
                    'branch_id' => $locked->branch_id,
                    'from_warehouse_id' => $locked->warehouse_id,
                    'to_warehouse_id' => null,
                    'reason' => "تسوية عجز جرد مخزني - محضر #{$locked->stocktake_number}",
                    'notes' => $locked->notes,
                ], $shortageLines);

                $lastMovement = $this->stockMovementService->postMovement($shortageMovement->id);
            }

            // 2. تسوية الفائض عبر محرك الحركات (StockMovement ADJUSTMENT Surplus)
            if (!empty($surplusLines)) {
                $surplusMovement = $this->stockMovementService->createMovement([
                    'movement_type' => MovementType::ADJUSTMENT,
                    'movement_date' => $dateStr,
                    'branch_id' => $locked->branch_id,
                    'from_warehouse_id' => null,
                    'to_warehouse_id' => $locked->warehouse_id,
                    'reason' => "تسوية فائض جرد مخزني - محضر #{$locked->stocktake_number}",
                    'notes' => $locked->notes,
                ], $surplusLines);

                $surplusPosted = $this->stockMovementService->postMovement($surplusMovement->id);
                $lastMovement = $lastMovement ?? $surplusPosted;
            }

            // تحديث حالة المحضر إلى مرحل ومعتمد نهائياً
            $locked->status = StocktakeStatus::POSTED;
            $locked->posted_at = Carbon::now();
            if ($lastMovement) {
                $locked->stock_movement_id = $lastMovement->id;
                $locked->journal_entry_id = $lastMovement->journal_entry_id;
            }
            $locked->save();

            return $locked->fresh([
                'lines.item',
                'lines.batch',
                'lines.location',
                'warehouse',
                'branch',
                'stockMovement',
                'journalEntry.lines.account',
            ]);
        });
    }

    /**
     * إلغاء محضر جرد ورفع التجميد
     */
    public function cancelStocktake(PhysicalStocktake $stocktake): PhysicalStocktake
    {
        if ($stocktake->isPosted()) {
            throw ValidationException::withMessages([
                'status' => ['لا يمكن إلغاء محضر جرد مرحل ومعتمد نهائياً.'],
            ]);
        }

        $stocktake->status = StocktakeStatus::CANCELLED;
        $stocktake->save();

        return $stocktake->fresh();
    }
}
