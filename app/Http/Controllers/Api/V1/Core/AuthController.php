<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Core;

use App\Domains\Core\Services\AccessControlService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        protected AccessControlService $accessControlService
    ) {}

    /**
     * تسجيل الدخول
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::with(['roles', 'branch'])->where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.',
            ], 422);
        }

        // صمام الأمان: فحص ما إذا كان الحساب مفعلاً أم معطلاً
        if (!$user->is_active) {
            $this->accessControlService->logAudit(
                targetUser: $user,
                action: 'login_blocked_inactive',
                actor: null,
                notes: 'محاولة تسجيل دخول فاشلة بسبب تجميد وتعطيل الحساب'
            );

            return response()->json([
                'message' => 'تم تجميد وتعطيل هذا الحساب من قبل الإدارة. يرجى مراجعة مدير النظام.',
                'is_active' => false,
            ], 403);
        }

        // تسجيل حركة الدخول في سجل الرقابة
        $this->accessControlService->logAudit(
            targetUser: $user,
            action: 'account_login',
            actor: $user,
            notes: 'تسجيل دخول ناجح إلى النظام'
        );

        $token = $user->createToken('mizan_auth_token')->plainTextToken;
        $permissionsMatrix = $this->accessControlService->getEffectivePermissionsMatrix($user);

        return response()->json([
            'message' => 'تم تسجيل الدخول بنجاح',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'is_active' => (bool) $user->is_active,
                'is_super_admin' => (bool) $user->is_super_admin,
                'branch_id' => $user->branch_id,
                'branch_name' => $user->branch?->name,
                'roles' => $user->roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name]),
                'primary_role' => $user->roles->first()?->name ?? 'مستخدم',
            ],
            'permissions' => $permissionsMatrix,
        ]);
    }

    /**
     * تسجيل الخروج
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $this->accessControlService->logAudit(
                targetUser: $user,
                action: 'account_logout',
                actor: $user,
                notes: 'تسجيل خروج من النظام'
            );

            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'تم تسجيل الخروج بنجاح',
        ]);
    }

    /**
     * بيانات المستخدم الحالي المسجل
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'غير مصرح'], 401);
        }

        $user->loadMissing(['roles', 'branch']);

        $permissionsMatrix = $this->accessControlService->getEffectivePermissionsMatrix($user);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'is_active' => (bool) $user->is_active,
                'is_super_admin' => (bool) $user->is_super_admin,
                'branch_id' => $user->branch_id,
                'branch_name' => $user->branch?->name,
                'roles' => $user->roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name]),
                'primary_role' => $user->roles->first()?->name ?? 'مستخدم',
            ],
            'permissions' => $permissionsMatrix,
        ]);
    }
}
