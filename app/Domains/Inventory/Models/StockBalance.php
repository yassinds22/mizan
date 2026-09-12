<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Models;

use App\Domains\Products\Models\Item;
use App\Domains\Warehouses\Models\Warehouse;
use App\Domains\Warehouses\Models\WarehouseLocation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockBalance extends Model
{
    use HasFactory;

    protected $table = 'stock_balances';

    protected $fillable = [
        'item_id',
        'warehouse_id',
        'location_id',
        'batch_id',
        'quantity',
        'reserved_quantity',
        'unit_cost',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'reserved_quantity' => 'decimal:4',
        'unit_cost' => 'decimal:4',
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

    public function getAvailableQuantityAttribute(): float
    {
        return max(0.0, (float) $this->quantity - (float) $this->reserved_quantity);
    }

    public function getTotalValueAttribute(): float
    {
        return (float) $this->quantity * (float) $this->unit_cost;
    }

    public function scopeInStock(Builder $query): Builder
    {
        return $query->where('quantity', '>', 0);
    }

    public function scopeForWarehouse(Builder $query, int $warehouseId): Builder
    {
        return $query->where('warehouse_id', $warehouseId);
    }

    public function scopeForItem(Builder $query, int $itemId): Builder
    {
        return $query->where('item_id', $itemId);
    }
}
