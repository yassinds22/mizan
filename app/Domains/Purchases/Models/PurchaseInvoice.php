<?php

declare(strict_types=1);

namespace App\Domains\Purchases\Models;

use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Core\Models\Branch;
use App\Domains\Purchases\Enums\PurchaseInvoiceStatus;
use App\Domains\Sales\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'supplier_invoice_number',
        'invoice_date',
        'due_date',
        'branch_id',
        'supplier_id',
        'supplier_name',
        'supplier_tax_number',
        'payment_method',
        'status',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'notes',
        'journal_entry_id',
        'posted_at',
        'cancelled_at',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'status' => PurchaseInvoiceStatus::class,
        'payment_method' => PaymentMethod::class,
        'subtotal' => 'decimal:4',
        'discount_amount' => 'decimal:4',
        'tax_amount' => 'decimal:4',
        'total_amount' => 'decimal:4',
        'posted_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function isPosted(): bool
    {
        return $this->status === PurchaseInvoiceStatus::POSTED;
    }

    public function isDraft(): bool
    {
        return $this->status === PurchaseInvoiceStatus::DRAFT;
    }

    public function isCancelled(): bool
    {
        return $this->status === PurchaseInvoiceStatus::CANCELLED;
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PurchaseInvoiceLine::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
