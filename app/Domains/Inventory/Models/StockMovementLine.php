<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Models;

use App\Domains\Products\Models\Item;
use App\Domains\Warehouses\Models\WarehouseLocation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovementLine extends Model
{
    use HasFactory;

    protected $table = 'stock_movement_lines';

    protected $fillable = [
        'stock_movement_id',
        'item_id',
        'from_location_id',
        'to_location_id',
        'batch_id',
        'quantity',
        'unit_cost',
        'total_cost',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'unit_cost' => 'decimal:4',
        'total_cost' => 'decimal:4',
    ];

    public function movement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function fromLocation(): BelongsTo
    {
        return $this->belongsTo(WarehouseLocation::class, 'from_location_id');
    }

    public function toLocation(): BelongsTo
    {
        return $this->belongsTo(WarehouseLocation::class, 'to_location_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ItemBatch::class, 'batch_id');
    }
}
