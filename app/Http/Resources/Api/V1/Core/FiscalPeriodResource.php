<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Core;

use App\Domains\Core\Models\FiscalPeriod;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin FiscalPeriod
 */
class FiscalPeriodResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'period_number' => (int) $this->period_number,
            'name' => $this->name,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'is_open' => $this->isOpen(),
            'is_closed' => $this->isClosed(),
            'is_locked' => $this->isLocked(),
            'fiscal_year' => $this->whenLoaded('fiscalYear', function () {
                return [
                    'id' => $this->fiscalYear->id,
                    'name' => $this->fiscalYear->name,
                    'is_closed' => (bool) $this->fiscalYear->is_closed,
                ];
            }),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
