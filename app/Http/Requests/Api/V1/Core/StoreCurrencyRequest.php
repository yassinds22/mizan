<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Core;

use Illuminate\Foundation\Http\FormRequest;

class StoreCurrencyRequest extends FormRequest
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
        return [
            'code' => ['required', 'string', 'size:3', 'unique:currencies,code'],
            'name' => ['required', 'string', 'max:100'],
            'symbol' => ['required', 'string', 'max:10'],
            'decimal_places' => ['nullable', 'integer', 'min:0', 'max:4'],
            'is_base_currency' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'initial_rate' => ['nullable', 'numeric', 'gt:0'],
            'valid_from' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required' => 'كود العملة مطلوب.',
            'code.size' => 'كود العملة يجب أن يتكون من 3 أحرف طبقاً لمعيار ISO (مثل: USD).',
            'code.unique' => 'كود العملة مسجل مسبقاً في النظام.',
            'name.required' => 'اسم العملة مطلوب.',
            'symbol.required' => 'رمز العملة مطلوب.',
            'initial_rate.gt' => 'سعر الصرف المبدئي يجب أن يكون أكبر من الصفر.',
        ];
    }
}
