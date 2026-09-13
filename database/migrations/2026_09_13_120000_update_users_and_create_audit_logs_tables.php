<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. تحديث جدول المستخدمين لإضافة صمام الأمان وحالة الحساب والمدير العام
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('password');
            $table->boolean('is_super_admin')->default(false)->after('is_active');
            $table->string('phone', 50)->nullable()->after('email');
            $table->foreignId('branch_id')->nullable()->after('is_super_admin')->constrained('branches')->nullOnDelete();

            $table->index('is_active');
            $table->index('is_super_admin');
        });

        // 2. جدول الفروع المصرح بها للمستخدم (User Branches Scope)
        Schema::create('user_branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'branch_id']);
            $table->index('user_id');
            $table->index('branch_id');
        });

        // 3. جدول سجل الرقابة والتدقيق التاريخي للصلاحيات والمستخدمين (Audit Log)
        Schema::create('permission_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('target_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 50); // granted, revoked, role_assigned, role_removed, account_activated, account_deactivated, user_created, user_updated
            $table->string('permission_name', 100)->nullable();
            $table->string('role_name', 100)->nullable();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('actor_id');
            $table->index('target_user_id');
            $table->index('action');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('permission_audit_logs');
        Schema::dropIfExists('user_branches');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropIndex(['is_active']);
            $table->dropIndex(['is_super_admin']);
            $table->dropColumn(['is_active', 'is_super_admin', 'phone', 'branch_id']);
        });
    }
};
