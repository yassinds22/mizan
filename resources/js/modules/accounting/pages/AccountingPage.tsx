import React, { useState } from "react";
import { Plus } from "lucide-react";
import { accounts, journalRows } from "@/data/accounting";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";

interface AccountingPageProps {
  onOpenJournal: () => void;
}

export const AccountingPage: React.FC<AccountingPageProps> = ({
  onOpenJournal,
}) => {
  const [selected, setSelected] = useState("1200");

  return (
    <div className="split">
      <aside className="tree">
        <div
          style={{
            padding: "6px 10px 12px",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          دليل الحسابات
        </div>
        {accounts.map((a) => (
          <button
            key={a.code}
            className={`tree-item ${a.level > 0 ? "indent" : ""} ${
              selected === a.code ? "active" : ""
            }`}
            style={a.level === 2 ? { paddingInlineStart: 44 } : undefined}
            onClick={() => setSelected(a.code)}
          >
            <span className="amount" style={{ opacity: 0.55, minWidth: 44 }}>
              {a.code}
            </span>
            {a.name}
          </button>
        ))}
      </aside>
      <div className="grid" style={{ gap: 16 }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>ملخص الحساب المحدد</h3>
              <p>المخزون — مواد غذائية مرتبط بحركات الدفعات</p>
            </div>
            <button className="btn btn-primary" onClick={onOpenJournal}>
              <Plus size={15} /> قيد يومية
            </button>
          </div>
          <div className="panel-body">
            <div className="stat-row">
              <span>الرصيد الافتتاحي</span>
              <strong className="amount">{money(1620000)}</strong>
            </div>
            <div className="stat-row">
              <span>مدين الفترة</span>
              <strong className="amount">{money(286400)}</strong>
            </div>
            <div className="stat-row">
              <span>دائن الفترة</span>
              <strong className="amount">{money(198200)}</strong>
            </div>
            <div className="stat-row">
              <span>الرصيد الحالي</span>
              <strong className="amount" style={{ color: "var(--brand)" }}>
                {money(1708200)}
              </strong>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>القيود الأخيرة</h3>
              <p>ترحيل تلقائي من الاستلام والبيع والهدر</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>القيد</th>
                  <th>التاريخ</th>
                  <th>البيان</th>
                  <th>مدين</th>
                  <th>دائن</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {journalRows.map((j) => (
                  <tr key={j.no}>
                    <td className="amount">{j.no}</td>
                    <td>{j.date}</td>
                    <td>{j.desc}</td>
                    <td className="amount">{money(j.debit)}</td>
                    <td className="amount">{money(j.credit)}</td>
                    <td>
                      <StatusPill status={j.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
