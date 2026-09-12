<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Models;

use App\Domains\Products\Models\Item;
use App\Domains\Warehouses\Models\Warehouse;
use App\Domains\Warehouses\Models\WarehouseLocation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockLedgerEntry extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'stock_ledger_entries';

    protected $fillable = [
        'entry_number',
        'entry_date',
        'item_id',
        'warehouse_id',
        'location_id',
        'batch_id',
        'voucher_type',
        'voucher_id',
        'voucher_line_id',
        'quantity_delta',
        'balance_after',
        'unit_cost',
        'total_value_delta',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'quantity_delta' => 'decimal:4',
        'balance_after' => 'decimal:4',
        'unit_cost' => 'decimal:4',
        'total_value_delta' => 'decimal:4',
        'created_at' => 'datetime',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(WarehouseLocation::class, 'location_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ItemBatch::class, 'batch_id');
    }
}
