<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Models;

use App\Domains\Products\Models\Item;
use App\Domains\Warehouses\Models\WarehouseLocation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhysicalStocktakeLine extends Model
{
    protected $fillable = [
        'physical_stocktake_id',
        'item_id',
        'location_id',
        'batch_id',
        'book_quantity',
        'counted_quantity',
        'difference_quantity',
        'unit_cost',
        'difference_value',
        'variance_reason',
        'notes',
    ];

    protected $casts = [
        'book_quantity' => 'decimal:4',
        'counted_quantity' => 'decimal:4',
        'difference_quantity' => 'decimal:4',
        'unit_cost' => 'decimal:4',
        'difference_value' => 'decimal:4',
    ];

    public function stocktake(): BelongsTo
    {
        return $this->belongsTo(PhysicalStocktake::class, 'physical_stocktake_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(WarehouseLocation::class, 'location_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ItemBatch::class, 'batch_id');
    }

    public function isMatched(): bool
    {
        return abs((float) $this->difference_quantity) < 0.0001;
    }

    public function isShortage(): bool
    {
        return (float) $this->difference_quantity < -0.0001;
    }

    public function isSurplus(): bool
    {
        return (float) $this->difference_quantity > 0.0001;
    }
}
