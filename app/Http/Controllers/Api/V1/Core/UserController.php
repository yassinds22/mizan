<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Core;

use App\Domains\Core\Services\AccessControlService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function __construct(
        protected AccessControlService $accessControlService
    ) {}

    /**
     * استعراض قائمة المستخدمين مع الأدوار والفرع والحالة
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['roles', 'branch'])
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('branch_id') && $request->query('branch_id') !== 'all') {
            $query->where('branch_id', $request->query('branch_id'));
        }

        if ($request->filled('is_active') && $request->query('is_active') !== 'all') {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $users = $query->paginate((int) $request->query('per_page', 20));

        $data = $users->map(function (User $u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'is_active' => (bool) $u->is_active,
                'is_super_admin' => (bool) $u->is_super_admin,
                'branch_id' => $u->branch_id,
                'branch_name' => $u->branch?->name,
                'roles' => $u->roles->map(fn($r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                ]),
                'primary_role' => $u->roles->first()?->name ?? 'مستخدم',
                'created_at' => $u->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $data,
            'current_page' => $users->currentPage(),
            'last_page' => $users->lastPage(),
            'total' => $users->total(),
        ]);
    }

    /**
     * إنشاء مستخدم جديد وتعيين دوره وفرعه
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:50'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'role' => ['nullable', 'string', 'exists:roles,name'],
            'is_active' => ['boolean'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'branch_id' => $validated['branch_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'is_super_admin' => false,
        ]);

        if (!empty($validated['role'])) {
            $this->accessControlService->assignRole($user, $validated['role'], $request->user());
        }

        $this->accessControlService->logAudit(
            targetUser: $user,
            action: 'user_created',
            actor: $request->user(),
            notes: "إنشاء حساب المستخدم الجديد [{$user->name}]"
        );

        return response()->json([
            'message' => 'تم إنشاء المستخدم بنجاح',
            'user' => $user->load('roles', 'branch'),
        ], 201);
    }

    /**
     * تفاصيل المستخدم
     */
    public function show(int $id): JsonResponse
    {
        $user = User::with(['roles', 'branch'])->findOrFail($id);

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
                'roles' => $user->roles->pluck('name'),
                'primary_role' => $user->roles->first()?->name ?? 'مستخدم',
            ],
        ]);
    }

    /**
     * تعديل بيانات المستخدم ودوره
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:50'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'role' => ['nullable', 'string', 'exists:roles,name'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['email'])) $user->email = $validated['email'];
        if (!empty($validated['password'])) $user->password = Hash::make($validated['password']);
        if (array_key_exists('phone', $validated)) $user->phone = $validated['phone'];
        if (array_key_exists('branch_id', $validated)) $user->branch_id = $validated['branch_id'];
        if (isset($validated['is_active'])) $user->is_active = $validated['is_active'];

        $user->save();

        if (!empty($validated['role'])) {
            $user->syncRoles([$validated['role']]);
            $this->accessControlService->logAudit(
                targetUser: $user,
                action: 'role_assigned',
                actor: $request->user(),
                roleName: $validated['role'],
                notes: "تحديث الدور الوظيفي إلى [{$validated['role']}]"
            );
        }

        return response()->json([
            'message' => 'تم تحديث بيانات المستخدم بنجاح',
            'user' => $user->fresh(['roles', 'branch']),
        ]);
    }

    /**
     * تفعيل أو تعطيل حساب المستخدم (Active Kill-Switch)
     */
    public function toggleActive(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $updatedUser = $this->accessControlService->toggleUserActive($user, $request->user());

        return response()->json([
            'message' => $updatedUser->is_active ? 'تم تفعيل الحساب بنجاح' : 'تم تجميد وتعطيل الحساب بنجاح',
            'is_active' => (bool) $updatedUser->is_active,
        ]);
    }

    /**
     * جلب مصفوفة الصلاحيات الشفافة للمستخدم
     */
    public function permissions(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $matrix = $this->accessControlService->getEffectivePermissionsMatrix($user);

        return response()->json([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'is_super_admin' => (bool) $user->is_super_admin,
            'primary_role' => $user->roles->first()?->name ?? 'مستخدم',
            'permissions' => $matrix,
        ]);
    }

    /**
     * فتح أو إغلاق الصلاحية المباشرة للمستخدم بنقرة زر واحدة
     */
    public function togglePermission(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'permission' => ['required', 'string', 'exists:permissions,name'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $result = $this->accessControlService->toggleDirectPermission(
            user: $user,
            permissionName: $validated['permission'],
            actor: $request->user(),
            reason: $validated['reason'] ?? null
        );

        return response()->json([
            'message' => $result['is_direct'] ? 'تم فتح الصلاحية للمستخدم' : 'تم إغلاق الصلاحية المباشرة للمستخدم',
            'result' => $result,
        ]);
    }
}
