import React, { useState, useEffect } from "react";
import { Plus, Search, RefreshCw, Edit2, CheckCircle2, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { money } from "@/utils/formatters";
import { purchasesApi, Supplier } from "@/api/purchases";
import { SupplierModal } from "./SupplierModal";

interface SuppliersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSupplier?: (supplier: Supplier) => void;
}

export const SuppliersListModal: React.FC<SuppliersListModalProps> = ({
  isOpen,
  onClose,
  onSelectSupplier,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await purchasesApi.getSuppliers({ search: search || undefined, per_page: 100 });
      setSuppliers(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
    }
  }, [isOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSuppliers();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="دليل الموردين والحسابات الدائنة"
        subtitle="استعراض وإدارة بطاقات الموردين ومتابعة الأرصدة الحالية"
        maxWidth="800px"
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingSupplier(null);
                setShowAddModal(true);
              }}
              style={{ background: "#059669" }}
            >
              <Plus size={15} /> إضافة مورد جديد
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              إغلاق
            </button>
          </div>
        }
      >
        <div style={{ direction: "rtl", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <Search size={15} />
              <input
                placeholder="بحث باسم المورد، الكود، أو الرقم الضريبي..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-ghost" onClick={loadSuppliers}>
              <RefreshCw size={14} className={loading ? "spin" : ""} /> تحديث
            </button>
          </form>

          {/* Table */}
          <div style={{ maxHeight: 420, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <table className="data" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>اسم المورد</th>
                  <th>رقم الهاتف</th>
                  <th>الرقم الضريبي</th>
                  <th>الرصيد الدائن</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                      جاري تحميل بيانات الموردين...
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                      لا يوجد موردين مسجلين مطابقين للبحث.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{s.code}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{s.name_ar}</div>
                        {s.city && <span style={{ fontSize: 11, color: "#64748b" }}>{s.city}</span>}
                      </td>
                      <td style={{ fontFamily: "monospace" }}>{s.phone || "—"}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 11 }}>{s.tax_number || "—"}</td>
                      <td style={{ fontFamily: "monospace", fontWeight: 800, color: s.balance > 0 ? "#b45309" : "#059669" }}>
                        {money(s.balance)}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {onSelectSupplier && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ height: 28, padding: "0 8px", fontSize: 11 }}
                              onClick={() => {
                                onSelectSupplier(s);
                                onClose();
                              }}
                            >
                              اختيار
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ height: 28, padding: "0 8px", fontSize: 11 }}
                            onClick={() => {
                              setEditingSupplier(s);
                              setShowAddModal(true);
                            }}
                            title="تعديل بيانات المورد"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Supplier Modal */}
      <SupplierModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        supplierToEdit={editingSupplier}
        onSuccess={() => {
          loadSuppliers();
        }}
      />
    </>
  );
};
