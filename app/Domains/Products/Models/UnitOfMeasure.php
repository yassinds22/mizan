<?php

declare(strict_types=1);

namespace App\Domains\Products\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnitOfMeasure extends Model
{
    use HasFactory;

    protected $table = 'units_of_measure';

    protected $fillable = [
        'code',
        'name_ar',
        'name_en',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'base_uom_id');
    }

    public function itemUnits(): HasMany
    {
        return $this->hasMany(ItemUnit::class, 'uom_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
