<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Core;

use Illuminate\Foundation\Http\FormRequest;

class StoreFiscalYearRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:50', 'unique:fiscal_years,name'],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'اسم السنة المالية مطلوب.',
            'name.unique' => 'اسم السنة المالية مسجل مسبقاً في النظام.',
            'year.required' => 'سنة التقويم مطلوبة.',
            'end_date.after' => 'تاريخ نهاية السنة المالية يجب أن يكون بعد تاريخ البداية.',
        ];
    }
}
