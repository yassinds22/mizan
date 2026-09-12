import React, { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Printer,
  Trash2,
  DollarSign,
  Building2,
  Calendar,
  Wallet,
} from "lucide-react";
import { money } from "@/utils/formatters";
import { treasuryApi, VoucherRecord } from "@/api/treasury";
import { Modal } from "@/components/ui/Modal";

interface VouchersPageProps {
  onOpenDoc: (voucherId?: number, initialType?: "receipt" | "payment") => void;
}

export const VouchersPage: React.FC<VouchersPageProps> = ({ onOpenDoc }) => {
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cancel Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedVoucherForCancel, setSelectedVoucherForCancel] = useState<VoucherRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const res = await treasuryApi.getVouchers({
        voucher_type: typeFilter !== "all" ? typeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchTerm.trim() || undefined,
        per_page: 50,
      });
      setVouchers(res.data || []);
    } catch (err: any) {
      showToast("تعذر تحميل السندات: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, [typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadVouchers();
  };

  const handlePost = async (id: number) => {
    if (!confirm("هل أنت متأكد من ترحيل هذا السند؟ سيتم إنشاء القيد المحاسبي فوراً وتحديث الأرصدة.")) return;
    setActionLoading(true);
    try {
      await treasuryApi.postVoucher(id);
      showToast("تم ترحيل السند بنجاح وتوليد قيد اليومية.");
      loadVouchers();
    } catch (err: any) {
      alert("تعذر الترحيل: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDraft = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف مسودة هذا السند؟")) return;
    setActionLoading(true);
    try {
      await treasuryApi.deleteVoucher(id);
      showToast("تم حذف مسودة السند بنجاح.");
      loadVouchers();
    } catch (err: any) {
      alert("تعذر الحذف: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const openCancelModal = (voucher: VoucherRecord) => {
    setSelectedVoucherForCancel(voucher);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedVoucherForCancel) return;
    if (!cancelReason.trim()) {
      alert("يرجى كتابة سبب الإلغاء.");
      return;
    }
    setActionLoading(true);
    try {
      await treasuryApi.cancelVoucher(selectedVoucherForCancel.id, cancelReason.trim());
      showToast(`تم إلغاء السند [${selectedVoucherForCancel.voucher_number}] وعكس القيد بنجاح.`);
      setCancelModalOpen(false);
      loadVouchers();
    } catch (err: any) {
      alert("تعذر الإلغاء: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Stats calculation
  const totalReceipts = vouchers
    .filter((v) => v.voucher_type === "receipt" && v.status === "posted")
    .reduce((acc, v) => acc + Number(v.amount), 0);

  const totalPayments = vouchers
    .filter((v) => v.voucher_type === "payment" && v.status === "posted")
    .reduce((acc, v) => acc + Number(v.amount), 0);

  const netCashFlow = totalReceipts - totalPayments;
  const draftCount = vouchers.filter((v) => v.status === "draft").length;

  return (
    <div className="page-container" style={{ padding: "1.5rem", maxWidth: 1400, margin: "0 auto" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "2rem",
            backgroundColor: "#0f172a",
            color: "#fff",
            padding: "1rem 1.5rem",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            borderRight: "4px solid #10b981",
          }}
        >
          <CheckCircle2 size={20} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Wallet size={26} color="#0284c7" />
            سندات القبض والصرف (الخزينة)
          </h2>
          <p style={{ color: "#64748b", margin: "0.25rem 0 0", fontSize: "0.875rem" }}>
            إدارة المقبوضات والمدفوعات، تحصيل مديونيات العملاء، سداد الموردين، والمصروفات المباشرة
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => onOpenDoc(undefined, "receipt")}
            className="btn"
            style={{
              backgroundColor: "#059669",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.2rem",
              borderRadius: "8px",
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(5,150,105,0.25)",
            }}
          >
            <ArrowDownLeft size={18} />
            <span>+ سند قبض (تحصيل)</span>
          </button>

          <button
            onClick={() => onOpenDoc(undefined, "payment")}
            className="btn"
            style={{
              backgroundColor: "#dc2626",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.2rem",
              borderRadius: "8px",
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(220,38,38,0.25)",
            }}
          >
            <ArrowUpRight size={18} />
            <span>+ سند صرف (دفع)</span>
          </button>

          <button
            onClick={loadVouchers}
            className="btn btn-outline"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "8px" }}
            title="تحديث البيانات"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)",
            border: "1px solid #a7f3d0",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#065f46", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>إجمالي المقبوضات (المرحلة)</span>
            <div style={{ background: "#d1fae5", padding: "6px", borderRadius: "8px" }}>
              <ArrowDownLeft size={20} color="#059669" />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#065f46" }}>{money(totalReceipts)}</div>
          <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: "0.25rem" }}>تحصيلات نقدية وبنكية واردة</div>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#991b1b", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>إجمالي المدفوعات (المرحلة)</span>
            <div style={{ background: "#fee2e2", padding: "6px", borderRadius: "8px" }}>
              <ArrowUpRight size={20} color="#dc2626" />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#991b1b" }}>{money(totalPayments)}</div>
          <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>سدادات موردين ومصروفات صادرة</div>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)",
            border: "1px solid #bae6fd",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#075985", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>صافي التدفق النقدي</span>
            <div style={{ background: "#e0f2fe", padding: "6px", borderRadius: "8px" }}>
              <DollarSign size={20} color="#0284c7" />
            </div>
          </div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: netCashFlow >= 0 ? "#0284c7" : "#dc2626",
            }}
          >
            {money(netCashFlow)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#0284c7", marginTop: "0.25rem" }}>الفرق بين المقبوض والمدفوع</div>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>سندات تحت الاعتماد (مسودة)</span>
            <div style={{ background: "#f1f5f9", padding: "6px", borderRadius: "8px" }}>
              <Receipt size={20} color="#64748b" />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#334155" }}>{draftCount}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>تتطلب المراجعة والترحيل</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          background: "#fff",
          padding: "1rem",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          marginBottom: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className={`btn btn-sm ${typeFilter === "all" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTypeFilter("all")}
          >
            جميع السندات
          </button>
          <button
            className={`btn btn-sm ${typeFilter === "receipt" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTypeFilter("receipt")}
            style={typeFilter === "receipt" ? { backgroundColor: "#059669", borderColor: "#059669" } : {}}
          >
            🧾 سندات القبض
          </button>
          <button
            className={`btn btn-sm ${typeFilter === "payment" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTypeFilter("payment")}
            style={typeFilter === "payment" ? { backgroundColor: "#dc2626", borderColor: "#dc2626" } : {}}
          >
            💸 سندات الصرف
          </button>

          <span style={{ borderLeft: "1px solid #cbd5e1", margin: "0 0.25rem" }}></span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.875rem",
            }}
          >
            <option value="all">جميع الحالات</option>
            <option value="posted">المرحلة فقط</option>
            <option value="draft">المسودات فقط</option>
            <option value="cancelled">الملغاة فقط</option>
          </select>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", minWidth: 280 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              placeholder="بحث برقم السند، الطرف، المرجع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.4rem 2rem 0.4rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
              }}
            />
            <Search
              size={16}
              style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
            />
          </div>
          <button type="submit" className="btn btn-sm btn-outline">
            بحث
          </button>
        </form>
      </div>

      {/* Vouchers Table */}
      <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            <RefreshCw size={24} className="spin" style={{ margin: "0 auto 0.5rem" }} />
            <div>جاري تحميل السندات...</div>
          </div>
        ) : vouchers.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            <Receipt size={40} style={{ margin: "0 auto 0.75rem", opacity: 0.3 }} />
            <h4 style={{ margin: 0, fontWeight: 700 }}>لا توجد سندات مطابقة</h4>
            <p style={{ margin: "0.25rem 0 1rem", fontSize: "0.875rem" }}>
              لم يتم العثور على أي سند قبض أو صرف وفق شروط البحث الحالية.
            </p>
            <button onClick={() => onOpenDoc(undefined, "receipt")} className="btn btn-sm btn-primary">
              + إنشاء سند قبض جديد
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "0.825rem", color: "#475569" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>رقم السند والنوع</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>التاريخ</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>الطرف المتعامل</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>الخزينة / الحساب</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>طريقة الدفع</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>المبلغ</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>الحالة</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher) => {
                  const isReceipt = voucher.voucher_type === "receipt";
                  return (
                    <tr
                      key={voucher.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                      }}
                      className="hover-row"
                    >
                      {/* Voucher Number & Type Badge */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              backgroundColor: isReceipt ? "#dcfce7" : "#fee2e2",
                              color: isReceipt ? "#15803d" : "#b91c1c",
                              border: isReceipt ? "1px solid #bbf7d0" : "1px solid #fecaca",
                            }}
                          >
                            {isReceipt ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                            {isReceipt ? "قبض" : "صرف"}
                          </span>
                          <span style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.9rem" }}>
                            {voucher.voucher_number}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#334155" }}>
                        {voucher.date}
                      </td>

                      {/* Party */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}>
                          {voucher.party_name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {voucher.party_type === "customer" && "عميل مبيعات"}
                          {voucher.party_type === "supplier" && "مورد مشتريات"}
                          {voucher.party_type === "account" && "حساب عام من الدليل"}
                        </div>
                      </td>

                      {/* Treasury Account */}
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>
                        <div style={{ color: "#334155", fontWeight: 500 }}>
                          {voucher.treasury_account?.name_ar || "الخزينة"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace" }}>
                          كود: {voucher.treasury_account?.code || "---"}
                        </div>
                      </td>

                      {/* Payment Method & Ref */}
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>
                        <span style={{ color: "#334155" }}>
                          {voucher.payment_method === "cash" && "نقداً"}
                          {voucher.payment_method === "bank_transfer" && "تحويل بنكي"}
                          {voucher.payment_method === "cheque" && "شيك"}
                          {voucher.payment_method === "pos" && "شبكة / مدى"}
                        </span>
                        {voucher.reference_number && (
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>مرجع: {voucher.reference_number}</div>
                        )}
                      </td>

                      {/* Amount */}
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          fontWeight: 800,
                          fontSize: "1rem",
                          color: isReceipt ? "#059669" : "#dc2626",
                        }}
                      >
                        {money(Number(voucher.amount))}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        {voucher.status === "posted" && (
                          <span
                            style={{
                              background: "#ecfdf5",
                              color: "#047857",
                              padding: "3px 10px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            <CheckCircle2 size={12} /> مرحل
                          </span>
                        )}
                        {voucher.status === "draft" && (
                          <span
                            style={{
                              background: "#fef3c7",
                              color: "#b45309",
                              padding: "3px 10px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              border: "1px solid #fde68a",
                            }}
                          >
                            <AlertCircle size={12} /> مسودة
                          </span>
                        )}
                        {voucher.status === "cancelled" && (
                          <span
                            style={{
                              background: "#f1f5f9",
                              color: "#64748b",
                              padding: "3px 10px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              border: "1px solid #cbd5e1",
                            }}
                          >
                            <XCircle size={12} /> ملغى
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                          {/* عرض / طباعة السند */}
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => onOpenDoc(voucher.id)}
                            title="عرض السند وطباعته"
                            style={{ padding: "4px 8px" }}
                          >
                            <Eye size={14} />
                          </button>

                          {/* ترحيل المسودة */}
                          {voucher.status === "draft" && (
                            <>
                              <button
                                className="btn btn-sm"
                                onClick={() => handlePost(voucher.id)}
                                title="ترحيل السند وتوليد القيد"
                                style={{
                                  backgroundColor: "#059669",
                                  color: "#fff",
                                  padding: "4px 8px",
                                }}
                              >
                                ترحيل
                              </button>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => handleDeleteDraft(voucher.id)}
                                title="حذف المسودة"
                                style={{ color: "#ef4444", padding: "4px 8px" }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}

                          {/* إلغاء السند المرحل */}
                          {voucher.status === "posted" && (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => openCancelModal(voucher)}
                              title="إلغاء السند وعكس القيد المحاسبي"
                              style={{ color: "#dc2626", borderColor: "#fecaca", padding: "4px 8px", fontSize: "0.75rem" }}
                            >
                              إلغاء
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalOpen && selectedVoucherForCancel && (
        <Modal
          isOpen={cancelModalOpen}
          title={`إلغاء السند رقم [${selectedVoucherForCancel.voucher_number}]`}
          onClose={() => setCancelModalOpen(false)}
        >
          <div style={{ padding: "1rem" }}>
            <div
              style={{
                backgroundColor: "#fff1f2",
                border: "1px solid #fecdd3",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                color: "#9f1239",
                fontSize: "0.875rem",
                marginBottom: "1rem",
              }}
            >
              <strong>تحذير محاسبي:</strong> سيؤدي إلغاء هذا السند إلى توليد قيد عكسي تلقائي في دفتر اليومية، واسترجاع
              أرصدة الفواتير المخصصة وتعديل رصيد الطرف.
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                سبب الإلغاء (إلزامي للتدقيق):
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="اكتب سبب إلغاء السند هنا..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.875rem",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setCancelModalOpen(false)}
                disabled={actionLoading}
              >
                تراجع
              </button>
              <button
                type="button"
                className="btn"
                style={{ backgroundColor: "#dc2626", color: "#fff" }}
                onClick={handleConfirmCancel}
                disabled={actionLoading}
              >
                {actionLoading ? "جاري الإلغاء..." : "تأكيد إلغاء السند"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
