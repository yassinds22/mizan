import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { AppUser } from "@/api/accessControl";

export function usePermissions() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAll = useCallback(async () => {
    const token = localStorage.getItem("mizan_auth_token");
    if (!token) {
      setCurrentUser(null);
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get("/api/v1/core/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const { user, permissions: perms } = res.data;

      setCurrentUser(user);
      setIsSuperAdmin(Boolean(user.is_super_admin));

      if (user.is_super_admin) {
        setPermissions(new Set()); // المدير العام يتجاوز كل الصلاحيات
      } else if (Array.isArray(perms)) {
        const activeSet = new Set<string>(
          perms.filter((p: any) => p.is_effective).map((p: any) => p.name)
        );
        setPermissions(activeSet);
      }
    } catch (e: any) {
      console.error("Failed to load authenticated user:", e);
      if (e.response && (e.response.status === 401 || e.response.status === 403)) {
        localStorage.removeItem("mizan_auth_token");
        window.dispatchEvent(new Event("mizan_auth_logout"));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();

    const handleUserChanged = () => {
      loadAll();
    };

    window.addEventListener("mizan_user_switched", handleUserChanged);
    return () => window.removeEventListener("mizan_user_switched", handleUserChanged);
  }, [loadAll]);

  const can = useCallback(
    (permissionName: string): boolean => {
      // إذا كان الحساب معطلاً: حظر تام
      if (currentUser && !currentUser.is_active) {
        return false;
      }
      // المدير العام يتجاوز كافة الصلاحيات
      if (isSuperAdmin) {
        return true;
      }
      return permissions.has(permissionName);
    },
    [isSuperAdmin, permissions, currentUser]
  );

  const hasRole = useCallback(
    (roleName: string): boolean => {
      if (currentUser && !currentUser.is_active) {
        return false;
      }
      if (isSuperAdmin) {
        return true;
      }
      return currentUser?.roles.some((r) => r.name === roleName) ?? false;
    },
    [isSuperAdmin, currentUser]
  );

  return {
    currentUser,
    isSuperAdmin,
    can,
    hasRole,
    loading,
    refresh: loadAll,
  };
};
