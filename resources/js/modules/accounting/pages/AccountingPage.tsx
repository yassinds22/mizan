import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Folder,
  FileText,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRightLeft,
  X,
} from "lucide-react";
import {
  accountingApi,
  AccountApi,
  AccountTreeApi,
  AccountTypeEnum,
  AccountNatureEnum,
  CreateAccountPayload,
} from "@/api/accounting";

interface AccountingPageProps {
  onOpenJournal: () => void;
}

const TYPE_COLORS: Record<AccountTypeEnum, { bg: string; text: string; border: string }> = {
  asset: { bg: "rgba(16, 185, 129, 0.12)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  liability: { bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  equity: { bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
  revenue: { bg: "rgba(139, 92, 246, 0.12)", text: "#8b5cf6", border: "rgba(139, 92, 246, 0.3)" },
  expense: { bg: "rgba(239, 68, 68, 0.12)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
};

export const AccountingPage: React.FC<AccountingPageProps> = ({ onOpenJournal }) => {
  const [tree, setTree] = useState<AccountTreeApi[]>([]);
  const [accounts, setAccounts] = useState<AccountApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetAccount, setTargetAccount] = useState<AccountApi | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<{
    code: string;
    name_ar: string;
    name_en: string;
    parent_id: string;
    type: AccountTypeEnum;
    nature: AccountNatureEnum;
    is_leaf: boolean;
    is_active: boolean;
    description: string;
  }>({
    code: "",
    name_ar: "",
    name_en: "",
    parent_id: "",
    type: "asset",
    nature: "debit",
    is_leaf: true,
    is_active: true,
    description: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [treeData, listData] = await Promise.all([
        accountingApi.getAccountTree(),
        accountingApi.getAccounts(),
      ]);
      setTree(treeData);
      setAccounts(listData);

      // Auto expand root accounts
      const initialExp: Record<number, boolean> = {};
      treeData.forEach((node) => {
        initialExp[node.id] = true;
        if (node.children) {
          node.children.forEach((c) => {
            initialExp[c.id] = true;
          });
        }
      });
      setExpandedNodes(initialExp);

      // Select first leaf or root if nothing selected
      if (!selectedAccountId && listData.length > 0) {
        setSelectedAccountId(listData[0].id);
      }
    } catch (e: any) {
      console.error("Failed to load chart of accounts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const openCreateModal = (parent?: AccountApi | AccountTreeApi) => {
    setFormError(null);
    setModalMode("create");
    setTargetAccount(null);

    if (parent) {
      setFormData({
        code: `${parent.code}0`,
        name_ar: "",
        name_en: "",
        parent_id: parent.id.toString(),
        type: parent.type.value,
        nature: parent.nature.value,
        is_leaf: true,
        is_active: true,
        description: "",
      });
    } else {
      setFormData({
        code: "",
        name_ar: "",
        name_en: "",
        parent_id: "",
        type: "asset",
        nature: "debit",
        is_leaf: true,
        is_active: true,
        description: "",
      });
    }
    setModalOpen(true);
  };

  const openEditModal = (account: AccountApi, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormError(null);
    setModalMode("edit");
    setTargetAccount(account);
    setFormData({
      code: account.code,
      name_ar: account.name_ar,
      name_en: account.name_en || "",
      parent_id: account.parent_id ? account.parent_id.toString() : "",
      type: account.type.value,
      nature: account.nature.value,
      is_leaf: account.is_leaf,
      is_active: account.is_active,
      description: account.description || "",
    });
    setModalOpen(true);
  };

  const handleDeleteAccount = async (account: AccountApi, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`هل أنت متأكد من حذف الحساب [${account.code} - ${account.name_ar}]؟`)) {
      return;
    }
    try {
      await accountingApi.deleteAccount(account.id);
      await loadData();
      if (selectedAccountId === account.id) {
        setSelectedAccountId(null);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.account?.[0] ||
        err.response?.data?.message ||
        "تعذر حذف الحساب المالي.";
      alert(msg);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const payload: CreateAccountPayload = {
        code: formData.code.trim(),
        name_ar: formData.name_ar.trim(),
        name_en: formData.name_en.trim() || undefined,
        parent_id: formData.parent_id ? parseInt(formData.parent_id, 10) : null,
        type: formData.type,
        nature: formData.nature,
        is_leaf: formData.is_leaf,
        is_active: formData.is_active,
        description: formData.description.trim() || undefined,
      };

      if (modalMode === "create") {
        const created = await accountingApi.createAccount(payload);
        setSelectedAccountId(created.id);
      } else if (targetAccount) {
        await accountingApi.updateAccount(targetAccount.id, payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors) {
        const first = Object.values(errors)[0] as string[];
        setFormError(first[0]);
      } else {
        setFormError(err.response?.data?.message || "حدث خطأ أثناء حفظ الحساب.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tree nodes recursively
  const filteredTree = useMemo(() => {
    const filterNode = (node: AccountTreeApi): AccountTreeApi | null => {
      // Type tab match
      const typeMatches = typeFilter === "all" || node.type.value === typeFilter;

      // Search match
      const search = searchTerm.trim().toLowerCase();
      const textMatches =
        !search ||
        node.code.toLowerCase().includes(search) ||
        node.name_ar.toLowerCase().includes(search) ||
        (node.name_en && node.name_en.toLowerCase().includes(search));

      const filteredChildren: AccountTreeApi[] = [];
      if (node.children) {
        node.children.forEach((c) => {
          const res = filterNode(c);
          if (res) filteredChildren.push(res);
        });
      }

      if (textMatches && typeMatches) {
        return { ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children };
      }

      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }

      return null;
    };

    return tree.map((n) => filterNode(n)).filter(Boolean) as AccountTreeApi[];
  }, [tree, typeFilter, searchTerm]);

  // Render tree item recursively
  const renderTreeItem = (node: AccountTreeApi, depth = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const isSelected = selectedAccountId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const typeColor = TYPE_COLORS[node.type.value] || { bg: "#eee", text: "#333", border: "#ccc" };

    return (
      <div key={node.id} style={{ display: "flex", flexDirection: "column" }}>
        <div
          onClick={() => setSelectedAccountId(node.id)}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 12px",
            paddingInlineStart: `${12 + depth * 22}px`,
            cursor: "pointer",
            borderRadius: "6px",
            background: isSelected ? "var(--accent-subtle, rgba(37, 99, 235, 0.08))" : "transparent",
            border: isSelected ? "1px solid var(--accent, #2563eb)" : "1px solid transparent",
            marginBottom: "2px",
            transition: "all 0.15s ease",
          }}
          className="tree-node-row"
        >
          {/* Expand / Collapse Icon */}
          <span
            onClick={(e) => toggleExpand(node.id, e)}
            style={{
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              opacity: hasChildren ? 0.8 : 0.2,
              marginInlineEnd: 4,
            }}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )
            ) : (
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor" }} />
            )}
          </span>

          {/* Node Folder / File Icon */}
          <span style={{ marginInlineEnd: 8, color: typeColor.text }}>
            {node.is_leaf ? <FileText size={16} /> : <Folder size={16} />}
          </span>

          {/* Code */}
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "12px",
              minWidth: "55px",
              color: isSelected ? "var(--accent, #2563eb)" : "var(--text-muted, #64748b)",
            }}
          >
            {node.code}
          </span>

          {/* Name */}
          <span
            style={{
              flex: 1,
              fontWeight: node.is_leaf ? 500 : 700,
              fontSize: "13px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {node.name_ar}
          </span>

          {/* Leaf or Head Badge */}
          {node.is_leaf ? (
            <span
              style={{
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                marginInlineEnd: 6,
              }}
            >
              تحليلي
            </span>
          ) : (
            <span
              style={{
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: "rgba(100, 116, 139, 0.1)",
                color: "#64748b",
                border: "1px solid rgba(100, 116, 139, 0.2)",
                marginInlineEnd: 6,
              }}
            >
              رئيسي
            </span>
          )}

          {/* Type Badge */}
          <span
            style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: typeColor.bg,
              color: typeColor.text,
              border: `1px solid ${typeColor.border}`,
            }}
          >
            {node.type.label}
          </span>
        </div>

        {/* Children Render */}
        {hasChildren && isExpanded && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {node.children!.map((child) => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Top Controls & KPI Cards */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>دليل الحسابات وشجرة المحاسبة</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted, #64748b)" }}>
            إدارة الهيكل المالي والشجري لقطاع الأغذية والتوزيع وفقاً لمعايير المحاسبة المعتمدة
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={loadData} title="تحديث البيانات">
            <RefreshCw size={15} className={loading ? "spin" : ""} /> تحديث
          </button>
          <button className="btn btn-primary" onClick={() => openCreateModal()}>
            <Plus size={15} /> حساب جديد
          </button>
          <button className="btn btn-accent" onClick={onOpenJournal} style={{ backgroundColor: "#0284c7", color: "#fff" }}>
            <ArrowRightLeft size={15} /> إنشاء قيد محاسبي
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Explorer Tree / Right Account Inspector */}
      <div className="split" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        {/* Left Tree Explorer */}
        <section className="panel" style={{ display: "flex", flexDirection: "column", height: "720px" }}>
          <div className="panel-head" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <div style={{ width: "100%" }}>
              {/* Type Filter Pills */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
                {[
                  { id: "all", label: "كافة الحسابات" },
                  { id: "asset", label: "الأصول" },
                  { id: "liability", label: "الخصوم" },
                  { id: "equity", label: "الملكية" },
                  { id: "revenue", label: "الإيرادات" },
                  { id: "expense", label: "المصروفات" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTypeFilter(tab.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: typeFilter === tab.id ? 700 : 500,
                      border: typeFilter === tab.id ? "1px solid var(--accent, #2563eb)" : "1px solid var(--border)",
                      backgroundColor: typeFilter === tab.id ? "var(--accent-subtle, rgba(37,99,235,0.1))" : "transparent",
                      color: typeFilter === tab.id ? "var(--accent, #2563eb)" : "inherit",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div style={{ position: "relative" }}>
                <Search
                  size={15}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}
                />
                <input
                  type="text"
                  placeholder="بحث بالكود أو الاسم العربي أو الإنجليزي..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 34px 8px 12px",
                    fontSize: "13px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--input-bg, transparent)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tree Scrollable Container */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 6px" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                جاري تحميل دليل الحسابات...
              </div>
            ) : filteredTree.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                لا توجد حسابات تطابق معايير البحث والفلترة.
              </div>
            ) : (
              filteredTree.map((node) => renderTreeItem(node))
            )}
          </div>
        </section>

        {/* Right Account Inspector Panel */}
        <section className="panel" style={{ display: "flex", flexDirection: "column" }}>
          {selectedAccount ? (
            <>
              <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 800,
                        fontSize: 16,
                        padding: "2px 8px",
                        borderRadius: 4,
                        backgroundColor: "var(--border)",
                      }}
                    >
                      {selectedAccount.code}
                    </span>
                    <h3 style={{ margin: 0 }}>{selectedAccount.name_ar}</h3>
                  </div>
                  {selectedAccount.name_en && (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", fontFamily: "sans-serif" }}>
                      {selectedAccount.name_en}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => openCreateModal(selectedAccount)}
                    title="إضافة حساب فرعي تحته"
                  >
                    <Plus size={14} /> فرعي
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => openEditModal(selectedAccount)}
                    title="تعديل بيانات الحساب"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleDeleteAccount(selectedAccount)}
                    title="حذف الحساب"
                    style={{ color: "#ef4444" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="panel-body" style={{ flex: 1 }}>
                {/* Status Notice */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                    backgroundColor: selectedAccount.can_post
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(245, 158, 11, 0.1)",
                    border: `1px solid ${
                      selectedAccount.can_post ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"
                    }`,
                  }}
                >
                  {selectedAccount.can_post ? (
                    <>
                      <CheckCircle2 size={18} color="#10b981" />
                      <div>
                        <strong style={{ color: "#10b981", fontSize: 13 }}>حساب تحليلي نشط (Leaf)</strong>
                        <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.85 }}>
                          مسموح بالترحيل المباشر عليه في كافة قيود اليومية وفواتير التوزيع.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={18} color="#f59e0b" />
                      <div>
                        <strong style={{ color: "#f59e0b", fontSize: 13 }}>حساب رئيسي / تجميعي (Aggregate)</strong>
                        <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.85 }}>
                          يُحظر الترحيل المباشر عليه، وتظهر أرصدته كإجمالي تجميعي للحسابات الفرعية التابعة له.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Account Details Table */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                  <div className="stat-row">
                    <span>نوع الحساب</span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontWeight: 600,
                        backgroundColor: TYPE_COLORS[selectedAccount.type.value]?.bg,
                        color: TYPE_COLORS[selectedAccount.type.value]?.text,
                      }}
                    >
                      {selectedAccount.type.label} (
                      {selectedAccount.type.is_balance_sheet ? "ميزانية عمومية" : "قائمة دخل"})
                    </span>
                  </div>

                  <div className="stat-row">
                    <span>طبيعة الحساب المحاسبية</span>
                    <strong style={{ color: selectedAccount.nature.value === "debit" ? "#10b981" : "#f59e0b" }}>
                      {selectedAccount.nature.label} ({selectedAccount.nature.value.toUpperCase()})
                    </strong>
                  </div>

                  <div className="stat-row">
                    <span>المستوى في الشجرة</span>
                    <strong>المستوى {selectedAccount.level}</strong>
                  </div>

                  <div className="stat-row">
                    <span>الحساب الأب (الرئيسي)</span>
                    <span>
                      {selectedAccount.parent_name ? (
                        `${selectedAccount.parent_code} — ${selectedAccount.parent_name}`
                      ) : (
                        <em style={{ opacity: 0.6 }}>حساب جذري رئيسي (Root)</em>
                      )}
                    </span>
                  </div>

                  <div className="stat-row">
                    <span>حالة النشاط</span>
                    <span>{selectedAccount.is_active ? "نشط" : "معطل"}</span>
                  </div>

                  {selectedAccount.description && (
                    <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>الوصف / البيان:</span>
                      <p style={{ margin: 0, lineHeight: 1.5 }}>{selectedAccount.description}</p>
                    </div>
                  )}
                </div>

                {/* Quick Action to create journal entry */}
                <div style={{ marginTop: 24 }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={onOpenJournal}
                  >
                    <ArrowRightLeft size={16} /> إنشاء قيد يومية مرتبط
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
              <Layers size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <p>اختر حساباً من الشجرة لعرض تفاصيله وبطاقته المحاسبية.</p>
            </div>
          )}
        </section>
      </div>

      {/* Create / Edit Account Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="panel"
            style={{
              width: "100%",
              maxWidth: 540,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="panel-head"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <h3 style={{ margin: 0 }}>
                {modalMode === "create" ? "إضافة حساب مالي جديد" : "تعديل الحساب المالي"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveForm}>
              <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {formError && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "#ef4444",
                      fontSize: 13,
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                  <label className="label">
                    كود الحساب *
                    <input
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="مثال: 1115"
                      style={{ fontFamily: "monospace", fontWeight: 700 }}
                    />
                  </label>

                  <label className="label">
                    اسم الحساب (بالعربية) *
                    <input
                      required
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      placeholder="مثال: حساب بنكي تشغيلي"
                    />
                  </label>
                </div>

                <label className="label">
                  اسم الحساب (بالإنجليزية)
                  <input
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="e.g. Operating Bank Account"
                  />
                </label>

                <label className="label">
                  الحساب الأب (الرئيسي)
                  <select
                    value={formData.parent_id}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const pAcc = accounts.find((a) => a.id.toString() === pid);
                      setFormData({
                        ...formData,
                        parent_id: pid,
                        type: pAcc ? pAcc.type.value : formData.type,
                        nature: pAcc ? pAcc.nature.value : formData.nature,
                      });
                    }}
                  >
                    <option value="">بدون حساب أب (حساب جذري رئيسي Root)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id.toString()}>
                        {"— ".repeat(Math.max(0, acc.level - 1))}
                        {acc.code} — {acc.name_ar}
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label className="label">
                    نوع الحساب *
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountTypeEnum })}
                    >
                      <option value="asset">أصول (Assets)</option>
                      <option value="liability">خصوم / التزامات (Liabilities)</option>
                      <option value="equity">حقوق ملكية (Equity)</option>
                      <option value="revenue">إيرادات (Revenues)</option>
                      <option value="expense">مصروفات (Expenses)</option>
                    </select>
                  </label>

                  <label className="label">
                    الطبيعة المحاسبية *
                    <select
                      value={formData.nature}
                      onChange={(e) => setFormData({ ...formData, nature: e.target.value as AccountNatureEnum })}
                    >
                      <option value="debit">مدين (Debit)</option>
                      <option value="credit">دائن (Credit)</option>
                    </select>
                  </label>
                </div>

                <div style={{ display: "flex", gap: 20, alignItems: "center", paddingTop: 4 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={formData.is_leaf}
                      onChange={(e) => setFormData({ ...formData, is_leaf: e.target.checked })}
                    />
                    <span>حساب تحليلي يقبل الترحيل المباشر (Leaf Account)</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span>حساب نشط</span>
                  </label>
                </div>

                <label className="label">
                  ملاحظات أو وصف الحساب
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="ملاحظات توضيحية لسياسة القيد على هذا الحساب..."
                  />
                </label>
              </div>

              <div
                className="panel-foot"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  borderTop: "1px solid var(--border)",
                  padding: "12px 16px",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "جاري الحفظ..." : modalMode === "create" ? "إنشاء الحساب" : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
