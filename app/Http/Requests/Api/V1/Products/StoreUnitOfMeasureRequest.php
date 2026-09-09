<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Products;

use Illuminate\Foundation\Http\FormRequest;

class StoreUnitOfMeasureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:20', 'unique:units_of_measure,code'],
            'name_ar' => ['required', 'string', 'max:100'],
            'name_en' => ['nullable', 'string', 'max:100'],
            'symbol' => ['nullable', 'string', 'max:20'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
