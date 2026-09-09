<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Core;

use App\Domains\Core\Enums\FiscalPeriodStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFiscalPeriodStatusRequest extends FormRequest
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
            'status' => ['required', Rule::enum(FiscalPeriodStatus::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'status.required' => 'حالة الفترة المالية مطلوبة.',
            'status.enum' => 'الحالة المحددة غير صالحة. الحالات المقبولة: open (مفتوحة), closed (مغلقة), locked (مجمدة).',
        ];
    }
}
