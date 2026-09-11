<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Products;

use App\Domains\Products\Enums\PriceTier;
use App\Domains\Products\Enums\StorageCondition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('item') ?? $this->route('id');

        return [
            'sku' => ['sometimes', 'string', 'max:50', Rule::unique('items', 'sku')->ignore($id)],
            'barcode' => ['nullable', 'string', 'max:50', Rule::unique('items', 'barcode')->ignore($id)],
            'name_ar' => ['sometimes', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'category_id' => ['sometimes', 'integer', 'exists:item_categories,id'],
            'tax_category_id' => ['nullable', 'integer', 'exists:tax_categories,id'],
            'base_uom_id' => ['sometimes', 'integer', 'exists:units_of_measure,id'],
            'storage_condition' => ['sometimes', 'string', Rule::enum(StorageCondition::class)],
            'is_perishable' => ['nullable', 'boolean'],
            'shelf_life_days' => ['nullable', 'integer', 'min:1'],
            'reorder_level' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],

            // Multi-UOM packaging updates if provided
            'units' => ['nullable', 'array'],
            'units.*.id' => ['nullable', 'integer', 'exists:item_units,id'],
            'units.*.uom_id' => ['required_with:units', 'integer', 'exists:units_of_measure,id'],
            'units.*.conversion_factor' => ['required_with:units', 'numeric', 'min:0.0001'],
            'units.*.barcode' => ['nullable', 'string', 'max:50'],
            'units.*.is_base_unit' => ['nullable', 'boolean'],
            'units.*.is_sale_unit' => ['nullable', 'boolean'],
            'units.*.is_purchase_unit' => ['nullable', 'boolean'],

            // Price tiers per unit
            'units.*.prices' => ['nullable', 'array'],
            'units.*.prices.*.id' => ['nullable', 'integer', 'exists:item_prices,id'],
            'units.*.prices.*.price_tier' => ['required_with:units.*.prices', 'string', Rule::enum(PriceTier::class)],
            'units.*.prices.*.price' => ['required_with:units.*.prices', 'numeric', 'min:0'],
            'units.*.prices.*.min_quantity' => ['nullable', 'numeric', 'min:1'],
        ];
    }
}
