import React from "react";
import { Printer, X, FileText, ArrowDownLeft, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { money } from "@/utils/formatters";
import { tafqeet } from "@/utils/tafqeet";
import { PurchaseReturn } from "@/api/purchases";

interface DebitNotePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseReturn: PurchaseReturn | null;
  companySettings?: {
    company_name?: string;
    vat_number?: string;
    commercial_register?: string;
    address?: string;
    phone?: string;
  };
}

export const DebitNotePrintModal: React.FC<DebitNotePrintModalProps> = ({
  isOpen,
  onClose,
  purchaseReturn,
  companySettings = {
    company_name: "ميزان لتجارة وتوزيع المواد الغذائية",
    vat_number: "300000000000003",
    commercial_register: "1010000000",
    address: "المملكة العربية السعودية - المركز الرئيسي",
    phone: "+966 11 000 0000",
  },
}) => {
  if (!purchaseReturn) return null;

  const refundMethodLabel = matchRefundMethod(purchaseReturn.refund_method);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إشعار مدين / مردود مشتريات #${purchaseReturn.debit_note_number || purchaseReturn.return_number}`}
      subtitle="مستند رسمي معتمد لإثبات إرجاع البضاعة وتسوية الذمة المالية مع المورد"
      maxWidth="900px"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            إغلاق
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              padding: "0.6rem 1.6rem",
              borderRadius: "8px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Printer size={18} /> طباعة الإشعار المدين (A4)
          </button>
        </div>
      }
    >
      <div style={{ padding: "10px 4px", maxHeight: "74vh", overflowY: "auto", direction: "rtl", fontFamily: "inherit" }}>
        {/* Scoped Print CSS */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            body * {
              visibility: hidden;
            }
            #debit-note-print-area, #debit-note-print-area * {
              visibility: visible;
            }
            #debit-note-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: #fff;
            }
          }
        `}</style>

        <div
          id="debit-note-print-area"
          style={{
            background: "#ffffff",
            padding: "24px 28px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            color: "#0f172a",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2px solid #059669",
              paddingBottom: 16,
              marginBottom: 16,
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 900, color: "#064e3b" }}>
                {companySettings.company_name}
              </h2>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                <div>الرقم الضريبي: <strong>{companySettings.vat_number}</strong></div>
                <div>السجل التجاري: {companySettings.commercial_register} | هاتف: {companySettings.phone}</div>
                <div>{companySettings.address}</div>
              </div>
            </div>

            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  display: "inline-block",
                  background: "#ecfdf5",
                  border: "1px solid #6ee7b7",
                  color: "#065f46",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontWeight: 900,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                إشعار مدين (DEBIT NOTE)
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                رقم الإشعار: {purchaseReturn.debit_note_number || purchaseReturn.return_number}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                التاريخ: {purchaseReturn.return_date}
              </div>
            </div>
          </div>

          {/* Document & Party Info Box */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 16,
              fontSize: 12,
            }}
          >
            <div>
              <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>بيانات المورد:</span>
              <strong style={{ fontSize: 14, color: "#1e293b", display: "block", marginTop: 2 }}>
                {purchaseReturn.supplier_name || "مورد عام"}
              </strong>
              <div style={{ color: "#475569", marginTop: 4 }}>
                طريقة التسوية: <strong style={{ color: "#059669" }}>{refundMethodLabel}</strong>
              </div>
            </div>

            <div>
              <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>بيانات الفاتورة الأصلية:</span>
              <div style={{ marginTop: 2 }}>
                رقم فاتورة المشتريات: <strong>{purchaseReturn.original_invoice_number || `#${purchaseReturn.purchase_invoice_id}`}</strong>
              </div>
              {purchaseReturn.supplier_invoice_number && (
                <div style={{ marginTop: 2 }}>
                  فاتورة المورد المرجعية: <strong>{purchaseReturn.supplier_invoice_number}</strong>
                </div>
              )}
              {purchaseReturn.reason && (
                <div style={{ marginTop: 4, color: "#64748b" }}>
                  سبب المردود: <em>{purchaseReturn.reason}</em>
                </div>
              )}
            </div>
          </div>

          {/* Return Lines Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              marginBottom: 16,
              border: "1px solid #e2e8f0",
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", color: "#334155" }}>
                <th style={{ padding: "8px 10px", textAlign: "center", width: 35 }}>#</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>الصنف والوصف</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>الوحدة</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>الكمية المرتجعة</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>سعر الوحدة</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>الضريبة (15%)</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>الإجمالي المسترد</th>
              </tr>
            </thead>
            <tbody>
              {purchaseReturn.lines?.map((line, idx) => (
                <tr key={line.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 10px", textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <strong style={{ color: "#1e293b", display: "block" }}>{line.item_name_ar || "صنف غذائي"}</strong>
                    {line.item_sku && <span style={{ fontSize: 11, color: "#64748b" }}>{line.item_sku}</span>}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>{line.unit_name}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#b91c1c" }}>
                    {line.quantity}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "left" }}>{money(line.unit_price)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "left" }}>{money(line.tax_amount || 0)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "left", fontWeight: 800, color: "#065f46" }}>
                    {money(line.total || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals & Tafqeet Box */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 24 }}>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>المبلغ الإجمالي المسترد تفقيطاً:</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#064e3b" }}>
                {tafqeet(purchaseReturn.total_amount, "ريال سعودي", "هللة")}
              </div>
            </div>

            <div
              style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#065f46" }}>
                <span>المجموع قبل الضريبة:</span>
                <strong>{money(purchaseReturn.subtotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "#065f46" }}>
                <span>ضريبة المدخلات المعكوسة (15%):</span>
                <strong>{money(purchaseReturn.tax_amount)}</strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#064e3b",
                  borderTop: "1px dashed #6ee7b7",
                  paddingTop: 8,
                }}
              >
                <span>صافي الإشعار المدين:</span>
                <span>{money(purchaseReturn.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              borderTop: "1px solid #cbd5e1",
              paddingTop: 18,
              textAlign: "center",
              fontSize: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: "#475569" }}>أمين المستودع</div>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: "1px dotted #94a3b8", paddingTop: 4 }}>التوقيع: ...................</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#475569" }}>مسؤول المشتريات</div>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: "1px dotted #94a3b8", paddingTop: 4 }}>التوقيع: ...................</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#475569" }}>المحاسب المالي</div>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: "1px dotted #94a3b8", paddingTop: 4 }}>التوقيع: ...................</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#475569" }}>استلام المورد / المندوب</div>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: "1px dotted #94a3b8", paddingTop: 4 }}>التوقيع: ...................</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

function matchRefundMethod(method: string): string {
  switch (method) {
    case "credit":
      return "قيد دائن بحساب المورد (تخفيض الرصيد المستحق)";
    case "cash":
      return "استرداد نقدي بالصندوق (كاش)";
    case "bank_transfer":
      return "استرداد عبر الحساب البنكي";
    default:
      return "تسوية على الحساب";
  }
}
