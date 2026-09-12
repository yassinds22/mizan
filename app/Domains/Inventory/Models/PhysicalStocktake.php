<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Models;

use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Core\Models\Branch;
use App\Domains\Inventory\Enums\StocktakeStatus;
use App\Domains\Products\Models\ItemCategory;
use App\Domains\Warehouses\Models\Warehouse;
use App\Domains\Warehouses\Models\WarehouseLocation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PhysicalStocktake extends Model
{
    protected $fillable = [
        'stocktake_number',
        'branch_id',
        'warehouse_id',
        'location_id',
        'category_id',
        'stocktake_date',
        'status',
        'scope',
        'is_blind',
        'freeze_movements',
        'total_items_count',
        'matched_items_count',
        'variance_items_count',
        'total_shortage_value',
        'total_surplus_value',
        'net_variance_value',
        'stock_movement_id',
        'journal_entry_id',
        'supervisor_name',
        'notes',
        'posted_at',
    ];

    protected $casts = [
        'stocktake_date' => 'date:Y-m-d',
        'status' => StocktakeStatus::class,
        'is_blind' => 'boolean',
        'freeze_movements' => 'boolean',
        'total_items_count' => 'integer',
        'matched_items_count' => 'integer',
        'variance_items_count' => 'integer',
        'total_shortage_value' => 'decimal:4',
        'total_surplus_value' => 'decimal:4',
        'net_variance_value' => 'decimal:4',
        'posted_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(WarehouseLocation::class, 'location_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ItemCategory::class, 'category_id');
    }

    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PhysicalStocktakeLine::class, 'physical_stocktake_id');
    }

    public function isDraft(): bool
    {
        return $this->status === StocktakeStatus::DRAFT;
    }

    public function isInProgress(): bool
    {
        return $this->status === StocktakeStatus::IN_PROGRESS;
    }

    public function isPosted(): bool
    {
        return $this->status === StocktakeStatus::POSTED;
    }

    public function isCancelled(): bool
    {
        return $this->status === StocktakeStatus::CANCELLED;
    }

    public function canBeEdited(): bool
    {
        return in_array($this->status, [StocktakeStatus::DRAFT, StocktakeStatus::IN_PROGRESS], true);
    }
}
