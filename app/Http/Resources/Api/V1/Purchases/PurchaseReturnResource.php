<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Purchases;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domains\Purchases\Models\PurchaseReturn
 */
class PurchaseReturnResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'return_number' => $this->return_number,
            'debit_note_number' => $this->debit_note_number,
            'purchase_invoice_id' => $this->purchase_invoice_id,
            'original_invoice_number' => $this->invoice?->invoice_number,
            'supplier_invoice_number' => $this->invoice?->supplier_invoice_number,
            'return_date' => $this->return_date?->toDateString(),
            'branch_id' => $this->branch_id,
            'branch_name' => $this->branch?->name_ar,
            'supplier_id' => $this->supplier_id,
            'supplier_name' => $this->supplier_name,
            'refund_method' => $this->refund_method,
            'status' => $this->status,
            'subtotal' => (float) $this->subtotal,
            'tax_amount' => (float) $this->tax_amount,
            'total_amount' => (float) $this->total_amount,
            'reason' => $this->reason,
            'notes' => $this->notes,
            'journal_entry_id' => $this->journal_entry_id,
            'journal_entry_number' => $this->journalEntry?->entry_number,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'lines' => $this->lines->map(fn ($l) => [
                'id' => $l->id,
                'purchase_invoice_line_id' => $l->purchase_invoice_line_id,
                'item_id' => $l->item_id,
                'item_name_ar' => $l->item?->name_ar,
                'item_sku' => $l->item?->sku,
                'unit_name' => $l->unit_name,
                'conversion_factor' => (float) $l->conversion_factor,
                'quantity' => (float) $l->quantity,
                'base_quantity' => (float) $l->base_quantity,
                'unit_price' => (float) $l->unit_price,
                'tax_rate' => (float) $l->tax_rate,
                'tax_amount' => (float) $l->tax_amount,
                'subtotal' => (float) $l->subtotal,
                'total' => (float) $l->total,
            ]),
        ];
    }
}
