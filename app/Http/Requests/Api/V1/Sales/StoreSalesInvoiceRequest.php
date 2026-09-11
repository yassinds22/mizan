<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreSalesInvoiceRequest extends FormRequest
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
            'invoice_number' => ['nullable', 'string', 'max:50', 'unique:sales_invoices,invoice_number'],
            'invoice_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:invoice_date'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'customer_tax_number' => ['nullable', 'string', 'max:50'],
            'payment_method' => ['required', 'string', 'in:cash,credit,bank_transfer'],
            'notes' => ['nullable', 'string'],
            'post_immediately' => ['nullable', 'boolean'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_id' => ['required', 'integer', 'exists:items,id'],
            'lines.*.item_unit_id' => ['nullable', 'integer', 'exists:item_units,id'],
            'lines.*.unit_name' => ['nullable', 'string', 'max:50'],
            'lines.*.conversion_factor' => ['nullable', 'numeric', 'min:0.0001'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.0001'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'lines.*.discount_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'lines.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'branch_id.exists' => 'الفرع المحدد غير موجود في النظام أو لم يعد نشطاً.',
            'customer_id.exists' => 'العميل المحدد غير موجود في سجلات العملاء.',
            'payment_method.required' => 'طريقة السداد مطلوبة (نقدي / آجل / تحويل بنكي).',
            'payment_method.in' => 'طريقة السداد المحددة غير صالحة.',
            'lines.required' => 'يجب إضافة صنف واحد على الأقل في فاتورة المبيعات.',
            'lines.min' => 'يجب إضافة صنف واحد على الأقل في فاتورة المبيعات.',
            'lines.*.item_id.required' => 'معرف الصنف مطلوب لكل سطر في الفاتورة.',
            'lines.*.item_id.exists' => 'أحد الأصناف المحددة غير موجود في المخزون.',
            'lines.*.quantity.required' => 'الكمية مطلوبة لجميع بنود الفاتورة.',
            'lines.*.quantity.min' => 'يجب أن تكون كمية الصنف أكبر من الصفر.',
            'lines.*.unit_price.required' => 'سعر الوحدة مطلوب لكل صنف.',
            'lines.*.unit_price.min' => 'يجب أن يكون سعر الوحدة صفراً أو أكبر.',
        ];
    }
}
