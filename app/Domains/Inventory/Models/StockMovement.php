<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Models;

use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Core\Models\Branch;
use App\Domains\Inventory\Enums\MovementStatus;
use App\Domains\Inventory\Enums\MovementType;
use App\Domains\Warehouses\Models\Warehouse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockMovement extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'stock_movements';

    protected $fillable = [
        'movement_number',
        'movement_type',
        'movement_date',
        'branch_id',
        'from_warehouse_id',
        'to_warehouse_id',
        'reason',
        'notes',
        'status',
        'journal_entry_id',
        'posted_at',
    ];

    protected $casts = [
        'movement_type' => MovementType::class,
        'status' => MovementStatus::class,
        'movement_date' => 'date',
        'posted_at' => 'datetime',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(StockMovementLine::class, 'stock_movement_id');
    }

    public function fromWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'from_warehouse_id');
    }

    public function toWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'to_warehouse_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function getTotalCostAttribute(): float
    {
        return (float) $this->lines->sum('total_cost');
    }

    public function getTotalQuantityAttribute(): float
    {
        return (float) $this->lines->sum('quantity');
    }

    public function scopePosted(Builder $query): Builder
    {
        return $query->where('status', MovementStatus::POSTED);
    }

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', MovementStatus::DRAFT);
    }
}
