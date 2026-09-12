import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Plus,
  Search,
  RefreshCw,
  FileText,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  RotateCcw,
} from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";
import { purchasesApi, PurchaseInvoice, PurchaseReturn } from "@/api/purchases";
import { SuppliersListModal } from "../components/SuppliersListModal";
import { PurchaseReturnModal } from "../components/PurchaseReturnModal";
import { DebitNotePrintModal } from "../components/DebitNotePrintModal";

interface PurchasesPageProps {
  onOpenDoc: (purchaseId?: number) => void;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({ onOpenDoc }) => {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [returnInvoiceId, setReturnInvoiceId] = useState<number | null>(null);
  const [recentReturn, setRecentReturn] = useState<PurchaseReturn | null>(null);
  const [showDebitNotePrint, setShowDebitNotePrint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [showSuppliersModal, setShowSuppliersModal] = useState(false);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await purchasesApi.getInvoices({
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        payment_method: paymentFilter !== "all" ? paymentFilter : undefined,
        per_page: 50,
      });
      setInvoices(res.data || []);
    } catch (err) {
      console.error("Error loading purchase invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, paymentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices();
  };

  // Metrics
  const metrics = useMemo(() => {
    let totalPurchases = 0;
    let totalTax = 0;
    let postedCount = 0;
    let draftCount = 0;

    invoices.forEach((inv) => {
      if (inv.status.value === "posted") {
        totalPurchases += Number(inv.total_amount) || 0;
        totalTax += Number(inv.tax_amount) || 0;
        postedCount++;
      }
      if (inv.status.value === "draft") draftCount++;
    });

    return { totalPurchases, totalTax, postedCount, draftCount };
  }, [invoices]);

  return (
    <div className="grid" style={{ gap: 18 }}>
      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          كافة الفواتير ({invoices.length})
        </button>
        <button
          className={`tab ${statusFilter === "posted" ? "active" : ""}`}
          onClick={() => setStatusFilter("posted")}
        >
          المرحّلة والمؤكدة
        </button>
        <button
          className={`tab ${statusFilter === "draft" ? "active" : ""}`}
          onClick={() => setStatusFilter("draft")}
        >
          المسودات
        </button>
        <button
          className={`tab ${statusFilter === "cancelled" ? "active" : ""}`}
          onClick={() => setStatusFilter("cancelled")}
        >
          الملغاة
        </button>
        <button className="tab" onClick={() => setShowSuppliersModal(true)}>
          <Users size={14} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 4 }} /> دليل الموردين
        </button>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              background: "#ecfdf5",
              color: "#059669",
              padding: 10,
              borderRadius: 10,
            }}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>إجمالي المشتريات المعتمدة</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>
              {money(metrics.totalPurchases)}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              background: "#eff6ff",
              color: "#2563eb",
              padding: 10,
              borderRadius: 10,
            }}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>ضريبة المدخلات المستردة (15%)</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>
              {money(metrics.totalTax)}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              background: "#fef3c7",
              color: "#d97706",
              padding: 10,
              borderRadius: 10,
            }}
          >
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>الفواتير المرحلة / المسودات</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>
              {metrics.postedCount} مرحّلة · {metrics.draftCount} مسودة
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <form onSubmit={handleSearchSubmit} className="field" style={{ minWidth: 280 }}>
          <Search size={15} />
          <input
            placeholder="بحث برقم الفاتورة، فاتورة المورد، أو اسم المورد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          style={{
            height: 38,
            padding: "0 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            fontSize: 13,
          }}
        >
          <option value="all">كافة طرق الدفع</option>
          <option value="cash">نقدي</option>
          <option value="credit">آجل (ذمم دائنة)</option>
          <option value="bank_transfer">شبكة / تحويل بنكي</option>
        </select>

        <button
          className="btn btn-ghost"
          onClick={loadInvoices}
          title="تحديث البيانات"
          style={{ height: 38 }}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} /> تحديث
        </button>

        <div style={{ marginInlineStart: "auto", display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowSuppliersModal(true)}
            style={{ height: 38, border: "1px solid #cbd5e1", fontSize: 13 }}
          >
            <Users size={15} /> دليل الموردين
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenDoc()}
            style={{ background: "#059669", height: 38 }}
          >
            <Plus size={16} /> إصدار فاتورة شراء جديدة
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>فاتورة المورد</th>
                <th>المورد</th>
                <th>تاريخ الفاتورة</th>
                <th>طريقة السداد</th>
                <th className="amount">الصافي قبل الضريبة</th>
                <th className="amount">ضريبة المدخلات 15%</th>
                <th className="amount">الإجمالي شامل الضريبة</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                    <RefreshCw className="spin" size={24} style={{ margin: "0 auto 8px" }} />
                    جاري تحميل فواتير المشتريات...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                    لا توجد فواتير مشتريات مسجلة. اضغط على "+ إصدار فاتورة شراء جديدة" لتسجيل بضاعة جديدة.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="amount" style={{ fontWeight: 800, fontFamily: "monospace" }}>
                      #{inv.invoice_number}
                    </td>
                    <td style={{ fontFamily: "monospace", color: "#64748b" }}>
                      {inv.supplier_invoice_number || "—"}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{inv.supplier_name || "مشتريات عامة"}</div>
                      {inv.supplier_tax_number && (
                        <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                          ر.ض: {inv.supplier_tax_number}
                        </div>
                      )}
                    </td>
                    <td>{inv.invoice_date}</td>
                    <td>
                      <span
                        style={{
                          fontSize: 12,
                          background: "#f1f5f9",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontWeight: 600,
                        }}
                      >
                        {inv.payment_method.label}
                      </span>
                    </td>
                    <td className="amount">{money(inv.subtotal - inv.discount_amount)}</td>
                    <td className="amount" style={{ color: "#2563eb" }}>
                      {money(inv.tax_amount)}
                    </td>
                    <td className="amount" style={{ fontWeight: 900, color: "#059669", fontSize: 14 }}>
                      {money(inv.total_amount)}
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            inv.status.value === "posted"
                              ? "#ecfdf5"
                              : inv.status.value === "draft"
                              ? "#fef3c7"
                              : "#fef2f2",
                          color:
                            inv.status.value === "posted"
                              ? "#059669"
                              : inv.status.value === "draft"
                              ? "#d97706"
                              : "#dc2626",
                        }}
                      >
                        {inv.status.value === "posted" && <CheckCircle2 size={12} />}
                        {inv.status.value === "draft" && <AlertCircle size={12} />}
                        {inv.status.value === "cancelled" && <XCircle size={12} />}
                        {inv.status.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                          onClick={() => onOpenDoc(inv.id)}
                          title="استعراض تفاصيل الفاتورة"
                        >
                          <Eye size={13} /> عرض <ChevronLeft size={13} />
                        </button>

                        {inv.status.value === "posted" && (
                          <button
                            type="button"
                            className="btn"
                            style={{
                              height: 32,
                              padding: "0 10px",
                              fontSize: 12,
                              fontWeight: 700,
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              borderRadius: 6,
                              cursor: "pointer",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReturnInvoiceId(inv.id);
                            }}
                            title="إرجاع بضاعة وإصدار إشعار مدين للمورد"
                          >
                            <RotateCcw size={13} /> مردود
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Suppliers Directory Modal */}
      <SuppliersListModal
        isOpen={showSuppliersModal}
        onClose={() => setShowSuppliersModal(false)}
      />

      {/* Return Modal & Debit Note Print Modal */}
      {returnInvoiceId && (
        <PurchaseReturnModal
          isOpen={!!returnInvoiceId}
          onClose={() => setReturnInvoiceId(null)}
          invoiceId={returnInvoiceId}
          onSuccess={(ret) => {
            setRecentReturn(ret);
            setShowDebitNotePrint(true);
            loadInvoices();
          }}
        />
      )}

      <DebitNotePrintModal
        isOpen={showDebitNotePrint}
        onClose={() => setShowDebitNotePrint(false)}
        purchaseReturn={recentReturn}
      />
    </div>
  );
};
