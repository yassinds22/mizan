<?php

declare(strict_types=1);

namespace App\Domains\Purchases\Models;

use App\Domains\Products\Models\Item;
use App\Domains\Products\Models\ItemUnit;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseReturnLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_return_id',
        'purchase_invoice_line_id',
        'item_id',
        'item_unit_id',
        'unit_name',
        'conversion_factor',
        'quantity',
        'base_quantity',
        'unit_price',
        'tax_rate',
        'tax_amount',
        'subtotal',
        'total',
    ];

    protected $casts = [
        'conversion_factor' => 'decimal:4',
        'quantity' => 'decimal:4',
        'base_quantity' => 'decimal:4',
        'unit_price' => 'decimal:4',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:4',
        'subtotal' => 'decimal:4',
        'total' => 'decimal:4',
    ];

    public function purchaseReturn(): BelongsTo
    {
        return $this->belongsTo(PurchaseReturn::class);
    }

    public function purchaseInvoiceLine(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoiceLine::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function itemUnit(): BelongsTo
    {
        return $this->belongsTo(ItemUnit::class);
    }
}
