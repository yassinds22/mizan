<?php

declare(strict_types=1);

namespace App\Models;

use App\Domains\Core\Models\Branch;
use App\Domains\Core\Models\PermissionAuditLog;
use App\Domains\Core\Models\UserBranch;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'is_active',
        'is_super_admin',
        'branch_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'is_super_admin' => 'boolean',
        ];
    }

    /**
     * الفرع الرئيسي المرتبط به المستخدم
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    /**
     * جميع الفروع المصرح للمستخدم بالوصول إليها
     */
    public function userBranches(): HasMany
    {
        return $this->hasMany(UserBranch::class, 'user_id');
    }

    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class, 'user_branches', 'user_id', 'branch_id')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    /**
     * سجلات الرقابة التي قام بها المستخدم كـ Actor
     */
    public function auditLogsPerformed(): HasMany
    {
        return $this->hasMany(PermissionAuditLog::class, 'actor_id');
    }

    /**
     * سجلات الرقابة التي استهدفت هذا المستخدم
     */
    public function auditLogsReceived(): HasMany
    {
        return $this->hasMany(PermissionAuditLog::class, 'target_user_id');
    }
}
