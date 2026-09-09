import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  Plus,
  Search,
  RefreshCw,
  FileText,
  DollarSign,
  CreditCard,
  Building,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";
import { salesApi, SalesInvoice } from "@/api/sales";

interface SalesPageProps {
  onOpenInvoice: (invoiceId?: number) => void;
  onOpenPartners: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  onOpenInvoice,
  onOpenPartners,
}) => {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await salesApi.getInvoices({
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        payment_method: paymentFilter !== "all" ? paymentFilter : undefined,
        per_page: 50,
      });
      setInvoices(res.data || []);
    } catch (err) {
      console.error("Error loading sales invoices:", err);
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
  const metrics = React.useMemo(() => {
    let totalSales = 0;
    let totalTax = 0;
    let postedCount = 0;
    let draftCount = 0;

    invoices.forEach((inv) => {
      totalSales += Number(inv.total_amount) || 0;
      totalTax += Number(inv.tax_amount) || 0;
      if (inv.status.value === "posted") postedCount++;
      if (inv.status.value === "draft") draftCount++;
    });

    return { totalSales, totalTax, postedCount, draftCount };
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
        <button className="tab" onClick={onOpenPartners}>
          دليل العملاء
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
            <div style={{ fontSize: 12, color: "#64748b" }}>إجمالي المبيعات المحققة</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>
              {money(metrics.totalSales)}
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
              background: "#e0f2fe",
              color: "#0284c7",
              padding: 10,
              borderRadius: 10,
            }}
          >
            <CreditCard size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>ضريبة القيمة المضافة (15%)</div>
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
        <form onSubmit={handleSearchSubmit} className="field" style={{ minWidth: 260 }}>
          <Search size={15} />
          <input
            placeholder="بحث برقم الفاتورة أو اسم العميل..."
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
          <option value="credit">آجل</option>
          <option value="bank_transfer">شبكة / تحويل</option>
        </select>

        <button
          className="btn btn-ghost"
          onClick={loadInvoices}
          title="تحديث البيانات"
          style={{ height: 38 }}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} /> تحديث
        </button>

        <div style={{ marginInlineStart: "auto" }}>
          <button
            className="btn btn-primary"
            onClick={() => onOpenInvoice()}
            style={{ background: "#059669" }}
          >
            <Plus size={16} /> إصدار فاتورة بيع جديدة
          </button>
        </div>
      </div>

      {/* Table */}
      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>التاريخ</th>
                <th>طريقة السداد</th>
                <th>المجموع</th>
                <th>الضريبة 15%</th>
                <th>الإجمالي الصافي</th>
                <th>الحالة</th>
                <th style={{ width: 100 }}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                    جارِ جلب فواتير المبيعات...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                      لا توجد فواتير مبيعات مسجلة حتى الآن
                    </div>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                      ابدأ بإصدار أول فاتورة مبيعات لربطها تلقائياً بالمخزون والحسابات وهيئة الزكاة.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => onOpenInvoice()}
                      style={{ background: "#059669" }}
                    >
                      <Plus size={15} /> إصدار فاتورة الآن
                    </button>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="amount" style={{ fontWeight: 800, color: "#0f172a" }}>
                      {inv.invoice_number}
                    </td>
                    <td>
                      <strong>{inv.customer_name}</strong>
                      {inv.customer_tax_number && (
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          ر.ض: {inv.customer_tax_number}
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
                    <td className="amount" style={{ color: "#0284c7" }}>
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
                      <button
                        className="btn btn-ghost"
                        style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                        onClick={() => onOpenInvoice(inv.id)}
                      >
                        <Eye size={13} /> عرض <ChevronLeft size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
