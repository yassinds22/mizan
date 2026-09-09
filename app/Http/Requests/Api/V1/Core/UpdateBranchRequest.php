<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Core;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBranchRequest extends FormRequest
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
        $branchId = (int) $this->route('branch');

        return [
            'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('branches', 'code')->ignore($branchId)],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
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
            'code.unique' => 'كود الفرع مسجل مسبقاً لفرع آخر.',
            'name.required' => 'اسم الفرع مطلوب.',
        ];
    }
}
