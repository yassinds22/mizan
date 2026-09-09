import React, { useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { closeChecklist } from "@/data/accounting";

export const PeriodClosePage: React.FC = () => {
  const [items, setItems] = useState(closeChecklist.map((c) => ({ ...c })));
  const [closed, setClosed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ready = items.every((i) => i.done);

  const toggle = (id: string) => {
    if (closed) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
    );
  };

  const closePeriod = () => {
    if (!ready) return;
    setClosed(true);
    setToast("تم إقفال الفترة — الترحيل مقفل حتى إعادة الفتح");
    setTimeout(() => setToast(null), 2400);
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid grid-3">
        <div className="kpi">
          <h3>الفترة الحالية</h3>
          <div className="value" style={{ fontSize: 22 }}>
            سبتمبر 2026
          </div>
          <div className="hint">فرع الرياض · السنة 2026</div>
        </div>
        <div className={`kpi ${closed ? "danger" : ""}`}>
          <h3>حالة الترحيل</h3>
          <div className="value" style={{ fontSize: 22 }}>
            {closed ? "مقفل" : "مفتوح"}
          </div>
          <div className="hint">
            {closed ? "لا يمكن ترحيل قيود جديدة" : "يمكن ترحيل القيود"}
          </div>
        </div>
        <div className="kpi warm">
          <h3>بنود الإقفال</h3>
          <div className="value">
            {items.filter((i) => i.done).length}/{items.length}
          </div>
          <div className="hint">يجب إكمال الكل قبل الإقفال</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>قائمة مراجعة الإقفال</h3>
            <p>لا يُسمح بالإقفال قبل اكتمال البنود</p>
          </div>
          {closed ? (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setClosed(false);
                setToast("أُعيد فتح الفترة للترحيل");
                setTimeout(() => setToast(null), 2000);
              }}
            >
              <Unlock size={15} /> إعادة فتح
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={!ready}
              onClick={closePeriod}
            >
              <Lock size={15} /> إقفال الفترة
            </button>
          )}
        </div>
        <div className="panel-body">
          <div className="alert-list">
            {items.map((item) => (
              <button
                key={item.id}
                className={`alert-item ${item.done ? "" : "warn"}`}
                style={{
                  width: "100%",
                  cursor: closed ? "default" : "pointer",
                }}
                onClick={() => toggle(item.id)}
              >
                <span className={`pill ${item.done ? "pill-ok" : "pill-warn"}`}>
                  {item.done ? "مكتمل" : "مطلوب"}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <span>{closed ? "الفترة مقفلة" : "اضغط للتبديل"}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
