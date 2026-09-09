<?php

declare(strict_types=1);

namespace App\Domains\Core\Models;

use App\Domains\Core\Enums\FiscalPeriodStatus;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FiscalPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'fiscal_year_id',
        'period_number',
        'name',
        'start_date',
        'end_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'period_number' => 'integer',
            'start_date' => 'date',
            'end_date' => 'date',
            'status' => FiscalPeriodStatus::class,
        ];
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function isOpen(): bool
    {
        return $this->status === FiscalPeriodStatus::Open;
    }

    public function isClosed(): bool
    {
        return $this->status === FiscalPeriodStatus::Closed;
    }

    public function isLocked(): bool
    {
        return $this->status === FiscalPeriodStatus::Locked;
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('status', FiscalPeriodStatus::Open);
    }

    public function scopeForDate(Builder $query, string|DateTimeInterface $date): Builder
    {
        $formattedDate = $date instanceof DateTimeInterface ? $date->format('Y-m-d') : $date;

        return $query->where('start_date', '<=', $formattedDate)
            ->where('end_date', '>=', $formattedDate);
    }
}
