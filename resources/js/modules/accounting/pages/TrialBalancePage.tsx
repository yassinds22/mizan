import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Download,
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ExternalLink,
  ChevronRight,
  Layers,
  Search,
} from "lucide-react";
import { fetchTrialBalance, TrialBalanceData, TrialBalanceAccountItem } from "@/api/reports";
import { money } from "@/utils/formatters";
import type { PageId } from "@/types/navigation";

interface TrialBalancePageProps {
  onNavigate?: (page: PageId, params?: Record<string, any>) => void;
  onOpenLedger?: (accountId: number) => void;
}

export const TrialBalancePage: React.FC<TrialBalancePageProps> = ({
  onNavigate,
  onOpenLedger,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrialBalanceData | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [leafOnly, setLeafOnly] = useState<boolean>(false);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchTrialBalance({
        date_from: dateFrom,
        date_to: dateTo,
        branch_id: branchId === "all" ? undefined : branchId,
        level: selectedLevel === "all" ? undefined : parseInt(selectedLevel, 10),
      });
      setData(res);
    } catch (err: any) {
      console.error("Failed to load trial balance", err);
      setError(err?.response?.data?.message || "تعذر تحميل بيانات ميزان المراجعة.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, branchId, selectedLevel]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Accounts filtering
  const filteredAccounts = useMemo(() => {
    if (!data?.accounts) return [];
    return data.accounts.filter((acc) => {
      if (leafOnly && !acc.is_leaf) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const codeMatch = acc.code.toLowerCase().includes(term);
        const nameArMatch = acc.name_ar.toLowerCase().includes(term);
        const nameEnMatch = acc.name_en?.toLowerCase().includes(term) ?? false;
        if (!codeMatch && !nameArMatch && !nameEnMatch) return false;
      }
      return true;
    });
  }, [data?.accounts, leafOnly, searchTerm]);

  // Export CSV
  const handleExportCsv = () => {
    if (!data?.accounts) return;
    const headers = [
      "رمز الحساب",
      "اسم الحساب",
      "المستوى",
      "طبيعة الحساب",
      "افتتاحي مدين",
      "افتتاحي دائن",
      "فترة مدين",
      "فترة دائن",
      "ختامي مدين",
      "ختامي دائن",
    ];

    const rows = filteredAccounts.map((a) => [
      `"${a.code}"`,
      `"${a.name_ar}"`,
      a.level,
      `"${a.type_label}"`,
      a.opening_debit,
      a.opening_credit,
      a.period_debit,
      a.period_credit,
      a.closing_debit,
      a.closing_credit,
    ]);

    if (data.totals) {
      rows.push([
        '"الإجمالي العام"',
        '""',
        '""',
        '""',
        data.totals.opening_debit,
        data.totals.opening_credit,
        data.totals.period_debit,
        data.totals.period_credit,
        data.totals.closing_debit,
        data.totals.closing_credit,
      ]);
    }

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `trial_balance_${dateFrom}_${dateTo}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAccountClick = (acc: TrialBalanceAccountItem) => {
    if (onOpenLedger) {
      onOpenLedger(acc.id);
    } else if (onNavigate) {
      onNavigate("account-ledger", { account_id: acc.id });
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* 1. شريط الأدوات والفلاتر */}
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
        <div className="field">
          <span>مستوى الشجرة</span>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <option value="all">كافة المستويات</option>
            <option value="1">المستوى 1 (الحسابات الرئيسية)</option>
            <option value="2">المستوى 2 (المجموعات)</option>
            <option value="3">المستوى 3 (الحسابات التفصيلية)</option>
          </select>
        </div>

        <div className="field" style={{ minWidth: 200 }}>
          <span>بحث سريع</span>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={14} style={{ position: "absolute", right: 8, color: "var(--ink-soft)" }} />
            <input
              type="text"
              placeholder="كود أو اسم الحساب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingInlineStart: 28 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginInlineStart: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={leafOnly}
              onChange={(e) => setLeafOnly(e.target.checked)}
            />
            <span>الحسابات التحليلية (الأوراق) فقط</span>
          </label>
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

      {/* تنبيه الخطأ */}
      {error && (
        <div className="panel" style={{ borderRight: "4px solid var(--danger)", padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)" }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 2. بطاقات مؤشرات التوازن والمجاميع (KPIs) */}
      {data && (
        <div className="grid grid-4" style={{ gap: 12 }}>
          <div className="kpi">
            <h3>الرصيد الافتتاحي</h3>
            <div className="value" style={{ fontSize: 20 }}>
              {money(data.totals.opening_debit)}
            </div>
            <div className="hint" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>مدين: {money(data.totals.opening_debit)}</span>
              <span>دائن: {money(data.totals.opening_credit)}</span>
            </div>
          </div>

          <div className="kpi">
            <h3>حركات الفترة</h3>
            <div className="value" style={{ fontSize: 20, color: "var(--accent)" }}>
              {money(data.totals.period_debit)}
            </div>
            <div className="hint" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>مدين: {money(data.totals.period_debit)}</span>
              <span>دائن: {money(data.totals.period_credit)}</span>
            </div>
          </div>

          <div className="kpi info">
            <h3>الأرصدة الختامية</h3>
            <div className="value" style={{ fontSize: 20 }}>
              {money(data.totals.closing_debit)}
            </div>
            <div className="hint" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>مدين: {money(data.totals.closing_debit)}</span>
              <span>دائن: {money(data.totals.closing_credit)}</span>
            </div>
          </div>

          <div
            className="kpi"
            style={{
              backgroundColor: data.is_balanced
                ? "rgba(16, 185, 129, 0.08)"
                : "rgba(239, 68, 68, 0.08)",
              border: data.is_balanced
                ? "1px solid rgba(16, 185, 129, 0.3)"
                : "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3>حالة التوازن المحاسبي</h3>
              {data.is_balanced ? (
                <CheckCircle2 size={20} style={{ color: "var(--ok, #10b981)" }} />
              ) : (
                <AlertTriangle size={20} style={{ color: "var(--danger, #ef4444)" }} />
              )}
            </div>
            <div
              className="value"
              style={{
                fontSize: 20,
                color: data.is_balanced ? "var(--ok, #10b981)" : "var(--danger, #ef4444)",
              }}
            >
              {data.is_balanced ? "متوازن تماماً (100%)" : "غير متوازن!"}
            </div>
            <div className="hint">
              {data.is_balanced
                ? "الفارق بين جانبي الميزان = 0.00 ر.س"
                : `يوجد فارق قدره ${money(data.totals.difference)}`}
            </div>
          </div>
        </div>
      )}

      {/* 3. جدول ميزان المراجعة */}
      <section className="panel">
        <div
          className="panel-head"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              ميزان المراجعة العام (Trial Balance)
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
              مجموع الحركات والأرصدة المستخرجة مباشرة من قيود اليومية المرحلة
            </p>
          </div>
          <span className="pill pill-neutral">
            عدد الحسابات المعروضة: {filteredAccounts.length}
          </span>
        </div>

        <div className="table-wrap">
          <table className="data" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--surface-sunken)" }}>
                <th rowSpan={2} style={{ width: "90px", textAlign: "center" }}>
                  كود الحساب
                </th>
                <th rowSpan={2}>اسم الحساب والشجرة</th>
                <th rowSpan={2} style={{ width: "80px", textAlign: "center" }}>
                  النوع
                </th>
                <th colSpan={2} style={{ textAlign: "center", borderBottom: "1px solid var(--border)" }}>
                  رصيد أول المدة
                </th>
                <th colSpan={2} style={{ textAlign: "center", borderBottom: "1px solid var(--border)" }}>
                  حركة الفترة
                </th>
                <th colSpan={2} style={{ textAlign: "center", borderBottom: "1px solid var(--border)" }}>
                  رصيد آخر المدة
                </th>
                <th rowSpan={2} style={{ width: "60px", textAlign: "center" }}>
                  الأستاذ
                </th>
              </tr>
              <tr style={{ background: "var(--surface-sunken)" }}>
                <th style={{ textAlign: "right", width: "100px" }}>مدين</th>
                <th style={{ textAlign: "right", width: "100px" }}>دائن</th>
                <th style={{ textAlign: "right", width: "100px" }}>مدين</th>
                <th style={{ textAlign: "right", width: "100px" }}>دائن</th>
                <th style={{ textAlign: "right", width: "100px" }}>مدين</th>
                <th style={{ textAlign: "right", width: "100px" }}>دائن</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 32 }}>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                      <RefreshCw size={20} className="animate-spin" />
                      <span>جاري إعداد ميزان المراجعة...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 32, color: "var(--ink-soft)" }}>
                    لا توجد بيانات مطابقة لخيارات الفلترة الحالية.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const isParent = !acc.is_leaf;
                  const indentPx = (acc.level - 1) * 18;

                  return (
                    <tr
                      key={acc.id}
                      style={{
                        backgroundColor: isParent
                          ? acc.level === 1
                            ? "var(--surface-sunken)"
                            : "rgba(0,0,0,0.015)"
                          : "transparent",
                        fontWeight: isParent ? 600 : 400,
                      }}
                    >
                      <td
                        className="amount"
                        style={{
                          textAlign: "center",
                          fontFamily: "var(--font-mono, monospace)",
                          fontWeight: 600,
                        }}
                      >
                        {acc.code}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", paddingInlineStart: indentPx }}>
                          {isParent ? (
                            <Layers size={14} style={{ marginInlineEnd: 6, color: "var(--accent)", flexShrink: 0 }} />
                          ) : (
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor: "var(--border)",
                                marginInlineEnd: 10,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span style={{ color: isParent ? "var(--ink)" : "var(--ink-soft)" }}>
                            {acc.name_ar}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className="pill pill-neutral"
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            opacity: 0.85,
                          }}
                        >
                          {acc.type_label}
                        </span>
                      </td>

                      {/* افتتاحية */}
                      <td className="amount">
                        {acc.opening_debit > 0 ? money(acc.opening_debit) : "—"}
                      </td>
                      <td className="amount">
                        {acc.opening_credit > 0 ? money(acc.opening_credit) : "—"}
                      </td>

                      {/* حركات الفترة */}
                      <td className="amount" style={{ color: acc.period_debit > 0 ? "var(--accent)" : undefined }}>
                        {acc.period_debit > 0 ? money(acc.period_debit) : "—"}
                      </td>
                      <td className="amount" style={{ color: acc.period_credit > 0 ? "var(--accent)" : undefined }}>
                        {acc.period_credit > 0 ? money(acc.period_credit) : "—"}
                      </td>

                      {/* ختامية */}
                      <td
                        className="amount"
                        style={{
                          fontWeight: 600,
                          color: acc.closing_debit > 0 ? "var(--ink)" : undefined,
                        }}
                      >
                        {acc.closing_debit > 0 ? money(acc.closing_debit) : "—"}
                      </td>
                      <td
                        className="amount"
                        style={{
                          fontWeight: 600,
                          color: acc.closing_credit > 0 ? "var(--ink)" : undefined,
                        }}
                      >
                        {acc.closing_credit > 0 ? money(acc.closing_credit) : "—"}
                      </td>

                      {/* زر الأستاذ */}
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() => handleAccountClick(acc)}
                          title="عرض كشف دفتر الأستاذ العام لهذا الحساب"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* صف الإجمالي العام الصارم المعتمد من أوراق الشجرة */}
              {data && (
                <tr
                  style={{
                    background: "var(--surface-sunken)",
                    fontWeight: 700,
                    borderTop: "2px solid var(--border)",
                    fontSize: 14,
                  }}
                >
                  <td colSpan={3} style={{ textAlign: "center", padding: "12px 16px" }}>
                    <span>المجموع الإجمالي العام (محسوب حصراً من الحسابات الفرعية لمنع الازدواجية)</span>
                  </td>
                  <td className="amount" style={{ color: "var(--ink)" }}>
                    {money(data.totals.opening_debit)}
                  </td>
                  <td className="amount" style={{ color: "var(--ink)" }}>
                    {money(data.totals.opening_credit)}
                  </td>
                  <td className="amount" style={{ color: "var(--accent)" }}>
                    {money(data.totals.period_debit)}
                  </td>
                  <td className="amount" style={{ color: "var(--accent)" }}>
                    {money(data.totals.period_credit)}
                  </td>
                  <td className="amount" style={{ color: "var(--ink)" }}>
                    {money(data.totals.closing_debit)}
                  </td>
                  <td className="amount" style={{ color: "var(--ink)" }}>
                    {money(data.totals.closing_credit)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {data.is_balanced ? (
                      <CheckCircle2 size={16} style={{ color: "var(--ok)", display: "inline" }} />
                    ) : (
                      <AlertTriangle size={16} style={{ color: "var(--danger)", display: "inline" }} />
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
export default TrialBalancePage;
