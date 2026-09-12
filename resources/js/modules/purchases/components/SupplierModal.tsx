import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { purchasesApi, Supplier } from "@/api/purchases";

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit?: Supplier | null;
  onSuccess: (supplier: Supplier) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    tax_number: "",
    commercial_register: "",
    phone: "",
    email: "",
    city: "الرياض",
    address: "",
    payment_terms_days: 30,
    credit_limit: 50000,
  });

  useEffect(() => {
    if (supplierToEdit) {
      setFormData({
        name_ar: supplierToEdit.name_ar || "",
        name_en: supplierToEdit.name_en || "",
        tax_number: supplierToEdit.tax_number || "",
        commercial_register: supplierToEdit.commercial_register || "",
        phone: supplierToEdit.phone || "",
        email: supplierToEdit.email || "",
        city: supplierToEdit.city || "الرياض",
        address: supplierToEdit.address || "",
        payment_terms_days: supplierToEdit.payment_terms_days || 30,
        credit_limit: supplierToEdit.credit_limit || 50000,
      });
    } else {
      setFormData({
        name_ar: "",
        name_en: "",
        tax_number: "",
        commercial_register: "",
        phone: "",
        email: "",
        city: "الرياض",
        address: "",
        payment_terms_days: 30,
        credit_limit: 50000,
      });
    }
    setError(null);
  }, [isOpen, supplierToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_ar.trim()) {
      setError("اسم المورد التجاري بالعربية مطلوب.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let saved: Supplier;
      if (supplierToEdit?.id) {
        saved = await purchasesApi.updateSupplier(supplierToEdit.id, formData);
      } else {
        saved = await purchasesApi.createSupplier(formData);
      }
      onSuccess(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || "فشل حفظ بيانات المورد");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplierToEdit ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
      subtitle="تسجيل وتحديث بيانات الموردين لمتابعة الاستحقاقات وفواتير الشراء"
      maxWidth="620px"
      footer={
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ background: "#059669" }}
          >
            {submitting ? "جارِ الحفظ..." : "حفظ المورد"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ direction: "rtl", display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#991b1b", borderRadius: 6, fontSize: 13 }}>
            {error}
          </div>
        )}

        <label className="label">
          <span>اسم المورد التجاري *</span>
          <input
            type="text"
            required
            placeholder="مثال: شركة المراعي للصناعات الغذائية"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            autoFocus
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label className="label">
            <span>الرقم الضريبي (15 رقم)</span>
            <input
              type="text"
              placeholder="3xxxxxxxxxxxxxx"
              value={formData.tax_number}
              onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
            />
          </label>

          <label className="label">
            <span>رقم الهاتف / الجوال</span>
            <input
              type="text"
              placeholder="05xxxxxxxx"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label className="label">
            <span>المدينة</span>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </label>

          <label className="label">
            <span>السجل التجاري</span>
            <input
              type="text"
              value={formData.commercial_register}
              onChange={(e) => setFormData({ ...formData, commercial_register: e.target.value })}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label className="label">
            <span>شروط السداد (بالأيام)</span>
            <input
              type="number"
              min={0}
              value={formData.payment_terms_days}
              onChange={(e) => setFormData({ ...formData, payment_terms_days: Number(e.target.value) || 0 })}
            />
          </label>

          <label className="label">
            <span>الحد الائتماني (ر.س)</span>
            <input
              type="number"
              min={0}
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) || 0 })}
            />
          </label>
        </div>
      </form>
    </Modal>
  );
};
