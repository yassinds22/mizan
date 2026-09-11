<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreSalesReturnRequest extends FormRequest
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
            'sales_invoice_id' => ['required', 'integer', 'exists:sales_invoices,id'],
            'return_date' => ['nullable', 'date'],
            'refund_method' => ['required', 'string', 'in:cash,credit,bank_transfer'],
            'reason' => ['nullable', 'string', 'max:500'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.sales_invoice_line_id' => ['required', 'integer', 'exists:sales_invoice_lines,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.0001'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'sales_invoice_id.required' => 'فاتورة المبيعات الأصلية مطلوبة لإتمام المرتجع.',
            'sales_invoice_id.exists' => 'فاتورة المبيعات الأصلية غير موجودة.',
            'refund_method.required' => 'طريقة رد المبلغ مطلوبة (نقدي / آجل / تحويل بنكي).',
            'refund_method.in' => 'طريقة رد المبلغ المحددة غير صالحة.',
            'lines.required' => 'يجب تحديد صنف واحد على الأقل للإرجاع.',
            'lines.min' => 'يجب تحديد صنف واحد على الأقل للإرجاع.',
            'lines.*.sales_invoice_line_id.required' => 'سطر الفاتورة الأصلي مطلوب.',
            'lines.*.sales_invoice_line_id.exists' => 'أحد أسطر الفاتورة المحددة غير صحيح.',
            'lines.*.quantity.required' => 'الكمية المرتجعة مطلوبة.',
            'lines.*.quantity.min' => 'الكمية المرتجعة يجب أن تكون أكبر من الصفر.',
        ];
    }
}
