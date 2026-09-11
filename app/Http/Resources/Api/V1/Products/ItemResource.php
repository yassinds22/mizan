<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Products;

use App\Domains\Products\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Item
 */
class ItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'category_id' => $this->category_id,
            'category' => $this->category ? [
                'id' => $this->category->id,
                'code' => $this->category->code,
                'name_ar' => $this->category->name_ar,
            ] : null,
            'tax_category_id' => $this->tax_category_id,
            'tax_category' => $this->taxCategory ? [
                'id' => $this->taxCategory->id,
                'name' => $this->taxCategory->name,
                'rates' => $this->taxCategory->rates->map(fn ($r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'rate_percent' => (float) $r->rate_percent,
                ]),
            ] : null,
            'base_uom_id' => $this->base_uom_id,
            'base_uom' => $this->baseUom ? [
                'id' => $this->baseUom->id,
                'code' => $this->baseUom->code,
                'name_ar' => $this->baseUom->name_ar,
                'symbol' => $this->baseUom->symbol,
            ] : null,
            'storage_condition' => [
                'value' => $this->storage_condition->value,
                'label' => $this->storage_condition->label(),
                'requires_cooling' => $this->storage_condition->requiresCooling(),
            ],
            'is_perishable' => $this->is_perishable,
            'shelf_life_days' => $this->shelf_life_days,
            'reorder_level' => (float) $this->reorder_level,
            'cost_price' => (float) $this->cost_price,
            'stock_quantity' => (float) ($this->stock_quantity ?? 0.0),
            'is_active' => $this->is_active,
            'units' => ItemUnitResource::collection($this->whenLoaded('itemUnits')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
