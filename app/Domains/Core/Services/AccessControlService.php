<?php

declare(strict_types=1);

namespace App\Domains\Core\Services;

use App\Domains\Core\Models\PermissionAuditLog;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AccessControlService
{
    /**
     * إسناد دور وظيفي للمستخدم
     */
    public function assignRole(User $user, string $roleName, ?User $actor = null): void
    {
        $role = Role::findByName($roleName);

        if ($user->hasRole($roleName)) {
            return;
        }

        DB::transaction(function () use ($user, $role, $actor) {
            $user->assignRole($role);

            $this->logAudit(
                targetUser: $user,
                action: 'role_assigned',
                actor: $actor,
                roleName: $role->name,
                notes: "إسناد الدور الوظيفي [{$role->name}] للمستخدم"
            );
        });
    }

    /**
     * إزالة دور وظيفي من المستخدم
     */
    public function removeRole(User $user, string $roleName, ?User $actor = null): void
    {
        if (!$user->hasRole($roleName)) {
            return;
        }

        DB::transaction(function () use ($user, $roleName, $actor) {
            $user->removeRole($roleName);

            $this->logAudit(
                targetUser: $user,
                action: 'role_removed',
                actor: $actor,
                roleName: $roleName,
                notes: "إزالة الدور الوظيفي [{$roleName}] من المستخدم"
            );
        });
    }

    /**
     * منح صلاحية مباشرة إضافية للمستخدم (Direct Grant)
     */
    public function grantDirectPermission(User $user, string $permissionName, ?User $actor = null, ?string $reason = null): void
    {
        $permission = Permission::findByName($permissionName);

        DB::transaction(function () use ($user, $permission, $actor, $reason) {
            $user->givePermissionTo($permission);

            $this->logAudit(
                targetUser: $user,
                action: 'granted',
                actor: $actor,
                permissionName: $permission->name,
                notes: $reason ?? "منح صلاحية مباشرة إضافية [{$permission->name}]"
            );
        });
    }

    /**
     * سحب أو تعطيل الصلاحية المباشرة الإضافية للمستخدم (Direct Revoke)
     */
    public function revokeDirectPermission(User $user, string $permissionName, ?User $actor = null, ?string $reason = null): void
    {
        if (!$user->hasDirectPermission($permissionName)) {
            return;
        }

        $permission = Permission::findByName($permissionName);

        DB::transaction(function () use ($user, $permission, $actor, $reason) {
            $user->revokePermissionTo($permission);

            $this->logAudit(
                targetUser: $user,
                action: 'revoked',
                actor: $actor,
                permissionName: $permission->name,
                notes: $reason ?? "سحب الصلاحية المباشرة [{$permission->name}]"
            );
        });
    }

    /**
     * تبديل الصلاحية المباشرة (تفعيل / تعطيل بنقرة واحدة)
     */
    public function toggleDirectPermission(User $user, string $permissionName, ?User $actor = null, ?string $reason = null): array
    {
        $hasDirect = $user->hasDirectPermission($permissionName);

        if ($hasDirect) {
            $this->revokeDirectPermission($user, $permissionName, $actor, $reason);
            $newStatus = false;
        } else {
            $this->grantDirectPermission($user, $permissionName, $actor, $reason);
            $newStatus = true;
        }

        // تحديث الكاش
        $user->refresh();

        return [
            'permission' => $permissionName,
            'is_direct' => $newStatus,
            'is_effective' => $user->hasPermissionTo($permissionName),
        ];
    }

    /**
     * تفعيل أو تعطيل حساب المستخدم (Active Kill-Switch)
     * مع حماية المدير العام من تعطيل حسابه بنفسه
     */
    public function toggleUserActive(User $user, ?User $actor = null): User
    {
        // صمام الأمان: منع المدير العام من تعطيل نفسه
        if ($actor && $actor->id === $user->id && $user->is_super_admin) {
            throw ValidationException::withMessages([
                'user' => ['لا يمكن للمدير العام تعطيل حسابه الشخصي.'],
            ]);
        }

        // صمام الأمان: منع تعطيل آخر مدير عام نشط في النظام
        if ($user->is_super_admin && $user->is_active) {
            $activeSuperAdminsCount = User::where('is_super_admin', true)
                ->where('is_active', true)
                ->count();

            if ($activeSuperAdminsCount <= 1) {
                throw ValidationException::withMessages([
                    'user' => ['لا يمكن تعطيل آخر مدير عام نشط في النظام.'],
                ]);
            }
        }

        DB::transaction(function () use ($user, $actor) {
            $user->is_active = !$user->is_active;
            $user->save();

            $action = $user->is_active ? 'account_activated' : 'account_deactivated';
            $notes = $user->is_active
                ? "تفعيل حساب المستخدم [{$user->name}]"
                : "تجميد وتعطيل حساب المستخدم [{$user->name}]";

            $this->logAudit(
                targetUser: $user,
                action: $action,
                actor: $actor,
                notes: $notes
            );
        });

        return $user;
    }

    /**
     * استخراج مصفوفة الصلاحيات الشفافة للمستخدم
     * توضح مصدر كل صلاحية (من الدور، إضافية مباشرة، أو غير ممنوحة) وحالتها الفعالة
     */
    public function getEffectivePermissionsMatrix(User $user): array
    {
        $allPermissions = Permission::orderBy('name')->get();
        $directPermissions = $user->getDirectPermissions()->pluck('name')->flip();
        $rolePermissions = $user->getPermissionsViaRoles()->pluck('name')->flip();

        $matrix = [];

        foreach ($allPermissions as $perm) {
            $isDirect = isset($directPermissions[$perm->name]);
            $isRole = isset($rolePermissions[$perm->name]);
            $isEffective = $user->is_super_admin || $isDirect || $isRole;

            $source = 'none';
            if ($isDirect) {
                $source = 'direct';
            } elseif ($isRole) {
                $source = 'role';
            }

            // استخراج النطاق (Module) من اسم الصلاحية (e.g. sales.invoices.create -> sales)
            $parts = explode('.', $perm->name);
            $module = $parts[0] ?? 'general';

            $matrix[] = [
                'id' => $perm->id,
                'name' => $perm->name,
                'module' => $module,
                'source' => $source, // 'role', 'direct', 'none'
                'is_direct' => $isDirect,
                'is_role' => $isRole,
                'is_effective' => $isEffective,
                'can_toggle' => true, // يمكن للمدير تبديلها كصلاحية مباشرة
            ];
        }

        return $matrix;
    }

    /**
     * تسجيل حركة في سجل التدقيق الرقابي الدائم (Audit Log)
     */
    public function logAudit(
        User $targetUser,
        string $action,
        ?User $actor = null,
        ?string $permissionName = null,
        ?string $roleName = null,
        ?string $notes = null,
        ?array $metadata = null
    ): PermissionAuditLog {
        return PermissionAuditLog::create([
            'actor_id' => $actor?->id,
            'target_user_id' => $targetUser->id,
            'action' => $action,
            'permission_name' => $permissionName,
            'role_name' => $roleName,
            'branch_id' => $targetUser->branch_id,
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'notes' => $notes,
            'metadata' => $metadata,
            'created_at' => now(),
        ]);
    }
}
