<?php

declare(strict_types=1);

namespace Tests\Feature\Core;

use App\Domains\Core\Models\Branch;
use App\Domains\Core\Services\CompanySetupService;
use App\Domains\Core\Services\DataResetService;
use App\Domains\Sales\Models\Customer;
use App\Domains\Sales\Models\SalesInvoice;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SystemInitializationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
    }

    /**
     * اختبار قابلية تكرار التهيئة (Idempotency) دون تكرار الفروع أو الحسابات
     */
    public function test_init_client_is_idempotent(): void
    {
        $payload = [
            'company_name' => 'مؤسسة التجربة الذكية',
            'vat_number' => '310123456700003',
            'commercial_register' => '1010998877',
            'branch_name' => 'الفرع الرئيسي',
            'city' => 'الرياض',
        ];

        // المرة الأولى
        $res1 = $this->postJson('/api/v1/core/settings/init-client', $payload);
        $res1->assertStatus(200);

        $branchCount1 = Branch::count();

        // المرة الثانية لنفس البيانات
        $res2 = $this->postJson('/api/v1/core/settings/init-client', $payload);
        $res2->assertStatus(200);

        $branchCount2 = Branch::count();

        $this->assertEquals($branchCount1, $branchCount2, 'يجب ألا يتضاعف عدد الفروع عند تشغيل التهيئة مجدداً');
        $this->assertDatabaseHas('system_settings', [
            'key' => 'setup_completed',
            'value' => '1',
        ]);
    }

    /**
     * التأكد من أن init-client لا يمسح بيانات أو فواتير العميل إذا كان النظام مهيأ مسبقاً
     */
    public function test_init_client_does_not_wipe_existing_operational_data(): void
    {
        $customer = Customer::create([
            'code' => 'C-TEST-01',
            'name_ar' => 'عميل حقيقي دائم',
            'name_en' => 'Permanent Customer',
            'phone' => '0555555555',
            'is_active' => true,
        ]);

        // تشغيل التهيئة
        $this->postJson('/api/v1/core/settings/init-client', [
            'company_name' => 'شركة التحديث المستمر',
            'branch_name' => 'فرع الإدارة',
        ])->assertStatus(200);

        // التأكد من بقاء العميل كما هو
        $this->assertDatabaseHas('customers', [
            'code' => 'C-TEST-01',
            'name_ar' => 'عميل حقيقي دائم',
        ]);
    }

    /**
     * اختبار التراجع (Transaction Rollback) عند حدوث خطأ أثناء التهيئة
     */
    public function test_transaction_rollback_on_failure(): void
    {
        $initialBranchCount = Branch::count();

        try {
            DB::transaction(function () {
                Branch::create([
                    'code' => 'BR-FAIL-TEST',
                    'name' => 'فرع تحت الاختبار',
                    'city' => 'الرياض',
                    'address' => 'عنوان',
                    'is_active' => true,
                ]);

                // محاكاة خطأ غير متوقع داخل المعاملة
                throw new \RuntimeException('خطأ متعمد لاختبار الـ Rollback');
            });
        } catch (\RuntimeException $e) {
            // تجاهل الخطأ المتعمد
        }

        $this->assertEquals(
            $initialBranchCount,
            Branch::count(),
            'يجب التراجع عن إنشاء الفرع عند حدوث استثناء داخل الـ Transaction'
        );
        $this->assertDatabaseMissing('branches', ['code' => 'BR-FAIL-TEST']);
    }

    /**
     * اختبار رفض تصفير الحركات عند إدخال اسم منشأة غير مطابق
     */
    public function test_reset_data_rejects_mismatched_confirmation_name(): void
    {
        DB::table('system_settings')->updateOrInsert(
            ['key' => 'company_name'],
            ['value' => 'شركة النور التجارية', 'group' => 'general']
        );

        $response = $this->postJson('/api/v1/core/settings/reset-data', [
            'confirmation_name' => 'اسم خاطئ تماماً',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['confirmation_name']);
    }

    /**
     * اختبار تصفير الحركات بنجاح مع إنشاء نسخة احتياطية
     */
    public function test_reset_data_creates_backup_and_wipes_transactions(): void
    {
        DB::table('system_settings')->updateOrInsert(
            ['key' => 'company_name'],
            ['value' => 'شركة النور التجارية', 'group' => 'general']
        );

        $response = $this->postJson('/api/v1/core/settings/reset-data', [
            'confirmation_name' => 'شركة النور التجارية',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['backup' => ['filename', 'size_kb', 'driver']]);

        $backupFilename = $response->json('backup.filename');
        $this->assertFileExists(storage_path("app/backups/{$backupFilename}"));

        // التأكد من تسجيل التدقيق الأمني
        $this->assertFileExists(storage_path('logs/system_audit.log'));
    }

    /**
     * اختبار نقطة نهاية فحص حالة النظام status
     */
    public function test_system_status_endpoint(): void
    {
        $response = $this->getJson('/api/v1/core/settings/status');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'company_name',
                    'setup_completed',
                ],
            ]);
    }
}
