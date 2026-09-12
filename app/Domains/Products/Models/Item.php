<?php

declare(strict_types=1);

namespace App\Domains\Products\Models;

use App\Domains\Core\Models\TaxCategory;
use App\Domains\Products\Enums\StorageCondition;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Validation\ValidationException;

class Item extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'items';

    protected $fillable = [
        'sku',
        'barcode',
        'name_ar',
        'name_en',
        'category_id',
        'tax_category_id',
        'base_uom_id',
        'storage_condition',
        'is_perishable',
        'shelf_life_days',
        'reorder_level',
        'cost_price',
        'stock_quantity',
        'is_active',
        'description',
    ];

    protected $casts = [
        'storage_condition' => StorageCondition::class,
        'is_perishable' => 'boolean',
        'shelf_life_days' => 'integer',
        'reorder_level' => 'string',
        'cost_price' => 'string',
        'stock_quantity' => 'string',
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(ItemCategory::class, 'category_id');
    }

    public function taxCategory(): BelongsTo
    {
        return $this->belongsTo(TaxCategory::class, 'tax_category_id');
    }

    public function baseUom(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'base_uom_id');
    }

    public function itemUnits(): HasMany
    {
        return $this->hasMany(ItemUnit::class, 'item_id');
    }

    public function units(): BelongsToMany
    {
        return $this->belongsToMany(UnitOfMeasure::class, 'item_units', 'item_id', 'uom_id')
            ->withPivot(['conversion_factor', 'barcode', 'is_base_unit'])
            ->withTimestamps();
    }

    public function prices(): HasManyThrough
    {
        return $this->hasManyThrough(
            ItemPrice::class,
            ItemUnit::class,
            'item_id',
            'item_unit_id'
        );
    }

    public function batches(): HasMany
    {
        return $this->hasMany(\App\Domains\Inventory\Models\ItemBatch::class, 'item_id');
    }

    /**
     * جلب الوحدة الأساسية للصنف
     */
    public function getBaseItemUnit(): ?ItemUnit
    {
        return $this->itemUnits->firstWhere('is_base_unit', true)
            ?? $this->itemUnits->firstWhere('uom_id', $this->base_uom_id);
    }

    public function findUnitByUomId(int $uomId): ?ItemUnit
    {
        return $this->itemUnits->firstWhere('uom_id', $uomId);
    }

    public function findUnitByBarcode(string $barcode): ?ItemUnit
    {
        return $this->itemUnits->firstWhere('barcode', $barcode);
    }

    /**
     * تحويل كمية من وحدة إلى وحدة أخرى بدقة bcmath
     *
     * @throws ValidationException
     */
    public function convertQuantity(float|string $qty, int $fromUomId, int $toUomId): string
    {
        if ($fromUomId === $toUomId) {
            return number_format((float) $qty, 4, '.', '');
        }

        $fromUnit = $this->findUnitByUomId($fromUomId);
        $toUnit = $this->findUnitByUomId($toUomId);

        if (!$fromUnit || !$toUnit) {
            throw ValidationException::withMessages([
                'uom' => ["إحدى وحدات القياس غير معرفة على الصنف [{$this->sku} - {$this->name_ar}]."],
            ]);
        }

        $fromFactor = (string) $fromUnit->conversion_factor;
        $toFactor = (string) $toUnit->conversion_factor;

        if (bccomp($toFactor, '0.0000', 4) === 0) {
            throw ValidationException::withMessages([
                'uom' => ['معامل تحويل الوحدة الهدف يساوي صفراً، لا يمكن التحويل.'],
            ]);
        }

        // 1. التحويل للوحدة الأساسية: qty * fromFactor
        $baseQty = bcmul((string) $qty, $fromFactor, 6);

        // 2. التحويل من الوحدة الأساسية إلى الوحدة الهدف: baseQty / toFactor
        return bcdiv($baseQty, $toFactor, 4);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopePerishable(Builder $query): Builder
    {
        return $query->where('is_perishable', true);
    }

    public function scopeByStorageCondition(Builder $query, StorageCondition|string $condition): Builder
    {
        $val = $condition instanceof StorageCondition ? $condition->value : $condition;
        return $query->where('storage_condition', $val);
    }
}
