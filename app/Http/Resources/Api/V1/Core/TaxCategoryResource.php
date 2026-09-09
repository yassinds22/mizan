<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Core;

use App\Domains\Core\Enums\TaxCategoryCode;
use App\Domains\Core\Models\TaxCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TaxCategory
 */
class TaxCategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $enumCase = TaxCategoryCode::tryFrom($this->code);

        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'label' => $enumCase?->label() ?? $this->name,
            'current_rate' => $this->whenLoaded('currentRate', function () {
                return $this->currentRate ? new TaxRateResource($this->currentRate) : null;
            }),
            'rates' => TaxRateResource::collection($this->whenLoaded('rates')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
