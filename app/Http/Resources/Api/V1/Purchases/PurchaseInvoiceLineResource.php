<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1\Purchases;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domains\Purchases\Models\PurchaseInvoiceLine
 */
class PurchaseInvoiceLineResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'purchase_invoice_id' => $this->purchase_invoice_id,
            'item_id' => $this->item_id,
            'item_name_ar' => $this->item?->name_ar,
            'item_sku' => $this->item?->sku,
            'item_unit_id' => $this->item_unit_id,
            'unit_name' => $this->unit_name,
            'conversion_factor' => (float) $this->conversion_factor,
            'quantity' => (float) $this->quantity,
            'base_quantity' => (float) $this->base_quantity,
            'unit_price' => (float) $this->unit_price,
            'discount_amount' => (float) $this->discount_amount,
            'tax_rate' => (float) $this->tax_rate,
            'tax_amount' => (float) $this->tax_amount,
            'subtotal' => (float) $this->subtotal,
            'total' => (float) $this->total,
        ];
    }
}
