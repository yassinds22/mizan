<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Accounting;

use App\Domains\Accounting\Models\JournalEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin JournalEntry
 */
class JournalEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entry_number' => $this->entry_number,
            'date' => $this->date?->format('Y-m-d'),
            'branch_id' => $this->branch_id,
            'branch_name' => $this->branch?->name,
            'fiscal_period_id' => $this->fiscal_period_id,
            'fiscal_period_name' => $this->fiscalPeriod?->name,
            'status' => [
                'value' => $this->status->value,
                'label' => $this->status->label(),
                'is_draft' => $this->isDraft(),
                'is_posted' => $this->isPosted(),
                'is_reversed' => $this->isReversed(),
            ],
            'source_type' => [
                'value' => $this->source_type->value,
                'label' => $this->source_type->label(),
            ],
            'source_id' => $this->source_id,
            'source_reference' => $this->source_reference,
            'reversal_of_id' => $this->reversal_of_id,
            'reversed_by_id' => $this->reversed_by_id,
            'total_debit' => (float) $this->total_debit,
            'total_credit' => (float) $this->total_credit,
            'is_balanced' => $this->isBalanced(),
            'description' => $this->description,
            'notes' => $this->notes,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'posted_by' => $this->posted_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'lines' => JournalEntryLineResource::collection($this->whenLoaded('lines')),
        ];
    }
}
