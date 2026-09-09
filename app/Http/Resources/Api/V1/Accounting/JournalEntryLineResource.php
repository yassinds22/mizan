<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Accounting;

use App\Domains\Accounting\Models\JournalEntryLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin JournalEntryLine
 */
class JournalEntryLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'journal_entry_id' => $this->journal_entry_id,
            'account_id' => $this->account_id,
            'account_code' => $this->account?->code,
            'account_name' => $this->account?->name_ar,
            'cost_center_id' => $this->cost_center_id,
            'cost_center_name' => $this->costCenter?->name_ar,
            'debit' => (float) $this->debit,
            'credit' => (float) $this->credit,
            'currency_id' => $this->currency_id,
            'exchange_rate' => (float) $this->exchange_rate,
            'foreign_debit' => $this->foreign_debit !== null ? (float) $this->foreign_debit : null,
            'foreign_credit' => $this->foreign_credit !== null ? (float) $this->foreign_credit : null,
            'description' => $this->description,
            'line_order' => $this->line_order,
        ];
    }
}
