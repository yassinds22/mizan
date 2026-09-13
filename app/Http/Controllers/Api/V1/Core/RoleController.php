<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Core;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /**
     * استعراض قائمة الأدوار
     */
    public function index(): JsonResponse
    {
        $roles = Role::with(['permissions'])
            ->withCount('users')
            ->get()
            ->map(function (Role $r) {
                return [
                    'id' => $r->id,
                    'name' => $r->name,
                    'permissions_count' => $r->permissions->count(),
                    'users_count' => $r->users_count,
                    'permissions' => $r->permissions->pluck('name'),
                ];
            });

        return response()->json([
            'roles' => $roles,
            'all_permissions' => Permission::orderBy('name')->pluck('name'),
        ]);
    }

    /**
     * إنشاء دور جديد
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:roles,name'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);

        if (!empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        return response()->json([
            'message' => 'تم إنشاء الدور بنجاح',
            'role' => $role->load('permissions'),
        ], 201);
    }

    /**
     * تحديث صلاحيات الدور
     */
    public function updatePermissions(Request $request, int|string $id): JsonResponse
    {
        $role = is_numeric($id) ? Role::findOrFail($id) : Role::findByName((string) $id);

        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role->syncPermissions($validated['permissions']);

        return response()->json([
            'message' => 'تم تحديث صلاحيات الدور بنجاح',
            'role' => $role->load('permissions'),
        ]);
    }
}
