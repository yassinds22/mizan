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
  RotateCcw,
  Printer,
  Sparkles,
} from "lucide-react";
import QRCode from "qrcode";
import { Modal } from "@/components/ui/Modal";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";
import { salesApi, SalesInvoice, SalesReturn } from "@/api/sales";
import { SalesReturnModal } from "../components/SalesReturnModal";

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

  // Sales Return states
  const [returnInvoiceId, setReturnInvoiceId] = useState<number | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showInvoicePickerModal, setShowInvoicePickerModal] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [activeSalesReturn, setActiveSalesReturn] = useState<SalesReturn | null>(null);
  const [showReturnPrintModal, setShowReturnPrintModal] = useState(false);
  const [returnQrCodeUrl, setReturnQrCodeUrl] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [companySettings, setCompanySettings] = useState<{
    company_name: string;
    vat_number: string;
    commercial_register: string;
    address: string;
    phone: string;
  }>({
    company_name: "ميزان لتجارة وتوزيع المواد الغذائية",
    vat_number: "300000000000003",
    commercial_register: "1010123456",
    address: "المملكة العربية السعودية - الرياض",
    phone: "0112345678",
  });

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

  useEffect(() => {
    fetch("/api/v1/core/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setCompanySettings({
            company_name: res.data.company_name || "ميزان لتجارة وتوزيع المواد الغذائية",
            vat_number: res.data.vat_number || "300000000000003",
            commercial_register: res.data.commercial_register || "1010123456",
            address: res.data.address || "المملكة العربية السعودية - الرياض",
            phone: res.data.phone || "0112345678",
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices();
  };

  const handleOpenReturn = (invoiceId: number) => {
    setReturnInvoiceId(invoiceId);
    setShowInvoicePickerModal(false);
    setShowReturnModal(true);
  };

  const handleReturnSuccess = async (ret: SalesReturn) => {
    setShowReturnModal(false);
    setActiveSalesReturn(ret);

    if (ret.zatca_qr_payload) {
      try {
        const qrUrl = await QRCode.toDataURL(ret.zatca_qr_payload, {
          width: 180,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setReturnQrCodeUrl(qrUrl);
      } catch (e) {
        console.warn("Could not generate QR for return:", e);
      }
    }

    setToastMessage(`تم إصدار وترحيل إشعار دائن برقم [${ret.return_number}] بنجاح!`);
    setTimeout(() => setToastMessage(null), 5000);

    setShowReturnPrintModal(true);
    loadInvoices();
  };

  // Filter posted invoices for picker modal
  const postedInvoicesForPicker = React.useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.status.value !== "posted") return false;
      if (!pickerSearch) return true;
      const q = pickerSearch.toLowerCase();
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.customer_name && inv.customer_name.toLowerCase().includes(q))
      );
    });
  }, [invoices, pickerSearch]);

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

        <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn"
            onClick={() => setShowInvoicePickerModal(true)}
            style={{
              height: 38,
              padding: "0 14px",
              background: "#fffbeb",
              color: "#b45309",
              border: "1px solid #fde68a",
              fontSize: 13,
              fontWeight: 800,
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
            title="إرجاع فاتورة مبيعات وإصدار إشعار دائن رسمي"
          >
            <RotateCcw size={15} /> إرجاع فاتورة (إشعار دائن)
          </button>

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
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                          onClick={() => onOpenInvoice(inv.id)}
                          title="عرض تفاصيل الفاتورة"
                        >
                          <Eye size={13} /> عرض
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
                              background: "#fffbeb",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                              borderRadius: 6,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              cursor: "pointer",
                            }}
                            title="إرجاع أصناف هذه الفاتورة وإصدار إشعار دائن"
                            onClick={() => handleOpenReturn(inv.id)}
                          >
                            <RotateCcw size={13} /> إرجاع
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

      {/* 1. Quick Invoice Picker Modal for Return */}
      <Modal
        isOpen={showInvoicePickerModal}
        onClose={() => setShowInvoicePickerModal(false)}
        title="اختيار فاتورة مبيعات لإرجاعها (إشعار دائن)"
        subtitle="ابحث برقم الفاتورة أو اسم العميل لبدء إرجاع الأصناف واستعادة المخزون"
        maxWidth="680px"
      >
        <div style={{ direction: "rtl", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field" style={{ width: "100%" }}>
            <Search size={15} />
            <input
              placeholder="اكتب رقم الفاتورة أو اسم العميل..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {postedInvoicesForPicker.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: 8 }}>
                لا توجد فواتير مرحّلة مطابقة للبحث.
              </div>
            ) : (
              postedInvoicesForPicker.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 800, color: "#0f172a", fontFamily: "monospace", fontSize: 14 }}>
                        #{inv.invoice_number}
                      </span>
                      <span style={{ fontSize: 11, background: "#ecfdf5", color: "#059669", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                        مرحّلة
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                      العميل: <strong>{inv.customer_name}</strong> · التاريخ: {inv.invoice_date} · طريقة الدفع: {inv.payment_method.label}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#059669", fontFamily: "monospace" }}>
                      {money(inv.total_amount)}
                    </span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleOpenReturn(inv.id)}
                      style={{
                        height: 34,
                        padding: "0 12px",
                        background: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                        fontSize: 12,
                        fontWeight: 800,
                        borderRadius: 6,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <RotateCcw size={13} /> إرجاع الفاتورة
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* 2. Sales Return & Credit Note Modal */}
      {returnInvoiceId && (
        <SalesReturnModal
          isOpen={showReturnModal}
          onClose={() => {
            setShowReturnModal(false);
            setReturnInvoiceId(null);
          }}
          invoiceId={returnInvoiceId}
          onSuccess={handleReturnSuccess}
        />
      )}

      {/* 3. Credit Note Print Preview Modal */}
      <Modal
        isOpen={showReturnPrintModal}
        onClose={() => setShowReturnPrintModal(false)}
        title={`معاينة طباعة — إشعار دائن ضريبي ${activeSalesReturn?.return_number || ""}`}
        subtitle="مرتجع مبيعات رسمي معتمد طبقاً لاشتراطات هيئة الزكاة والضريبة والجمارك (ZATCA)"
        footer={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setShowReturnPrintModal(false)}>
              إغلاق
            </button>
            <button
              className="btn btn-primary"
              onClick={() => window.print()}
              style={{ background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))" }}
            >
              <Printer size={15} /> طباعة الإشعار الآن
            </button>
          </div>
        }
      >
        {activeSalesReturn && (
          <div>
            <div
              className="print-container"
              style={{
                maxWidth: "100%",
                margin: "0 auto",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                padding: "24px",
                borderRadius: 8,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                color: "#0f172a",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 19, fontWeight: 900, margin: 0 }}>
                  {companySettings.company_name}
                </h2>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {companySettings.address} · هاتف: {companySettings.phone}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    marginTop: 6,
                    background: "#fffbeb",
                    color: "#b45309",
                    padding: "4px 10px",
                    borderRadius: 4,
                    display: "inline-block",
                    border: "1px solid #fde68a",
                  }}
                >
                  إشعار دائن ضريبي (Tax Credit Note)
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  fontSize: 12,
                  marginBottom: 16,
                  padding: "10px 12px",
                  background: "#f8fafc",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <strong>رقم الإشعار: </strong>
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    {activeSalesReturn.return_number}
                  </span>
                </div>
                <div>
                  <strong>تاريخ الإرجاع: </strong>
                  <span>{activeSalesReturn.return_date}</span>
                </div>
                <div>
                  <strong>مرجع الفاتورة الأصلية: </strong>
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    #{activeSalesReturn.original_invoice_number || ""}
                  </span>
                </div>
                <div>
                  <strong>طريقة الاسترداد: </strong>
                  <span>{activeSalesReturn.refund_method?.label || "نقداً"}</span>
                </div>
                <div>
                  <strong>العميل: </strong>
                  <span>{activeSalesReturn.customer_name || "عميل عام"}</span>
                </div>
                {activeSalesReturn.reason && (
                  <div>
                    <strong>سبب الإرجاع: </strong>
                    <span>{activeSalesReturn.reason}</span>
                  </div>
                )}
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  marginBottom: 16,
                }}
              >
                <thead>
                  <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>الصنف</th>
                    <th style={{ padding: "6px 8px", textAlign: "center" }}>الكمية المرتجعة</th>
                    <th style={{ padding: "6px 8px", textAlign: "left" }}>سعر الوحدة</th>
                    <th style={{ padding: "6px 8px", textAlign: "left" }}>الضريبة 15%</th>
                    <th style={{ padding: "6px 8px", textAlign: "left" }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSalesReturn.lines?.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "6px 8px" }}>
                        <div style={{ fontWeight: 700 }}>{line.item_name_ar || `صنف #${line.item_id}`}</div>
                        {line.item_sku && (
                          <span style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>
                            {line.item_sku}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 800 }}>
                        {line.quantity} {line.unit_name}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "left", fontFamily: "monospace" }}>
                        {money(line.unit_price)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "left", fontFamily: "monospace", color: "#0284c7" }}>
                        {money(line.tax_amount)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "left", fontFamily: "monospace", fontWeight: 700 }}>
                        {money(line.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  borderTop: "1px dashed #cbd5e1",
                  paddingTop: 10,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>المجموع قبل الضريبة:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    {money(activeSalesReturn.subtotal)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>ضريبة القيمة المضافة (15%):</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0284c7" }}>
                    {money(activeSalesReturn.tax_amount)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 15,
                    fontWeight: 900,
                    color: "#b45309",
                    background: "#fffbeb",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #fde68a",
                  }}
                >
                  <span>إجمالي المبلغ المسترد:</span>
                  <span style={{ fontFamily: "monospace" }}>{money(activeSalesReturn.total_amount)}</span>
                </div>
              </div>

              <div style={{ textAlign: "center", marginTop: 10 }}>
                {returnQrCodeUrl ? (
                  <img
                    src={returnQrCodeUrl}
                    alt="ZATCA QR Code"
                    style={{
                      width: 120,
                      height: 120,
                      margin: "0 auto",
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 11, color: "#64748b" }}>رمز ZATCA الإلكتروني</div>
                )}
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                  إشعار دائن صادر طبقاً لاشتراطات هيئة الزكاة والضريبة والجمارك (الفاتورة الإلكترونية)
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 28,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            color: "#ffffff",
            padding: "14px 28px",
            borderRadius: "50px",
            fontSize: 14,
            fontWeight: 800,
            boxShadow: "0 20px 40px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            direction: "rtl",
          }}
        >
          <Sparkles size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
