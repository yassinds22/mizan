<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Accounting;

use App\Domains\Accounting\Enums\AccountNature;
use App\Domains\Accounting\Enums\AccountType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = (int) ($this->route('account') ?? $this->route('id'));

        return [
            'code' => ['nullable', 'string', 'max:50', Rule::unique('chart_of_accounts', 'code')->ignore($id)],
            'name_ar' => ['sometimes', 'required', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'exists:chart_of_accounts,id'],
            'type' => ['nullable', 'string', Rule::enum(AccountType::class)],
            'nature' => ['nullable', 'string', Rule::enum(AccountNature::class)],
            'is_leaf' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
