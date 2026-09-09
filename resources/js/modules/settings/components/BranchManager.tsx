import React, { useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Edit3,
  Trash2,
  Power,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { coreApi, BranchApi } from "@/api/core";

interface BranchManagerProps {
  branches: BranchApi[];
  onReload: () => void;
  onNotify: (msg: string) => void;
}

export const BranchManager: React.FC<BranchManagerProps> = ({
  branches,
  onReload,
  onNotify,
}) => {
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchApi | null>(null);

  // Form states
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const resetForm = () => {
    setFormCode("");
    setFormName("");
    setFormCity("");
    setFormAddress("");
    setFormIsActive(true);
    setSelectedBranch(null);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (branch: BranchApi) => {
    setSelectedBranch(branch);
    setFormCode(branch.code);
    setFormName(branch.name);
    setFormCity(branch.city || "");
    setFormAddress(branch.address || "");
    setFormIsActive(branch.is_active);
    setIsEditOpen(true);
  };

  const openDelete = (branch: BranchApi) => {
    setSelectedBranch(branch);
    setIsDeleteOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode || !formName) {
      onNotify("يرجى ملء كود الفرع واسمه");
      return;
    }
    setSubmitting(true);
    try {
      await coreApi.createBranch({
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        city: formCity.trim() || undefined,
        address: formAddress.trim() || undefined,
        is_active: formIsActive,
      });
      onNotify(`تم إنشاء الفرع (${formCode.toUpperCase()}) بنجاح`);
      setIsAddOpen(false);
      resetForm();
      onReload();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && Object.values(err.response.data.errors)[0]) ||
        "تعذر حفظ الفرع الجديد";
      onNotify(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setSubmitting(true);
    try {
      await coreApi.updateBranch(selectedBranch.id, {
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        city: formCity.trim() || undefined,
        address: formAddress.trim() || undefined,
        is_active: formIsActive,
      });
      onNotify(`تم تحديث بيانات الفرع (${formCode.toUpperCase()}) بنجاح`);
      setIsEditOpen(false);
      resetForm();
      onReload();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && Object.values(err.response.data.errors)[0]) ||
        "تعذر تحديث بيانات الفرع";
      onNotify(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBranch) return;
    setSubmitting(true);
    try {
      await coreApi.deleteBranch(selectedBranch.id);
      onNotify(`تم حذف الفرع (${selectedBranch.code}) بنجاح`);
      setIsDeleteOpen(false);
      resetForm();
      onReload();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && Object.values(err.response.data.errors)[0]) ||
        "فشل حذف الفرع";
      onNotify(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (branch: BranchApi) => {
    try {
      await coreApi.toggleBranch(branch.id);
      onNotify(`تم ${branch.is_active ? "تعطيل" : "تفعيل"} الفرع (${branch.code})`);
      onReload();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && Object.values(err.response.data.errors)[0]) ||
        "فشلت العملية";
      onNotify(String(msg));
    }
  };

  const filteredBranches = branches.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      b.code.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      (b.city && b.city.toLowerCase().includes(q))
    );
  });

  return (
    <section className="panel" style={{ background: "#fff", display: "flex", flexDirection: "column" }}>
      {/* ترويسة اللوحة مع زر الإضافة والبحث */}
      <div
        className="panel-head"
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 size={18} color="#059669" /> فروع الشركة ومراكز التوزيع ({branches.length})
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
            إدارة كاملة (CRUD) متصلة بـ Service و Repository في الباك إند
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="btn"
            onClick={onReload}
            title="تحديث القائمة من قاعدة البيانات"
            style={{ padding: "6px 10px", fontSize: 12 }}
          >
            <RefreshCw size={13} />
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={openAdd}
            style={{
              fontSize: 13,
              padding: "7px 14px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 700,
            }}
          >
            <Plus size={15} /> إضافة فرع جديد
          </button>
        </div>
      </div>

      {/* شريط البحث السريع */}
      <div style={{ padding: "12px 20px 0" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={15}
            color="#94a3b8"
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بكود الفرع، الاسم، أو المدينة..."
            style={{
              width: "100%",
              padding: "8px 36px 8px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
        </div>
      </div>

      {/* قائمة الفروع */}
      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 18 }}>
        {filteredBranches.length > 0 ? (
          filteredBranches.map((b) => (
            <div
              key={b.id}
              style={{
                padding: "14px 18px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                background: b.is_active ? "#ffffff" : "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                opacity: b.is_active ? 1 : 0.75,
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: b.is_active ? "#ecfdf5" : "#f1f5f9",
                    color: b.is_active ? "#059669" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  <Building2 size={18} />
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{b.name}</span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        background: "#e2e8f0",
                        color: "#334155",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {b.code}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        background: b.is_active ? "#dcfce7" : "#fee2e2",
                        color: b.is_active ? "#15803d" : "#991b1b",
                        padding: "1px 7px",
                        borderRadius: 10,
                        fontWeight: 700,
                      }}
                    >
                      {b.is_active ? "نشط" : "معطل"}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 4,
                    }}
                  >
                    <MapPin size={12} color="#94a3b8" />
                    <span>{b.city || "المدينة غير محددة"}</span>
                    {b.address && <span>· {b.address}</span>}
                  </div>
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* زر التفعيل/التعطيل */}
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleToggle(b)}
                  title={b.is_active ? "تعطيل الفرع" : "تفعيل الفرع"}
                  style={{
                    padding: "6px 9px",
                    color: b.is_active ? "#059669" : "#94a3b8",
                  }}
                >
                  <Power size={14} />
                </button>

                {/* زر التعديل */}
                <button
                  type="button"
                  className="btn"
                  onClick={() => openEdit(b)}
                  title="تعديل بيانات الفرع"
                  style={{ padding: "6px 9px", color: "#2563eb" }}
                >
                  <Edit3 size={14} />
                </button>

                {/* زر الحذف */}
                <button
                  type="button"
                  className="btn"
                  onClick={() => openDelete(b)}
                  title="حذف الفرع"
                  style={{ padding: "6px 9px", color: "#dc2626" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            لا توجد فروع مطابقة لمعايير البحث
          </div>
        )}
      </div>

      {/* ================= MODAL: إضافة فرع ================= */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="إضافة فرع أو مركز توزيع جديد"
        subtitle="يتم حفظ الفرع مباشرة في قاعدة البيانات عبر الـ API"
      >
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <label className="label">
              كود الفرع (Code) *
              <input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="BR-DMM-03"
                maxLength={50}
                style={{ fontFamily: "monospace", fontWeight: 700 }}
                required
              />
            </label>

            <label className="label">
              اسم الفرع الرسمي *
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="فرع الدمام — مستودع الشرقية"
                required
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <label className="label">
              المدينة
              <input
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                placeholder="الدمام"
              />
            </label>

            <label className="label">
              العنوان التفصيلي
              <input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="المنطقة الصناعية الثانية، طريق الميناء"
              />
            </label>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
              background: "#f8fafc",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
            />
            <span style={{ fontWeight: 600 }}>تنشيط الفرع فور إنشائه لاستقبال الحركات المخزنية والمالية</span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => setIsAddOpen(false)}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "جاري الإنشاء..." : "إنشاء الفرع"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: تعديل فرع ================= */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`تعديل بيانات الفرع: ${selectedBranch?.code || ""}`}
        subtitle="تحديث الكود أو المسمى أو الموقع الجغرافي"
      >
        <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <label className="label">
              كود الفرع *
              <input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="BR-RUH-01"
                maxLength={50}
                style={{ fontFamily: "monospace", fontWeight: 700 }}
                required
              />
            </label>

            <label className="label">
              اسم الفرع *
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="اسم الفرع"
                required
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <label className="label">
              المدينة
              <input value={formCity} onChange={(e) => setFormCity(e.target.value)} />
            </label>

            <label className="label">
              العنوان التفصيلي
              <input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            </label>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
              background: "#f8fafc",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
            />
            <span style={{ fontWeight: 600 }}>حالة نشاط الفرع</span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => setIsEditOpen(false)}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "جاري التحديث..." : "حفظ التعديلات"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: تأكيد الحذف ================= */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="تأكيد حذف الفرع"
        subtitle="تحذير: لا يمكن التراجع عن عملية الحذف بعد تأكيدها"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              borderRadius: 8,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
            }}
          >
            <AlertTriangle size={20} color="#dc2626" />
            <div>
              هل أنت متأكد من رغبتك في حذف الفرع <strong>"{selectedBranch?.name}"</strong> ({selectedBranch?.code})؟
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => setIsDeleteOpen(false)}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleDelete}
              disabled={submitting}
              style={{ background: "#dc2626", color: "#fff", border: "none", fontWeight: 700 }}
            >
              {submitting ? "جاري الحذف..." : "نعم، حذف الفرع"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
};
