<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Products;

use App\Domains\Products\Models\UnitOfMeasure;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin UnitOfMeasure
 */
class UnitOfMeasureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'symbol' => $this->symbol,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
