<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Services\Reports;

use App\Domains\Inventory\Models\StockLedgerEntry;
use App\Domains\Inventory\Models\StockMovement;
use App\Domains\Products\Models\Item;
use App\Domains\Purchases\Models\PurchaseInvoice;
use App\Domains\Purchases\Models\PurchaseReturn;
use App\Domains\Sales\Models\SalesInvoice;
use App\Domains\Sales\Models\SalesReturn;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class ItemLedgerReportService
{
    /**
     * استخراج كارت الصنف التاريخي التفصيلي مبنياً حصراً على دفتر أستاذ المخزون (stock_ledger_entries)
     *
     * @param Item|int $item
     * @param array $filters [date_from, date_to, warehouse_id, batch_id]
     * @return array
     */
    public function getItemCard(Item|int $item, array $filters = []): array
    {
        $itemModel = is_int($item) 
            ? Item::with(['category', 'baseUom'])->findOrFail($item) 
            : $item->loadMissing(['category', 'baseUom']);

        $dateFrom = !empty($filters['date_from']) 
            ? Carbon::parse($filters['date_from'])->toDateString() 
            : Carbon::now()->startOfYear()->toDateString();

        $dateTo = !empty($filters['date_to']) 
            ? Carbon::parse($filters['date_to'])->toDateString() 
            : Carbon::now()->toDateString();

        $warehouseId = !empty($filters['warehouse_id']) ? (int) $filters['warehouse_id'] : null;
        $batchId = !empty($filters['batch_id']) ? (int) $filters['batch_id'] : null;

        // 1. احتساب الرصيد الافتتاحي قبل date_from
        $openingQuery = StockLedgerEntry::where('item_id', $itemModel->id)
            ->where('entry_date', '<', $dateFrom);

        if ($warehouseId) {
            $openingQuery->where('warehouse_id', $warehouseId);
        }
        if ($batchId) {
            $openingQuery->where('batch_id', $batchId);
        }

        $openingQty = (float) $openingQuery->sum('quantity_delta');
        $openingValue = (float) $openingQuery->sum('total_value_delta');

        // 2. جلب الحركات داخل الفترة بترتيب قطعي: entry_date ASC, created_at ASC, id ASC
        $movementsQuery = StockLedgerEntry::query()
            ->with(['warehouse', 'location', 'batch'])
            ->where('item_id', $itemModel->id)
            ->where('entry_date', '>=', $dateFrom)
            ->where('entry_date', '<=', $dateTo);

        if ($warehouseId) {
            $movementsQuery->where('warehouse_id', $warehouseId);
        }
        if ($batchId) {
            $movementsQuery->where('batch_id', $batchId);
        }

        $entries = $movementsQuery
            ->orderBy('entry_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        // تجميع معلومات المستندات المرجعية بكفاءة (Batch Lookup)
        $voucherLookups = $this->resolveVoucherLookups($entries);

        // 3. بناء سطور الكشف مع الرصيد التراكمي
        $runningQty = $openingQty;
        $runningValue = $openingValue;

        $totalInQty = 0.0;
        $totalInValue = 0.0;
        $totalOutQty = 0.0;
        $totalOutValue = 0.0;

        $transactions = [];

        foreach ($entries as $entry) {
            $deltaQty = (float) $entry->quantity_delta;
            $deltaValue = (float) $entry->total_value_delta;
            $unitCost = (float) $entry->unit_cost;

            $runningQty += $deltaQty;
            $runningValue += $deltaValue;

            if ($deltaQty > 0) {
                $totalInQty += $deltaQty;
                $totalInValue += $deltaValue;
                $inQty = $deltaQty;
                $outQty = 0.0;
            } else {
                $outQuantityAbs = abs($deltaQty);
                $totalOutQty += $outQuantityAbs;
                $totalOutValue += abs($deltaValue);
                $inQty = 0.0;
                $outQty = $outQuantityAbs;
            }

            $voucherInfo = $voucherLookups[$entry->voucher_type][$entry->voucher_id] ?? [
                'number' => (string) $entry->voucher_id,
                'label' => $this->translateVoucherType($entry->voucher_type),
                'party' => null,
            ];

            $transactions[] = [
                'id' => $entry->id,
                'entry_number' => $entry->entry_number,
                'entry_date' => $entry->entry_date->toDateString(),
                'created_at' => $entry->created_at ? $entry->created_at->toIso8601String() : null,
                'voucher_type' => $entry->voucher_type,
                'voucher_type_label' => $voucherInfo['label'],
                'voucher_id' => $entry->voucher_id,
                'voucher_number' => $voucherInfo['number'],
                'party_name' => $voucherInfo['party'],
                'warehouse_id' => $entry->warehouse_id,
                'warehouse_name' => $entry->warehouse?->name ?? '—',
                'location_name' => $entry->location?->code ?? '—',
                'batch_id' => $entry->batch_id,
                'batch_number' => $entry->batch?->batch_number ?? '—',
                'expiry_date' => $entry->batch?->expiry_date?->toDateString() ?? '—',
                'quantity_in' => round($inQty, 4),
                'quantity_out' => round($outQty, 4),
                'quantity_delta' => round($deltaQty, 4),
                'unit_cost' => round($unitCost, 4),
                'total_value_delta' => round($deltaValue, 4),
                'running_balance' => round($runningQty, 4),
                'running_value' => round($runningValue, 4),
                'notes' => $entry->notes,
            ];
        }

        $closingQty = $runningQty;
        $closingValue = $runningValue;
        $weightedUnitCost = $closingQty > 0 ? round($closingValue / $closingQty, 4) : (float) $itemModel->cost_price;

        return [
            'item' => [
                'id' => $itemModel->id,
                'sku' => $itemModel->sku,
                'barcode' => $itemModel->barcode,
                'name_ar' => $itemModel->name_ar,
                'name_en' => $itemModel->name_en,
                'category_name' => $itemModel->category?->name_ar ?? '—',
                'base_uom' => $itemModel->baseUom?->name_ar ?? '—',
                'reorder_level' => (float) ($itemModel->reorder_level ?? 0),
                'standard_cost' => (float) ($itemModel->cost_price ?? 0),
                'current_stock_quantity' => (float) ($itemModel->stock_quantity ?? 0),
            ],
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'warehouse_id' => $warehouseId,
                'batch_id' => $batchId,
            ],
            'summary' => [
                'opening_quantity' => round($openingQty, 4),
                'opening_value' => round($openingValue, 4),
                'total_in_quantity' => round($totalInQty, 4),
                'total_in_value' => round($totalInValue, 4),
                'total_out_quantity' => round($totalOutQty, 4),
                'total_out_value' => round($totalOutValue, 4),
                'net_quantity_delta' => round($totalInQty - $totalOutQty, 4),
                'net_value_delta' => round($totalInValue - $totalOutValue, 4),
                'closing_quantity' => round($closingQty, 4),
                'closing_value' => round($closingValue, 4),
                'average_unit_cost' => $weightedUnitCost,
            ],
            'transactions' => $transactions,
        ];
    }

    /**
     * جلب أرقام وبيانات المستندات دفعة واحدة لتفادي استعلامات N+1
     */
    private function resolveVoucherLookups(Collection $entries): array
    {
        $lookups = [
            'stock_movement' => [],
            'sales_invoice' => [],
            'sales_return' => [],
            'purchase_invoice' => [],
            'purchase_return' => [],
        ];

        $movementIds = $entries->where('voucher_type', 'stock_movement')->pluck('voucher_id')->unique()->filter()->values();
        $salesInvoiceIds = $entries->where('voucher_type', 'sales_invoice')->pluck('voucher_id')->unique()->filter()->values();
        $salesReturnIds = $entries->where('voucher_type', 'sales_return')->pluck('voucher_id')->unique()->filter()->values();
        $purchaseInvoiceIds = $entries->where('voucher_type', 'purchase_invoice')->pluck('voucher_id')->unique()->filter()->values();
        $purchaseReturnIds = $entries->where('voucher_type', 'purchase_return')->pluck('voucher_id')->unique()->filter()->values();

        if ($movementIds->isNotEmpty()) {
            $movements = StockMovement::whereIn('id', $movementIds)->get(['id', 'movement_number', 'movement_type']);
            foreach ($movements as $m) {
                $lookups['stock_movement'][$m->id] = [
                    'number' => $m->movement_number,
                    'label' => $this->translateMovementType($m->movement_type->value ?? (string) $m->movement_type),
                    'party' => null,
                ];
            }
        }

        if ($salesInvoiceIds->isNotEmpty()) {
            $invoices = SalesInvoice::with('customer')->whereIn('id', $salesInvoiceIds)->get(['id', 'invoice_number', 'customer_id']);
            foreach ($invoices as $inv) {
                $lookups['sales_invoice'][$inv->id] = [
                    'number' => $inv->invoice_number,
                    'label' => 'فاتورة مبيعات',
                    'party' => $inv->customer?->name_ar ?? $inv->customer?->name ?? null,
                ];
            }
        }

        if ($salesReturnIds->isNotEmpty()) {
            $returns = SalesReturn::with('customer')->whereIn('id', $salesReturnIds)->get(['id', 'return_number', 'customer_id']);
            foreach ($returns as $ret) {
                $lookups['sales_return'][$ret->id] = [
                    'number' => $ret->return_number,
                    'label' => 'مردودات مبيعات',
                    'party' => $ret->customer?->name_ar ?? $ret->customer?->name ?? null,
                ];
            }
        }

        if ($purchaseInvoiceIds->isNotEmpty()) {
            $purchases = PurchaseInvoice::with('supplier')->whereIn('id', $purchaseInvoiceIds)->get(['id', 'invoice_number', 'supplier_id']);
            foreach ($purchases as $pi) {
                $lookups['purchase_invoice'][$pi->id] = [
                    'number' => $pi->invoice_number,
                    'label' => 'فاتورة مشتريات',
                    'party' => $pi->supplier?->name_ar ?? $pi->supplier?->name ?? null,
                ];
            }
        }

        if ($purchaseReturnIds->isNotEmpty()) {
            $pReturns = PurchaseReturn::with('supplier')->whereIn('id', $purchaseReturnIds)->get(['id', 'return_number', 'supplier_id']);
            foreach ($pReturns as $pr) {
                $lookups['purchase_return'][$pr->id] = [
                    'number' => $pr->return_number,
                    'label' => 'مردودات مشتريات',
                    'party' => $pr->supplier?->name_ar ?? $pr->supplier?->name ?? null,
                ];
            }
        }

        return $lookups;
    }

    private function translateVoucherType(string $type): string
    {
        return match ($type) {
            'stock_movement' => 'حركة مخزنية',
            'sales_invoice' => 'فاتورة مبيعات',
            'sales_return' => 'مردودات مبيعات',
            'purchase_invoice' => 'فاتورة مشتريات',
            'purchase_return' => 'مردودات مشتريات',
            default => $type,
        };
    }

    private function translateMovementType(string $type): string
    {
        return match ($type) {
            'transfer' => 'تحويل بين مستودعات',
            'issue' => 'صرف مخزني تشغيلي',
            'adjustment' => 'تسوية جرد مخزني',
            'waste' => 'إهلاك تالف وهدر غذائي',
            default => 'حركة مخزون',
        };
    }
}
