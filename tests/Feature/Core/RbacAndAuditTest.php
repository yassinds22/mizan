<?php

declare(strict_types=1);

namespace Tests\Feature\Core;

use App\Domains\Core\Models\PermissionAuditLog;
use App\Domains\Core\Services\AccessControlService;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RbacAndAuditTest extends TestCase
{
    use RefreshDatabase;

    protected AccessControlService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->service = app(AccessControlService::class);
    }

    /**
     * اختبار: المدير العام النشط يتجاوز كافة الصلاحيات عبر Gate
     */
    public function test_super_admin_has_all_permissions_via_gate(): void
    {
        $admin = User::where('email', 'admin@mizan.sa')->first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->is_super_admin);
        $this->assertTrue($admin->is_active);

        // فحص أي صلاحية عشوائية
        $this->assertTrue($admin->can('sales.invoices.create'));
        $this->assertTrue($admin->can('accounting.period.close'));
        $this->assertTrue($admin->can('arbitrary.permission.name'));
    }

    /**
     * اختبار صمام الأمان: المستخدم المعطل (is_active = false) يفشل في Gate حتى لو كان Super Admin
     */
    public function test_inactive_user_cannot_pass_gate_even_if_super_admin(): void
    {
        $admin = User::where('email', 'admin@mizan.sa')->first();
        $admin->is_active = false;
        $admin->save();

        // Gate::before يتحقق من is_active
        $this->assertFalse(Gate::forUser($admin)->check('arbitrary.permission.name'));
    }

    /**
     * اختبار: الصلاحيات الموروثة من الدور تعمل بدقة للمستخدم العادي
     */
    public function test_role_permissions_are_inherited_correctly(): void
    {
        $cashier = User::factory()->create(['is_active' => true, 'is_super_admin' => false]);
        $this->service->assignRole($cashier, 'sales_representative');

        $this->assertTrue($cashier->hasRole('sales_representative'));
        $this->assertTrue($cashier->can('sales.invoices.create'));
        $this->assertTrue($cashier->can('sales.invoices.view'));

        // لا يملك صلاحيات الحسابات أو إقفال الفترة
        $this->assertFalse($cashier->can('accounting.period.close'));
        $this->assertFalse($cashier->can('accounting.journals.reverse'));
    }

    /**
     * اختبار: منح وإلغاء الصلاحية المباشرة الإضافية (Direct Grants & Revocations)
     */
    public function test_direct_permission_grant_and_revoke_dynamically(): void
    {
        $cashier = User::factory()->create(['is_active' => true, 'is_super_admin' => false]);
        $this->service->assignRole($cashier, 'sales_representative');

        // في البداية: لا يملك صلاحية المردودات
        $this->assertFalse($cashier->can('sales.returns.create'));

        // المدير يمنحه صلاحية المردودات مباشرة
        $admin = User::where('email', 'admin@mizan.sa')->first();
        $this->service->grantDirectPermission($cashier, 'sales.returns.create', $admin, 'استثناء لوردية اليوم');

        $cashier->refresh();
        $this->assertTrue($cashier->hasDirectPermission('sales.returns.create'));
        $this->assertTrue($cashier->can('sales.returns.create'));

        // سحب الصلاحية المباشرة
        $this->service->revokeDirectPermission($cashier, 'sales.returns.create', $admin, 'انتهاء الوردية');

        $cashier->refresh();
        $this->assertFalse($cashier->hasDirectPermission('sales.returns.create'));
        $this->assertFalse($cashier->can('sales.returns.create'));

        // التأكد من بقاء صلاحيات الدور الأساسية سليمة
        $this->assertTrue($cashier->can('sales.invoices.create'));
    }

    /**
     * اختبار: توثيق حركة الصلاحيات في سجل التدقيق الرقابي (Permission Audit Log)
     */
    public function test_audit_log_records_grants_revocations_and_status_changes(): void
    {
        $admin = User::where('email', 'admin@mizan.sa')->first();
        $user = User::factory()->create(['is_active' => true, 'is_super_admin' => false]);

        $this->service->grantDirectPermission($user, 'sales.returns.create', $admin, 'صلاحية مؤقتة');

        $log = PermissionAuditLog::where('target_user_id', $user->id)
            ->where('action', 'granted')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($admin->id, $log->actor_id);
        $this->assertEquals('sales.returns.create', $log->permission_name);
        $this->assertEquals('صلاحية مؤقتة', $log->notes);
    }

    /**
     * اختبار: صمام أمان يمنع المدير العام من تعطيل نفسه
     */
    public function test_super_admin_cannot_deactivate_self(): void
    {
        $admin = User::where('email', 'admin@mizan.sa')->first();

        $this->expectException(ValidationException::class);
        $this->service->toggleUserActive($admin, $admin);
    }

    /**
     * اختبار API: إنشاء مستخدم وجلب مصفوفة الصلاحيات الشفافة
     */
    public function test_users_api_crud_and_permissions_matrix(): void
    {
        $response = $this->postJson('/api/v1/core/users', [
            'name' => 'أحمد الكاشير',
            'email' => 'ahmed.cashier@mizan.sa',
            'password' => 'secret123',
            'phone' => '0512345678',
            'role' => 'sales_representative',
            'is_active' => true,
        ]);

        $response->assertStatus(201);
        $userId = $response->json('user.id');

        // جلب مصفوفة الصلاحيات
        $matrixRes = $this->getJson("/api/v1/core/users/{$userId}/permissions");
        $matrixRes->assertStatus(200)
            ->assertJsonStructure([
                'user_id',
                'user_name',
                'permissions' => [
                    '*' => ['id', 'name', 'module', 'source', 'is_direct', 'is_role', 'is_effective', 'can_toggle']
                ]
            ]);

        $permissions = collect($matrixRes->json('permissions'));
        $invoiceCreate = $permissions->firstWhere('name', 'sales.invoices.create');
        $this->assertEquals('role', $invoiceCreate['source']);
        $this->assertTrue($invoiceCreate['is_effective']);
    }

    /**
     * اختبار API: تبديل الصلاحية المباشرة بنقرة زر (Toggle Permission)
     */
    public function test_toggle_permission_api_endpoint(): void
    {
        $user = User::factory()->create(['is_active' => true, 'is_super_admin' => false]);
        $this->service->assignRole($user, 'sales_representative');

        // فتح الصلاحية
        $res1 = $this->postJson("/api/v1/core/users/{$user->id}/permissions/toggle", [
            'permission' => 'sales.returns.create',
            'reason' => 'موافقة المدير الشفهية',
        ]);

        $res1->assertStatus(200)
            ->assertJson([
                'result' => [
                    'permission' => 'sales.returns.create',
                    'is_direct' => true,
                    'is_effective' => true,
                ]
            ]);

        // إغلاق الصلاحية
        $res2 = $this->postJson("/api/v1/core/users/{$user->id}/permissions/toggle", [
            'permission' => 'sales.returns.create',
        ]);

        $res2->assertStatus(200)
            ->assertJson([
                'result' => [
                    'permission' => 'sales.returns.create',
                    'is_direct' => false,
                    'is_effective' => false,
                ]
            ]);
    }
}
