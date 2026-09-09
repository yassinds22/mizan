import React, { useMemo, useState } from "react";
import { Percent } from "lucide-react";
import { fefoSuggestions } from "@/data/expiry";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";

interface FefoPageProps {
  onOpenInvoice?: () => void;
}

export const FefoPage: React.FC<FefoPageProps> = ({ onOpenInvoice }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const totalValue = useMemo(
    () =>
      fefoSuggestions
        .filter((s) => selected.includes(s.batch))
        .reduce((sum, s) => sum + s.value, 0),
    [selected]
  );

  const toggle = (batch: string) => {
    setSelected((prev) =>
      prev.includes(batch) ? prev.filter((b) => b !== batch) : [...prev, batch]
    );
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid grid-3">
        <div className="kpi danger">
          <h3>أولوية عالية</h3>
          <div className="value">2</div>
          <div className="hint">دفعات خلال أقل من 10 أيام</div>
        </div>
        <div className="kpi warm">
          <h3>قيمة مختارة</h3>
          <div className="value" style={{ fontSize: 26 }}>
            {money(totalValue)}
          </div>
          <div className="hint">ريال للدفعات المحددة</div>
        </div>
        <div className="kpi">
          <h3>اقتراحات جاهزة</h3>
          <div className="value">{fefoSuggestions.length}</div>
          <div className="hint">للصرف أو الخصم</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>قائمة FEFO المقترحة</h3>
            <p>رتّبت تلقائيًا حسب أقرب تاريخ انتهاء</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-warn"
              onClick={() => {
                setToast("تم إنشاء عرض خصم للدفعات المحددة");
                setTimeout(() => setToast(null), 2200);
              }}
              disabled={selected.length === 0}
            >
              <Percent size={15} /> خصم ترويجي
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onOpenInvoice?.()}
              disabled={selected.length === 0}
            >
              صرف للمبيعات
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th></th>
                <th>الأولوية</th>
                <th>الدفعة</th>
                <th>الصنف</th>
                <th>المستودع</th>
                <th>الكمية</th>
                <th>الأيام</th>
                <th>القيمة</th>
                <th>الإجراء المقترح</th>
              </tr>
            </thead>
            <tbody>
              {fefoSuggestions.map((s) => (
                <tr key={s.batch}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(s.batch)}
                      onChange={() => toggle(s.batch)}
                    />
                  </td>
                  <td>
                    <StatusPill status={s.priority} />
                  </td>
                  <td className="amount">{s.batch}</td>
                  <td>{s.item}</td>
                  <td>{s.warehouse}</td>
                  <td className="amount">{s.qty}</td>
                  <td className="amount">{s.days}</td>
                  <td className="amount">{money(s.value)}</td>
                  <td>{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
