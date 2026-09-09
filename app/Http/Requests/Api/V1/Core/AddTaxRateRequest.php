<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Core;

use Illuminate\Foundation\Http\FormRequest;

class AddTaxRateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'valid_from' => ['required', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'rate.required' => 'نسبة الضريبة مطلوبة',
            'rate.numeric' => 'نسبة الضريبة يجب أن تكون رقماً',
            'rate.min' => 'نسبة الضريبة لا يمكن أن تكون سالبة',
            'rate.max' => 'نسبة الضريبة لا يمكن أن تتجاوز 100%',
            'valid_from.required' => 'تاريخ سريان النسبة مطلوب',
            'valid_from.date' => 'تاريخ السريان غير صالح',
        ];
    }
}
