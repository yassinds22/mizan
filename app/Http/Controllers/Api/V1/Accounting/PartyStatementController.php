<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Accounting;

use App\Domains\Accounting\Services\PartyStatementService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PartyStatementController extends Controller
{
    public function __construct(
        protected PartyStatementService $statementService
    ) {}

    /**
     * استخراج كشف الحساب المالي الموحد للطرف (مورد أو عميل)
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'party_type' => ['required', 'string', 'in:supplier,customer'],
            'party_id' => ['required', 'integer', 'min:1'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
        ], [
            'party_type.required' => 'نوع الطرف مطلوب (supplier أو customer).',
            'party_type.in' => 'نوع الطرف يجب أن يكون إما supplier أو customer.',
            'party_id.required' => 'معرف الطرف مطلوب.',
            'party_id.integer' => 'معرف الطرف يجب أن يكون رقماً صحيحاً.',
            'date_to.after_or_equal' => 'تاريخ النهاية يجب أن يكون مساوياً أو لاحقاً لتاريخ البداية.',
            'branch_id.exists' => 'الفرع المحدد غير موجود في النظام.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات الاستعلام غير صالحة.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $partyType = (string) $request->input('party_type');
        $partyId = (int) $request->input('party_id');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $branchId = $request->has('branch_id') ? (int) $request->input('branch_id') : null;

        $statement = $this->statementService->getStatement(
            $partyType,
            $partyId,
            $dateFrom,
            $dateTo,
            $branchId
        );

        return response()->json([
            'success' => true,
            'message' => 'تم استخراج كشف الحساب المالي بنجاح.',
            'data' => $statement,
        ]);
    }
}
