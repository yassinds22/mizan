<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Models;

use App\Domains\Core\Models\Currency;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\ValidationException;

class JournalEntryLine extends Model
{
    use HasFactory;

    protected $table = 'journal_entry_lines';

    protected $fillable = [
        'journal_entry_id',
        'account_id',
        'cost_center_id',
        'debit',
        'credit',
        'currency_id',
        'exchange_rate',
        'foreign_debit',
        'foreign_credit',
        'description',
        'line_order',
    ];

    protected $casts = [
        'debit' => 'string',
        'credit' => 'string',
        'exchange_rate' => 'string',
        'foreign_debit' => 'string',
        'foreign_credit' => 'string',
        'line_order' => 'integer',
    ];

    protected static function booted(): void
    {
        // صمام أمان معمارية المحاسبة: منع تعديل أو حذف أي سطر يتبع لقيد مرحّل أو معكوس
        static::updating(function (JournalEntryLine $line) {
            if ($line->journalEntry && !$line->journalEntry->isDraft()) {
                throw ValidationException::withMessages([
                    'journal_entry' => ['غير مسموح بتعديل أسطر قيد يومية مرحّل أو معكوس نهائياً.'],
                ]);
            }
        });

        static::deleting(function (JournalEntryLine $line) {
            if ($line->journalEntry && !$line->journalEntry->isDraft()) {
                throw ValidationException::withMessages([
                    'journal_entry' => ['غير مسموح بحذف أسطر قيد يومية مرحّل أو معكوس نهائياً.'],
                ]);
            }
        });
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function costCenter(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }
}
