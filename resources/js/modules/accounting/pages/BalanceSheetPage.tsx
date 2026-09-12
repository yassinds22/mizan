import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ExternalLink,
  ShieldCheck,
  Building,
  CreditCard,
  PieChart,
} from "lucide-react";
import { fetchBalanceSheet, BalanceSheetData, BalanceSheetAccountItem } from "@/api/reports";
import { money } from "@/utils/formatters";
import type { PageId } from "@/types/navigation";

interface BalanceSheetPageProps {
  onNavigate?: (page: PageId, params?: Record<string, any>) => void;
  onOpenLedger?: (accountId: number) => void;
}

export const BalanceSheetPage: React.FC<BalanceSheetPageProps> = ({
  onNavigate,
  onOpenLedger,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BalanceSheetData | null>(null);

  // Filters
  const [asOfDate, setAsOfDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>("all");

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchBalanceSheet({
        as_of_date: asOfDate,
        branch_id: branchId === "all" ? undefined : branchId,
      });
      setData(res);
    } catch (err: any) {
      console.error("Failed to load balance sheet", err);
      setError(err?.response?.data?.message || "تعذر تحميل الميزانية العمومية.");
    } finally {
      setLoading(false);
    }
  }, [asOfDate, branchId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleAccountClick = (item: BalanceSheetAccountItem) => {
    if (onOpenLedger) {
      onOpenLedger(item.account_id);
    } else if (onNavigate) {
      onNavigate("account-ledger", { account_id: item.account_id });
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      ["الميزانية العمومية وقائمة المركز المالي (Balance Sheet)"],
      [`حتى تاريخ: ${asOfDate}`],
      [""],
      ["القسم", "كود الحساب", "اسم الحساب", "الرصيد (ر.س)"],
      ...data.assets.items.map((i) => ["الأصول", i.code, i.name_ar, i.balance]),
      ["إجمالي الأصول", "", "", data.assets.total],
      [""],
      ...data.liabilities.items.map((i) => ["الالتزامات (الخصوم)", i.code, i.name_ar, i.balance]),
      ["إجمالي الالتزامات", "", "", data.liabilities.total],
      [""],
      ...data.equity.items.map((i) => ["حقوق الملكية", i.code, i.name_ar, i.balance]),
      ["أرباح الفترة الحالية من قائمة الدخل", "", "", data.equity.current_period_net_profit],
      ["إجمالي حقوق الملكية", "", "", data.equity.total_equity],
      [""],
      ["إجمالي الالتزامات وحقوق الملكية", "", "", data.total_liabilities_and_equity],
      ["حالة التوازن", "", "", data.is_balanced ? "متوازنة" : "غير متوازنة"],
      ["الفارق", "", "", data.difference],
    ];

    const csvContent =
      "\uFEFF" + rows.map((e) => e.map((c) => `"${c}"`).join(",")).join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `balance_sheet_${asOfDate}.csv`);
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
          <span>حتى تاريخ (As of Date)</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
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
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 2. بانر التحقق من المعادلة المحاسبية الذهبية */}
      {data && (
        <div
          className="panel"
          style={{
            padding: "16px 20px",
            backgroundColor: data.is_balanced
              ? "rgba(16, 185, 129, 0.06)"
              : "rgba(239, 68, 68, 0.06)",
            border: data.is_balanced
              ? "1px solid rgba(16, 185, 129, 0.3)"
              : "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  backgroundColor: data.is_balanced
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: data.is_balanced ? "var(--ok, #10b981)" : "var(--danger, #ef4444)",
                }}
              >
                <Scale size={24} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 17 }}>
                    المعادلة الذهبية: الأصول = الالتزامات + حقوق الملكية
                  </h3>
                  {data.is_balanced ? (
                    <span
                      className="pill"
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                        color: "var(--ok)",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={12} style={{ display: "inline", marginInlineEnd: 4 }} />
                      الميزانية متوازنة بدقة 100%
                    </span>
                  ) : (
                    <span
                      className="pill"
                      style={{
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        color: "var(--danger)",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <AlertTriangle size={12} style={{ display: "inline", marginInlineEnd: 4 }} />
                      فارق محاسبي: {money(data.difference)}
                    </span>
                  )}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>
                  تم ترحيل أرباح الفترة الحالية ({money(data.equity.current_period_net_profit)}) تلقائياً من قائمة الدخل لحقوق الملكية لضمان الاكتمال
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>إجمالي الأصول</span>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
                  {money(data.assets.total)}
                </div>
              </div>
              <div style={{ fontSize: 20, color: "var(--ink-soft)" }}>=</div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>الالتزامات + حقوق الملكية</span>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
                  {money(data.total_liabilities_and_equity)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. تخطيط المركز المالي (عمودين متقابلين) */}
      {data && (
        <div className="grid grid-2" style={{ gap: 16 }}>
          {/* الجانب الأيمن: الأصول */}
          <section className="panel">
            <div
              className="panel-head"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(59, 130, 246, 0.05)",
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Building size={18} style={{ color: "var(--accent)" }} />
                <h3 style={{ margin: 0, fontSize: 16, color: "var(--accent)" }}>
                  الأصول (Assets)
                </h3>
              </div>
              <strong style={{ fontSize: 16, color: "var(--accent)" }}>
                {money(data.assets.total)}
              </strong>
            </div>

            <div className="table-wrap">
              <table className="data" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: "110px" }}>كود الحساب</th>
                    <th>اسم الحساب</th>
                    <th style={{ width: "140px", textAlign: "right" }}>الرصيد (ر.س)</th>
                    <th style={{ width: "50px", textAlign: "center" }}>الأستاذ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--ink-soft)" }}>
                        لا توجد أصول مسجلة حتى هذا التاريخ.
                      </td>
                    </tr>
                  ) : (
                    data.assets.items.map((it) => (
                      <tr key={it.account_id}>
                        <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>
                          {it.code}
                        </td>
                        <td>{it.name_ar}</td>
                        <td className="amount" style={{ fontWeight: 600 }}>
                          {money(it.balance)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "4px 6px" }}
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

            {/* إجمالي الأصول */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                background: "var(--surface-sunken)",
                borderTop: "2px solid var(--border)",
              }}
            >
              <strong style={{ fontSize: 15 }}>مجموع الأصول (Total Assets)</strong>
              <strong style={{ fontSize: 17, color: "var(--accent)" }}>
                {money(data.assets.total)}
              </strong>
            </div>
          </section>

          {/* الجانب الأيسر: الالتزامات وحقوق الملكية */}
          <div className="grid" style={{ gap: 16 }}>
            {/* 1. الخصوم والالتزامات */}
            <section className="panel">
              <div
                className="panel-head"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(245, 158, 11, 0.05)",
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CreditCard size={18} style={{ color: "#d97706" }} />
                  <h3 style={{ margin: 0, fontSize: 16, color: "#d97706" }}>
                    الالتزامات / الخصوم (Liabilities)
                  </h3>
                </div>
                <strong style={{ fontSize: 16, color: "#d97706" }}>
                  {money(data.liabilities.total)}
                </strong>
              </div>

              <div className="table-wrap">
                <table className="data" style={{ width: "100%", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ width: "110px" }}>كود الحساب</th>
                      <th>اسم الحساب</th>
                      <th style={{ width: "140px", textAlign: "right" }}>الرصيد (ر.س)</th>
                      <th style={{ width: "50px", textAlign: "center" }}>الأستاذ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.liabilities.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 16, color: "var(--ink-soft)" }}>
                          لا توجد التزامات مسجلة حتى هذا التاريخ.
                        </td>
                      </tr>
                    ) : (
                      data.liabilities.items.map((it) => (
                        <tr key={it.account_id}>
                          <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>
                            {it.code}
                          </td>
                          <td>{it.name_ar}</td>
                          <td className="amount" style={{ fontWeight: 600 }}>
                            {money(it.balance)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: "4px 6px" }}
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

            {/* 2. حقوق الملكية */}
            <section className="panel">
              <div
                className="panel-head"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(16, 185, 129, 0.05)",
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PieChart size={18} style={{ color: "var(--ok)" }} />
                  <h3 style={{ margin: 0, fontSize: 16, color: "var(--ok)" }}>
                    حقوق الملكية (Owner's Equity)
                  </h3>
                </div>
                <strong style={{ fontSize: 16, color: "var(--ok)" }}>
                  {money(data.equity.total_equity)}
                </strong>
              </div>

              <div className="table-wrap">
                <table className="data" style={{ width: "100%", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ width: "110px" }}>كود الحساب</th>
                      <th>اسم الحساب</th>
                      <th style={{ width: "140px", textAlign: "right" }}>الرصيد (ر.س)</th>
                      <th style={{ width: "50px", textAlign: "center" }}>الأستاذ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.equity.items.map((it) => (
                      <tr key={it.account_id}>
                        <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>
                          {it.code}
                        </td>
                        <td>{it.name_ar}</td>
                        <td className="amount" style={{ fontWeight: 600 }}>
                          {money(it.balance)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "4px 6px" }}
                            onClick={() => handleAccountClick(it)}
                            title="فتح دفتر الأستاذ"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* سطر صافي أرباح الفترة المرحّلة من قائمة الدخل */}
                    <tr style={{ background: "rgba(16, 185, 129, 0.04)" }}>
                      <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, color: "var(--ok)" }}>
                        P&L
                      </td>
                      <td>
                        <strong>أرباح الفترة الحالية (ترحيل آلي من قائمة الدخل)</strong>
                      </td>
                      <td className="amount" style={{ fontWeight: 700, color: "var(--ok)" }}>
                        {money(data.equity.current_period_net_profit)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 6px" }}
                          onClick={() => onNavigate?.("profit-loss")}
                          title="عرض قائمة الدخل والأرباح والخسائر"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* إجمالي الالتزامات وحقوق الملكية */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  background: "var(--surface-sunken)",
                  borderTop: "2px solid var(--border)",
                }}
              >
                <strong style={{ fontSize: 15 }}>مجموع الالتزامات وحقوق الملكية</strong>
                <strong style={{ fontSize: 17, color: "var(--ink)" }}>
                  {money(data.total_liabilities_and_equity)}
                </strong>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
export default BalanceSheetPage;
