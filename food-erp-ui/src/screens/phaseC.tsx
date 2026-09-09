import { useMemo, useState } from "react";
import { Download, Lock, Printer, Shield, Unlock } from "lucide-react";
import {
  agingCustomers,
  agingSuppliers,
  appUsers,
  closeChecklist,
  money,
  profitLossRows,
  roleMatrix,
  trialBalanceRows,
} from "../data";

function CellCheck({ on }: { on: boolean }) {
  return (
    <span className={`pill ${on ? "pill-ok" : "pill-neutral"}`}>{on ? "مسموح" : "ممنوع"}</span>
  );
}

export function TrialBalanceScreen() {
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
}

export function ProfitLossScreen() {
  const revenue = profitLossRows.filter((r) => r.group === "إيرادات").reduce((s, r) => s + r.amount, 0);
  const cogs = profitLossRows.filter((r) => r.group === "تكلفة").reduce((s, r) => s + r.amount, 0);
  const opex = profitLossRows.filter((r) => r.group === "تشغيل").reduce((s, r) => s + r.amount, 0);
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
                  <td className="amount" style={{ color: r.amount < 0 ? "var(--danger)" : "var(--ok)" }}>
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
}

function AgingTable({
  title,
  rows,
}: {
  title: string;
  rows: typeof agingCustomers;
}) {
  const sum = (key: keyof (typeof rows)[0]) =>
    rows.reduce((s, r) => s + (typeof r[key] === "number" ? (r[key] as number) : 0), 0);

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
                  {money(sum("current") + sum("d30") + sum("d60") + sum("d90") + sum("older"))}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AgingScreen() {
  const [tab, setTab] = useState<"customers" | "suppliers">("customers");

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="tabs">
        <button className={`tab ${tab === "customers" ? "active" : ""}`} onClick={() => setTab("customers")}>
          العملاء (ذمم مدينة)
        </button>
        <button className={`tab ${tab === "suppliers" ? "active" : ""}`} onClick={() => setTab("suppliers")}>
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
}

export function PeriodCloseScreen() {
  const [items, setItems] = useState(closeChecklist.map((c) => ({ ...c })));
  const [closed, setClosed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ready = items.every((i) => i.done);

  const toggle = (id: string) => {
    if (closed) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
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
          <div className="hint">{closed ? "لا يمكن ترحيل قيود جديدة" : "يمكن ترحيل القيود"}</div>
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
            <button className="btn btn-primary" disabled={!ready} onClick={closePeriod}>
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
                style={{ width: "100%", cursor: closed ? "default" : "pointer" }}
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
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

export function UsersRolesScreen() {
  const [selected, setSelected] = useState(appUsers[0].id);
  const current = appUsers.find((u) => u.id === selected) ?? appUsers[0];

  return (
    <div className="split partners-split">
      <aside className="tree">
        <div style={{ padding: "6px 10px 12px", fontWeight: 700, fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
          <Shield size={16} /> المستخدمون
        </div>
        {appUsers.map((u) => (
          <button
            key={u.id}
            className={`tree-item ${selected === u.id ? "active" : ""}`}
            onClick={() => setSelected(u.id)}
          >
            <span style={{ flex: 1, textAlign: "right" }}>{u.name}</span>
            <span className={`pill ${u.status === "نشط" ? "pill-ok" : "pill-neutral"}`} style={{ fontSize: 10 }}>
              {u.role}
            </span>
          </button>
        ))}
      </aside>

      <div className="grid" style={{ gap: 16 }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{current.name}</h3>
              <p>
                {current.email} · {current.branch}
              </p>
            </div>
            <span className={`pill ${current.status === "نشط" ? "pill-ok" : "pill-warn"}`}>{current.status}</span>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                الاسم
                <input defaultValue={current.name} key={current.id + "-n"} />
              </label>
              <label className="label">
                البريد
                <input defaultValue={current.email} key={current.id + "-e"} />
              </label>
              <label className="label">
                الدور
                <select defaultValue={current.role} key={current.id + "-r"}>
                  <option>مدير مالي</option>
                  <option>محاسب</option>
                  <option>أمين مستودع</option>
                  <option>مبيعات</option>
                </select>
              </label>
              <label className="label">
                الفرع
                <select defaultValue={current.branch} key={current.id + "-b"}>
                  <option>الرياض</option>
                  <option>جدة</option>
                  <option>الدمام</option>
                </select>
              </label>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary">حفظ المستخدم</button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>مصفوفة الصلاحيات</h3>
              <p>مدير · محاسب · أمين مستودع · مبيعات</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>الصلاحية</th>
                  <th>مدير</th>
                  <th>محاسب</th>
                  <th>أمين مستودع</th>
                  <th>مبيعات</th>
                </tr>
              </thead>
              <tbody>
                {roleMatrix.map((row) => (
                  <tr key={row.perm}>
                    <td>{row.perm}</td>
                    <td>
                      <CellCheck on={row.manager} />
                    </td>
                    <td>
                      <CellCheck on={row.accountant} />
                    </td>
                    <td>
                      <CellCheck on={row.warehouse} />
                    </td>
                    <td>
                      <CellCheck on={row.sales} />
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
}
