<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Models;

use App\Domains\Accounting\Enums\AccountNature;
use App\Domains\Accounting\Enums\AccountType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $code
 * @property string $name_ar
 * @property string|null $name_en
 * @property int|null $parent_id
 * @property AccountType $type
 * @property AccountNature $nature
 * @property int $level
 * @property bool $is_leaf
 * @property bool $is_active
 * @property string|null $description
 * @property-read Account|null $parent
 * @property-read Collection<int, Account> $children
 */
class Account extends Model
{
    use HasFactory;

    protected $table = 'chart_of_accounts';

    protected $fillable = [
        'code',
        'name_ar',
        'name_en',
        'parent_id',
        'type',
        'nature',
        'level',
        'is_leaf',
        'is_active',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'type' => AccountType::class,
            'nature' => AccountNature::class,
            'level' => 'integer',
            'is_leaf' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Account::class, 'parent_id')->orderBy('code');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeLeaf(Builder $query): Builder
    {
        return $query->where('is_leaf', true);
    }

    public function scopeRoot(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    public function scopeOfType(Builder $query, AccountType|string $type): Builder
    {
        $val = $type instanceof AccountType ? $type->value : $type;
        return $query->where('type', $val);
    }

    /**
     * هل يقبل الحساب الترحيل المباشر لقيود اليومية؟
     */
    public function canPost(): bool
    {
        return $this->is_leaf && $this->is_active;
    }

    public function isRoot(): bool
    {
        return $this->parent_id === null;
    }
}
