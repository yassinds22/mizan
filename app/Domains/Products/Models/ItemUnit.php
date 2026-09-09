<?php

declare(strict_types=1);

namespace App\Domains\Products\Models;

use App\Domains\Products\Enums\PriceTier;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ItemUnit extends Model
{
    use HasFactory;

    protected $table = 'item_units';

    protected $fillable = [
        'item_id',
        'uom_id',
        'conversion_factor',
        'barcode',
        'is_base_unit',
    ];

    protected $casts = [
        'conversion_factor' => 'string',
        'is_base_unit' => 'boolean',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function uom(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'uom_id');
    }

    public function prices(): HasMany
    {
        return $this->hasMany(ItemPrice::class, 'item_unit_id');
    }

    public function priceForTier(PriceTier|string $tier): ?ItemPrice
    {
        $tierValue = $tier instanceof PriceTier ? $tier->value : $tier;

        return $this->prices->firstWhere('price_tier', $tierValue);
    }
}
