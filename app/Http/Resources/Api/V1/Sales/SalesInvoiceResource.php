<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Sales;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domains\Sales\Models\SalesInvoice
 */
class SalesInvoiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'invoice_date' => $this->invoice_date->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'branch_id' => $this->branch_id,
            'branch_name' => $this->branch?->name_ar,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer_name,
            'customer_tax_number' => $this->customer_tax_number,
            'customer' => $this->whenLoaded('customer', fn () => new CustomerResource($this->customer)),
            'payment_method' => [
                'value' => $this->payment_method->value,
                'label' => $this->payment_method->label(),
            ],
            'status' => [
                'value' => $this->status->value,
                'label' => $this->status->label(),
            ],
            'subtotal' => (float) $this->subtotal,
            'discount_amount' => (float) $this->discount_amount,
            'tax_amount' => (float) $this->tax_amount,
            'total_amount' => (float) $this->total_amount,
            'paid_amount' => (float) $this->paid_amount,
            'remaining_amount' => (float) $this->remaining_amount,
            'notes' => $this->notes,
            'journal_entry_id' => $this->journal_entry_id,
            'journal_entry_number' => $this->journalEntry?->entry_number,
            'zatca_qr_payload' => $this->zatca_qr_payload,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'lines' => SalesInvoiceLineResource::collection($this->whenLoaded('lines')),
        ];
    }
}
