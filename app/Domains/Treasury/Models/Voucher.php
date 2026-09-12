<?php

declare(strict_types=1);

namespace App\Domains\Treasury\Models;

use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Models\CostCenter;
use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Core\Models\Branch;
use App\Domains\Core\Models\FiscalPeriod;
use App\Domains\Purchases\Models\Supplier;
use App\Domains\Sales\Models\Customer;
use App\Domains\Treasury\Enums\VoucherPartyType;
use App\Domains\Treasury\Enums\VoucherPaymentMethod;
use App\Domains\Treasury\Enums\VoucherStatus;
use App\Domains\Treasury\Enums\VoucherType;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Voucher extends Model
{
    protected $fillable = [
        'voucher_number',
        'voucher_type',
        'date',
        'branch_id',
        'fiscal_period_id',
        'party_type',
        'party_id',
        'party_name',
        'treasury_account_id',
        'counter_account_id',
        'payment_method',
        'reference_number',
        'amount',
        'cost_center_id',
        'notes',
        'received_from',
        'paid_to',
        'status',
        'journal_entry_id',
        'created_by',
        'posted_at',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected $casts = [
        'voucher_type' => VoucherType::class,
        'party_type' => VoucherPartyType::class,
        'status' => VoucherStatus::class,
        'payment_method' => VoucherPaymentMethod::class,
        'date' => 'date',
        'amount' => 'decimal:4',
        'posted_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function isDraft(): bool
    {
        return $this->status === VoucherStatus::DRAFT;
    }

    public function isPosted(): bool
    {
        return $this->status === VoucherStatus::POSTED;
    }

    public function isCancelled(): bool
    {
        return $this->status === VoucherStatus::CANCELLED;
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function fiscalPeriod(): BelongsTo
    {
        return $this->belongsTo(FiscalPeriod::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'party_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'party_id');
    }

    public function treasuryAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'treasury_account_id');
    }

    public function counterAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'counter_account_id');
    }

    public function costCenter(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(VoucherAllocation::class);
    }
}
