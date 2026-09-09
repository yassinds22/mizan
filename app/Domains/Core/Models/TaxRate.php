<?php

declare(strict_types=1);

namespace App\Domains\Core\Models;

use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'tax_category_id',
        'rate',
        'valid_from',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:2',
            'valid_from' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(TaxCategory::class, 'tax_category_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeValidForDate(Builder $query, string|DateTimeInterface $date): Builder
    {
        $formattedDate = $date instanceof DateTimeInterface ? $date->format('Y-m-d') : $date;

        return $query->where('valid_from', '<=', $formattedDate);
    }
}
