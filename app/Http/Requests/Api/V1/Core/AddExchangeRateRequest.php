<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Core;

use Illuminate\Foundation\Http\FormRequest;

class AddExchangeRateRequest extends FormRequest
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
            'rate' => ['required', 'numeric', 'gt:0'],
            'valid_from' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'rate.required' => 'سعر الصرف مطلوب.',
            'rate.gt' => 'سعر الصرف يجب أن يكون أكبر من الصفر.',
            'valid_from.date' => 'تاريخ بدء السريان يجب أن يكون تاريخاً صالحاً.',
        ];
    }
}
