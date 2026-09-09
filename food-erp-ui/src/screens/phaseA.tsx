import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Download,
  Plus,
  Printer,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import {
  itemBatches,
  money,
  partners,
  type PageId,
} from "../data";

export type Navigate = (page: PageId) => void;

function statusPill(status: string) {
  if (["متوفر", "مكتمل", "مدفوعة", "مرحّل", "نشط", "متوازن"].includes(status))
    return "pill-ok";
  if (["منخفض", "جزئي", "آجلة", "قيد الاستلام", "متوسط", "مراقبة"].includes(status))
    return "pill-warn";
  if (["حرج", "عالي", "مسودة", "غير متوازن"].includes(status)) return "pill-danger";
  return "pill-neutral";
}

function BackBar({
  onBack,
  label,
  actions,
}: {
  onBack: () => void;
  label: string;
  actions?: ReactNode;
}) {
  return (
    <div className="toolbar detail-bar">
      <button className="btn btn-ghost" onClick={onBack}>
        <ArrowRight size={15} /> {label}
      </button>
      <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>{actions}</div>
    </div>
  );
}

export function ItemDetail({ onBack }: { onBack: () => void }) {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <BackBar
        onBack={onBack}
        label="العودة للمخزون"
        actions={
          <>
            <button className="btn btn-ghost">إلغاء</button>
            <button className="btn btn-primary">
              <Save size={15} /> حفظ الصنف
            </button>
          </>
        }
      />

      <div className="grid grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>بيانات الصنف</h3>
              <p>FD-10204 · ألبان</p>
            </div>
            <span className="pill pill-ok">نشط</span>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                اسم الصنف
                <input defaultValue="حليب كامل الدسم 1 لتر" />
              </label>
              <label className="label">
                SKU
                <input defaultValue="FD-10204" />
              </label>
              <label className="label">
                الفئة
                <select defaultValue="ألبان">
                  <option>ألبان</option>
                  <option>حبوب</option>
                  <option>مجمدات</option>
                  <option>معلبات</option>
                </select>
              </label>
              <label className="label">
                الوحدة الأساسية
                <select defaultValue="كرتون">
                  <option>كرتون</option>
                  <option>كيس</option>
                  <option>قطعة</option>
                </select>
              </label>
              <label className="label">
                وحدة البيع
                <input defaultValue="كرتون (12 عبوة)" />
              </label>
              <label className="label">
                باركود
                <input defaultValue="6281001020401" />
              </label>
              <label className="label">
                تكلفة متوسطة
                <input defaultValue="42.00" />
              </label>
              <label className="label">
                سعر البيع
                <input defaultValue="48.50" />
              </label>
              <label className="label">
                حد إعادة الطلب
                <input defaultValue="60" />
              </label>
              <label className="label">
                الحد الأقصى للمخزون
                <input defaultValue="300" />
              </label>
              <label className="label full">
                ملاحظات تخزين
                <textarea defaultValue="يحفظ مبردًا بين 2–6°م · سياسة FEFO إلزامية" />
              </label>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>ملخص الرصيد</h3>
              <p>حسب المستودعات والدفعات</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="stat-row">
              <span>الرصيد الكلي</span>
              <strong className="amount">112</strong>
            </div>
            <div className="stat-row">
              <span>قيمة المخزون</span>
              <strong className="amount">{money(4704)}</strong>
            </div>
            <div className="stat-row">
              <span>أقرب صلاحية</span>
              <strong>2026-09-10</strong>
            </div>
            <div className="stat-row">
              <span>الحالة</span>
              <span className="pill pill-ok">متوفر</span>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>الدفعات والمستودعات</h3>
            <p>تتبع الصلاحية لكل دفعة</p>
          </div>
          <button className="btn btn-ghost">
            <Plus size={15} /> دفعة
          </button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>الدفعة</th>
                <th>المستودع</th>
                <th>الكمية</th>
                <th>التكلفة</th>
                <th>الانتهاء</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {itemBatches.map((b) => (
                <tr key={b.batch}>
                  <td className="amount">{b.batch}</td>
                  <td>{b.warehouse}</td>
                  <td className="amount">{b.qty}</td>
                  <td className="amount">{b.cost}</td>
                  <td>{b.expiry}</td>
                  <td>
                    <span className={`pill ${b.qty === 0 ? "pill-neutral" : "pill-ok"}`}>
                      {b.qty === 0 ? "منتهية" : "متاحة"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type Line = { id: number; item: string; qty: number; price: number; discount: number };

export function InvoiceScreen({ onBack }: { onBack: () => void }) {
  const [lines, setLines] = useState<Line[]>([
    { id: 1, item: "أرز بسمتي 5 كجم", qty: 20, price: 34, discount: 0 },
    { id: 2, item: "زيت ذرة 1.8 لتر", qty: 8, price: 98, discount: 5 },
    { id: 3, item: "حليب كامل الدسم 1 لتر", qty: 12, price: 48.5, discount: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(15);
  const [showPrint, setShowPrint] = useState(false);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price * (1 - l.discount / 100), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { id: Date.now(), item: "صنف جديد", qty: 1, price: 0, discount: 0 },
    ]);

  const removeLine = (id: number) => setLines((prev) => prev.filter((l) => l.id !== id));

  return (
    <div className="grid" style={{ gap: 16 }}>
      <BackBar
        onBack={onBack}
        label="العودة للمبيعات"
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => setShowPrint(true)}>
              <Printer size={15} /> معاينة طباعة
            </button>
            <button className="btn btn-ghost">
              <Download size={15} /> PDF
            </button>
            <button className="btn btn-primary">
              <Save size={15} /> حفظ وترحيل
            </button>
          </>
        }
      />

      <section className="panel">
        <div className="panel-body">
          <div className="form-grid">
            <label className="label">
              رقم الفاتورة
              <input defaultValue="INV-88430" />
            </label>
            <label className="label">
              التاريخ
              <input type="date" defaultValue="2026-09-04" />
            </label>
            <label className="label">
              العميل
              <select defaultValue="سوبرماركت الواحة">
                <option>سوبرماركت الواحة</option>
                <option>تموينات الرائد</option>
                <option>مطاعم البحر الأحمر</option>
              </select>
            </label>
            <label className="label">
              طريقة الدفع
              <select>
                <option>نقدي</option>
                <option>آجل</option>
                <option>تحويل</option>
              </select>
            </label>
            <label className="label">
              المستودع
              <select>
                <option>المستودع الرئيسي</option>
                <option>الثلاجة 1</option>
              </select>
            </label>
            <label className="label">
              نسبة الضريبة %
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>بنود الفاتورة</h3>
            <p>يُفضّل اختيار دفعات FEFO تلقائيًا عند الصرف</p>
          </div>
          <button className="btn btn-primary" onClick={addLine}>
            <Plus size={15} /> بند
          </button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>خصم %</th>
                <th>الإجمالي</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const lineTotal = l.qty * l.price * (1 - l.discount / 100);
                return (
                  <tr key={l.id}>
                    <td>
                      <input
                        className="inline-input"
                        value={l.item}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((x) => (x.id === l.id ? { ...x, item: e.target.value } : x))
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="inline-input narrow"
                        type="number"
                        value={l.qty}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((x) =>
                              x.id === l.id ? { ...x, qty: Number(e.target.value) || 0 } : x
                            )
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="inline-input narrow"
                        type="number"
                        value={l.price}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((x) =>
                              x.id === l.id ? { ...x, price: Number(e.target.value) || 0 } : x
                            )
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="inline-input narrow"
                        type="number"
                        value={l.discount}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((x) =>
                              x.id === l.id ? { ...x, discount: Number(e.target.value) || 0 } : x
                            )
                          )
                        }
                      />
                    </td>
                    <td className="amount">{money(Math.round(lineTotal))}</td>
                    <td>
                      <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => removeLine(l.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="panel-body totals-box">
          <div className="stat-row">
            <span>المجموع قبل الضريبة</span>
            <strong className="amount">{money(Math.round(subtotal))}</strong>
          </div>
          <div className="stat-row">
            <span>ضريبة القيمة المضافة ({taxRate}%)</span>
            <strong className="amount">{money(Math.round(tax))}</strong>
          </div>
          <div className="stat-row total-row">
            <span>الإجمالي</span>
            <strong className="amount">{money(Math.round(total))}</strong>
          </div>
        </div>
      </section>

      {showPrint ? (
        <div className="modal-backdrop" onClick={() => setShowPrint(false)}>
          <div className="modal print-preview" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>معاينة طباعة — INV-88430</h3>
                <p>مؤونة · فرع الرياض</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowPrint(false)}>
                <Printer size={15} /> طباعة
              </button>
            </div>
            <div className="modal-body">
              <div className="print-sheet">
                <header>
                  <strong>مؤونة</strong>
                  <span>فاتورة ضريبية مبسطة</span>
                </header>
                <p>العميل: سوبرماركت الواحة · التاريخ: 2026-09-04</p>
                <ul>
                  {lines.map((l) => (
                    <li key={l.id}>
                      {l.item} — {l.qty} × {l.price} ={" "}
                      {money(Math.round(l.qty * l.price * (1 - l.discount / 100)))}
                    </li>
                  ))}
                </ul>
                <footer>
                  <span>الإجمالي شامل الضريبة</span>
                  <strong>{money(Math.round(total))} ر.س</strong>
                </footer>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PurchaseDoc({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"order" | "receive">("order");

  return (
    <div className="grid" style={{ gap: 16 }}>
      <BackBar
        onBack={onBack}
        label="العودة للمشتريات"
        actions={
          <>
            <button className="btn btn-ghost">حفظ مسودة</button>
            <button className="btn btn-primary">
              <Save size={15} /> {tab === "order" ? "اعتماد الأمر" : "تأكيد الاستلام"}
            </button>
          </>
        }
      />

      <div className="tabs">
        <button className={`tab ${tab === "order" ? "active" : ""}`} onClick={() => setTab("order")}>
          أمر الشراء
        </button>
        <button
          className={`tab ${tab === "receive" ? "active" : ""}`}
          onClick={() => setTab("receive")}
        >
          الاستلام والدفعات
        </button>
      </div>

      <section className="panel">
        <div className="panel-body">
          <div className="form-grid">
            <label className="label">
              رقم الأمر
              <input defaultValue="PO-260904" />
            </label>
            <label className="label">
              التاريخ
              <input type="date" defaultValue="2026-09-04" />
            </label>
            <label className="label">
              المورد
              <select defaultValue="شركة النخيل للتجارة">
                <option>شركة النخيل للتجارة</option>
                <option>مصنع الألبان المتحدة</option>
                <option>مجمدات الخليج</option>
              </select>
            </label>
            <label className="label">
              المستودع المستهدف
              <select>
                <option>المستودع الرئيسي</option>
                <option>الثلاجة 1</option>
                <option>المجمدات</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {tab === "order" ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>بنود أمر الشراء</h3>
              <p>الكميات المطلوبة قبل الاستلام</p>
            </div>
            <button className="btn btn-ghost">
              <Plus size={15} /> بند
            </button>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>المطلوب</th>
                  <th>المستلم</th>
                  <th>سعر الشراء</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>أرز بسمتي 5 كجم</td>
                  <td className="amount">120</td>
                  <td className="amount">120</td>
                  <td className="amount">28.5</td>
                  <td className="amount">{money(3420)}</td>
                  <td>
                    <span className="pill pill-ok">مكتمل</span>
                  </td>
                </tr>
                <tr>
                  <td>زيت ذرة 1.8 لتر</td>
                  <td className="amount">80</td>
                  <td className="amount">40</td>
                  <td className="amount">86</td>
                  <td className="amount">{money(6880)}</td>
                  <td>
                    <span className="pill pill-warn">جزئي</span>
                  </td>
                </tr>
                <tr>
                  <td>تمر سكري فاخر 3 كجم</td>
                  <td className="amount">50</td>
                  <td className="amount">0</td>
                  <td className="amount">54</td>
                  <td className="amount">{money(2700)}</td>
                  <td>
                    <span className="pill pill-danger">بانتظار</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>تسجيل الاستلام</h3>
              <p>كل استلام ينشئ دفعة بتاريخ صلاحية</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                الصنف
                <select>
                  <option>زيت ذرة 1.8 لتر</option>
                  <option>تمر سكري فاخر 3 كجم</option>
                </select>
              </label>
              <label className="label">
                الكمية المستلمة
                <input defaultValue="40" />
              </label>
              <label className="label">
                رقم الدفعة
                <input defaultValue="B-4540" />
              </label>
              <label className="label">
                تاريخ الانتهاء
                <input type="date" defaultValue="2026-11-02" />
              </label>
              <label className="label">
                درجة حرارة الشاحنة
                <input placeholder="مثال: 4°م" />
              </label>
              <label className="label">
                حالة العبوات
                <select>
                  <option>سليمة</option>
                  <option>تالفة جزئيًا</option>
                  <option>مرفوضة</option>
                </select>
              </label>
              <label className="label full">
                ملاحظات الجودة
                <textarea placeholder="ملاحظات الاستلام والفحص..." />
              </label>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export function JournalEntry({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState([
    { id: 1, account: "1200 — المخزون مواد غذائية", debit: 21450, credit: 0 },
    { id: 2, account: "2100 — الموردون", debit: 0, credit: 21450 },
  ]);

  const debit = rows.reduce((s, r) => s + r.debit, 0);
  const credit = rows.reduce((s, r) => s + r.credit, 0);
  const balanced = debit === credit && debit > 0;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <BackBar
        onBack={onBack}
        label="العودة للحسابات"
        actions={
          <>
            <button className="btn btn-ghost">حفظ مسودة</button>
            <button className="btn btn-primary" disabled={!balanced}>
              ترحيل القيد
            </button>
          </>
        }
      />

      <section className="panel">
        <div className="panel-body">
          <div className="form-grid">
            <label className="label">
              رقم القيد
              <input defaultValue="JV-9025" />
            </label>
            <label className="label">
              التاريخ
              <input type="date" defaultValue="2026-09-04" />
            </label>
            <label className="label full">
              البيان
              <input defaultValue="استلام فاتورة مورد — زيت وذرة" />
            </label>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>سطور القيد</h3>
            <p>يجب أن يتساوى المدين مع الدائن قبل الترحيل</p>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                { id: Date.now(), account: "", debit: 0, credit: 0 },
              ])
            }
          >
            <Plus size={15} /> سطر
          </button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>الحساب</th>
                <th>مدين</th>
                <th>دائن</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <select
                      className="inline-input"
                      value={r.account}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, account: e.target.value } : x
                          )
                        )
                      }
                    >
                      <option value="">اختر حسابًا</option>
                      <option>1100 — النقدية والبنوك</option>
                      <option>1200 — المخزون مواد غذائية</option>
                      <option>2100 — الموردون</option>
                      <option>4100 — مبيعات التجزئة</option>
                      <option>5100 — تكلفة البضاعة المباعة</option>
                      <option>5200 — هدر وانتهاء صلاحية</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="inline-input narrow"
                      type="number"
                      value={r.debit}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, debit: Number(e.target.value) || 0, credit: 0 }
                              : x
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="inline-input narrow"
                      type="number"
                      value={r.credit}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, credit: Number(e.target.value) || 0, debit: 0 }
                              : x
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      style={{ width: 34, height: 34 }}
                      onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-body totals-box">
          <div className="stat-row">
            <span>إجمالي المدين</span>
            <strong className="amount">{money(debit)}</strong>
          </div>
          <div className="stat-row">
            <span>إجمالي الدائن</span>
            <strong className="amount">{money(credit)}</strong>
          </div>
          <div className="stat-row total-row">
            <span>حالة التوازن</span>
            <span className={`pill ${balanced ? "pill-ok" : "pill-danger"}`}>
              {balanced ? "متوازن — جاهز للترحيل" : "غير متوازن"}
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>معاينة الترحيل</h3>
            <p>الأثر المتوقع على الحسابات</p>
          </div>
        </div>
        <div className="panel-body">
          {rows
            .filter((r) => r.account)
            .map((r) => (
              <div className="stat-row" key={r.id}>
                <span>{r.account}</span>
                <strong className="amount">
                  {r.debit > 0 ? `مدين ${money(r.debit)}` : `دائن ${money(r.credit)}`}
                </strong>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

export function Partners({ onOpenInvoice }: { onOpenInvoice?: () => void }) {
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

      {current ? (
        <div className="grid" style={{ gap: 16 }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>{current.name}</h3>
                <p>
                  {current.id} · {current.city} · {current.phone}
                </p>
              </div>
              <span className={`pill ${statusPill(current.status)}`}>{current.status}</span>
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
                {current.kind === "عميل" && onOpenInvoice ? (
                  <button className="btn btn-ghost" onClick={onOpenInvoice}>
                    فاتورة جديدة
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
