<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Core;

use Illuminate\Foundation\Http\FormRequest;

class StoreBranchRequest extends FormRequest
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
            'code' => ['required', 'string', 'max:50', 'unique:branches,code'],
            'name' => ['required', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required' => 'كود الفرع مطلوب.',
            'code.unique' => 'كود الفرع مسجل مسبقاً، يرجى اختيار كود آخر.',
            'code.max' => 'كود الفرع يجب ألا يتجاوز 50 حرفاً.',
            'name.required' => 'اسم الفرع مطلوب.',
            'name.max' => 'اسم الفرع يجب ألا يتجاوز 255 حرفاً.',
        ];
    }
}
