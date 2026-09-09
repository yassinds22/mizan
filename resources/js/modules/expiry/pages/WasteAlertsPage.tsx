import React, { useState } from "react";
import { CheckCircle2, Snowflake, Thermometer, Warehouse } from "lucide-react";
import { wasteAlerts } from "@/data/expiry";

interface WasteAlertsPageProps {
  onOpenFefo?: () => void;
  onOpenPurchase?: () => void;
  onOpenMove?: () => void;
}

export const WasteAlertsPage: React.FC<WasteAlertsPageProps> = ({
  onOpenFefo,
  onOpenPurchase,
  onOpenMove,
}) => {
  const [done, setDone] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const runAction = (id: string, action: string) => {
    setDone((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (action.includes("FEFO") || action.includes("صرف")) onOpenFefo?.();
    else if (action.includes("شراء")) onOpenPurchase?.();
    else if (action.includes("تحويل") || action.includes("حركة") || action.includes("فحص"))
      onOpenMove?.();
    else {
      setToast(`تم تنفيذ: ${action}`);
      setTimeout(() => setToast(null), 2000);
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid grid-3">
        <div className="kpi danger">
          <h3>تنبيهات حرجة</h3>
          <div className="value">
            {wasteAlerts.filter((a) => a.tone === "danger").length}
          </div>
          <div className="hint">تتطلب إجراء اليوم</div>
        </div>
        <div className="kpi warm">
          <h3>قيد المتابعة</h3>
          <div className="value">
            {wasteAlerts.filter((a) => a.tone === "warn").length}
          </div>
          <div className="hint">خلال أسبوع</div>
        </div>
        <div className="kpi">
          <h3>تم التعامل معها</h3>
          <div className="value">{done.length}</div>
          <div className="hint">في هذه الجلسة</div>
        </div>
      </div>

      <div className="alert-list">
        {wasteAlerts.map((a) => (
          <section className="panel" key={a.id}>
            <div className="panel-body">
              <div
                className="alert-item"
                style={{ border: 0, background: "transparent", padding: 0 }}
              >
                {a.tone === "info" ? (
                  <Thermometer size={20} />
                ) : a.tone === "danger" ? (
                  <Snowflake size={20} />
                ) : (
                  <Warehouse size={20} />
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <strong style={{ fontSize: 15 }}>{a.title}</strong>
                    {done.includes(a.id) ? (
                      <span className="pill pill-ok">
                        <CheckCircle2 size={12} /> تم
                      </span>
                    ) : (
                      <span
                        className={`pill pill-${
                          a.tone === "info"
                            ? "info"
                            : a.tone === "danger"
                            ? "danger"
                            : "warn"
                        }`}
                      >
                        {a.tone === "danger"
                          ? "حرج"
                          : a.tone === "warn"
                          ? "تحذير"
                          : "معلومة"}
                      </span>
                    )}
                  </div>
                  <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                    {a.detail}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    {a.actions.map((action) => (
                      <button
                        key={action}
                        className={`btn ${
                          action.includes("إهلاك") ? "btn-warn" : "btn-ghost"
                        }`}
                        style={{ height: 36 }}
                        onClick={() => runAction(a.id, action)}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
