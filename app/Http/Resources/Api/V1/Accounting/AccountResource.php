<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Accounting;

use App\Domains\Accounting\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Account
 */
class AccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'parent_id' => $this->parent_id,
            'parent_code' => $this->parent?->code,
            'parent_name' => $this->parent?->name_ar,
            'type' => [
                'value' => $this->type->value,
                'label' => $this->type->label(),
                'is_balance_sheet' => $this->type->isBalanceSheet(),
                'is_income_statement' => $this->type->isIncomeStatement(),
            ],
            'nature' => [
                'value' => $this->nature->value,
                'label' => $this->nature->label(),
            ],
            'level' => $this->level,
            'is_leaf' => $this->is_leaf,
            'is_active' => $this->is_active,
            'can_post' => $this->canPost(),
            'description' => $this->description,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
