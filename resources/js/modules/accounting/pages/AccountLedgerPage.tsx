import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download,
  Printer,
  RefreshCw,
  Search,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  FileText,
  AlertCircle,
} from "lucide-react";
import { fetchAccountLedger, AccountLedgerData, AccountLedgerTransaction } from "@/api/reports";
import { accountingApi, AccountApi } from "@/api/accounting";
import { money } from "@/utils/formatters";
import type { PageId } from "@/types/navigation";

interface AccountLedgerPageProps {
  initialAccountId?: number | null;
  onNavigate?: (page: PageId, params?: Record<string, any>) => void;
}

export const AccountLedgerPage: React.FC<AccountLedgerPageProps> = ({
  initialAccountId,
  onNavigate,
}) => {
  const [accounts, setAccounts] = useState<AccountApi[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    initialAccountId || null
  );
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);
  const [ledgerData, setLedgerData] = useState<AccountLedgerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // 1. تحميل قائمة الحسابات
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const list = await accountingApi.getAccounts({ is_active: 1 });
        setAccounts(list);
        if (!selectedAccountId && list.length > 0) {
          // اختيار أول حساب ورقي أو نقدية افتراضياً
          const defaultAcc = list.find((a) => a.is_leaf && a.code.startsWith("11")) || list.find((a) => a.is_leaf) || list[0];
          if (defaultAcc) {
            setSelectedAccountId(defaultAcc.id);
          }
        }
      } catch (e) {
        console.error("Failed to load accounts", e);
      } finally {
        setLoadingAccounts(false);
      }
    };
    loadAccounts();
  }, []);

  // تحديث عند تغير initialAccountId من الخارج
  useEffect(() => {
    if (initialAccountId) {
      setSelectedAccountId(initialAccountId);
    }
  }, [initialAccountId]);

  // 2. استدعاء كشف دفتر الأستاذ للحساب المحدد
  const loadLedger = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      setLoadingLedger(true);
      setError(null);
      const res = await fetchAccountLedger(selectedAccountId, {
        date_from: dateFrom,
        date_to: dateTo,
        branch_id: branchId === "all" ? undefined : branchId,
      });
      setLedgerData(res);
    } catch (err: any) {
      console.error("Failed to load account ledger", err);
      setError(err?.response?.data?.message || "تعذر تحميل كشف حساب دفتر الأستاذ.");
    } finally {
      setLoadingLedger(false);
    }
  }, [selectedAccountId, dateFrom, dateTo, branchId]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  // فلترة الحسابات في القائمة المنسدلة
  const filteredAccountOptions = useMemo(() => {
    if (!searchTerm) return accounts;
    const t = searchTerm.toLowerCase();
    return accounts.filter(
      (a) =>
        a.code.toLowerCase().includes(t) ||
        a.name_ar.toLowerCase().includes(t) ||
        (a.name_en && a.name_en.toLowerCase().includes(t))
    );
  }, [accounts, searchTerm]);

  // تصدير CSV
  const handleExportCsv = () => {
    if (!ledgerData) return;
    const headers = [
      "التاريخ",
      "رقم القيد",
      "المرجع",
      "المصدر",
      "البيان والتفاصيل",
      "مدين",
      "دائن",
      "الرصيد التراكمي",
    ];

    const rows = ledgerData.transactions.map((tx) => [
      `"${tx.date}"`,
      `"${tx.entry_number}"`,
      `"${tx.reference || ""}"`,
      `"${tx.source_type}"`,
      `"${(tx.description || "").replace(/"/g, '""')}"`,
      tx.debit,
      tx.credit,
      tx.running_balance,
    ]);

    const csvContent =
      "\uFEFF" +
      [
        `"كشف دفتر الأستاذ العام - حساب: ${ledgerData.account.code} - ${ledgerData.account.name_ar}"`,
        `"الفترة: من ${dateFrom || "البداية"} إلى ${dateTo}"`,
        `"الرصيد الافتتاحي: ${ledgerData.opening_balance}"`,
        headers.join(","),
        ...rows.map((e) => e.join(",")),
        `"الإجمالي","","","","إجمالي الحركات",${ledgerData.total_debit},${ledgerData.total_credit},${ledgerData.closing_balance}`,
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ledger_${ledgerData.account.code}_${dateFrom}_${dateTo}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* 1. شريط الفلاتر واختيار الحساب */}
      <div className="toolbar" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="field" style={{ minWidth: 260 }}>
          <span>الحساب المالي</span>
          <select
            value={selectedAccountId || ""}
            onChange={(e) => setSelectedAccountId(Number(e.target.value))}
            disabled={loadingAccounts}
          >
            {loadingAccounts ? (
              <option>جاري تحميل الحسابات...</option>
            ) : (
              filteredAccountOptions.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} — {acc.name_ar} {acc.is_leaf ? "" : " (رئيسي)"}
                </option>
              ))
            )}
          </select>
        </div>

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
            onClick={loadLedger}
            disabled={loadingLedger || !selectedAccountId}
            title="تحديث البيانات"
          >
            <RefreshCw size={15} className={loadingLedger ? "animate-spin" : ""} />
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

      {/* خطأ */}
      {error && (
        <div className="panel" style={{ borderRight: "4px solid var(--danger)", padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 2. بطاقات مؤشرات الأرصدة (KPIs) */}
      {ledgerData && (
        <div className="grid grid-4" style={{ gap: 12 }}>
          <div className="kpi">
            <h3>الرصيد الافتتاحي</h3>
            <div className="value" style={{ fontSize: 22 }}>
              {money(ledgerData.opening_balance)}
            </div>
            <div className="hint">
              {ledgerData.opening_balance >= 0
                ? ledgerData.account.nature === "debit" ? "رصيد مدين سابق" : "رصيد دائن سابق"
                : "رصيد عكس الطبيعة"}
            </div>
          </div>

          <div className="kpi">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3>إجمالي حركات المدين (+)</h3>
              <ArrowDownLeft size={18} style={{ color: "var(--ok, #10b981)" }} />
            </div>
            <div className="value" style={{ fontSize: 22, color: "var(--ok, #10b981)" }}>
              {money(ledgerData.total_debit)}
            </div>
            <div className="hint">خلال الفترة المحددة</div>
          </div>

          <div className="kpi info">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3>إجمالي حركات الدائن (-)</h3>
              <ArrowUpRight size={18} style={{ color: "var(--accent, #3b82f6)" }} />
            </div>
            <div className="value" style={{ fontSize: 22, color: "var(--accent, #3b82f6)" }}>
              {money(ledgerData.total_credit)}
            </div>
            <div className="hint">خلال الفترة المحددة</div>
          </div>

          <div
            className="kpi"
            style={{
              backgroundColor: "var(--surface-sunken)",
              border: "1px solid var(--border)",
            }}
          >
            <h3>الرصيد الختامي للحساب</h3>
            <div
              className="value"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              {money(ledgerData.closing_balance)}
            </div>
            <div className="hint">
              طبيعة الحساب:{" "}
              <strong>
                {ledgerData.account.nature === "debit" ? "مدين (Debit)" : "دائن (Credit)"}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 3. جدول دفتر الأستاذ العام */}
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
              {ledgerData ? (
                <>
                  كشف دفتر الأستاذ:{" "}
                  <span style={{ color: "var(--accent)" }}>
                    [{ledgerData.account.code}] {ledgerData.account.name_ar}
                  </span>
                </>
              ) : (
                "كشف حركات دفتر الأستاذ العام"
              )}
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
              الحركات المالية اللحظية مرتبة زمنياً مع احتساب الرصيد التراكمي
            </p>
          </div>
          {ledgerData && (
            <span className="pill pill-neutral">
              عدد الحركات: {ledgerData.transactions.length}
            </span>
          )}
        </div>

        <div className="table-wrap">
          <table className="data" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--surface-sunken)" }}>
                <th style={{ width: "100px" }}>التاريخ</th>
                <th style={{ width: "110px", textAlign: "center" }}>رقم القيد</th>
                <th style={{ width: "120px" }}>المرجع</th>
                <th style={{ width: "90px", textAlign: "center" }}>المصدر</th>
                <th>البيان وشرح الحركة</th>
                <th style={{ width: "110px", textAlign: "right" }}>مدين</th>
                <th style={{ width: "110px", textAlign: "right" }}>دائن</th>
                <th style={{ width: "120px", textAlign: "right" }}>الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody>
              {/* سطر الرصيد الافتتاحي */}
              {ledgerData && (
                <tr style={{ background: "rgba(0,0,0,0.02)", fontWeight: 600 }}>
                  <td>{ledgerData.filters.date_from || "—"}</td>
                  <td style={{ textAlign: "center" }}>—</td>
                  <td>—</td>
                  <td style={{ textAlign: "center" }}>
                    <span className="pill pill-neutral" style={{ fontSize: 10 }}>
                      افتتاحي
                    </span>
                  </td>
                  <td>
                    <strong>الرصيد الافتتاحي السابق للفترة</strong>
                  </td>
                  <td className="amount">—</td>
                  <td className="amount">—</td>
                  <td className="amount" style={{ fontWeight: 700 }}>
                    {money(ledgerData.opening_balance)}
                  </td>
                </tr>
              )}

              {loadingLedger ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 32 }}>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                      <RefreshCw size={20} className="animate-spin" />
                      <span>جاري جلب حركات دفتر الأستاذ...</span>
                    </div>
                  </td>
                </tr>
              ) : !ledgerData || ledgerData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--ink-soft)" }}>
                    لا توجد حركات مالية مسجلة لهذا الحساب خلال الفترة المحددة.
                  </td>
                </tr>
              ) : (
                ledgerData.transactions.map((tx) => (
                  <tr key={tx.line_id}>
                    <td style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      {tx.date}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        fontFamily: "var(--font-mono, monospace)",
                        fontWeight: 600,
                        color: "var(--accent)",
                      }}
                    >
                      {tx.entry_number}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      {tx.reference || "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        className="pill pill-neutral"
                        style={{ fontSize: 10, padding: "2px 6px" }}
                      >
                        {tx.source_type}
                      </span>
                    </td>
                    <td>{tx.description}</td>
                    <td
                      className="amount"
                      style={{ color: tx.debit > 0 ? "var(--ok)" : undefined }}
                    >
                      {tx.debit > 0 ? money(tx.debit) : "—"}
                    </td>
                    <td
                      className="amount"
                      style={{ color: tx.credit > 0 ? "var(--accent)" : undefined }}
                    >
                      {tx.credit > 0 ? money(tx.credit) : "—"}
                    </td>
                    <td
                      className="amount"
                      style={{
                        fontWeight: 600,
                        color: tx.running_balance < 0 ? "var(--danger)" : "var(--ink)",
                      }}
                    >
                      {money(tx.running_balance)}
                    </td>
                  </tr>
                ))
              )}

              {/* صف الإجماليات */}
              {ledgerData && (
                <tr
                  style={{
                    background: "var(--surface-sunken)",
                    fontWeight: 700,
                    borderTop: "2px solid var(--border)",
                  }}
                >
                  <td colSpan={5} style={{ textAlign: "center", padding: "12px 16px" }}>
                    إجمالي حركات الفترة والرصيد النهائي
                  </td>
                  <td className="amount" style={{ color: "var(--ok)" }}>
                    {money(ledgerData.total_debit)}
                  </td>
                  <td className="amount" style={{ color: "var(--accent)" }}>
                    {money(ledgerData.total_credit)}
                  </td>
                  <td className="amount" style={{ color: "var(--ink)", fontSize: 14 }}>
                    {money(ledgerData.closing_balance)}
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
export default AccountLedgerPage;
