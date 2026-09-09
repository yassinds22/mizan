<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Accounting;

use Illuminate\Foundation\Http\FormRequest;

class UpdateJournalEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['nullable', 'date'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'description' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'lines' => ['nullable', 'array', 'min:2'],
            'lines.*.account_id' => ['required_with:lines', 'integer', 'exists:chart_of_accounts,id'],
            'lines.*.cost_center_id' => ['nullable', 'integer', 'exists:cost_centers,id'],
            'lines.*.debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.currency_id' => ['nullable', 'integer', 'exists:currencies,id'],
            'lines.*.exchange_rate' => ['nullable', 'numeric', 'min:0.000001'],
            'lines.*.foreign_debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.foreign_credit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
