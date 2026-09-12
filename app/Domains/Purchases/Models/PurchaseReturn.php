<?php

declare(strict_types=1);

namespace App\Domains\Purchases\Models;

use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Core\Models\Branch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'return_number',
        'debit_note_number',
        'purchase_invoice_id',
        'return_date',
        'branch_id',
        'supplier_id',
        'supplier_name',
        'refund_method',
        'status',
        'subtotal',
        'tax_amount',
        'total_amount',
        'reason',
        'notes',
        'journal_entry_id',
        'posted_at',
        'cancelled_at',
    ];

    protected $casts = [
        'return_date' => 'date',
        'subtotal' => 'decimal:4',
        'tax_amount' => 'decimal:4',
        'total_amount' => 'decimal:4',
        'posted_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function isPosted(): bool
    {
        return $this->status === 'posted';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoice::class, 'purchase_invoice_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PurchaseReturnLine::class, 'purchase_return_id');
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
