<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Core;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
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
            'company_name' => ['nullable', 'string', 'max:150'],
            'tax_number' => ['nullable', 'string', 'max:50'],
            'cr_number' => ['nullable', 'string', 'max:50'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],

            'logo_text' => ['nullable', 'string', 'max:150'],
            'footer_text' => ['nullable', 'string', 'max:255'],
            'legal_note' => ['nullable', 'string', 'max:500'],
            'paper_type' => ['nullable', 'string', 'in:thermal,a4'],
            'show_qr' => ['nullable', 'boolean'],

            'vat_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'fiscal_start_date' => ['nullable', 'date'],
            'stock_policy' => ['nullable', 'string', 'in:FEFO,FIFO,WEIGHTED_AVG'],
            'selected_currency' => ['nullable', 'string', 'max:10'],
        ];
    }
}
