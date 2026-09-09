import React, { useMemo, useState } from "react";
import { Save, Users } from "lucide-react";
import { partners } from "@/data/partners";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";

interface PartnersPageProps {
  onOpenInvoice?: () => void;
}

export const PartnersPage: React.FC<PartnersPageProps> = ({ onOpenInvoice }) => {
  const [kind, setKind] = useState<"الكل" | "عميل" | "مورد">("الكل");
  const [selected, setSelected] = useState(partners[0].id);

  const list = useMemo(
    () => partners.filter((p) => kind === "الكل" || p.kind === kind),
    [kind]
  );
  const current = partners.find((p) => p.id === selected) ?? list[0];

  return (
    <div className="split partners-split">
      <aside className="tree">
        <div className="tabs" style={{ marginBottom: 10, width: "100%" }}>
          {(["الكل", "عميل", "مورد"] as const).map((k) => (
            <button
              key={k}
              className={`tab ${kind === k ? "active" : ""}`}
              onClick={() => setKind(k)}
              style={{ flex: 1 }}
            >
              {k}
            </button>
          ))}
        </div>
        {list.map((p) => (
          <button
            key={p.id}
            className={`tree-item ${current?.id === p.id ? "active" : ""}`}
            onClick={() => setSelected(p.id)}
          >
            <Users size={14} />
            <span style={{ flex: 1, textAlign: "right" }}>{p.name}</span>
            <span className="pill pill-neutral" style={{ fontSize: 10 }}>
              {p.kind}
            </span>
          </button>
        ))}
      </aside>

      {current && (
        <div className="grid" style={{ gap: 16 }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>{current.name}</h3>
                <p>
                  {current.id} · {current.city} · {current.phone}
                </p>
              </div>
              <StatusPill status={current.status} />
            </div>
            <div className="panel-body">
              <div className="grid grid-3">
                <div className="kpi">
                  <h3>الرصيد الحالي</h3>
                  <div className="value" style={{ fontSize: 24 }}>
                    {money(current.balance)}
                  </div>
                  <div className="hint">ريال</div>
                </div>
                <div className="kpi info">
                  <h3>حد الائتمان</h3>
                  <div className="value" style={{ fontSize: 24 }}>
                    {money(current.creditLimit)}
                  </div>
                  <div className="hint">ريال</div>
                </div>
                <div className="kpi warm">
                  <h3>المتاح</h3>
                  <div className="value" style={{ fontSize: 24 }}>
                    {money(Math.max(0, current.creditLimit - current.balance))}
                  </div>
                  <div className="hint">ريال</div>
                </div>
              </div>
              <div className="form-grid" style={{ marginTop: 16 }}>
                <label className="label">
                  الاسم
                  <input defaultValue={current.name} key={current.id + "-n"} />
                </label>
                <label className="label">
                  الجوال / الهاتف
                  <input defaultValue={current.phone} key={current.id + "-p"} />
                </label>
                <label className="label">
                  المدينة
                  <input defaultValue={current.city} key={current.id + "-c"} />
                </label>
                <label className="label">
                  حد الائتمان
                  <input defaultValue={String(current.creditLimit)} key={current.id + "-l"} />
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button className="btn btn-primary">
                  <Save size={15} /> حفظ البطاقة
                </button>
                {current.kind === "عميل" && onOpenInvoice && (
                  <button className="btn btn-ghost" onClick={onOpenInvoice}>
                    فاتورة جديدة
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
