import axios from "axios";

export interface AppUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  branch_id?: number | null;
  branch_name?: string | null;
  roles: { id: number; name: string }[];
  primary_role: string;
  created_at?: string;
}

export interface RoleItem {
  id: number;
  name: string;
  permissions_count: number;
  users_count: number;
  permissions: string[];
}

export interface UserPermissionMatrixItem {
  id: number;
  name: string;
  module: string;
  source: "role" | "direct" | "none";
  is_direct: boolean;
  is_role: boolean;
  is_effective: boolean;
  can_toggle: boolean;
}

export interface AuditLogItem {
  id: number;
  action: string;
  actor_name: string;
  target_user_name: string;
  target_user_id: number;
  permission_name?: string | null;
  role_name?: string | null;
  branch_name?: string | null;
  ip_address?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export const accessControlApi = {
  // 1. المستخدمون
  async getUsers(params?: { search?: string; branch_id?: string; is_active?: string }): Promise<PaginatedResponse<AppUser>> {
    const res = await axios.get("/api/v1/core/users", { params });
    return res.data;
  },

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    branch_id?: number | null;
    role?: string;
    is_active?: boolean;
  }): Promise<{ message: string; user: AppUser }> {
    const res = await axios.post("/api/v1/core/users", data);
    return res.data;
  },

  async updateUser(
    id: number,
    data: {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      branch_id?: number | null;
      role?: string;
      is_active?: boolean;
    }
  ): Promise<{ message: string; user: AppUser }> {
    const res = await axios.put(`/api/v1/core/users/${id}`, data);
    return res.data;
  },

  async toggleUserActive(id: number): Promise<{ message: string; is_active: boolean }> {
    const res = await axios.patch(`/api/v1/core/users/${id}/toggle-active`);
    return res.data;
  },

  // 2. مصفوفة الصلاحيات
  async getUserPermissions(id: number): Promise<{
    user_id: number;
    user_name: string;
    is_super_admin: boolean;
    primary_role: string;
    permissions: UserPermissionMatrixItem[];
  }> {
    const res = await axios.get(`/api/v1/core/users/${id}/permissions`);
    return res.data;
  },

  async toggleUserPermission(
    id: number,
    permission: string,
    reason?: string
  ): Promise<{
    message: string;
    result: {
      permission: string;
      is_direct: boolean;
      is_effective: boolean;
    };
  }> {
    const res = await axios.post(`/api/v1/core/users/${id}/permissions/toggle`, {
      permission,
      reason,
    });
    return res.data;
  },

  // 3. الأدوار
  async getRoles(): Promise<{ roles: RoleItem[]; all_permissions: string[] }> {
    const res = await axios.get("/api/v1/core/roles");
    return res.data;
  },

  async updateRolePermissions(roleId: number | string, permissions: string[]): Promise<{ message: string; role: RoleItem }> {
    const res = await axios.put(`/api/v1/core/roles/${roleId}/permissions`, { permissions });
    return res.data;
  },

  // 4. سجل التدقيق الرقابي
  async getAuditLogs(params?: {
    target_user_id?: number;
    action?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<PaginatedResponse<AuditLogItem>> {
    const res = await axios.get("/api/v1/core/audit-logs", { params });
    return res.data;
  },
};
