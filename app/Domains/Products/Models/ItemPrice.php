<?php

declare(strict_types=1);

namespace App\Domains\Products\Models;

use App\Domains\Products\Enums\PriceTier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class ItemPrice extends Model
{
    use HasFactory;

    protected $table = 'item_prices';

    protected $fillable = [
        'item_unit_id',
        'price_tier',
        'price',
        'min_quantity',
        'is_active',
    ];

    protected $casts = [
        'price_tier' => PriceTier::class,
        'price' => 'string',
        'min_quantity' => 'string',
        'is_active' => 'boolean',
    ];

    public function itemUnit(): BelongsTo
    {
        return $this->belongsTo(ItemUnit::class, 'item_unit_id');
    }

    public function item(): HasOneThrough
    {
        return $this->hasOneThrough(
            Item::class,
            ItemUnit::class,
            'id',
            'id',
            'item_unit_id',
            'item_id'
        );
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
