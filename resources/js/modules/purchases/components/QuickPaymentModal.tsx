import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Calendar,
  FileText,
  DollarSign,
  ArrowDownLeft,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { money } from "@/utils/formatters";
import { PurchaseInvoice } from "@/api/purchases";
import { treasuryApi, VoucherRecord, OpenInvoiceItem } from "@/api/treasury";
import axios from "axios";

interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: PurchaseInvoice | null;
  onSuccess: (voucher: VoucherRecord, allocatedAmount: number) => void;
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Balances
  const [paidAmount, setPaidAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);

  // Form Fields
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "cheque">("cash");
  const [treasuryAccountId, setTreasuryAccountId] = useState<number | "">("");
  const [treasuryAccounts, setTreasuryAccounts] = useState<any[]>([]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Load Open Invoices & Treasuries on modal open
  useEffect(() => {
    if (!isOpen || !invoice) return;

    setError(null);
    setLoading(true);

    const total = Number(invoice.total_amount) || 0;
    const initialNotes = `سداد دفعة من فاتورة مشتريات رقم [${invoice.invoice_number}]`;
    setNotes(initialNotes);
    setReferenceNumber("");

    const loadData = async () => {
      try {
        // 1. Fetch Leaf Accounts for Treasury/Bank selection
        const accRes = await axios.get("/api/v1/accounting/accounts/leaf");
        const list = accRes.data.data || [];
        const treasuries = list.filter((acc: any) => {
          const code = String(acc.code);
          const name = String(acc.name_ar).toLowerCase();
          return (
            code.startsWith("111") ||
            name.includes("صندوق") ||
            name.includes("بنك") ||
            name.includes("نقدية") ||
            name.includes("خزينة")
          );
        });
        setTreasuryAccounts(treasuries);
        if (treasuries.length > 0) {
          setTreasuryAccountId(treasuries[0].id);
        }

        // 2. Fetch Open Invoices for supplier if supplier_id is set
        if (invoice.supplier_id) {
          try {
            const openInvs = await treasuryApi.getOpenInvoices("supplier", invoice.supplier_id);
            const found = openInvs.find((i) => i.invoice_id === invoice.id);
            if (found) {
              setPaidAmount(found.paid_amount);
              setRemainingAmount(found.remaining_amount);
              setPaymentAmount(found.remaining_amount);
            } else {
              // Might be completely unpaid or invoice was just posted
              setPaidAmount(0);
              setRemainingAmount(total);
              setPaymentAmount(total);
            }
          } catch {
            setPaidAmount(0);
            setRemainingAmount(total);
            setPaymentAmount(total);
          }
        } else {
          setPaidAmount(0);
          setRemainingAmount(total);
          setPaymentAmount(total);
        }
      } catch (err: any) {
        setError(err.message || "فشل تحميل بيانات الحسابات المعتمدة");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const totalAmount = Number(invoice.total_amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setError("يرجى إدخال مبلغ سداد صحيح أكبر من الصفر.");
      return;
    }

    if (Number(paymentAmount) > remainingAmount + 0.001) {
      setError(`مبلغ السداد (${money(Number(paymentAmount))}) أكبر من المتبقي على الفاتورة (${money(remainingAmount)}).`);
      return;
    }

    if (!treasuryAccountId) {
      setError("يرجى اختيار حساب الخزينة أو البنك المصروف منه.");
      return;
    }

    if (!invoice.supplier_id) {
      setError("لا يمكن ربط سند الصرف بمورد نقدي غير مسجل في الدليل.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create Payment Voucher via Treasury API
      const voucherPayload: Record<string, any> = {
        voucher_type: "payment",
        date,
        party_type: "supplier",
        party_id: invoice.supplier_id,
        party_name: invoice.supplier_name || invoice.supplier?.name_ar || "مورد",
        amount: Number(paymentAmount),
        treasury_account_id: Number(treasuryAccountId),
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: [
          {
            invoice_type: "purchase_invoice",
            invoice_id: invoice.id,
            allocated_amount: Number(paymentAmount),
          },
        ],
      };

      const createdVoucher = await treasuryApi.createVoucher(voucherPayload);

      // 2. Post Voucher immediately through Treasury Engine
      const postedVoucher = await treasuryApi.postVoucher(createdVoucher.id);

      // 3. Callback
      onSuccess(postedVoucher, Number(paymentAmount));
      onClose();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء صرف وترحيل السند المالي.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="سداد فاتورة مشتريات — إصدار سند صرف مالي"
      subtitle={`خصم من الخزينة/البنك وسداد مديونية الفاتورة رقم [${invoice.invoice_number}]`}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ direction: "rtl", display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#991b1b",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Invoice & Supplier Financial Summary */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "12px 16px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            fontSize: "12px",
          }}
        >
          <div>
            <div style={{ color: "#64748b", marginBottom: 2 }}>المورد المستفيد:</div>
            <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>
              {invoice.supplier_name || invoice.supplier?.name_ar || "مورد عام"}
            </div>
            {invoice.supplier_tax_number && (
              <div style={{ color: "#64748b", fontSize: "11px", marginTop: 2 }}>
                الرقم الضريبي: {invoice.supplier_tax_number}
              </div>
            )}
          </div>

          <div>
            <div style={{ color: "#64748b", marginBottom: 2 }}>رقم وتاريخ الفاتورة:</div>
            <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a", fontFamily: "monospace" }}>
              {invoice.invoice_number}
            </div>
            <div style={{ color: "#64748b", fontSize: "11px", marginTop: 2 }}>
              تاريخ الشراء: {invoice.invoice_date}
            </div>
          </div>
        </div>

        {/* Balance Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          <div
            style={{
              padding: "10px 12px",
              background: "#ffffff",
              border: "1.5px solid #e2e8f0",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>إجمالي الفاتورة</div>
            <div style={{ fontSize: "16px", fontWeight: 900, color: "#0f172a", marginTop: "2px" }}>
              {money(totalAmount)}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "#ecfdf5",
              border: "1.5px solid #a7f3d0",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#065f46", fontWeight: 700 }}>المسدد سابقاً</div>
            <div style={{ fontSize: "16px", fontWeight: 900, color: "#059669", marginTop: "2px" }}>
              {money(paidAmount)}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "#fffbeb",
              border: "1.5px solid #fde68a",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#92400e", fontWeight: 700 }}>المتبقي المطلوب</div>
            <div style={{ fontSize: "16px", fontWeight: 900, color: "#d97706", marginTop: "2px" }}>
              {money(remainingAmount)}
            </div>
          </div>
        </div>

        {/* Payment Amount Input & Quick Presets */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1.5px solid #86efac",
            borderRadius: "10px",
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label style={{ fontSize: "13px", fontWeight: 800, color: "#166534" }}>
              مبلغ السداد المطلوب صرفه الآن *
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setPaymentAmount(remainingAmount)}
                style={{
                  padding: "3px 8px",
                  fontSize: "11px",
                  background: "#ffffff",
                  border: "1px solid #86efac",
                  borderRadius: "5px",
                  color: "#15803d",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                كامل المتبقي ({money(remainingAmount)})
              </button>
              {remainingAmount > 1 && (
                <button
                  type="button"
                  onClick={() => setPaymentAmount(Math.round((remainingAmount / 2) * 100) / 100)}
                  style={{
                    padding: "3px 8px",
                    fontSize: "11px",
                    background: "#ffffff",
                    border: "1px solid #86efac",
                    borderRadius: "5px",
                    color: "#15803d",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  نصف المتبقي (50%)
                </button>
              )}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remainingAmount}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder={`أدخل المبلغ (بحد أقصى ${remainingAmount})`}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "18px",
                fontWeight: 900,
                color: "#14532d",
                borderRadius: "8px",
                border: "2px solid #22c55e",
                background: "#ffffff",
              }}
              required
              autoFocus
            />
          </div>
          <div style={{ fontSize: "11px", color: "#15803d", marginTop: "4px" }}>
            {paymentAmount !== "" && Number(paymentAmount) < remainingAmount
              ? `سيكون السداد جزئياً، وسيتبقى على الفاتورة ${money(remainingAmount - Number(paymentAmount))}`
              : "سيتم إغلاق وسداد الفاتورة بالكامل"}
          </div>
        </div>

        {/* Treasury Account & Payment Method */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
              الصرف خصماً من (الخزينة / البنك) *
            </label>
            <select
              value={treasuryAccountId}
              onChange={(e) => setTreasuryAccountId(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13px",
              }}
              required
            >
              {treasuryAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name_ar}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
              طريقة الصرف *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13px",
              }}
              required
            >
              <option value="cash">نقداً من الخزينة (Cash)</option>
              <option value="bank_transfer">تحويل بنكي (Bank Transfer)</option>
              <option value="cheque">شيك بنكي (Cheque)</option>
            </select>
          </div>
        </div>

        {/* Date & Reference */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
              تاريخ السند
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13px",
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
              رقم المرجع / الشيك (اختياري)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="مثال: رقم الحوالة أو الشيك"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
            البيان والملاحظات
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1.5px solid #cbd5e1",
              fontSize: "13px",
            }}
          />
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "10px",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "14px",
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
            style={{ padding: "8px 16px" }}
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || loading || remainingAmount <= 0}
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              padding: "9px 24px",
              fontSize: "14px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <Banknote size={17} />
            {submitting ? "جاري ترحيل السند..." : `تأكيد وصرف مبلغ ${money(Number(paymentAmount) || 0)}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};
