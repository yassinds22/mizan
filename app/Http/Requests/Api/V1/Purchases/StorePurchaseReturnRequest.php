<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Purchases;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseReturnRequest extends FormRequest
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
            'purchase_invoice_id' => ['required', 'integer', 'exists:purchase_invoices,id'],
            'return_date' => ['nullable', 'date'],
            'refund_method' => ['required', 'string', 'in:credit,cash,bank_transfer'],
            'reason' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.purchase_invoice_line_id' => ['required', 'integer', 'exists:purchase_invoice_lines,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'purchase_invoice_id.required' => 'يرجى تحديد فاتورة المشتريات المراد إرجاعها.',
            'purchase_invoice_id.exists' => 'فاتورة المشتريات المحددة غير موجودة بالنظام.',
            'refund_method.required' => 'يرجى تحديد طريقة تسوية المردود (آجل / كاش / بنك).',
            'refund_method.in' => 'طريقة التسوية المحددة غير صالحة.',
            'lines.required' => 'يجب إدراج صنف واحد على الأقل في المردود.',
            'lines.min' => 'يجب إدراج صنف واحد على الأقل في المردود.',
            'lines.*.purchase_invoice_line_id.required' => 'معرف سطر الفاتورة مطلوب لكل بند.',
            'lines.*.quantity.required' => 'كمية المردود مطلوبة لكل بند.',
            'lines.*.quantity.gt' => 'يجب أن تكون كمية المردود أكبر من الصفر.',
        ];
    }
}
