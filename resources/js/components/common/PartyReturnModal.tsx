import React, { useState, useEffect, useMemo } from "react";
import {
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Minus,
  Plus,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { money } from "@/utils/formatters";

export interface ReturnableLineItem {
  line_id: number;
  item_id: number;
  item_name_ar: string;
  item_sku: string;
  unit_name: string;
  original_quantity: number;
  already_returned_quantity: number;
  remaining_quantity: number;
  quantity_to_return: number;
  unit_price: number;
  tax_rate: number;
}

export interface ReturnableDocumentData {
  document_number: string;
  party_name: string;
  payment_method: string;
  lines: ReturnableLineItem[];
}

export interface PartyReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  partyType: "customer" | "supplier";
  fetchReturnableLines: (id: number) => Promise<ReturnableDocumentData>;
  onSubmitReturn: (payload: {
    document_id: number;
    return_date: string;
    refund_method: "cash" | "credit" | "bank_transfer";
    reason: string;
    lines: { line_id: number; quantity: number }[];
  }) => Promise<any>;
  onSuccess: (result: any) => void;
}

export const PartyReturnModal: React.FC<PartyReturnModalProps> = ({
  isOpen,
  onClose,
  documentId,
  partyType,
  fetchReturnableLines,
  onSubmitReturn,
  onSuccess,
}) => {
  const isSupplier = partyType === "supplier";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docData, setDocData] = useState<ReturnableDocumentData | null>(null);

  // Form State
  const [returnDate, setReturnDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [refundMethod, setRefundMethod] = useState<"cash" | "credit" | "bank_transfer">("credit");
  const [reason, setReason] = useState<string>("");
  const [lines, setLines] = useState<ReturnableLineItem[]>([]);

  useEffect(() => {
    if (!isOpen || !documentId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchReturnableLines(documentId);
        setDocData(data);
        setRefundMethod(data.payment_method === "credit" ? "credit" : "cash");

        setLines(
          data.lines.map((l) => ({
            ...l,
            quantity_to_return: 0,
          }))
        );
      } catch (err: any) {
        setError(err.message || "فشل تحميل بيانات الأصناف القابلة للإرجاع.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, documentId]);

  // Dynamic Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    let totalItemsCount = 0;

    for (const l of lines) {
      const q = Number(l.quantity_to_return) || 0;
      if (q > 0) {
        totalItemsCount += 1;
        const lineSubtotal = q * l.unit_price;
        const lineTax = lineSubtotal * ((l.tax_rate || 15) / 100);
        subtotal += lineSubtotal;
        taxTotal += lineTax;
      }
    }

    const netTotal = subtotal + taxTotal;

    return {
      subtotal,
      taxTotal,
      netTotal,
      totalItemsCount,
    };
  }, [lines]);

  // Toggle return all
  const handleToggleReturnAll = () => {
    const isAllSelected = lines.every(
      (l) => l.remaining_quantity === 0 || l.quantity_to_return === l.remaining_quantity
    );

    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        quantity_to_return: isAllSelected ? 0 : l.remaining_quantity,
      }))
    );
  };

  const handleQuantityChange = (lineId: number, qty: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.line_id !== lineId) return l;
        const bounded = Math.max(0, Math.min(l.remaining_quantity, qty));
        return { ...l, quantity_to_return: bounded };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const itemsToReturn = lines.filter((l) => l.quantity_to_return > 0);
    if (itemsToReturn.length === 0) {
      setError("يرجى تحديد كمية أكبر من الصفر لصنف واحد على الأقل لإتمام المردود.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        document_id: documentId,
        return_date: returnDate,
        refund_method: refundMethod,
        reason: reason.trim() || (isSupplier ? "مردود مشتريات" : "مرتجع مبيعات"),
        lines: itemsToReturn.map((l) => ({
          line_id: l.line_id,
          quantity: l.quantity_to_return,
        })),
      };

      const result = await onSubmitReturn(payload);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء ترحيل المردود.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasAnyRemaining = lines.some((l) => l.remaining_quantity > 0);

  const title = isSupplier
    ? "مردود فاتورة مشتريات (إشعار مدين - Debit Note)"
    : "إرجاع فاتورة مبيعات (إشعار دائن - Credit Note)";

  const partyLabel = isSupplier ? "المورد" : "العميل";
  const defaultPartyName = isSupplier ? "مورد نقدي عام" : "عميل نقدي عام";
  const originalQtyHeader = isSupplier ? "المشترى" : "المباع";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="840px">
      <div style={{ direction: "rtl", fontFamily: "inherit" }}>
        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
            <RotateCcw className="animate-spin" size={32} style={{ margin: "0 auto 12px", color: "#059669" }} />
            <div>جاري قراءة أسطر الفاتورة ورصيد المتبقي للإرجاع...</div>
          </div>
        ) : error && !docData ? (
          <div style={{ padding: "20px", background: "#fef2f2", color: "#991b1b", borderRadius: 8 }}>
            <strong>خطأ:</strong> {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header info */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                background: "#f8fafc",
                padding: "14px 16px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: "#64748b" }}>الفاتورة الأصلية</span>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>
                  {docData?.document_number}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#64748b" }}>{partyLabel}</span>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
                  {docData?.party_name || defaultPartyName}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#64748b" }}>تاريخ المردود</span>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                  }}
                  required
                />
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#64748b" }}>طريقة التسوية المالية</span>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as any)}
                  style={{
                    display: "block",
                    width: "100%",
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {isSupplier ? (
                    <>
                      <option value="credit">تخفيض رصيد المورد (مدين - آجل)</option>
                      <option value="cash">استرداد نقدي بالصندوق (كاش)</option>
                      <option value="bank_transfer">استرداد تحويل بنكي</option>
                    </>
                  ) : (
                    <>
                      <option value="cash">نقداً من الصندوق (كاش)</option>
                      <option value="bank_transfer">تحويل بنكي / شبكة</option>
                      <option value="credit">قيد دائن بحساب العميل (آجل)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  padding: "10px 14px",
                  borderRadius: 6,
                  fontSize: 13,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {!hasAnyRemaining ? (
              <div
                style={{
                  padding: "30px 20px",
                  textAlign: "center",
                  background: "#f1f5f9",
                  borderRadius: 8,
                  color: "#475569",
                  marginBottom: 16,
                }}
              >
                <CheckCircle2 size={36} style={{ color: "#10b981", margin: "0 auto 10px" }} />
                <h4 style={{ margin: "0 0 6px", fontSize: 15 }}>تم إرجاع كافة أصناف هذه الفاتورة بالكامل</h4>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  كافة الكميات في هذه الفاتورة تم عمل مردودات لها ولا توجد كميات متبقية للإرجاع.
                </div>
              </div>
            ) : (
              <>
                {/* Header Action */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
                    {isSupplier
                      ? "حدد الأصناف والكميات المراد إرجاعها للمورد وتخفيضها من المخزن:"
                      : "حدد الأصناف والكميات المراد إرجاعها للمخزن:"}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleReturnAll}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "transparent",
                      border: "none",
                      color: "#059669",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <CheckSquare size={15} />
                    <span>إرجاع كافة الأصناف المتبقية</span>
                  </button>
                </div>

                {/* Returnable Items Table */}
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>الصنف</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>الوحدة</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>{originalQtyHeader}</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>المرتجع سابقاً</th>
                        <th style={{ padding: "8px 12px", textAlign: "center", color: "#059669" }}>المتبقي للإرجاع</th>
                        <th style={{ padding: "8px 12px", textAlign: "center", width: 140 }}>الكمية المرتجعة الآن</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>قيمة الاسترداد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => {
                        const lineReturnTotal =
                          l.quantity_to_return * l.unit_price * (1 + (l.tax_rate || 15) / 100);
                        const isExhausted = l.remaining_quantity <= 0;

                        return (
                          <tr
                            key={l.line_id}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              background: l.quantity_to_return > 0 ? "rgba(16, 185, 129, 0.04)" : "transparent",
                              opacity: isExhausted ? 0.6 : 1,
                            }}
                          >
                            <td style={{ padding: "10px 12px" }}>
                              <strong style={{ color: "#1e293b", display: "block" }}>{l.item_name_ar}</strong>
                              <span style={{ fontSize: 11, color: "#64748b" }}>{l.item_sku}</span>
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                                {l.unit_name}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                              {l.original_quantity}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8" }}>
                              {l.already_returned_quantity}
                            </td>
                            <td
                              style={{
                                padding: "10px 12px",
                                textAlign: "center",
                                fontWeight: 800,
                                color: isExhausted ? "#94a3b8" : "#059669",
                              }}
                            >
                              {l.remaining_quantity}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              {isExhausted ? (
                                <span style={{ color: "#94a3b8", fontSize: 11 }}>مكتمل الإرجاع</span>
                              ) : (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: l.quantity_to_return > 0 ? "1px solid #10b981" : "1px solid #cbd5e1",
                                    borderRadius: 6,
                                    overflow: "hidden",
                                    maxWidth: 120,
                                    margin: "0 auto",
                                    background: "#fff",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(l.line_id, l.quantity_to_return - 1)}
                                    disabled={l.quantity_to_return <= 0}
                                    style={{
                                      border: "none",
                                      background: "#f8fafc",
                                      padding: "4px 8px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={l.remaining_quantity}
                                    step="any"
                                    value={l.quantity_to_return === 0 ? "" : l.quantity_to_return}
                                    placeholder="0"
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      if (raw === "") {
                                        handleQuantityChange(l.line_id, 0);
                                        return;
                                      }
                                      handleQuantityChange(l.line_id, Number(raw) || 0);
                                    }}
                                    style={{
                                      width: 45,
                                      textAlign: "center",
                                      border: "none",
                                      fontSize: 12,
                                      fontWeight: 800,
                                      outline: "none",
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(l.line_id, l.quantity_to_return + 1)}
                                    disabled={l.quantity_to_return >= l.remaining_quantity}
                                    style={{
                                      border: "none",
                                      background: "#f8fafc",
                                      padding: "4px 8px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>
                              {l.quantity_to_return > 0 ? (
                                <span style={{ color: "#059669" }}>{money(lineReturnTotal)}</span>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Reason input */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    سبب الإرجاع / ملاحظات:
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      isSupplier
                        ? "مثال: بضاعة غير مطابقة للمواصفات / تلف بالعبوات / فرق بالسعر المتفق عليه..."
                        : "مثال: تلف بالعبوة / استبدال صنف / رغبة العميل..."
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                    }}
                  />
                </div>

                {/* Return Summary Card */}
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: 8,
                    padding: "14px 18px",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#065f46", marginBottom: 4 }}>
                    <span>المجموع المسترد (قبل الضريبة):</span>
                    <strong>{money(calculations.subtotal)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#065f46", marginBottom: 6 }}>
                    <span>ضريبة القيمة المضافة المستردة (15%):</span>
                    <strong>{money(calculations.taxTotal)}</strong>
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
                    <span>{isSupplier ? "صافي المبلغ المسترد من المورد:" : "صافي المبلغ المسترد للعميل:"}</span>
                    <span>{money(calculations.netTotal)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                disabled={submitting}
                style={{ padding: "8px 18px" }}
              >
                إلغاء
              </button>
              {hasAnyRemaining && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || calculations.totalItemsCount === 0}
                  style={{
                    padding: "8px 22px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#059669",
                    borderColor: "#059669",
                    fontWeight: 700,
                  }}
                >
                  <RotateCcw size={16} />
                  <span>{submitting ? "جاري ترحيل المردود..." : (isSupplier ? "ترحيل مردود المشتريات / إشعار مدين 🔄" : "تأكيد وترحيل المرتجع 🔄")}</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
