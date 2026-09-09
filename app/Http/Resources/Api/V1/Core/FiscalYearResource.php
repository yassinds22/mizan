<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Core;

use App\Domains\Core\Models\FiscalYear;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin FiscalYear
 */
class FiscalYearResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'is_closed' => (bool) $this->is_closed,
            'periods' => FiscalPeriodResource::collection($this->whenLoaded('periods')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
