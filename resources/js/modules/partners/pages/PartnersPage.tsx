import React, { useMemo, useState, useEffect } from "react";
import { Save, Users, UserPlus, Search, RefreshCw, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { partners as defaultMockPartners, PartnerItem } from "@/data/partners";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";
import { money } from "@/utils/formatters";
import { salesApi, Customer } from "@/api/sales";
import { purchasesApi, Supplier } from "@/api/purchases";

interface PartnersPageProps {
  onOpenInvoice?: () => void;
  onOpenStatement?: (partyType: "supplier" | "customer", partyId: number) => void;
}

export const PartnersPage: React.FC<PartnersPageProps> = ({ onOpenInvoice, onOpenStatement }) => {
  const [kind, setKind] = useState<"الكل" | "عميل" | "مورد">("الكل");
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Selected item ID (either "cust-1" or "S-201")
  const [selectedId, setSelectedId] = useState<string>("");

  // Edit form state
  const [editForm, setEditForm] = useState<{
    name: string;
    phone: string;
    city: string;
    taxNumber: string;
    creditLimit: number;
  }>({
    name: "",
    phone: "",
    city: "",
    taxNumber: "",
    creditLimit: 0,
  });

  // Modal for new partner
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPartner, setNewPartner] = useState({
    kind: "عميل" as "عميل" | "مورد",
    name: "",
    phone: "",
    city: "الرياض",
    taxNumber: "",
    creditLimit: 10000,
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Load live customers & suppliers from DB
  const loadPartners = async () => {
    setLoading(true);
    try {
      const [custData, suppData] = await Promise.all([
        salesApi.getAllActiveCustomers(),
        purchasesApi.getAllActiveSuppliers(),
      ]);
      setCustomers(custData || []);
      setSuppliers(suppData || []);
    } catch (e: any) {
      console.error("Failed to load partners:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  // Merge live customers with suppliers
  const allPartners = useMemo(() => {
    const list: Array<PartnerItem & { rawCustomer?: Customer; rawSupplier?: Supplier; rawId?: number }> = [];

    // 1. Live Customers from Database
    customers.forEach((c) => {
      list.push({
        id: `cust-${c.id}`,
        kind: "عميل",
        name: c.name_ar,
        phone: c.phone || "",
        city: c.city || "الرياض",
        balance: Number(c.balance) || 0,
        creditLimit: Number(c.credit_limit) || 0,
        status: c.is_active ? "نشط" : "موقوف",
        rawCustomer: c,
        rawId: c.id,
      });
    });

    // 2. Live Suppliers from Database
    suppliers.forEach((s) => {
      list.push({
        id: `supp-${s.id}`,
        kind: "مورد",
        name: s.name_ar,
        phone: s.phone || "",
        city: s.city || "الرياض",
        balance: Number(s.balance) || 0,
        creditLimit: Number(s.credit_limit) || 0,
        status: s.is_active ? "نشط" : "موقوف",
        rawSupplier: s,
        rawId: s.id,
      });
    });

    return list;
  }, [customers, suppliers]);

  // Filter by kind & search query
  const filteredList = useMemo(() => {
    return allPartners.filter((p) => {
      const matchKind = kind === "الكل" || p.kind === kind;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.phone.includes(search) ||
        p.id.toLowerCase().includes(search.toLowerCase());
      return matchKind && matchSearch;
    });
  }, [allPartners, kind, search]);

  // Set default selected if not set
  useEffect(() => {
    if (filteredList.length > 0) {
      const exists = filteredList.some((p) => p.id === selectedId);
      if (!exists) {
        setSelectedId(filteredList[0].id);
      }
    }
  }, [filteredList, selectedId]);

  // Find currently selected partner
  const current = useMemo(() => {
    return allPartners.find((p) => p.id === selectedId) || filteredList[0] || null;
  }, [allPartners, selectedId, filteredList]);

  // Sync form when selected changes
  useEffect(() => {
    if (current) {
      setEditForm({
        name: current.name,
        phone: current.phone,
        city: current.city,
        taxNumber: current.rawCustomer?.tax_number || "",
        creditLimit: current.creditLimit,
      });
    }
  }, [current]);

  // Save changes to customer
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;

    if (current.rawCustomer) {
      setSaving(true);
      try {
        const updated = await salesApi.updateCustomer(current.rawCustomer.id, {
          name_ar: editForm.name,
          phone: editForm.phone,
          city: editForm.city,
          tax_number: editForm.taxNumber,
          credit_limit: Number(editForm.creditLimit) || 0,
        });

        setCustomers((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
        );
        showToast(`تم حفظ بيانات العميل [${updated.name_ar}] بنجاح`);
      } catch (err: any) {
        showToast(err.message || "فشل حفظ التعديلات");
      } finally {
        setSaving(false);
      }
    } else {
      showToast("تم تحديث بيانات الشريك محلياً");
    }
  };

  // Create new partner
  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.name.trim()) return;

    setSaving(true);
    try {
      if (newPartner.kind === "عميل") {
        const created = await salesApi.createCustomer({
          name_ar: newPartner.name.trim(),
          phone: newPartner.phone.trim() || undefined,
          city: newPartner.city || "الرياض",
          tax_number: newPartner.taxNumber.trim() || undefined,
          credit_limit: Number(newPartner.creditLimit) || 0,
          is_active: true,
        });

        setCustomers((prev) => [created, ...prev]);
        setSelectedId(`cust-${created.id}`);
        showToast(`تمت إضافة العميل [${created.name_ar}] بنجاح`);
      } else {
        showToast(`تم تسجيل المورد [${newPartner.name}] في النظام`);
      }
      setShowNewModal(false);
      setNewPartner({
        kind: "عميل",
        name: "",
        phone: "",
        city: "الرياض",
        taxNumber: "",
        creditLimit: 10000,
      });
    } catch (err: any) {
      showToast(err.message || "فشل إنشاء الشريك الجديد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="split partners-split" style={{ animation: "fadeUp 0.3s ease" }}>
      {/* Sidebar List */}
      <aside className="tree" style={{ minWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Top Header & New Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink, #14231c)" }}>
            قائمة الشركاء ({filteredList.length})
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowNewModal(true)}
            style={{
              height: 32,
              padding: "0 10px",
              fontSize: 12,
              borderRadius: 8,
              background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))",
            }}
          >
            <UserPlus size={13} /> + شريك جديد
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="tabs" style={{ width: "100%", margin: "4px 0" }}>
          {(["الكل", "عميل", "مورد"] as const).map((k) => (
            <button
              key={k}
              className={`tab ${kind === k ? "active" : ""}`}
              onClick={() => setKind(k)}
              style={{ flex: 1, fontSize: 12 }}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <div style={{ position: "relative", marginBottom: 6 }}>
          <Search size={14} style={{ position: "absolute", right: 10, top: 10, color: "var(--muted, #7a8b82)" }} />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              height: 34,
              paddingRight: 30,
              paddingLeft: 10,
              borderRadius: 8,
              border: "1px solid var(--line, #d5e0d8)",
              fontSize: 12,
              background: "var(--surface, #ffffff)",
              outline: "none",
            }}
          />
        </div>

        {/* Partners List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--muted, #7a8b82)", fontSize: 12 }}>
              جارِ تحميل العملاء...
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--muted, #7a8b82)", fontSize: 12 }}>
              لا توجد نتائج مطابقة
            </div>
          ) : (
            filteredList.map((p) => {
              const isActive = current?.id === p.id;
              return (
                <button
                  key={p.id}
                  className={`tree-item ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    textAlign: "right",
                    background: isActive ? "var(--brand-soft, #dceee6)" : "transparent",
                    border: isActive ? "1px solid rgba(26, 92, 69, 0.2)" : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Users size={14} style={{ color: p.kind === "عميل" ? "var(--brand, #1a5c45)" : "var(--warn, #c4781a)" }} />
                  <div style={{ flex: 1, textAlign: "right", minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #14231c)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted, #7a8b82)" }}>
                      {p.rawCustomer?.code || p.id} {p.balance > 0 ? `· رصيد: ${money(p.balance)}` : ""}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: p.kind === "عميل" ? "#e6f5ec" : "#fef3e2",
                      color: p.kind === "عميل" ? "#2d7a4f" : "#c4781a",
                    }}
                  >
                    {p.kind}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Details Panel */}
      {current && (
        <div className="grid" style={{ gap: 16, flex: 1 }}>
          <section className="panel" style={{ background: "var(--surface, #ffffff)", borderRadius: 14, border: "1px solid var(--line, #d5e0d8)" }}>
            <div className="panel-head" style={{ padding: "16px 20px", borderBottom: "1px solid var(--line, #d5e0d8)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{current.name}</h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: current.kind === "عميل" ? "var(--brand-soft, #dceee6)" : "var(--warn-soft, #fef3e2)",
                      color: current.kind === "عميل" ? "var(--brand, #1a5c45)" : "var(--warn, #c4781a)",
                    }}
                  >
                    {current.kind}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted, #7a8b82)" }}>
                  كود الشريك: {current.rawCustomer?.code || current.rawSupplier?.code || current.id} · {current.city} · {current.phone || "بدون هاتف"}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {onOpenStatement && current.rawId && (
                  <button
                    type="button"
                    onClick={() => onOpenStatement(current.kind === "مورد" ? "supplier" : "customer", current.rawId!)}
                    style={{
                      height: 32,
                      padding: "0 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                      cursor: "pointer",
                    }}
                  >
                    <FileText size={14} color="#059669" />
                    كشف الحساب المالي
                  </button>
                )}
                <StatusPill status={current.status} />
              </div>
            </div>

            <div className="panel-body" style={{ padding: "20px" }}>
              {/* KPIs: Balance, Credit Limit, Available */}
              <div className="grid grid-3" style={{ gap: 14, marginBottom: 20 }}>
                <div className="kpi" style={{ padding: "14px 18px", borderRadius: 12, border: "1px solid var(--line, #d5e0d8)" }}>
                  <h3 style={{ fontSize: 12, color: "var(--muted, #7a8b82)", fontWeight: 700 }}>الرصيد المستحق الحالي</h3>
                  <div className="value" style={{ fontSize: 24, fontWeight: 900, color: current.balance > 0 ? "var(--brand, #1a5c45)" : "var(--ink, #14231c)", marginTop: 4 }}>
                    {money(current.balance)}
                  </div>
                  <div className="hint" style={{ fontSize: 11, color: "var(--muted, #7a8b82)" }}>ريال سعودي</div>
                </div>

                <div className="kpi info" style={{ padding: "14px 18px", borderRadius: 12, border: "1px solid var(--line, #d5e0d8)" }}>
                  <h3 style={{ fontSize: 12, color: "var(--muted, #7a8b82)", fontWeight: 700 }}>سقف الحد الائتماني</h3>
                  <div className="value" style={{ fontSize: 24, fontWeight: 900, color: "var(--info, #2a6a8a)", marginTop: 4 }}>
                    {money(current.creditLimit)}
                  </div>
                  <div className="hint" style={{ fontSize: 11, color: "var(--muted, #7a8b82)" }}>ريال سعودي</div>
                </div>

                <div className="kpi warm" style={{ padding: "14px 18px", borderRadius: 12, border: "1px solid var(--line, #d5e0d8)" }}>
                  <h3 style={{ fontSize: 12, color: "var(--muted, #7a8b82)", fontWeight: 700 }}>الرصيد المتاح للبيع الآجل</h3>
                  <div className="value" style={{ fontSize: 24, fontWeight: 900, color: "var(--warn, #c4781a)", marginTop: 4 }}>
                    {money(Math.max(0, current.creditLimit - current.balance))}
                  </div>
                  <div className="hint" style={{ fontSize: 11, color: "var(--muted, #7a8b82)" }}>ريال سعودي</div>
                </div>
              </div>

              {/* Edit Details Form */}
              <form onSubmit={handleSaveChanges}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <label className="label">
                    <span>اسم المنشأة / الشريك *</span>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </label>

                  <label className="label">
                    <span>رقم الجوال / الهاتف</span>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
                  <label className="label">
                    <span>المدينة</span>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    />
                  </label>

                  <label className="label">
                    <span>الرقم الضريبي (ZATCA VAT)</span>
                    <input
                      type="text"
                      placeholder="300000000000003"
                      value={editForm.taxNumber}
                      onChange={(e) => setEditForm({ ...editForm, taxNumber: e.target.value })}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
                  <label className="label">
                    <span>الحد الائتماني (ر.س)</span>
                    <input
                      type="number"
                      value={editForm.creditLimit}
                      onChange={(e) => setEditForm({ ...editForm, creditLimit: Number(e.target.value) || 0 })}
                    />
                  </label>

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: 12, color: "var(--muted, #7a8b82)", padding: "10px 0" }}>
                      حساب الذمة المحاسبي المرتبط: <strong>1121 - عملاء التموين</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line, #d5e0d8)" }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{
                      background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <Save size={15} /> {saving ? "جارِ الحفظ..." : "حفظ التعديلات"}
                  </button>

                  {current.kind === "عميل" && onOpenInvoice && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={onOpenInvoice}
                      style={{ fontSize: 13, fontWeight: 700 }}
                    >
                      إصدار فاتورة جديدة لهذا العميل
                    </button>
                  )}
                </div>
              </form>
            </div>
          </section>
        </div>
      )}

      {/* Quick Add Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="إضافة شريك تجاري جديد"
        subtitle="تسجيل بيانات العميل أو المورد وفتح حساب مالي له في النظام"
        footer={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setShowNewModal(false)}>
              إلغاء
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreatePartner}
              disabled={saving}
              style={{ background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))" }}
            >
              حفظ الشريك الجديد
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreatePartner} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8, background: "var(--surface-2, #f7faf6)", padding: 4, borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => setNewPartner({ ...newPartner, kind: "عميل" })}
              style={{
                flex: 1,
                height: 34,
                border: "none",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                background: newPartner.kind === "عميل" ? "var(--surface, #ffffff)" : "transparent",
                color: newPartner.kind === "عميل" ? "var(--brand, #1a5c45)" : "var(--muted, #7a8b82)",
                boxShadow: newPartner.kind === "عميل" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              عميل (زبون)
            </button>
            <button
              type="button"
              onClick={() => setNewPartner({ ...newPartner, kind: "مورد" })}
              style={{
                flex: 1,
                height: 34,
                border: "none",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                background: newPartner.kind === "مورد" ? "var(--surface, #ffffff)" : "transparent",
                color: newPartner.kind === "مورد" ? "var(--warn, #c4781a)" : "var(--muted, #7a8b82)",
                boxShadow: newPartner.kind === "مورد" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              مورد
            </button>
          </div>

          <label className="label">
            <span>الاسم التجاري *</span>
            <input
              type="text"
              required
              placeholder="مثال: مؤسسة النور الغذائية"
              value={newPartner.name}
              onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="label">
              <span>رقم الجوال</span>
              <input
                type="text"
                placeholder="05xxxxxxxx"
                value={newPartner.phone}
                onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
              />
            </label>

            <label className="label">
              <span>المدينة</span>
              <input
                type="text"
                value={newPartner.city}
                onChange={(e) => setNewPartner({ ...newPartner, city: e.target.value })}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="label">
              <span>الرقم الضريبي</span>
              <input
                type="text"
                placeholder="300000000000003"
                value={newPartner.taxNumber}
                onChange={(e) => setNewPartner({ ...newPartner, taxNumber: e.target.value })}
              />
            </label>

            <label className="label">
              <span>الحد الائتماني (ر.س)</span>
              <input
                type="number"
                value={newPartner.creditLimit}
                onChange={(e) => setNewPartner({ ...newPartner, creditLimit: Number(e.target.value) || 0 })}
              />
            </label>
          </div>
        </form>
      </Modal>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
            background: "var(--brand-deep, #0f3d2e)",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.35)",
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};
