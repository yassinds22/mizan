<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Core;

use App\Domains\Core\Models\PermissionAuditLog;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * استعراض سجل الرقابة والتدقيق التاريخي للصلاحيات والمستخدمين
     */
    public function index(Request $request): JsonResponse
    {
        $query = PermissionAuditLog::with(['actor:id,name,email', 'targetUser:id,name,email', 'branch:id,name'])
            ->orderBy('id', 'desc');

        if ($request->filled('target_user_id')) {
            $query->where('target_user_id', $request->query('target_user_id'));
        }

        if ($request->filled('actor_id')) {
            $query->where('actor_id', $request->query('actor_id'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->query('action'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->query('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->query('date_to'));
        }

        $logs = $query->paginate((int) $request->query('per_page', 25));

        $data = $logs->map(function (PermissionAuditLog $log) {
            return [
                'id' => $log->id,
                'action' => $log->action,
                'actor_name' => $log->actor?->name ?? 'النظام الآلي',
                'target_user_name' => $log->targetUser?->name ?? 'غير محدد',
                'target_user_id' => $log->target_user_id,
                'permission_name' => $log->permission_name,
                'role_name' => $log->role_name,
                'branch_name' => $log->branch?->name,
                'ip_address' => $log->ip_address,
                'notes' => $log->notes,
                'created_at' => $log->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $data,
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'total' => $logs->total(),
        ]);
    }
}
