<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Accounting;

use Illuminate\Foundation\Http\FormRequest;

class ReverseJournalEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:3', 'max:500'],
            'reversal_date' => ['nullable', 'date'],
        ];
    }
}
