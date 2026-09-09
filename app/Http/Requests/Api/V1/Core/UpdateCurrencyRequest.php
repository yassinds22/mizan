<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Core;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCurrencyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $currencyId = (int) $this->route('currency');

        return [
            'code' => ['sometimes', 'required', 'string', 'size:3', Rule::unique('currencies', 'code')->ignore($currencyId)],
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'symbol' => ['sometimes', 'required', 'string', 'max:10'],
            'decimal_places' => ['nullable', 'integer', 'min:0', 'max:4'],
            'is_base_currency' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required' => 'كود العملة مطلوب.',
            'code.size' => 'كود العملة يجب أن يتكون من 3 أحرف.',
            'code.unique' => 'كود العملة مسجل مسبقاً لعملة أخرى.',
            'name.required' => 'اسم العملة مطلوب.',
            'symbol.required' => 'رمز العملة مطلوب.',
        ];
    }
}
