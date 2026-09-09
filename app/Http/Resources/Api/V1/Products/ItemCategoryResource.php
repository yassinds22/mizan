<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Products;

use App\Domains\Products\Models\ItemCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ItemCategory
 */
class ItemCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'parent_id' => $this->parent_id,
            'parent_name' => $this->parent?->name_ar,
            'inventory_account_id' => $this->inventory_account_id,
            'inventory_account' => $this->inventoryAccount ? [
                'id' => $this->inventoryAccount->id,
                'code' => $this->inventoryAccount->code,
                'name_ar' => $this->inventoryAccount->name_ar,
            ] : null,
            'cogs_account_id' => $this->cogs_account_id,
            'cogs_account' => $this->cogsAccount ? [
                'id' => $this->cogsAccount->id,
                'code' => $this->cogsAccount->code,
                'name_ar' => $this->cogsAccount->name_ar,
            ] : null,
            'revenue_account_id' => $this->revenue_account_id,
            'revenue_account' => $this->revenueAccount ? [
                'id' => $this->revenueAccount->id,
                'code' => $this->revenueAccount->code,
                'name_ar' => $this->revenueAccount->name_ar,
            ] : null,
            'is_active' => $this->is_active,
            'items_count' => $this->whenCounted('items'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
