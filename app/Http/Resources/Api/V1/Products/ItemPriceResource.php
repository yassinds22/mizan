<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Products;

use App\Domains\Products\Models\ItemPrice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ItemPrice
 */
class ItemPriceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_unit_id' => $this->item_unit_id,
            'price_tier' => [
                'value' => $this->price_tier->value,
                'label' => $this->price_tier->label(),
            ],
            'price' => (float) $this->price,
            'min_quantity' => (float) $this->min_quantity,
        ];
    }
}
