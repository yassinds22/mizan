<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Models;

use App\Domains\Inventory\Enums\BatchStatus;
use App\Domains\Products\Models\Item;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ItemBatch extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'item_batches';

    protected $fillable = [
        'item_id',
        'batch_number',
        'production_date',
        'expiry_date',
        'unit_cost',
        'status',
        'notes',
    ];

    protected $casts = [
        'production_date' => 'date',
        'expiry_date' => 'date',
        'unit_cost' => 'decimal:4',
        'status' => BatchStatus::class,
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function isExpired(): bool
    {
        return $this->expiry_date->isPast();
    }

    public function daysUntilExpiry(): int
    {
        return (int) Carbon::now()->startOfDay()->diffInDays($this->expiry_date->startOfDay(), false);
    }

    public function isNearExpiry(int $thresholdDays = 7): bool
    {
        $days = $this->daysUntilExpiry();
        return $days >= 0 && $days <= $thresholdDays;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', BatchStatus::ACTIVE);
    }

    public function scopeFefo(Builder $query): Builder
    {
        return $query->where('status', BatchStatus::ACTIVE)
            ->where('expiry_date', '>=', Carbon::now()->toDateString())
            ->orderBy('expiry_date', 'asc');
    }

    public function scopeNearExpiry(Builder $query, int $days = 7): Builder
    {
        $today = Carbon::now()->toDateString();
        $targetDate = Carbon::now()->addDays($days)->toDateString();

        return $query->where('status', BatchStatus::ACTIVE)
            ->whereBetween('expiry_date', [$today, $targetDate])
            ->orderBy('expiry_date', 'asc');
    }

    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('expiry_date', '<', Carbon::now()->toDateString())
            ->orWhere('status', BatchStatus::EXPIRED);
    }
}
