import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { fetchIncomeStatement, IncomeStatementData, IncomeStatementLineItem } from "@/api/reports";
import { money } from "@/utils/formatters";
import type { PageId } from "@/types/navigation";

interface ProfitLossPageProps {
  onNavigate?: (page: PageId, params?: Record<string, any>) => void;
  onOpenLedger?: (accountId: number) => void;
}

export const ProfitLossPage: React.FC<ProfitLossPageProps> = ({
  onNavigate,
  onOpenLedger,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<IncomeStatementData | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>("all");

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchIncomeStatement({
        date_from: dateFrom,
        date_to: dateTo,
        branch_id: branchId === "all" ? undefined : branchId,
      });
      setData(res);
    } catch (err: any) {
      console.error("Failed to load income statement", err);
      setError(err?.response?.data?.message || "تعذر تحميل قائمة الدخل والأرباح والخسائر.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, branchId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleAccountClick = (item: IncomeStatementLineItem) => {
    if (onOpenLedger) {
      onOpenLedger(item.account_id);
    } else if (onNavigate) {
      onNavigate("account-ledger", { account_id: item.account_id });
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      ["قائمة الدخل والأرباح والخسائر (Income Statement)"],
      [`الفترة: من ${dateFrom} إلى ${dateTo}`],
      [""],
      ["القسم", "كود الحساب", "اسم الحساب", "المبلغ (ر.س)"],
      ...data.revenues.items.map((i) => ["الإيرادات", i.code, i.name_ar, i.amount]),
      ["إجمالي الإيرادات", "", "", data.revenues.total],
      [""],
      ...data.cogs.items.map((i) => ["تكلفة المبيعات", i.code, i.name_ar, i.amount]),
      ["إجمالي تكلفة المبيعات", "", "", data.cogs.total],
      ["مجمل الربح", "", "", data.gross_profit],
      ["هامش مجمل الربح (%)", "", "", `${data.gross_margin_percent}%`],
      [""],
      ...data.operating_expenses.items.map((i) => ["المصروفات التشغيلية", i.code, i.name_ar, i.amount]),
      ["إجمالي المصروفات التشغيلية", "", "", data.operating_expenses.total],
      [""],
      ["صافي الربح / الخسارة", "", "", data.net_profit],
      ["هامش صافي الربح (%)", "", "", `${data.net_margin_percent}%`],
    ];

    const csvContent =
      "\uFEFF" + rows.map((e) => e.map((c) => `"${c}"`).join(",")).join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `income_statement_${dateFrom}_${dateTo}.csv`);
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
          <span>من تاريخ</span>
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

      {/* 2. بطاقات مؤشرات الربحية (KPIs) */}
      {data && (
        <div className="grid grid-4" style={{ gap: 12 }}>
          <div className="kpi">
            <h3>إجمالي الإيرادات</h3>
            <div className="value" style={{ fontSize: 22, color: "var(--accent)" }}>
              {money(data.revenues.total)}
            </div>
            <div className="hint">مبيعات وأنشطة تشغيلية</div>
          </div>

          <div className="kpi">
            <h3>تكلفة البضاعة المباعة (COGS)</h3>
            <div className="value" style={{ fontSize: 22 }}>
              {money(data.cogs.total)}
            </div>
            <div className="hint">تكلفة المواد الغذائية المباعة</div>
          </div>

          <div className="kpi info">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3>مجمل الربح</h3>
              <Percent size={16} />
            </div>
            <div className="value" style={{ fontSize: 22 }}>
              {money(data.gross_profit)}
            </div>
            <div className="hint">
              هامش مجمل: <strong>{data.gross_margin_percent}%</strong>
            </div>
          </div>

          <div
            className="kpi"
            style={{
              backgroundColor: data.net_profit >= 0
                ? "rgba(16, 185, 129, 0.08)"
                : "rgba(239, 68, 68, 0.08)",
              border: data.net_profit >= 0
                ? "1px solid rgba(16, 185, 129, 0.3)"
                : "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3>صافي ربح الفترة</h3>
              {data.net_profit >= 0 ? (
                <ArrowUpRight size={20} style={{ color: "var(--ok)" }} />
              ) : (
                <ArrowDownRight size={20} style={{ color: "var(--danger)" }} />
              )}
            </div>
            <div
              className="value"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: data.net_profit >= 0 ? "var(--ok)" : "var(--danger)",
              }}
            >
              {money(data.net_profit)}
            </div>
            <div className="hint">
              هامش الصافي: <strong>{data.net_margin_percent}%</strong>
            </div>
          </div>
        </div>
      )}

      {/* 3. الجداول التفصيلية لقائمة الدخل */}
      {data && (
        <div className="grid" style={{ gap: 16 }}>
          {/* 1. الإيرادات التشغيلية */}
          <section className="panel">
            <div
              className="panel-head"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(59, 130, 246, 0.04)",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: "var(--accent)" }}>
                  1. الإيرادات التشغيلية (Operating Revenues)
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                  إجمالي عوائد مبيعات المواد الغذائية والأنشطة التجارية بعد استبعاد المردودات
                </p>
              </div>
              <strong style={{ fontSize: 16, color: "var(--accent)" }}>
                {money(data.revenues.total)}
              </strong>
            </div>

            <div className="table-wrap">
              <table className="data" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: "120px" }}>كود الحساب</th>
                    <th>اسم الحساب</th>
                    <th style={{ width: "160px", textAlign: "right" }}>المبلغ (ر.س)</th>
                    <th style={{ width: "60px", textAlign: "center" }}>الأستاذ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenues.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: 16, color: "var(--ink-soft)" }}>
                        لا توجد إيرادات مسجلة خلال الفترة.
                      </td>
                    </tr>
                  ) : (
                    data.revenues.items.map((it) => (
                      <tr key={it.account_id}>
                        <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>
                          {it.code}
                        </td>
                        <td>{it.name_ar}</td>
                        <td className="amount" style={{ fontWeight: 600, color: "var(--ok)" }}>
                          {money(it.amount)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "4px 8px" }}
                            onClick={() => handleAccountClick(it)}
                            title="فتح دفتر الأستاذ"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. تكلفة البضاعة المباعة COGS */}
          <section className="panel">
            <div
              className="panel-head"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(245, 158, 11, 0.04)",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: "#d97706" }}>
                  2. تكلفة البضاعة المباعة (Cost of Goods Sold - COGS)
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                  تكلفة المخزون الفعلي للبضاعة المباعة المنصرفة من المستودعات
                </p>
              </div>
              <strong style={{ fontSize: 16, color: "#d97706" }}>
                {money(data.cogs.total)}
              </strong>
            </div>

            <div className="table-wrap">
              <table className="data" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: "120px" }}>كود الحساب</th>
                    <th>اسم الحساب</th>
                    <th style={{ width: "160px", textAlign: "right" }}>المبلغ (ر.س)</th>
                    <th style={{ width: "60px", textAlign: "center" }}>الأستاذ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cogs.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: 16, color: "var(--ink-soft)" }}>
                        لا توجد تكاليف بضاعة مسجلة خلال الفترة.
                      </td>
                    </tr>
                  ) : (
                    data.cogs.items.map((it) => (
                      <tr key={it.account_id}>
                        <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>
                          {it.code}
                        </td>
                        <td>{it.name_ar}</td>
                        <td className="amount" style={{ fontWeight: 600 }}>
                          {money(it.amount)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "4px 8px" }}
                            onClick={() => handleAccountClick(it)}
                            title="فتح دفتر الأستاذ"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* صف مجمل الربح */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "var(--surface-sunken)",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div>
                <strong>مجمل الربح (Gross Profit) = الإيرادات - تكلفة البضاعة</strong>
                <span className="pill pill-neutral" style={{ marginInlineStart: 8, fontSize: 11 }}>
                  الهامش: {data.gross_margin_percent}%
                </span>
              </div>
              <strong style={{ fontSize: 16, color: data.gross_profit >= 0 ? "var(--ok)" : "var(--danger)" }}>
                {money(data.gross_profit)}
              </strong>
            </div>
          </section>

          {/* 3. المصروفات التشغيلية */}
          <section className="panel">
            <div
              className="panel-head"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(100, 116, 139, 0.04)",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  3. المصروفات التشغيلية والإدارية (Operating Expenses)
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                  مصروفات الإيجارات، الرواتب، التسويق، الصيانة، والإهلاك
                </p>
              </div>
              <strong style={{ fontSize: 16 }}>
                {money(data.operating_expenses.total)}
              </strong>
            </div>

            <div className="table-wrap">
              <table className="data" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: "120px" }}>كود الحساب</th>
                    <th>اسم الحساب</th>
                    <th style={{ width: "160px", textAlign: "right" }}>المبلغ (ر.س)</th>
                    <th style={{ width: "60px", textAlign: "center" }}>الأستاذ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.operating_expenses.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: 16, color: "var(--ink-soft)" }}>
                        لا توجد مصروفات تشغيلية مسجلة خلال الفترة.
                      </td>
                    </tr>
                  ) : (
                    data.operating_expenses.items.map((it) => (
                      <tr key={it.account_id}>
                        <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>
                          {it.code}
                        </td>
                        <td>{it.name_ar}</td>
                        <td className="amount" style={{ fontWeight: 600 }}>
                          {money(it.amount)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "4px 8px" }}
                            onClick={() => handleAccountClick(it)}
                            title="فتح دفتر الأستاذ"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* سطر صافي الربح الختامي */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                background: data.net_profit >= 0
                  ? "rgba(16, 185, 129, 0.08)"
                  : "rgba(239, 68, 68, 0.08)",
                borderTop: "2px solid var(--border)",
              }}
            >
              <div>
                <strong style={{ fontSize: 16 }}>
                  {data.net_profit >= 0 ? "صافي ربح الفترة (Net Profit)" : "صافي خسارة الفترة (Net Loss)"}
                </strong>
                <span className="pill pill-neutral" style={{ marginInlineStart: 8, fontSize: 11 }}>
                  نسبة صافي الربح: {data.net_margin_percent}%
                </span>
              </div>
              <strong
                style={{
                  fontSize: 20,
                  color: data.net_profit >= 0 ? "var(--ok)" : "var(--danger)",
                }}
              >
                {money(data.net_profit)}
              </strong>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
export default ProfitLossPage;
