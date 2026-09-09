<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Accounting;

use App\Domains\Accounting\Services\AccountService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Accounting\StoreAccountRequest;
use App\Http\Requests\Api\V1\Accounting\UpdateAccountRequest;
use App\Http\Resources\Api\V1\Accounting\AccountResource;
use App\Http\Resources\Api\V1\Accounting\AccountTreeResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AccountController extends Controller
{
    public function __construct(
        protected AccountService $accountService
    ) {}

    /**
     * عرض قائمة الحسابات مع إمكانية الفلترة والبحث
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only([
            'search',
            'type',
            'nature',
            'is_leaf',
            'is_active',
            'parent_id',
        ]);

        $accounts = $this->accountService->listAccounts($filters);

        return AccountResource::collection($accounts);
    }

    /**
     * جلب شجرة دليل الحسابات الهرمية متعددة المستويات
     */
    public function tree(): AnonymousResourceCollection
    {
        $tree = $this->accountService->getTree();

        return AccountTreeResource::collection($tree);
    }

    /**
     * جلب الحسابات التحليلية النشطة فقط (المسموح بالترحيل عليها في القيود)
     */
    public function leafAccounts(): AnonymousResourceCollection
    {
        $leafAccounts = $this->accountService->getLeafAccounts();

        return AccountResource::collection($leafAccounts);
    }

    /**
     * إضافة حساب جديد لدليل الحسابات
     */
    public function store(StoreAccountRequest $request): JsonResponse
    {
        $account = $this->accountService->createAccount($request->validated());

        return (new AccountResource($account))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * عرض تفاصيل حساب محدد
     */
    public function show(int $id): AccountResource
    {
        $account = $this->accountService->getAccount($id);

        return new AccountResource($account);
    }

    /**
     * تحديث بيانات حساب
     */
    public function update(UpdateAccountRequest $request, int $id): AccountResource
    {
        $account = $this->accountService->updateAccount($id, $request->validated());

        return new AccountResource($account);
    }

    /**
     * حذف حساب مالي (بشرط عدم وجود حسابات فرعية تحته)
     */
    public function destroy(int $id): JsonResponse
    {
        $this->accountService->deleteAccount($id);

        return response()->json([
            'message' => 'تم حذف الحساب بنجاح من دليل الحسابات.',
        ]);
    }
}
