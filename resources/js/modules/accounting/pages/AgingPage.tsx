import React, { useState } from "react";
import { agingCustomers, agingSuppliers } from "@/data/accounting";
import { money } from "@/utils/formatters";

function AgingTable({
  title,
  rows,
}: {
  title: string;
  rows: typeof agingCustomers | typeof agingSuppliers;
}) {
  const sum = (key: keyof (typeof rows)[0]) =>
    rows.reduce(
      (s, r) => s + (typeof r[key] === "number" ? (r[key] as number) : 0),
      0
    );

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          <p>الشرائح: جاري · 1–30 · 31–60 · 61–90 · أقدم</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>جاري</th>
              <th>1–30</th>
              <th>31–60</th>
              <th>61–90</th>
              <th>أقدم</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const total = r.current + r.d30 + r.d60 + r.d90 + r.older;
              return (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td className="amount">{money(r.current)}</td>
                  <td className="amount">{money(r.d30)}</td>
                  <td className="amount">{money(r.d60)}</td>
                  <td className="amount">{money(r.d90)}</td>
                  <td className="amount">{money(r.older)}</td>
                  <td className="amount">
                    <strong>{money(total)}</strong>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td>
                <strong>الإجمالي</strong>
              </td>
              <td className="amount">{money(sum("current"))}</td>
              <td className="amount">{money(sum("d30"))}</td>
              <td className="amount">{money(sum("d60"))}</td>
              <td className="amount">{money(sum("d90"))}</td>
              <td className="amount">{money(sum("older"))}</td>
              <td className="amount">
                <strong>
                  {money(
                    sum("current") +
                      sum("d30") +
                      sum("d60") +
                      sum("d90") +
                      sum("older")
                  )}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export const AgingPage: React.FC = () => {
  const [tab, setTab] = useState<"customers" | "suppliers">("customers");

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="tabs">
        <button
          className={`tab ${tab === "customers" ? "active" : ""}`}
          onClick={() => setTab("customers")}
        >
          العملاء (ذمم مدينة)
        </button>
        <button
          className={`tab ${tab === "suppliers" ? "active" : ""}`}
          onClick={() => setTab("suppliers")}
        >
          الموردون (ذمم دائنة)
        </button>
      </div>
      {tab === "customers" ? (
        <AgingTable title="أعمار مستحقات العملاء" rows={agingCustomers} />
      ) : (
        <AgingTable title="أعمار مستحقات الموردين" rows={agingSuppliers} />
      )}
    </div>
  );
};
