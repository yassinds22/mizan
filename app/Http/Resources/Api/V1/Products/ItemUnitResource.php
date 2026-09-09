<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Products;

use App\Domains\Products\Models\ItemUnit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ItemUnit
 */
class ItemUnitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->item_id,
            'uom_id' => $this->uom_id,
            'uom' => $this->uom ? [
                'id' => $this->uom->id,
                'code' => $this->uom->code,
                'name_ar' => $this->uom->name_ar,
                'symbol' => $this->uom->symbol,
            ] : null,
            'conversion_factor' => (float) $this->conversion_factor,
            'barcode' => $this->barcode,
            'is_base_unit' => $this->is_base_unit,
            'is_sale_unit' => $this->is_sale_unit,
            'is_purchase_unit' => $this->is_purchase_unit,
            'prices' => ItemPriceResource::collection($this->whenLoaded('prices')),
        ];
    }
}
