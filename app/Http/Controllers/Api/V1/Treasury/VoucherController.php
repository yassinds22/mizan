<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Treasury;

use App\Domains\Treasury\Services\VoucherService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VoucherController extends Controller
{
    public function __construct(
        private readonly VoucherService $voucherService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'voucher_type',
            'status',
            'party_type',
            'party_id',
            'treasury_account_id',
            'date_from',
            'date_to',
            'search',
        ]);

        $perPage = (int) $request->input('per_page', 25);
        $vouchers = $this->voucherService->listVouchers($filters, $perPage);

        return response()->json([
            'success' => true,
            'data' => $vouchers->items(),
            'meta' => [
                'current_page' => $vouchers->currentPage(),
                'last_page' => $vouchers->lastPage(),
                'per_page' => $vouchers->perPage(),
                'total' => $vouchers->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $voucher = $this->voucherService->getVoucher($id);

        return response()->json([
            'success' => true,
            'data' => $voucher,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'voucher_type' => ['required', Rule::in(['receipt', 'payment'])],
            'date' => ['nullable', 'date'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'party_type' => ['required', Rule::in(['customer', 'supplier', 'account'])],
            'party_id' => ['nullable', 'integer'],
            'party_name' => ['nullable', 'string', 'max:255'],
            'treasury_account_id' => ['required', 'integer', 'exists:chart_of_accounts,id'],
            'counter_account_id' => ['nullable', 'integer', 'exists:chart_of_accounts,id'],
            'payment_method' => ['nullable', Rule::in(['cash', 'bank_transfer', 'cheque', 'pos'])],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0.0001'],
            'cost_center_id' => ['nullable', 'integer', 'exists:cost_centers,id'],
            'notes' => ['nullable', 'string'],
            'received_from' => ['nullable', 'string', 'max:255'],
            'paid_to' => ['nullable', 'string', 'max:255'],
            'allocations' => ['nullable', 'array'],
            'allocations.*.invoice_type' => ['required_with:allocations', Rule::in(['sales_invoice', 'purchase_invoice'])],
            'allocations.*.invoice_id' => ['required_with:allocations', 'integer'],
            'allocations.*.allocated_amount' => ['required_with:allocations', 'numeric', 'min:0.0001'],
            'post_immediately' => ['nullable', 'boolean'],
        ]);

        $allocations = $request->input('allocations', []);
        $voucher = $this->voucherService->createDraft($validated, $allocations);

        if (!empty($validated['post_immediately'])) {
            $voucher = $this->voucherService->postVoucher($voucher);
        }

        return response()->json([
            'success' => true,
            'message' => $voucher->isPosted() ? 'تم إنشاء وترحيل السند بنجاح.' : 'تم حفظ مسودة السند بنجاح.',
            'data' => $voucher,
        ], 201);
    }

    public function update(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'party_type' => ['nullable', Rule::in(['customer', 'supplier', 'account'])],
            'party_id' => ['nullable', 'integer'],
            'party_name' => ['nullable', 'string', 'max:255'],
            'treasury_account_id' => ['nullable', 'integer', 'exists:chart_of_accounts,id'],
            'counter_account_id' => ['nullable', 'integer', 'exists:chart_of_accounts,id'],
            'payment_method' => ['nullable', Rule::in(['cash', 'bank_transfer', 'cheque', 'pos'])],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'amount' => ['nullable', 'numeric', 'min:0.0001'],
            'cost_center_id' => ['nullable', 'integer', 'exists:cost_centers,id'],
            'notes' => ['nullable', 'string'],
            'received_from' => ['nullable', 'string', 'max:255'],
            'paid_to' => ['nullable', 'string', 'max:255'],
            'allocations' => ['nullable', 'array'],
            'allocations.*.invoice_type' => ['required_with:allocations', Rule::in(['sales_invoice', 'purchase_invoice'])],
            'allocations.*.invoice_id' => ['required_with:allocations', 'integer'],
            'allocations.*.allocated_amount' => ['required_with:allocations', 'numeric', 'min:0.0001'],
        ]);

        $allocations = $request->input('allocations', []);
        $voucher = $this->voucherService->updateDraft($id, $validated, $allocations);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث مسودة السند بنجاح.',
            'data' => $voucher,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->voucherService->deleteDraft($id);

        return response()->json([
            'success' => true,
            'message' => 'تم حذف مسودة السند بنجاح.',
        ]);
    }

    public function post(int $id): JsonResponse
    {
        $voucher = $this->voucherService->postVoucher($id);

        return response()->json([
            'success' => true,
            'message' => "تم ترحيل السند رقم [{$voucher->voucher_number}] وتوليد القيد المحاسبي بنجاح.",
            'data' => $voucher,
        ]);
    }

    public function cancel(int $id, Request $request): JsonResponse
    {
        $reason = (string) $request->input('reason', 'طلب المستخدم');
        $voucher = $this->voucherService->cancelVoucher($id, $reason);

        return response()->json([
            'success' => true,
            'message' => "تم إلغاء السند رقم [{$voucher->voucher_number}] وعكس القيد المحاسبي بنجاح.",
            'data' => $voucher,
        ]);
    }

    public function openInvoices(Request $request): JsonResponse
    {
        $request->validate([
            'party_type' => ['required', Rule::in(['customer', 'supplier'])],
            'party_id' => ['required', 'integer'],
        ]);

        $partyType = (string) $request->input('party_type');
        $partyId = (int) $request->input('party_id');

        $invoices = $this->voucherService->getOpenInvoices($partyType, $partyId);

        return response()->json([
            'success' => true,
            'data' => $invoices,
        ]);
    }
}
