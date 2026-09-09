<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Products;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateItemCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('category') ?? $this->route('id');

        return [
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('item_categories', 'code')->ignore($id)],
            'name_ar' => ['sometimes', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'exists:item_categories,id'],
            'inventory_account_id' => ['nullable', 'integer', 'exists:chart_of_accounts,id'],
            'cogs_account_id' => ['nullable', 'integer', 'exists:chart_of_accounts,id'],
            'revenue_account_id' => ['nullable', 'integer', 'exists:chart_of_accounts,id'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
