<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Accounting;

use App\Domains\Accounting\Services\FinancialReportService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FinancialReportController extends Controller
{
    public function __construct(
        protected FinancialReportService $reportService
    ) {}

    /**
     * 1. ميزان المراجعة (Trial Balance) بالأرصدة والمجاميع والمستويات الشجرية
     */
    public function trialBalance(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'branch_id' => ['nullable'],
            'cost_center_id' => ['nullable'],
            'level' => ['nullable', 'integer', 'min:1', 'max:5'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات الفلترة غير صالحة.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $this->reportService->getTrialBalance($request->all());

        return response()->json([
            'success' => true,
            'message' => 'تم استخراج ميزان المراجعة بنجاح.',
            'data' => $data,
        ]);
    }

    /**
     * 2. كشف دفتر الأستاذ العام لأي حساب محدد (General Ledger Account Ledger)
     */
    public function accountLedger(Request $request, int $accountId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'branch_id' => ['nullable'],
            'cost_center_id' => ['nullable'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات الفلترة غير صالحة.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $this->reportService->getAccountLedger($accountId, $request->all());

        return response()->json([
            'success' => true,
            'message' => 'تم استخراج كشف دفتر الأستاذ بنجاح.',
            'data' => $data,
        ]);
    }

    /**
     * 3. قائمة الدخل والأرباح والخسائر (Income Statement / P&L)
     */
    public function incomeStatement(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'branch_id' => ['nullable'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات الفلترة غير صالحة.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $this->reportService->getIncomeStatement($request->all());

        return response()->json([
            'success' => true,
            'message' => 'تم استخراج قائمة الدخل بنجاح.',
            'data' => $data,
        ]);
    }

    /**
     * 4. الميزانية العمومية وقائمة المركز المالي (Balance Sheet)
     */
    public function balanceSheet(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'as_of_date' => ['nullable', 'date'],
            'branch_id' => ['nullable'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات الفلترة غير صالحة.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $this->reportService->getBalanceSheet($request->all());

        return response()->json([
            'success' => true,
            'message' => 'تم استخراج الميزانية العمومية وقائمة المركز المالي بنجاح.',
            'data' => $data,
        ]);
    }

    /**
     * 5. تقرير الموقف الضريبي لضريبة القيمة المضافة (VAT Position Report)
     */
    public function vatPosition(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'branch_id' => ['nullable'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات الفلترة غير صالحة.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $this->reportService->getVatPositionReport($request->all());

        return response()->json([
            'success' => true,
            'message' => 'تم استخراج تقرير الموقف الضريبي بنجاح.',
            'data' => $data,
        ]);
    }
}
