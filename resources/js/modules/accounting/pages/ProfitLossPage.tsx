import React from "react";
import { Download } from "lucide-react";
import { profitLossRows } from "@/data/accounting";
import { money } from "@/utils/formatters";

export const ProfitLossPage: React.FC = () => {
  const revenue = profitLossRows
    .filter((r) => r.group === "إيرادات")
    .reduce((s, r) => s + r.amount, 0);
  const cogs = profitLossRows
    .filter((r) => r.group === "تكلفة")
    .reduce((s, r) => s + r.amount, 0);
  const opex = profitLossRows
    .filter((r) => r.group === "تشغيل")
    .reduce((s, r) => s + r.amount, 0);
  const gross = revenue + cogs;
  const net = gross + opex;
  const margin = revenue ? Math.round((gross / revenue) * 100) : 0;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="toolbar">
        <div className="field">
          <span>من</span>
          <input type="date" defaultValue="2026-09-01" />
        </div>
        <div className="field">
          <span>إلى</span>
          <input type="date" defaultValue="2026-09-04" />
        </div>
        <div className="field">
          <select defaultValue="all">
            <option value="all">كل المستودعات</option>
            <option>المستودع الرئيسي</option>
            <option>الثلاجة 1</option>
          </select>
        </div>
        <div style={{ marginInlineStart: "auto" }}>
          <button className="btn btn-ghost">
            <Download size={15} /> تصدير
          </button>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="kpi">
          <h3>مجمل الربح</h3>
          <div className="value" style={{ fontSize: 24 }}>
            {money(gross)}
          </div>
          <div className="hint">هامش {margin}%</div>
        </div>
        <div className="kpi warm">
          <h3>هدر الصلاحية</h3>
          <div className="value" style={{ fontSize: 24 }}>
            {money(18920)}
          </div>
          <div className="hint">ضمن تكلفة الفترة</div>
        </div>
        <div className="kpi info">
          <h3>صافي الربح</h3>
          <div className="value" style={{ fontSize: 24 }}>
            {money(net)}
          </div>
          <div className="hint">بعد مصروفات التشغيل</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>قائمة الدخل</h3>
            <p>تجميع حسب المجموعة</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>المجموعة</th>
                <th>البند</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {profitLossRows.map((r) => (
                <tr key={r.name}>
                  <td>
                    <span className="pill pill-neutral">{r.group}</span>
                  </td>
                  <td>{r.name}</td>
                  <td
                    className="amount"
                    style={{
                      color: r.amount < 0 ? "var(--danger)" : "var(--ok)",
                    }}
                  >
                    {money(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-body totals-box">
          <div className="stat-row">
            <span>صافي المبيعات</span>
            <strong className="amount">{money(revenue)}</strong>
          </div>
          <div className="stat-row">
            <span>مجمل الربح</span>
            <strong className="amount">{money(gross)}</strong>
          </div>
          <div className="stat-row total-row">
            <span>صافي الفترة</span>
            <strong className="amount">{money(net)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
};
