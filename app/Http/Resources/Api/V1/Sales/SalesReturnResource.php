<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Sales;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domains\Sales\Models\SalesReturn
 */
class SalesReturnResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'return_number' => $this->return_number,
            'sales_invoice_id' => $this->sales_invoice_id,
            'original_invoice_number' => $this->invoice?->invoice_number,
            'return_date' => $this->return_date->toDateString(),
            'branch_id' => $this->branch_id,
            'branch_name' => $this->branch?->name_ar,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer_name,
            'refund_method' => [
                'value' => $this->refund_method->value,
                'label' => $this->refund_method->label(),
            ],
            'status' => $this->status,
            'subtotal' => (float) $this->subtotal,
            'tax_amount' => (float) $this->tax_amount,
            'total_amount' => (float) $this->total_amount,
            'reason' => $this->reason,
            'journal_entry_id' => $this->journal_entry_id,
            'journal_entry_number' => $this->journalEntry?->entry_number,
            'zatca_qr_payload' => $this->zatca_qr_payload,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'lines' => $this->lines->map(fn ($l) => [
                'id' => $l->id,
                'sales_invoice_line_id' => $l->sales_invoice_line_id,
                'item_id' => $l->item_id,
                'item_name_ar' => $l->item?->name_ar,
                'item_sku' => $l->item?->sku,
                'unit_name' => $l->unit_name,
                'conversion_factor' => (float) $l->conversion_factor,
                'quantity' => (float) $l->quantity,
                'base_quantity' => (float) $l->base_quantity,
                'unit_price' => (float) $l->unit_price,
                'cost_price' => (float) $l->cost_price,
                'tax_rate' => (float) $l->tax_rate,
                'tax_amount' => (float) $l->tax_amount,
                'subtotal' => (float) $l->subtotal,
                'total' => (float) $l->total,
            ]),
        ];
    }
}
