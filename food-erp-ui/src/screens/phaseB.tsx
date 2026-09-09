import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Percent,
  Plus,
  Save,
  Snowflake,
  Thermometer,
  Warehouse,
} from "lucide-react";
import {
  fefoSuggestions,
  money,
  stockMoves,
  warehouses,
  wasteAlerts,
} from "../data";

function statusPill(status: string) {
  if (["مكتمل", "طبيعي", "تم", "متاح"].includes(status)) return "pill-ok";
  if (["قرب الامتلاء", "متوسط", "مسودة", "مراقبة حرارة", "مزدحم", "منخفض"].includes(status))
    return "pill-warn";
  if (["عالي", "حرج"].includes(status)) return "pill-danger";
  return "pill-neutral";
}

export function WarehousesScreen() {
  const [selected, setSelected] = useState(warehouses[0].id);
  const current = warehouses.find((w) => w.id === selected) ?? warehouses[0];
  const usedPct = Math.round((current.used / current.capacity) * 100);

  return (
    <div className="split partners-split">
      <aside className="tree">
        <div style={{ padding: "6px 10px 12px", fontWeight: 700, fontSize: 14 }}>
          المستودعات
        </div>
        {warehouses.map((w) => (
          <button
            key={w.id}
            className={`tree-item ${selected === w.id ? "active" : ""}`}
            onClick={() => setSelected(w.id)}
          >
            <Warehouse size={14} />
            <span style={{ flex: 1, textAlign: "right" }}>{w.name}</span>
          </button>
        ))}
        <button className="btn btn-ghost" style={{ marginTop: 12, width: "100%" }}>
          <Plus size={15} /> مستودع جديد
        </button>
      </aside>

      <div className="grid" style={{ gap: 16 }}>
        <div className="grid grid-3">
          <div className="kpi">
            <h3>الإشغال</h3>
            <div className="value" style={{ fontSize: 26 }}>
              {usedPct}%
            </div>
            <div className="hint">
              {current.used} / {current.capacity} موقع
            </div>
            <div className="progress" style={{ marginTop: 10 }}>
              <span style={{ width: `${usedPct}%` }} />
            </div>
          </div>
          <div className="kpi info">
            <h3>الأصناف النشطة</h3>
            <div className="value" style={{ fontSize: 26 }}>
              {current.skus}
            </div>
            <div className="hint">SKU داخل المستودع</div>
          </div>
          <div className={`kpi ${current.type === "جاف" ? "" : "warm"}`}>
            <h3>الحرارة</h3>
            <div className="value" style={{ fontSize: 22 }}>
              {current.temp}
            </div>
            <div className="hint">{current.type}</div>
          </div>
        </div>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{current.name}</h3>
              <p>
                {current.id} ·{" "}
                <span className={`pill ${statusPill(current.status)}`}>{current.status}</span>
              </p>
            </div>
            <button className="btn btn-primary">
              <Save size={15} /> حفظ
            </button>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                الاسم
                <input defaultValue={current.name} key={current.id + "-n"} />
              </label>
              <label className="label">
                النوع
                <select defaultValue={current.type} key={current.id + "-t"}>
                  <option>جاف</option>
                  <option>مبرد</option>
                  <option>مجمّد</option>
                </select>
              </label>
              <label className="label">
                نطاق الحرارة
                <input defaultValue={current.temp} key={current.id + "-temp"} />
              </label>
              <label className="label">
                الطاقة الاستيعابية
                <input defaultValue={String(current.capacity)} key={current.id + "-c"} />
              </label>
              <label className="label full">
                ملاحظات التشغيل
                <textarea
                  key={current.id + "-note"}
                  defaultValue={
                    current.type === "جاف"
                      ? "تهوية جيدة · بعيد عن أشعة الشمس"
                      : "مراقبة درجة الحرارة كل ساعتين · إنذار عند الانحراف"
                  }
                />
              </label>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>المواقع داخل المستودع</h3>
              <p>مناطق تخزين فرعية</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>الموقع</th>
                  <th>الوصف</th>
                  <th>الإشغال</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="amount">A-01</td>
                  <td>ممر أمامي</td>
                  <td>
                    <div className="progress">
                      <span style={{ width: "70%" }} />
                    </div>
                  </td>
                  <td>
                    <span className="pill pill-ok">متاح</span>
                  </td>
                </tr>
                <tr>
                  <td className="amount">A-02</td>
                  <td>ممر خلفي</td>
                  <td>
                    <div className="progress">
                      <span style={{ width: "88%" }} />
                    </div>
                  </td>
                  <td>
                    <span className="pill pill-warn">مزدحم</span>
                  </td>
                </tr>
                <tr>
                  <td className="amount">B-01</td>
                  <td>{current.type === "جاف" ? "رفوف علوية" : "أرفف تبريد"}</td>
                  <td>
                    <div className="progress">
                      <span style={{ width: "45%" }} />
                    </div>
                  </td>
                  <td>
                    <span className="pill pill-ok">متاح</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export function StockMoveScreen() {
  const [moveType, setMoveType] = useState("تحويل");
  const [toast, setToast] = useState<string | null>(null);

  const submit = () => {
    setToast("تم حفظ حركة المخزون (واجهة تجريبية)");
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>حركة جديدة</h3>
              <p>تحويل · صرف · تسوية</p>
            </div>
            <button className="btn btn-primary" onClick={submit}>
              <Save size={15} /> ترحيل الحركة
            </button>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                نوع الحركة
                <select value={moveType} onChange={(e) => setMoveType(e.target.value)}>
                  <option>تحويل</option>
                  <option>صرف</option>
                  <option>تسوية</option>
                  <option>إهلاك هدر</option>
                </select>
              </label>
              <label className="label">
                التاريخ
                <input type="date" defaultValue="2026-09-04" />
              </label>
              <label className="label">
                الصنف
                <select>
                  <option>حليب كامل الدسم 1 لتر</option>
                  <option>زيت ذرة 1.8 لتر</option>
                  <option>دجاج مجمد 1 كجم</option>
                </select>
              </label>
              <label className="label">
                الدفعة (FEFO)
                <select>
                  <option>B-4491 — ينتهي 2026-09-10</option>
                  <option>B-4518 — ينتهي 2026-10-02</option>
                </select>
              </label>
              <label className="label">
                من مستودع
                <select>
                  <option>الثلاجة 1</option>
                  <option>المستودع الرئيسي</option>
                  <option>المجمدات</option>
                </select>
              </label>
              <label className="label">
                إلى
                <select disabled={moveType === "تسوية" || moveType === "إهلاك هدر"}>
                  <option>الثلاجة 2</option>
                  <option>المستودع الرئيسي</option>
                  <option>مبيعات</option>
                  <option>هدر</option>
                </select>
              </label>
              <label className="label">
                الكمية
                <input defaultValue="20" />
              </label>
              <label className="label">
                السبب
                <select>
                  <option>إعادة توزيع</option>
                  <option>قرب انتهاء صلاحية</option>
                  <option>جرد / تسوية</option>
                  <option>تلف</option>
                </select>
              </label>
              <label className="label full">
                ملاحظات
                <textarea placeholder="تفاصيل الحركة..." />
              </label>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>ملخص الأثر</h3>
              <p>معاينة قبل الترحيل</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="stat-row">
              <span>النوع</span>
              <strong>{moveType}</strong>
            </div>
            <div className="stat-row">
              <span>سياسة الصرف</span>
              <strong>FEFO مفعّلة</strong>
            </div>
            <div className="stat-row">
              <span>القيد المحاسبي</span>
              <strong>
                {moveType === "إهلاك هدر" ? "5200 هدر" : moveType === "صرف" ? "5100 تكلفة" : "تحويل داخلي"}
              </strong>
            </div>
            <div className="alert-list" style={{ marginTop: 12 }}>
              <div className="alert-item">
                <ArrowLeftRight size={16} />
                <div>
                  <strong>سيتم تحديث أرصدة الدفعات فورًا</strong>
                  <span>الحركة التجريبية لا تُحفظ في قاعدة بيانات</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>آخر الحركات</h3>
            <p>سجل تشغيلي</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>النوع</th>
                <th>الصنف</th>
                <th>من</th>
                <th>إلى</th>
                <th>الكمية</th>
                <th>الدفعة</th>
                <th>التاريخ</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {stockMoves.map((m) => (
                <tr key={m.no}>
                  <td className="amount">{m.no}</td>
                  <td>
                    <span className="pill pill-info">{m.type}</span>
                  </td>
                  <td>{m.item}</td>
                  <td>{m.from}</td>
                  <td>{m.to}</td>
                  <td className="amount">{m.qty}</td>
                  <td className="amount">{m.batch}</td>
                  <td>{m.date}</td>
                  <td>
                    <span className={`pill ${statusPill(m.status)}`}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

export function FefoScreen({ onOpenInvoice }: { onOpenInvoice?: () => void }) {
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
                    <span className={`pill ${statusPill(s.priority)}`}>{s.priority}</span>
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
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

export function WasteAlertsScreen({
  onOpenFefo,
  onOpenPurchase,
  onOpenMove,
}: {
  onOpenFefo?: () => void;
  onOpenPurchase?: () => void;
  onOpenMove?: () => void;
}) {
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
              <div className="alert-item" style={{ border: 0, background: "transparent", padding: 0 }}>
                {a.tone === "info" ? (
                  <Thermometer size={20} />
                ) : a.tone === "danger" ? (
                  <Snowflake size={20} />
                ) : (
                  <Warehouse size={20} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <strong style={{ fontSize: 15 }}>{a.title}</strong>
                    {done.includes(a.id) ? (
                      <span className="pill pill-ok">
                        <CheckCircle2 size={12} /> تم
                      </span>
                    ) : (
                      <span className={`pill pill-${a.tone === "info" ? "info" : a.tone === "danger" ? "danger" : "warn"}`}>
                        {a.tone === "danger" ? "حرج" : a.tone === "warn" ? "تحذير" : "معلومة"}
                      </span>
                    )}
                  </div>
                  <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{a.detail}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {a.actions.map((action) => (
                      <button
                        key={action}
                        className={`btn ${action.includes("إهلاك") ? "btn-warn" : "btn-ghost"}`}
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
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
