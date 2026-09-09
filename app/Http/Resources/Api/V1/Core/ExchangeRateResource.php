<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Core;

use App\Domains\Core\Models\ExchangeRate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ExchangeRate
 */
class ExchangeRateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'currency_id' => $this->currency_id,
            'rate' => (string) $this->rate,
            'valid_from' => $this->valid_from?->toDateString(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
