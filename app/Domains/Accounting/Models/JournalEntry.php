<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Models;

use App\Domains\Accounting\Enums\JournalEntrySourceType;
use App\Domains\Accounting\Enums\JournalEntryStatus;
use App\Domains\Core\Models\Branch;
use App\Domains\Core\Models\FiscalPeriod;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Validation\ValidationException;

class JournalEntry extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'journal_entries';

    protected $fillable = [
        'entry_number',
        'date',
        'branch_id',
        'fiscal_period_id',
        'status',
        'source_type',
        'source_id',
        'source_reference',
        'reversal_of_id',
        'reversed_by_id',
        'total_debit',
        'total_credit',
        'description',
        'notes',
        'posted_at',
        'posted_by',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
        'status' => JournalEntryStatus::class,
        'source_type' => JournalEntrySourceType::class,
        'total_debit' => 'string',
        'total_credit' => 'string',
        'posted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        // صمام أمان معمارية المحاسبة: القيود المرحّلة والمعكوسة غير قابلة للتعديل
        static::updating(function (JournalEntry $entry) {
            $originalStatus = $entry->getOriginal('status');
            $originalStatusEnum = is_string($originalStatus) ? JournalEntryStatus::from($originalStatus) : $originalStatus;

            // إذا كان القيد مرحلاً مسبقاً، لا يجوز تعديل بياناته أبداً، الاستثناء الوحيد هو ربطه بالقيد العاكس عند العكس
            if ($originalStatusEnum === JournalEntryStatus::Posted) {
                $dirtyKeys = array_keys($entry->getDirty());
                $allowedDirty = ['status', 'reversed_by_id', 'updated_at'];
                $disallowed = array_diff($dirtyKeys, $allowedDirty);

                if (!empty($disallowed)) {
                    throw ValidationException::withMessages([
                        'journal_entry' => ['القيد المالي مرحّل مسبقاً وغير قابل للتعديل طبقاً لقواعد النزاهة المحاسبية (Immutable).'],
                    ]);
                }
            }

            // القيود المعكوسة نهائية ومغلقة تماماً
            if ($originalStatusEnum === JournalEntryStatus::Reversed) {
                throw ValidationException::withMessages([
                    'journal_entry' => ['القيد المالي معكوس نهائياً ومغلق، لا يمكن تعديله بأي شكل.'],
                ]);
            }
        });

        // منع حذف القيود المرحّلة أو المعكوسة نهائياً
        static::deleting(function (JournalEntry $entry) {
            if (!$entry->isDraft()) {
                throw ValidationException::withMessages([
                    'journal_entry' => ['لا يمكن حذف القيد المحاسبي لأنه تم ترحيله أو عكسه مسبقاً. يمكن فقط إلغاؤه بإنشاء قيد عكسي.'],
                ]);
            }
        });
    }

    public function lines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class)->orderBy('line_order');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function fiscalPeriod(): BelongsTo
    {
        return $this->belongsTo(FiscalPeriod::class);
    }

    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversal_of_id');
    }

    public function reversedBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversed_by_id');
    }

    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isDraft(): bool
    {
        return $this->status === JournalEntryStatus::Draft;
    }

    public function isPosted(): bool
    {
        return $this->status === JournalEntryStatus::Posted;
    }

    public function isReversed(): bool
    {
        return $this->status === JournalEntryStatus::Reversed;
    }

    public function isBalanced(): bool
    {
        return bccomp((string) $this->total_debit, (string) $this->total_credit, 4) === 0;
    }

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', JournalEntryStatus::Draft);
    }

    public function scopePosted(Builder $query): Builder
    {
        return $query->where('status', JournalEntryStatus::Posted);
    }

    public function scopeReversed(Builder $query): Builder
    {
        return $query->where('status', JournalEntryStatus::Reversed);
    }

    public function scopeInPeriod(Builder $query, int $periodId): Builder
    {
        return $query->where('fiscal_period_id', $periodId);
    }

    public function scopeInBranch(Builder $query, int $branchId): Builder
    {
        return $query->where('branch_id', $branchId);
    }
}
