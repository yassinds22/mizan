<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Accounting;

use App\Domains\Accounting\Models\CostCenter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CostCenter
 */
class CostCenterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'branch_id' => $this->branch_id,
            'branch_name' => $this->branch?->name,
            'is_active' => $this->is_active,
            'description' => $this->description,
        ];
    }
}
