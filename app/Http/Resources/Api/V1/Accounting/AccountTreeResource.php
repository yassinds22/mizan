<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Accounting;

use App\Domains\Accounting\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Account
 */
class AccountTreeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'parent_id' => $this->parent_id,
            'type' => [
                'value' => $this->type->value,
                'label' => $this->type->label(),
            ],
            'nature' => [
                'value' => $this->nature->value,
                'label' => $this->nature->label(),
            ],
            'level' => $this->level,
            'is_leaf' => $this->is_leaf,
            'is_active' => $this->is_active,
            'can_post' => $this->canPost(),
            'children' => self::collection($this->whenLoaded('children')),
        ];
    }
}
