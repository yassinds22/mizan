import React, { useMemo } from "react";
import { Download, Printer } from "lucide-react";
import { trialBalanceRows } from "@/data/accounting";
import { money } from "@/utils/formatters";

export const TrialBalancePage: React.FC = () => {
  const totals = useMemo(() => {
    return trialBalanceRows.reduce(
      (acc, r) => ({ debit: acc.debit + r.debit, credit: acc.credit + r.credit }),
      { debit: 0, credit: 0 }
    );
  }, []);
  const balanced = totals.debit === totals.credit;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="toolbar">
        <div className="field">
          <span>حتى تاريخ</span>
          <input type="date" defaultValue="2026-09-04" />
        </div>
        <div className="field">
          <select defaultValue="all">
            <option value="all">كل الفروع</option>
            <option>الرياض</option>
            <option>جدة</option>
          </select>
        </div>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost">
            <Printer size={15} /> طباعة
          </button>
          <button className="btn btn-ghost">
            <Download size={15} /> تصدير
          </button>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="kpi">
          <h3>إجمالي المدين</h3>
          <div className="value" style={{ fontSize: 24 }}>
            {money(totals.debit)}
          </div>
        </div>
        <div className="kpi info">
          <h3>إجمالي الدائن</h3>
          <div className="value" style={{ fontSize: 24 }}>
            {money(totals.credit)}
          </div>
        </div>
        <div className={`kpi ${balanced ? "" : "danger"}`}>
          <h3>الحالة</h3>
          <div className="value" style={{ fontSize: 22 }}>
            {balanced ? "متوازن" : "غير متوازن"}
          </div>
          <div className="hint">ميزان المراجعة</div>
        </div>
      </div>

      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>الرمز</th>
                <th>الحساب</th>
                <th>مدين</th>
                <th>دائن</th>
              </tr>
            </thead>
            <tbody>
              {trialBalanceRows.map((r) => (
                <tr key={r.code}>
                  <td className="amount">{r.code}</td>
                  <td>{r.name}</td>
                  <td className="amount">{r.debit ? money(r.debit) : "—"}</td>
                  <td className="amount">{r.credit ? money(r.credit) : "—"}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}>
                  <strong>الإجمالي</strong>
                </td>
                <td className="amount">
                  <strong>{money(totals.debit)}</strong>
                </td>
                <td className="amount">
                  <strong>{money(totals.credit)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
