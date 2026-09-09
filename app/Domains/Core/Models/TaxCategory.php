<?php

declare(strict_types=1);

namespace App\Domains\Core\Models;

use App\Domains\Core\Enums\TaxCategoryCode;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TaxCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
    ];

    public function rates(): HasMany
    {
        return $this->hasMany(TaxRate::class);
    }

    public function currentRate(): HasOne
    {
        return $this->hasOne(TaxRate::class)
            ->where('is_active', true)
            ->latestOfMany('valid_from');
    }

    public function scopeCode(Builder $query, TaxCategoryCode|string $code): Builder
    {
        $value = $code instanceof TaxCategoryCode ? $code->value : $code;

        return $query->where('code', $value);
    }
}
