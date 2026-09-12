import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  Printer,
  RefreshCw,
  FileCheck2,
  AlertCircle,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { fetchVatPosition, VatPositionData } from "@/api/reports";
import { money } from "@/utils/formatters";
import type { PageId } from "@/types/navigation";

interface VatPositionPageProps {
  onNavigate?: (page: PageId, params?: Record<string, any>) => void;
}

export const VatPositionPage: React.FC<VatPositionPageProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VatPositionData | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>("all");

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchVatPosition({
        date_from: dateFrom,
        date_to: dateTo,
        branch_id: branchId === "all" ? undefined : branchId,
      });
      setData(res);
    } catch (err: any) {
      console.error("Failed to load VAT position report", err);
      setError(err?.response?.data?.message || "تعذر تحميل تقرير الموقف الضريبي.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, branchId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      ["تقرير الموقف الضريبي لضريبة القيمة المضافة (ZATCA VAT Position)"],
      [`الفترة الضريبية: من ${dateFrom} إلى ${dateTo}`],
      [""],
      ["البيان", "الإجمالي", "مردودات وتسويات", "صافي الضريبة", "الأساس التقديري للمبيعات/المشتريات"],
      [
        "ضريبة المخرجات (المبيعات)",
        data.output_vat.gross_tax,
        data.output_vat.adjustments_returns,
        data.output_vat.net_tax,
        data.output_vat.estimated_sales_base || 0,
      ],
      [
        "ضريبة المدخلات (المشتريات)",
        data.input_vat.gross_tax,
        data.input_vat.adjustments_returns,
        data.input_vat.net_tax,
        data.input_vat.estimated_purchases_base || 0,
      ],
      [""],
      ["صافي الموقف الضريبي", "", "", data.net_vat_position.amount, data.net_vat_position.status_label],
    ];

    const csvContent =
      "\uFEFF" + rows.map((e) => e.map((c) => `"${c}"`).join(",")).join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vat_position_${dateFrom}_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* 1. شريط الفلاتر */}
      <div className="toolbar" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="field">
          <span>من تاريخ الإقرار</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="field">
          <span>إلى تاريخ</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="field">
          <span>الفرع</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="all">كافة الفروع</option>
            <option value="1">الفرع الرئيسي (الرياض)</option>
          </select>
        </div>

        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={loadReport}
            disabled={loading}
            title="تحديث البيانات"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            تحديث
          </button>
          <button className="btn btn-ghost" onClick={handlePrint} title="طباعة">
            <Printer size={15} /> طباعة
          </button>
          <button className="btn btn-ghost" onClick={handleExportCsv} title="تصدير CSV">
            <Download size={15} /> تصدير Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="panel" style={{ borderRight: "4px solid var(--danger)", padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 2. بطاقات مؤشرات الموقف الضريبي (KPIs) */}
      {data && (
        <div className="grid grid-3" style={{ gap: 12 }}>
          <div className="kpi">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3>ضريبة المخرجات الصافية (المبيعات)</h3>
              <ArrowDownLeft size={18} style={{ color: "var(--accent)" }} />
            </div>
            <div className="value" style={{ fontSize: 22, color: "var(--accent)" }}>
              {money(data.output_vat.net_tax)}
            </div>
            <div className="hint">
              إجمالي: {money(data.output_vat.gross_tax)} — تسويات: {money(data.output_vat.adjustments_returns)}
            </div>
          </div>

          <div className="kpi info">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3>ضريبة المدخلات الصافية (المشتريات)</h3>
              <ArrowUpRight size={18} style={{ color: "var(--ok)" }} />
            </div>
            <div className="value" style={{ fontSize: 22, color: "var(--ok)" }}>
              {money(data.input_vat.net_tax)}
            </div>
            <div className="hint">
              إجمالي: {money(data.input_vat.gross_tax)} — تسويات: {money(data.input_vat.adjustments_returns)}
            </div>
          </div>

          <div
            className="kpi"
            style={{
              backgroundColor: data.net_vat_position.status === "payable"
                ? "rgba(239, 68, 68, 0.08)"
                : "rgba(16, 185, 129, 0.08)",
              border: data.net_vat_position.status === "payable"
                ? "1px solid rgba(239, 68, 68, 0.3)"
                : "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3>صافي الموقف الضريبي النهائي</h3>
              <FileCheck2
                size={20}
                style={{
                  color: data.net_vat_position.status === "payable" ? "var(--danger)" : "var(--ok)",
                }}
              />
            </div>
            <div
              className="value"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: data.net_vat_position.status === "payable" ? "var(--danger)" : "var(--ok)",
              }}
            >
              {money(data.net_vat_position.amount)}
            </div>
            <div className="hint" style={{ fontWeight: 600 }}>
              {data.net_vat_position.status_label}
            </div>
          </div>
        </div>
      )}

      {/* 3. تفاصيل احتساب الإقرار الضريبي ZATCA */}
      {data && (
        <section className="panel">
          <div
            className="panel-head"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 16px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                نموذج احتساب إقرار ضريبة القيمة المضافة (معتمد لـ ZATCA)
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                حساب الضرائب والتسويات بناءً على قيود اليومية لضريبة المدخلات وضريبة المخرجات
              </p>
            </div>
            <span className="pill pill-neutral">نسبة الضريبة القياسية: 15%</span>
          </div>

          <div className="table-wrap">
            <table className="data" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-sunken)" }}>
                  <th>بند الإقرار الضريبي</th>
                  <th>الحساب المالي في الدليل</th>
                  <th style={{ textAlign: "right" }}>الوعاء الخاضع التقديري</th>
                  <th style={{ textAlign: "right" }}>إجمالي الضريبة</th>
                  <th style={{ textAlign: "right" }}>تسويات المردودات</th>
                  <th style={{ textAlign: "right" }}>صافي الضريبة المستحقة</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>1. المبيعات الخاضعة للنسبة الأساسية (ضريبة المخرجات)</strong>
                  </td>
                  <td>{data.output_vat.account_name}</td>
                  <td className="amount" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    {money(data.output_vat.estimated_sales_base || 0)}
                  </td>
                  <td className="amount">{money(data.output_vat.gross_tax)}</td>
                  <td className="amount" style={{ color: "var(--accent)" }}>
                    {money(data.output_vat.adjustments_returns)}
                  </td>
                  <td className="amount" style={{ fontWeight: 700, color: "var(--accent)" }}>
                    {money(data.output_vat.net_tax)}
                  </td>
                </tr>

                <tr>
                  <td>
                    <strong>2. المشتريات الخاضعة للنسبة الأساسية (ضريبة المدخلات القابلة للخصم)</strong>
                  </td>
                  <td>{data.input_vat.account_name}</td>
                  <td className="amount" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    {money(data.input_vat.estimated_purchases_base || 0)}
                  </td>
                  <td className="amount">{money(data.input_vat.gross_tax)}</td>
                  <td className="amount" style={{ color: "var(--ok)" }}>
                    {money(data.input_vat.adjustments_returns)}
                  </td>
                  <td className="amount" style={{ fontWeight: 700, color: "var(--ok)" }}>
                    {money(data.input_vat.net_tax)}
                  </td>
                </tr>

                {/* صف صافي الالتزام */}
                <tr
                  style={{
                    background: "var(--surface-sunken)",
                    fontWeight: 700,
                    borderTop: "2px solid var(--border)",
                    fontSize: 14,
                  }}
                >
                  <td colSpan={5} style={{ textAlign: "center", padding: "14px 16px" }}>
                    صافي الضريبة المستحقة للسداد للهيئة أو (الرصيد الدائن المسترد)
                  </td>
                  <td
                    className="amount"
                    style={{
                      fontSize: 16,
                      color: data.net_vat_position.status === "payable"
                        ? "var(--danger)"
                        : "var(--ok)",
                    }}
                  >
                    {money(data.net_vat_position.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
export default VatPositionPage;
