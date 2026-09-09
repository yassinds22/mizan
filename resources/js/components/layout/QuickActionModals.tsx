import React from "react";
import { Modal } from "@/components/ui/Modal";

interface QuickActionModalsProps {
  modal: "invoice" | "receive" | null;
  onClose: () => void;
  onSubmit: () => void;
}

export const QuickActionModals: React.FC<QuickActionModalsProps> = ({
  modal,
  onClose,
  onSubmit,
}) => {
  if (!modal) return null;

  const isInvoice = modal === "invoice";

  return (
    <Modal
      isOpen={Boolean(modal)}
      onClose={onClose}
      title={isInvoice ? "فاتورة بيع سريعة" : "استلام مخزون سريع"}
      subtitle={
        isInvoice
          ? "واجهة مختصرة للمبيعات اليومية"
          : "تسجيل دفعة مع تاريخ الصلاحية"
      }
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn btn-primary" onClick={onSubmit}>
            {isInvoice ? "حفظ الفاتورة" : "تأكيد الاستلام"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        {isInvoice ? (
          <>
            <label className="label">
              العميل
              <select defaultValue="سوبرماركت الواحة">
                <option>سوبرماركت الواحة</option>
                <option>تموينات الرائد</option>
                <option>مطاعم البحر الأحمر</option>
              </select>
            </label>
            <label className="label">
              طريقة الدفع
              <select defaultValue="نقدي">
                <option>نقدي</option>
                <option>آجل</option>
                <option>تحويل</option>
              </select>
            </label>
            <label className="label">
              الصنف
              <select defaultValue="أرز بسمتي 5 كجم">
                <option>أرز بسمتي 5 كجم</option>
                <option>زيت ذرة 1.8 لتر</option>
                <option>حليب كامل الدسم 1 لتر</option>
              </select>
            </label>
            <label className="label">
              الكمية
              <input defaultValue="10" />
            </label>
            <label className="label full">
              ملاحظة
              <textarea placeholder="خصم قرب صلاحية، توصيل..." />
            </label>
          </>
        ) : (
          <>
            <label className="label">
              أمر الشراء
              <select defaultValue="PO-260904">
                <option>PO-260904</option>
                <option>PO-260828</option>
              </select>
            </label>
            <label className="label">
              المستودع
              <select defaultValue="المستودع الرئيسي">
                <option>المستودع الرئيسي</option>
                <option>الثلاجة 1</option>
                <option>المجمدات</option>
              </select>
            </label>
            <label className="label">
              الصنف
              <select defaultValue="أرز بسمتي 5 كجم">
                <option>أرز بسمتي 5 كجم</option>
                <option>دجاج مجمد 1 كجم</option>
              </select>
            </label>
            <label className="label">
              الكمية
              <input defaultValue="50" />
            </label>
            <label className="label">
              رقم الدفعة
              <input defaultValue="B-4531" />
            </label>
            <label className="label">
              تاريخ الانتهاء
              <input type="date" defaultValue="2027-03-12" />
            </label>
          </>
        )}
      </div>
    </Modal>
  );
};
