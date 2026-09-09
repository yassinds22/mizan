<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Core;

use App\Domains\Core\Models\Currency;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Currency
 */
class CurrencyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'symbol' => $this->symbol,
            'decimal_places' => (int) $this->decimal_places,
            'is_base_currency' => (bool) $this->is_base_currency,
            'is_active' => (bool) $this->is_active,
            'latest_exchange_rate' => $this->whenLoaded('latestExchangeRate', function () {
                return $this->latestExchangeRate ? new ExchangeRateResource($this->latestExchangeRate) : null;
            }),
            'exchange_rates' => ExchangeRateResource::collection($this->whenLoaded('exchangeRates')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
