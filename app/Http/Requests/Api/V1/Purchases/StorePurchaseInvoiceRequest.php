<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Purchases;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseInvoiceRequest extends FormRequest
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
            'invoice_number' => ['nullable', 'string', 'max:50'],
            'supplier_invoice_number' => ['nullable', 'string', 'max:100'],
            'invoice_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'supplier_tax_number' => ['nullable', 'string', 'max:50'],
            'payment_method' => ['required', 'string', 'in:cash,credit,bank_transfer'],
            'notes' => ['nullable', 'string'],
            'post_immediately' => ['nullable', 'boolean'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_id' => ['required', 'integer', 'exists:items,id'],
            'lines.*.item_unit_id' => ['nullable', 'integer', 'exists:item_units,id'],
            'lines.*.unit_name' => ['required', 'string', 'max:50'],
            'lines.*.conversion_factor' => ['nullable', 'numeric', 'min:0.0001'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.0001'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'lines.*.tax_rate' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'payment_method.required' => 'طريقة الدفع مطلوبة (نقدي / آجل / تحويل بنكي).',
            'payment_method.in' => 'طريقة الدفع المحددة غير صالحة.',
            'lines.required' => 'يجب إدخال صنف واحد على الأقل في فاتورة الشراء.',
            'lines.min' => 'يجب إدخال صنف واحد على الأقل في فاتورة الشراء.',
            'lines.*.item_id.required' => 'الصنف مطلوب.',
            'lines.*.item_id.exists' => 'أحد الأصناف المحددة غير موجود بالنظام.',
            'lines.*.quantity.required' => 'الكمية مطلوبة.',
            'lines.*.quantity.min' => 'الكمية يجب أن تكون أكبر من الصفر.',
            'lines.*.unit_price.required' => 'سعر شراء الوحدة مطلوب.',
        ];
    }
}
