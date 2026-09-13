import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Shield,
  UserCheck,
  UserX,
  Plus,
  Search,
  RefreshCw,
  Key,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building,
  Mail,
  Phone,
  Lock,
  Layers,
  Sliders,
  Check,
  X,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  accessControlApi,
  AppUser,
  RoleItem,
  UserPermissionMatrixItem,
  AuditLogItem,
} from "@/api/accessControl";
import { coreApi, BranchApi } from "@/api/core";

const MODULE_NAMES: Record<string, string> = {
  sales: "المبيعات والعملاء",
  purchases: "المشتريات والموردين",
  inventory: "المستودعات والمخزون",
  accounting: "الحسابات العامة ودفتر الأستاذ",
  treasury: "الخزينة وسندات القبض والصرف",
  products: "الأصناف والتسعير",
  expiry: "تتبع الصلاحية ومحرك FEFO",
  reports: "التقارير والقوائم المالية",
  users: "إدارة المستخدمين",
  roles: "إدارة الأدوار",
  settings: "إعدادات المنشأة والنظام",
  general: "صلاحيات عامة",
};

const PERMISSION_LABELS: Record<string, string> = {
  "users.view": "استعراض المستخدمين",
  "users.create": "إضافة مستخدم جديد",
  "users.update": "تعديل بيانات المستخدمين",
  "users.activate": "تفعيل الحسابات",
  "users.deactivate": "تعطيل وتجميد الحسابات",
  "users.roles.assign": "إسناد وتغيير الأدوار",
  "users.permissions.manage": "منح وسحب الصلاحيات المباشرة",
  "roles.view": "استعراض الأدوار",
  "roles.create": "إنشاء أدوار جديدة",
  "roles.update": "تعديل صلاحيات الدور",
  "roles.delete": "حذف الأدوار",
  "roles.permissions.manage": "إدارة مصفوفة الأدوار",
  "settings.view": "استعراض إعدادات النظام",
  "settings.company.update": "تعديل الهوية والسجل التجاري",
  "settings.branches.manage": "إدارة الفروع ومراكز التوزيع",
  "settings.tax.manage": "إدارة فئات ونسب الضريبة",
  "settings.invoice_template.manage": "تخصيص قالب وتذييل الفاتورة",
  "settings.currencies.manage": "إدارة العملات وأسعار الصرف",
  "accounting.chart.view": "استعراض شجرة الحسابات",
  "accounting.chart.manage": "إضافة وتعديل الحسابات التحليلية",
  "accounting.journals.view": "استعراض قيود اليومية",
  "accounting.journals.create": "إنشاء قيود يومية يدوية",
  "accounting.journals.post": "ترحيل قيود اليومية اليدوية",
  "accounting.journals.reverse": "عكس القيود المحاسبية وتصحيحها",
  "accounting.period.close": "إقفال الفترات والشهور المالية",
  "accounting.period.reopen": "إعادة فتح الفترات المغلقة",
  "accounting.statements.view": "استخراج كشوفات حساب العملاء والموردين",
  "accounting.ledger.view": "استعراض دفتر الأستاذ العام للحسابات",
  "products.view": "استعراض سجل الأصناف الغذائية",
  "products.create": "تعريف وإضافة أصناف جديدة",
  "products.update": "تعديل بطاقة الصنف وظروف الحفظ",
  "products.prices.manage": "تعديل مستويات الأسعار وتكلفة الشراء",
  "products.units.manage": "إدارة تعدد الوحدات والباركودات",
  "inventory.view": "استعراض أرصدة المخزون والدفعات",
  "inventory.warehouses.manage": "إدارة المستودعات والمواقع التخزينية",
  "inventory.locations.manage": "إدارة الأرفف والممرات الداخلية",
  "inventory.movements.view": "استعراض حركات المخزون والتحويلات",
  "inventory.movements.create": "تسجيل أذون التحويل والصرف والاستلام",
  "inventory.movements.post": "ترحيل أذون المخزون في دفتر الأستاذ",
  "inventory.stocktake.manage": "فتح وتدوين جلسات الجرد الفعلي",
  "inventory.stocktake.post": "اعتماد وترحيل تسويات الجرد والعجز",
  "inventory.waste.create": "تسجيل بضاعة تالفة ومنتهية الصلاحية",
  "inventory.waste.post": "إتلاف وترحيل خسائر الهدر الغذائي",
  "inventory.valuation.view": "استعراض تقرير تقييم المخزون المالي",
  "purchases.suppliers.view": "استعراض بطاقات الموردين",
  "purchases.suppliers.create": "إضافة مورد جديد",
  "purchases.suppliers.update": "تعديل بيانات الموردين وحدود الائتمان",
  "purchases.invoices.view": "استعراض فواتير الشراء",
  "purchases.invoices.create": "إنشاء فواتير شراء ومسودات",
  "purchases.invoices.post": "ترحيل فواتير الشراء وتحديث التكلفة والمخزون",
  "purchases.returns.view": "استعراض مردودات المشتريات",
  "purchases.returns.create": "إنشاء مردودات مشتريات وإشعارات مدينة",
  "purchases.returns.post": "ترحيل مردودات المشتريات وتخفيض رصيد المورد",
  "sales.customers.view": "استعراض بطاقات العملاء",
  "sales.customers.create": "إضافة عميل جديد",
  "sales.customers.update": "تعديل بيانات العميل والحدود الائتمانية",
  "sales.invoices.view": "استعراض فواتير المبيعات",
  "sales.invoices.create": "إنشاء فواتير بيع كاش أو آجل",
  "sales.invoices.post": "ترحيل فواتير البيع وتوليد رمز ZATCA QR",
  "sales.invoices.print": "طباعة الفاتورة الحرارية والمكتبية A4",
  "sales.returns.view": "استعراض مردودات المبيعات",
  "sales.returns.create": "إنشاء مردودات مبيعات وإشعارات دائنة",
  "sales.returns.post": "ترحيل المردودات واسترداد المخزون والضريبة",
  "sales.discounts.manage": "منح وتعديل الخصومات في المبيعات",
  "treasury.vouchers.view": "استعراض سندات القبض والصرف",
  "treasury.vouchers.create": "إنشاء سندات قبض وصرف ومصروفات",
  "treasury.vouchers.post": "ترحيل السندات والتأثير على الصندوق والبنك",
  "treasury.vouchers.reverse": "إلغاء وعكس السندات المالية",
  "expiry.dashboard.view": "مراقبة لوحة تنبيهات الصلاحية المبكرة",
  "expiry.fefo.view": "استعراض مقترحات صرف الأسبق صلاحية أولاً",
  "inventory.fefo.override": "صلاحية تجاوز ترتيب FEFO عند الصرف",
  "reports.trial_balance.view": "الاطلاع على ميزان المراجعة",
  "reports.profit_loss.view": "الاطلاع على قائمة الأرباح والخسائر",
  "reports.balance_sheet.view": "الاطلاع على الميزانية العمومية",
  "reports.vat.view": "استعراض إقرار ضريبة القيمة المضافة ZATCA",
  "reports.aging.view": "استعراض تقرير أعمار ديون العملاء والموردين",
  "reports.export": "تصدير وطباعة التقارير الرسمية",
};

export const UsersRolesPage: React.FC = () => {
  // 1. التبويب النشط
  const [activeTab, setActiveTab] = useState<"users" | "permissions" | "audit">("users");

  // 2. حالة المستخدمين
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [branches, setBranches] = useState<BranchApi[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [userSearch, setUserSearch] = useState<string>("");

  // 3. حالة مصفوفة الصلاحيات
  const [permissionsMatrix, setPermissionsMatrix] = useState<UserPermissionMatrixItem[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState<boolean>(false);
  const [permissionSearch, setPermissionSearch] = useState<string>("");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("all");

  // 4. حالة سجل التدقيق
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  // 5. النوافذ المنبثقة (Modals)
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [userModalMode, setUserModalMode] = useState<"create" | "edit">("create");
  const [userFormData, setUserFormData] = useState({
    id: 0,
    name: "",
    email: "",
    password: "",
    phone: "",
    branch_id: null as number | null,
    role: "sales_representative",
    is_active: true,
  });

  const [confirmDeactivateUser, setConfirmDeactivateUser] = useState<AppUser | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // تحميل المستخدمين والأدوار والفروع
  const loadInitialData = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        accessControlApi.getUsers(),
        accessControlApi.getRoles(),
        coreApi.getBranches(),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.roles);
      setBranches(branchesRes);

      if (usersRes.data.length > 0 && !selectedUser) {
        setSelectedUser(usersRes.data[0]);
      }
    } catch (err) {
      console.error("Failed to load users & roles data", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // تحميل مصفوفة الصلاحيات للمستخدم المختار
  const loadUserPermissions = useCallback(async (userId: number) => {
    try {
      setLoadingPermissions(true);
      const res = await accessControlApi.getUserPermissions(userId);
      setPermissionsMatrix(res.permissions);
    } catch (err) {
      console.error("Failed to load user permissions", err);
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUser && activeTab === "permissions") {
      loadUserPermissions(selectedUser.id);
    }
  }, [selectedUser, activeTab, loadUserPermissions]);

  // تحميل سجل التدقيق
  const loadAuditLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const res = await accessControlApi.getAuditLogs();
      setAuditLogs(res.data);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "audit") {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  // تفعيل / تعطيل الحساب (Active Kill-Switch)
  const handleToggleActive = async (user: AppUser) => {
    if (user.is_active) {
      // إذا كان نشطاً، نظهر نافذة التحذير والتأكيد أولاً
      setConfirmDeactivateUser(user);
    } else {
      // إذا كان معطلاً، نفعل الحساب مباشرة
      executeToggleActive(user.id);
    }
  };

  const executeToggleActive = async (userId: number) => {
    try {
      const res = await accessControlApi.toggleUserActive(userId);
      showToast(res.message);
      setConfirmDeactivateUser(null);
      loadInitialData();
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, is_active: res.is_active } : null));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "فشلت العملية");
    }
  };

  // تبديل الصلاحية المباشرة (Toggle Direct Permission)
  const handleTogglePermission = async (permissionName: string) => {
    if (!selectedUser) return;
    try {
      const res = await accessControlApi.toggleUserPermission(selectedUser.id, permissionName);
      showToast(res.message);

      // تحديث الحالة محلياً فورياً لسلاسة الواجهة
      setPermissionsMatrix((prev) =>
        prev.map((p) => {
          if (p.name === permissionName) {
            const isDirect = res.result.is_direct;
            return {
              ...p,
              is_direct: isDirect,
              source: isDirect ? "direct" : p.is_role ? "role" : "none",
              is_effective: res.result.is_effective,
            };
          }
          return p;
        })
      );
    } catch (err: any) {
      alert(err.response?.data?.message || "فشل تعديل الصلاحية");
    }
  };

  // فتح نافذة إنشاء مستخدم
  const handleOpenCreateModal = () => {
    setUserModalMode("create");
    setUserFormData({
      id: 0,
      name: "",
      email: "",
      password: "",
      phone: "",
      branch_id: branches[0]?.id || null,
      role: roles[0]?.name || "sales_representative",
      is_active: true,
    });
    setShowUserModal(true);
  };

  // فتح نافذة تعديل مستخدم
  const handleOpenEditModal = (user: AppUser) => {
    setUserModalMode("edit");
    setUserFormData({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      branch_id: user.branch_id || null,
      role: user.roles[0]?.name || "sales_representative",
      is_active: user.is_active,
    });
    setShowUserModal(true);
  };

  // حفظ بيانات المستخدم (إنشاء أو تعديل)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (userModalMode === "create") {
        await accessControlApi.createUser({
          name: userFormData.name,
          email: userFormData.email,
          password: userFormData.password,
          phone: userFormData.phone || undefined,
          branch_id: userFormData.branch_id,
          role: userFormData.role,
          is_active: userFormData.is_active,
        });
        showToast("تم إنشاء المستخدم بنجاح");
      } else {
        await accessControlApi.updateUser(userFormData.id, {
          name: userFormData.name,
          email: userFormData.email,
          password: userFormData.password || undefined,
          phone: userFormData.phone || undefined,
          branch_id: userFormData.branch_id,
          role: userFormData.role,
          is_active: userFormData.is_active,
        });
        showToast("تم تحديث بيانات المستخدم بنجاح");
      }
      setShowUserModal(false);
      loadInitialData();
    } catch (err: any) {
      alert(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    }
  };

  // فلترة المستخدمين
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q))
    );
  }, [users, userSearch]);

  // تجميع الصلاحيات حسب النطاق (Modules)
  const groupedPermissions = useMemo(() => {
    let filtered = permissionsMatrix;

    if (selectedModuleFilter !== "all") {
      filtered = filtered.filter((p) => p.module === selectedModuleFilter);
    }

    if (permissionSearch.trim()) {
      const q = permissionSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (PERMISSION_LABELS[p.name] && PERMISSION_LABELS[p.name].toLowerCase().includes(q))
      );
    }

    const groups: Record<string, UserPermissionMatrixItem[]> = {};
    for (const item of filtered) {
      const mod = item.module || "general";
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(item);
    }
    return groups;
  }, [permissionsMatrix, selectedModuleFilter, permissionSearch]);

  const uniqueModules = useMemo(() => {
    const set = new Set(permissionsMatrix.map((p) => p.module));
    return Array.from(set);
  }, [permissionsMatrix]);

  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  const toggleModuleCollapse = (mod: string) => {
    setCollapsedModules((prev) => ({ ...prev, [mod]: !prev[mod] }));
  };

  const expandAllModules = () => setCollapsedModules({});
  const collapseAllModules = () => {
    const all: Record<string, boolean> = {};
    uniqueModules.forEach((m) => {
      all[m] = true;
    });
    setCollapsedModules(all);
  };

  const permissionStats = useMemo(() => {
    const total = permissionsMatrix.length;
    const effective = permissionsMatrix.filter((p) => p.is_effective).length;
    const fromRole = permissionsMatrix.filter((p) => p.source === "role").length;
    const direct = permissionsMatrix.filter((p) => p.source === "direct").length;
    const denied = total - effective;
    const percent = total > 0 ? Math.round((effective / total) * 100) : 0;
    return { total, effective, fromRole, direct, denied, percent };
  }, [permissionsMatrix]);

  const moduleCounts = useMemo(() => {
    const counts: Record<string, { total: number; effective: number }> = {};
    for (const p of permissionsMatrix) {
      const mod = p.module || "general";
      if (!counts[mod]) counts[mod] = { total: 0, effective: 0 };
      counts[mod].total++;
      if (p.is_effective) counts[mod].effective++;
    }
    return counts;
  }, [permissionsMatrix]);

  return (
    <div style={{ padding: "0 8px 40px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #059669, #10b981)",
            color: "#fff",
            padding: "12px 28px",
            borderRadius: 12,
            boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 9999,
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          <CheckCircle2 size={20} />
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
          background: "var(--card-bg, #fff)",
          padding: "16px 20px",
          borderRadius: 16,
          border: "1px solid var(--border-color, #e2e8f0)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <Shield size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>المستخدمون والصلاحيات (RBAC)</h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #64748b)" }}>
              إدارة حسابات الفريق، ربط الأدوار، والصلاحيات المباشرة مع سجل التدقيق التاريخي
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            background: "var(--panel-bg, #f1f5f9)",
            padding: 4,
            borderRadius: 12,
            gap: 4,
          }}
        >
          <button
            onClick={() => setActiveTab("users")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              background: activeTab === "users" ? "#fff" : "transparent",
              color: activeTab === "users" ? "#2563eb" : "var(--text, #334155)",
              boxShadow: activeTab === "users" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.2s",
            }}
          >
            <UserCheck size={16} /> المستخدمون ({users.length})
          </button>

          <button
            onClick={() => setActiveTab("permissions")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              background: activeTab === "permissions" ? "#fff" : "transparent",
              color: activeTab === "permissions" ? "#2563eb" : "var(--text, #334155)",
              boxShadow: activeTab === "permissions" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.2s",
            }}
          >
            <Sliders size={16} /> مصفوفة الصلاحيات الفردية
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              background: activeTab === "audit" ? "#fff" : "transparent",
              color: activeTab === "audit" ? "#2563eb" : "var(--text, #334155)",
              boxShadow: activeTab === "audit" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.2s",
            }}
          >
            <History size={16} /> سجل الرقابة والتدقيق (Audit Trail)
          </button>
        </div>

        {/* Action Button */}
        {activeTab === "users" && (
          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 700,
              fontSize: 13,
              padding: "8px 16px",
              borderRadius: 10,
            }}
          >
            <Plus size={16} /> إضافة مستخدم جديد
          </button>
        )}
      </div>

      {/* ==================== TAB 1: USERS ==================== */}
      {activeTab === "users" && (
        <div>
          {/* Search Bar */}
          <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search
                size={18}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted, #94a3b8)",
                }}
              />
              <input
                type="text"
                placeholder="ابحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border-color, #cbd5e1)",
                  fontSize: 14,
                }}
              />
            </div>
            <button
              onClick={loadInitialData}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={16} /> تحديث
            </button>
          </div>

          {/* Users Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 16,
            }}
          >
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                style={{
                  background: "var(--card-bg, #fff)",
                  borderRadius: 16,
                  border: `1px solid ${
                    user.is_active ? "var(--border-color, #e2e8f0)" : "#fecaca"
                  }`,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                  opacity: user.is_active ? 1 : 0.85,
                  transition: "all 0.2s",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: user.is_super_admin
                            ? "linear-gradient(135deg, #f59e0b, #d97706)"
                            : user.is_active
                            ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                            : "#94a3b8",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 18,
                        }}
                      >
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                            {user.name}
                          </h3>
                          {user.is_super_admin && (
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#b45309",
                                padding: "2px 6px",
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              المدير العام
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--muted, #64748b)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 2,
                          }}
                        >
                          <Mail size={12} /> {user.email}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: user.is_active ? "#dcfce7" : "#fee2e2",
                        color: user.is_active ? "#15803d" : "#b91c1c",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {user.is_active ? (
                        <>
                          <CheckCircle2 size={12} /> مفعّل
                        </>
                      ) : (
                        <>
                          <XCircle size={12} /> معطّل
                        </>
                      )}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div
                    style={{
                      background: "var(--panel-bg, #f8fafc)",
                      padding: "10px 14px",
                      borderRadius: 10,
                      fontSize: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted, #64748b)" }}>الدور الوظيفي:</span>
                      <strong style={{ color: "#2563eb" }}>
                        {user.primary_role || "مستخدم"}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted, #64748b)" }}>الفرع:</span>
                      <strong>{user.branch_name || "كافة الفروع"}</strong>
                    </div>
                    {user.phone && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted, #64748b)" }}>الجوال:</span>
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    borderTop: "1px solid var(--border-color, #f1f5f9)",
                    paddingTop: 12,
                  }}
                >
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setActiveTab("permissions");
                    }}
                    className="btn btn-secondary"
                    style={{
                      flex: 1,
                      fontSize: 12,
                      padding: "6px 10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <Key size={14} /> الصلاحيات
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(user)}
                    className="btn btn-secondary"
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                    }}
                  >
                    تعديل
                  </button>

                  <button
                    onClick={() => handleToggleActive(user)}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "none",
                      fontWeight: 700,
                      cursor: "pointer",
                      background: user.is_active ? "#fee2e2" : "#dcfce7",
                      color: user.is_active ? "#b91c1c" : "#15803d",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {user.is_active ? (
                      <>
                        <UserX size={14} /> تعطيل
                      </>
                    ) : (
                      <>
                        <UserCheck size={14} /> تفعيل
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: PERMISSIONS MATRIX (COMPACT UX) ==================== */}
      {activeTab === "permissions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 1. User Selector & Quick Controls */}
          <div
            style={{
              background: "var(--card-bg, #fff)",
              padding: "16px 20px",
              borderRadius: 16,
              border: "1px solid var(--border-color, #e2e8f0)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: "#1e293b" }}>
                المستخدم المستهدف:
              </span>
              <select
                value={selectedUser?.id || ""}
                onChange={(e) => {
                  const u = users.find((x) => x.id === Number(e.target.value));
                  if (u) setSelectedUser(u);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #cbd5e1",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1e293b",
                  background: "#fff",
                  minWidth: 260,
                }}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — [{u.primary_role}] {u.is_super_admin ? "★ مدير عام" : ""}
                  </option>
                ))}
              </select>

              {selectedUser?.is_super_admin && (
                <span
                  style={{
                    background: "#fef3c7",
                    color: "#92400e",
                    padding: "6px 14px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    border: "1px solid #fde68a",
                  }}
                >
                  <Shield size={15} /> المدير العام يتجاوز كافة القيود ويمتلك كل الصلاحيات تلقائياً
                </span>
              )}
            </div>

            {/* Quick Actions & Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
                <input
                  type="text"
                  placeholder="بحث سريع في الصلاحيات..."
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  style={{
                    padding: "8px 36px 8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color, #cbd5e1)",
                    fontSize: 13,
                    width: 220,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={expandAllModules}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, fontWeight: 700 }}
                  title="توسيع كافة الأقسام"
                >
                  توسيع الكل
                </button>
                <button
                  type="button"
                  onClick={collapseAllModules}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, fontWeight: 700 }}
                  title="طي كافة الأقسام"
                >
                  طي الكل
                </button>
              </div>
            </div>
          </div>

          {/* 2. Executive Summary Metrics Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {/* Total */}
            <div
              style={{
                background: "#fff",
                padding: "14px 18px",
                borderRadius: 14,
                border: "1px solid var(--border-color, #e2e8f0)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                }}
              >
                <SlidersHorizontal size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                  إجمالي صلاحيات النظام
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
                  {permissionStats.total} صلاحية
                </div>
              </div>
            </div>

            {/* Role Inherited */}
            <div
              style={{
                background: "#fff",
                padding: "14px 18px",
                borderRadius: 14,
                border: "1px solid var(--border-color, #e2e8f0)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#dbeafe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1d4ed8",
                }}
              >
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                  مفعلة من الدور الوظيفي
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8" }}>
                  {permissionStats.fromRole} موروثة
                </div>
              </div>
            </div>

            {/* Direct Overrides */}
            <div
              style={{
                background: "#fff",
                padding: "14px 18px",
                borderRadius: 14,
                border: "1px solid var(--border-color, #e2e8f0)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#ede9fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6d28d9",
                }}
              >
                <Key size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                  صلاحيات مباشرة استثنائية
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#6d28d9" }}>
                  {permissionStats.direct} استثناء
                </div>
              </div>
            </div>

            {/* Denied / Locked */}
            <div
              style={{
                background: "#fff",
                padding: "14px 18px",
                borderRadius: 14,
                border: "1px solid var(--border-color, #e2e8f0)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#b91c1c",
                }}
              >
                <Lock size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                  صلاحيات محجوبة عن الحساب
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
                  {permissionStats.denied} محجوبة
                </div>
              </div>
            </div>
          </div>

          {/* 3. Module Tabs / Pills Bar (Quick Navigation) */}
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4,
              scrollbarWidth: "none",
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedModuleFilter("all")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 20,
                border: "1px solid",
                borderColor: selectedModuleFilter === "all" ? "#2563eb" : "#e2e8f0",
                background: selectedModuleFilter === "all" ? "#2563eb" : "#fff",
                color: selectedModuleFilter === "all" ? "#fff" : "#334155",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              <span>كافة الأقسام</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "1px 7px",
                  borderRadius: 10,
                  background: selectedModuleFilter === "all" ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                  color: selectedModuleFilter === "all" ? "#fff" : "#64748b",
                }}
              >
                {permissionStats.effective}/{permissionStats.total}
              </span>
            </button>

            {uniqueModules.map((mod) => {
              const counts = moduleCounts[mod] || { total: 0, effective: 0 };
              const isSelected = selectedModuleFilter === mod;
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setSelectedModuleFilter(mod)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    borderRadius: 20,
                    border: "1px solid",
                    borderColor: isSelected ? "#2563eb" : "#e2e8f0",
                    background: isSelected ? "#2563eb" : "#fff",
                    color: isSelected ? "#fff" : "#334155",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s",
                  }}
                >
                  <span>{MODULE_NAMES[mod] || mod}</span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: isSelected
                        ? "rgba(255,255,255,0.25)"
                        : counts.effective > 0
                        ? "#dcfce7"
                        : "#f1f5f9",
                      color: isSelected
                        ? "#fff"
                        : counts.effective > 0
                        ? "#15803d"
                        : "#64748b",
                      fontWeight: 800,
                    }}
                  >
                    {counts.effective}/{counts.total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 4. Permissions Compact Grid By Module */}
          {loadingPermissions ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--muted, #64748b)" }}>
              <RefreshCw size={28} className="spin" style={{ marginBottom: 10 }} />
              <div>جاري تحميل مصفوفة الصلاحيات...</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Object.entries(groupedPermissions).map(([mod, perms]) => {
                const isCollapsed = Boolean(collapsedModules[mod]);
                const effectiveCount = perms.filter((p) => p.is_effective).length;
                const isAllActive = effectiveCount === perms.length;

                return (
                  <div
                    key={mod}
                    style={{
                      background: "var(--card-bg, #fff)",
                      borderRadius: 16,
                      border: "1px solid var(--border-color, #e2e8f0)",
                      overflow: "hidden",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                    }}
                  >
                    {/* Module Accordion Header */}
                    <div
                      onClick={() => toggleModuleCollapse(mod)}
                      style={{
                        background: isCollapsed ? "#fafafa" : "var(--panel-bg, #f8fafc)",
                        padding: "12px 18px",
                        borderBottom: isCollapsed ? "none" : "1px solid var(--border-color, #e2e8f0)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "background 0.2s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            color: "#64748b",
                            display: "flex",
                            alignItems: "center",
                            transition: "transform 0.2s",
                          }}
                        >
                          {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                        </div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1e293b" }}>
                          {MODULE_NAMES[mod] || mod}
                        </h3>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 12,
                            background: isAllActive ? "#dcfce7" : effectiveCount > 0 ? "#eff6ff" : "#f1f5f9",
                            color: isAllActive ? "#15803d" : effectiveCount > 0 ? "#2563eb" : "#64748b",
                          }}
                        >
                          {effectiveCount} من {perms.length} مفعلة
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                        {isCollapsed ? "انقر للعرض" : "انقر للطي"}
                      </div>
                    </div>

                    {/* Permissions Responsive 2/3 Column Grid */}
                    {!isCollapsed && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                          gap: 12,
                          padding: 16,
                          background: "#ffffff",
                        }}
                      >
                        {perms.map((p) => {
                          const isDirect = p.is_direct;
                          const isRole = p.is_role;
                          const isEffective = p.is_effective;

                          return (
                            <div
                              key={p.id}
                              style={{
                                borderRadius: 12,
                                border: isDirect
                                  ? "1.5px solid #c4b5fd"
                                  : isEffective
                                  ? "1px solid #bbf7d0"
                                  : "1px solid #e2e8f0",
                                background: isDirect
                                  ? "#faf5ff"
                                  : isEffective
                                  ? "#f0fdf4"
                                  : "#ffffff",
                                padding: "12px 14px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                gap: 10,
                                transition: "all 0.15s ease",
                                boxShadow: isDirect ? "0 2px 8px rgba(124, 58, 237, 0.08)" : "none",
                              }}
                            >
                              {/* Top row: Label and Action Toggle */}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: 8,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 800,
                                      color: isEffective ? "#0f172a" : "#475569",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {PERMISSION_LABELS[p.name] || p.name}
                                  </div>
                                  <code
                                    style={{
                                      fontSize: 10,
                                      color: "#64748b",
                                      background: "rgba(0,0,0,0.04)",
                                      padding: "1px 5px",
                                      borderRadius: 4,
                                      marginTop: 4,
                                      display: "inline-block",
                                    }}
                                  >
                                    {p.name}
                                  </code>
                                </div>

                                {/* Compact Action Switch Button */}
                                <div>
                                  {isDirect ? (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePermission(p.name)}
                                      disabled={selectedUser?.is_super_admin}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        padding: "4px 10px",
                                        borderRadius: 8,
                                        border: "1px solid #fca5a5",
                                        background: "#fef2f2",
                                        color: "#b91c1c",
                                        fontSize: 11,
                                        fontWeight: 800,
                                        cursor: selectedUser?.is_super_admin ? "not-allowed" : "pointer",
                                        whiteSpace: "nowrap",
                                      }}
                                      title="انقر لإلغاء هذا الاستثناء المباشر"
                                    >
                                      <X size={12} /> إلغاء الاستثناء
                                    </button>
                                  ) : isRole ? (
                                    <span
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        padding: "4px 8px",
                                        borderRadius: 8,
                                        background: "#dcfce7",
                                        color: "#15803d",
                                        fontSize: 11,
                                        fontWeight: 800,
                                        whiteSpace: "nowrap",
                                      }}
                                      title="مفعلة تلقائياً من خلال الدور الوظيفي للمستخدم"
                                    >
                                      <Check size={12} /> بالدور
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePermission(p.name)}
                                      disabled={selectedUser?.is_super_admin}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        padding: "4px 10px",
                                        borderRadius: 8,
                                        border: "1px solid #cbd5e1",
                                        background: "#f8fafc",
                                        color: "#2563eb",
                                        fontSize: 11,
                                        fontWeight: 800,
                                        cursor: selectedUser?.is_super_admin ? "not-allowed" : "pointer",
                                        whiteSpace: "nowrap",
                                      }}
                                      title="انقر لمنح هذا المستخدم صلاحية مباشرة استثنائية"
                                    >
                                      <Plus size={12} /> فتح مباشر
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Bottom row: source tag */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  borderTop: "1px dashed #f1f5f9",
                                  paddingTop: 8,
                                  fontSize: 11,
                                }}
                              >
                                {isDirect ? (
                                  <span
                                    style={{
                                      color: "#7c3aed",
                                      fontWeight: 700,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    🟣 صلاحية مباشرة مخصصة
                                  </span>
                                ) : isRole ? (
                                  <span
                                    style={{
                                      color: "#16a34a",
                                      fontWeight: 700,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    🟢 موروثة من الدور
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontWeight: 600 }}>
                                    ⚪ محجوبة
                                  </span>
                                )}

                                <span style={{ color: "#94a3b8", fontSize: 10 }}>
                                  {p.module}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: AUDIT TRAIL ==================== */}
      {activeTab === "audit" && (
        <div
          style={{
            background: "var(--card-bg, #fff)",
            borderRadius: 16,
            border: "1px solid var(--border-color, #e2e8f0)",
            padding: 20,
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                سجل الرقابة والتدقيق التاريخي للصلاحيات (Audit Trail)
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #64748b)" }}>
                سجل دائم غير قابل للحذف يوثق كل عملية فتح أو إغلاق صلاحية أو تفعيل حساب
              </p>
            </div>
            <button
              onClick={loadAuditLogs}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={16} /> تحديث السجل
            </button>
          </div>

          {loadingAudit ? (
            <div style={{ textAlign: "center", padding: 40 }}>جاري تحميل سجل التدقيق...</div>
          ) : auditLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted, #64748b)" }}>
              لا توجد حركات رقابية مسجلة بعد.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr
                    style={{
                      background: "var(--panel-bg, #f8fafc)",
                      borderBottom: "2px solid var(--border-color, #e2e8f0)",
                      textAlign: "right",
                    }}
                  >
                    <th style={{ padding: "10px 14px" }}>التاريخ والوقت</th>
                    <th style={{ padding: "10px 14px" }}>الإجراء</th>
                    <th style={{ padding: "10px 14px" }}>منفذ الإجراء (Actor)</th>
                    <th style={{ padding: "10px 14px" }}>المستهدف (Target)</th>
                    <th style={{ padding: "10px 14px" }}>الصلاحية / الدور</th>
                    <th style={{ padding: "10px 14px" }}>البيان والملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)" }}
                    >
                      <td style={{ padding: "10px 14px", color: "var(--muted, #64748b)" }}>
                        <Clock size={12} style={{ marginLeft: 4 }} />
                        {new Date(log.created_at).toLocaleString("ar-SA")}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              log.action === "granted" || log.action === "account_activated"
                                ? "#dcfce7"
                                : "#fee2e2",
                            color:
                              log.action === "granted" || log.action === "account_activated"
                                ? "#15803d"
                                : "#b91c1c",
                          }}
                        >
                          {log.action === "granted" && "منح صلاحية"}
                          {log.action === "revoked" && "سحب صلاحية"}
                          {log.action === "role_assigned" && "إسناد دور"}
                          {log.action === "account_activated" && "تفعيل حساب"}
                          {log.action === "account_deactivated" && "تعطيل حساب"}
                          {log.action === "user_created" && "إنشاء حساب"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 700 }}>{log.actor_name}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#2563eb" }}>
                        {log.target_user_name}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <code>{log.permission_name || log.role_name || "—"}</code>
                      </td>
                      <td style={{ padding: "10px 14px", color: "var(--muted, #64748b)" }}>
                        {log.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODAL: CREATE / EDIT USER ==================== */}
      {showUserModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 500,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 24px",
                background: "linear-gradient(135deg, #1e293b, #334155)",
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                {userModalMode === "create" ? "إضافة مستخدم جديد" : "تعديل بيانات المستخدم"}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ padding: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label className="label">
                  الاسم الكامل
                  <input
                    type="text"
                    required
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  />
                </label>

                <label className="label">
                  البريد الإلكتروني
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  />
                </label>

                <label className="label">
                  كلمة المرور {userModalMode === "edit" ? "(اتركها فارغة إذا لم ترغب بالتغيير)" : ""}
                  <input
                    type="password"
                    required={userModalMode === "create"}
                    placeholder="******"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label className="label">
                    الدور الوظيفي الأساسي
                    <select
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="label">
                    الفرع
                    <select
                      value={userFormData.branch_id || ""}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          branch_id: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    >
                      <option value="">كافة الفروع</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="label">
                  رقم الهاتف
                  <input
                    type="text"
                    placeholder="05xxxxxxxx"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 24,
                  borderTop: "1px solid var(--border-color, #e2e8f0)",
                  paddingTop: 16,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="btn btn-secondary"
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  {userModalMode === "create" ? "حفظ المستخدم" : "تحديث البيانات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CONFIRMATION MODAL: DEACTIVATE USER ==================== */}
      {confirmDeactivateUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 460,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              overflow: "hidden",
              padding: 24,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#b91c1c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800 }}>
              تأكيد تعطيل حساب المستخدم
            </h3>

            <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--muted, #64748b)", lineHeight: 1.6 }}>
              هل أنت متأكد من تعطيل حساب <strong>{confirmDeactivateUser.name}</strong>؟
              <br />
              <span style={{ color: "#b91c1c", fontWeight: 700 }}>
                لن يتمكن المستخدم من تسجيل الدخول أو استخدام النظام حتى إعادة التفعيل.
              </span>
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setConfirmDeactivateUser(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                إلغاء التراجع
              </button>
              <button
                onClick={() => executeToggleActive(confirmDeactivateUser.id)}
                style={{
                  flex: 1,
                  background: "#b91c1c",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "10px 16px",
                }}
              >
                نعم، تعطيل الحساب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersRolesPage;
