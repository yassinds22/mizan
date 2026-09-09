<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Products;

use App\Domains\Products\Models\ItemCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ItemCategory
 */
class ItemCategoryTreeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'parent_id' => $this->parent_id,
            'is_active' => $this->is_active,
            'inventory_account' => $this->inventoryAccount ? [
                'id' => $this->inventoryAccount->id,
                'code' => $this->inventoryAccount->code,
                'name_ar' => $this->inventoryAccount->name_ar,
            ] : null,
            'children' => ItemCategoryTreeResource::collection($this->whenLoaded('children')),
        ];
    }
}
