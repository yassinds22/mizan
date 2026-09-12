<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Services;

use App\Domains\Inventory\Models\StockLedgerEntry;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class StockLedgerService
{
    /**
     * تسجيل حركة في دفتر أستاذ المخزون التراكمي (غير قابل للتعديل)
     */
    public function recordEntry(
        string $entryDate,
        int $itemId,
        int $warehouseId,
        ?int $locationId,
        ?int $batchId,
        string $voucherType,
        int $voucherId,
        ?int $voucherLineId,
        float $quantityDelta,
        float $balanceAfter,
        float $unitCost,
        ?string $notes = null
    ): StockLedgerEntry {
        $year = Carbon::parse($entryDate)->format('Y');
        $count = StockLedgerEntry::count() + 1;
        $entryNumber = sprintf('SLE-%s-%05d', $year, $count);

        return StockLedgerEntry::create([
            'entry_number' => $entryNumber,
            'entry_date' => $entryDate,
            'item_id' => $itemId,
            'warehouse_id' => $warehouseId,
            'location_id' => $locationId,
            'batch_id' => $batchId,
            'voucher_type' => $voucherType,
            'voucher_id' => $voucherId,
            'voucher_line_id' => $voucherLineId,
            'quantity_delta' => $quantityDelta,
            'balance_after' => $balanceAfter,
            'unit_cost' => $unitCost,
            'total_value_delta' => round($quantityDelta * $unitCost, 4),
            'notes' => $notes,
            'created_at' => Carbon::now(),
        ]);
    }

    /**
     * استعراض سجلات أستاذ المخزون مع التصفية
     */
    public function listLedger(array $filters = [], int $perPage = 50): LengthAwarePaginator
    {
        $query = StockLedgerEntry::query()->with([
            'item.category',
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

        if (!empty($filters['batch_id'])) {
            $query->where('batch_id', (int) $filters['batch_id']);
        }

        if (!empty($filters['voucher_type'])) {
            $query->where('voucher_type', $filters['voucher_type']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('entry_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->where('entry_date', '<=', $filters['date_to']);
        }

        return $query->orderBy('id', 'desc')->paginate($perPage);
    }
}
