import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarClock,
  FileBarChart,
  LayoutDashboard,
  Menu,
  Package,
  PanelRightClose,
  PanelRightOpen,
  Search,
  ShoppingCart,
  Timer,
  TrendingUp,
  Truck,
  Warehouse,
  Plus,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  X,
  Receipt,
  PackageCheck,
  Zap,
  BookmarkPlus,
  Users,
  ArrowLeftRight,
  ListOrdered,
  Siren,
  Lock,
  Shield,
  Settings,
  Layers,
} from "lucide-react";
import {
  accounts,
  buildSearchIndex,
  expiryBatches,
  inventoryFilterPresets,
  inventoryRows,
  journalRows,
  kpis,
  money,
  navGroups,
  notifications as notificationSeed,
  pageMeta,
  purchaseRows,
  reportCards,
  salesRows,
  type PageId,
  type SearchHit,
} from "./data";
import {
  InvoiceScreen,
  ItemDetail,
  JournalEntry,
  Partners,
  PurchaseDoc,
  type Navigate,
} from "./screens/phaseA";
import {
  FefoScreen,
  StockMoveScreen,
  WarehousesScreen,
  WasteAlertsScreen,
} from "./screens/phaseB";
import {
  AgingScreen,
  PeriodCloseScreen,
  ProfitLossScreen,
  TrialBalanceScreen,
  UsersRolesScreen,
} from "./screens/phaseC";
import { SettingsScreen, SystemStatesScreen } from "./screens/phaseD";
import "./overlays.css";

const icons = {
  LayoutDashboard,
  Package,
  Truck,
  ShoppingCart,
  BookOpen,
  CalendarClock,
  FileBarChart,
  Warehouse,
  TrendingUp,
  AlertTriangle,
  Timer,
  Users,
  ArrowLeftRight,
  ListOrdered,
  Siren,
  Lock,
  Shield,
  Settings,
  Layers,
};

function statusPill(status: string) {
  if (["متوفر", "مكتمل", "مدفوعة", "مرحّل"].includes(status)) return "pill-ok";
  if (["منخفض", "جزئي", "آجلة", "قيد الاستلام", "متوسط"].includes(status)) return "pill-warn";
  if (["حرج", "عالي", "مسودة"].includes(status)) return "pill-danger";
  return "pill-neutral";
}

function Dashboard() {
  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="grid grid-4">
        {kpis.map((k) => {
          const Icon = icons[k.icon as keyof typeof icons];
          return (
            <div key={k.title} className={`kpi ${k.tone}`}>
              <div className="kpi-head">
                <div className="kpi-icon">
                  <Icon size={18} />
                </div>
                <span className={`delta ${k.deltaDown ? "down" : ""}`}>{k.delta}</span>
              </div>
              <h3>{k.title}</h3>
              <div className="value">{k.value}</div>
              <div className="hint">{k.hint}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>مبيعات الأسبوع</h3>
              <p>مقارنة يومية بالمتوسط التشغيلي</p>
            </div>
            <button className="btn btn-ghost">
              <Download size={15} /> تصدير
            </button>
          </div>
          <div className="panel-body">
            <div className="chart-bars">
              {[55, 72, 48, 90, 66, 80, 95].map((h, i) => (
                <div className="bar" key={i}>
                  <i style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }} />
                  <span>{["س", "أ", "ث", "ر", "خ", "ج", "س"][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>تنبيهات الصلاحية والمخزون</h3>
              <p>إجراءات مقترحة قبل الهدر</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="alert-list">
              <div className="alert-item danger">
                <AlertTriangle size={18} />
                <div>
                  <strong>دفعة حليب تنتهي خلال 6 أيام</strong>
                  <span>42 كرتون في الثلاجة 1 — يُفضّل خصم ترويجي أو تحويل للمبيعات السريعة</span>
                </div>
              </div>
              <div className="alert-item warn">
                <Package size={18} />
                <div>
                  <strong>طماطم معلبة تحت حد إعادة الطلب</strong>
                  <span>الرصيد 18 / الحد 40 — مسودة أمر شراء جاهزة للمراجعة</span>
                </div>
              </div>
              <div className="alert-item">
                <Truck size={18} />
                <div>
                  <strong>استلام جزئي لأمر PO-260828</strong>
                  <span>متبقي 3 أصناف مجمدة من مجمدات الخليج</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>آخر حركات المخزون</h3>
            <p>دخول، صرف، وتسويات اليوم</p>
          </div>
          <button className="btn btn-primary">
            <Plus size={15} /> حركة جديدة
          </button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>النوع</th>
                <th>الصنف</th>
                <th>المستودع</th>
                <th>الكمية</th>
                <th>المرجع</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="pill pill-ok">استلام</span></td>
                <td>أرز بسمتي 5 كجم</td>
                <td>المستودع الرئيسي</td>
                <td className="amount">+120</td>
                <td>PO-260904</td>
                <td>08:20</td>
              </tr>
              <tr>
                <td><span className="pill pill-info">صرف</span></td>
                <td>زيت ذرة 1.8 لتر</td>
                <td>المستودع الرئيسي</td>
                <td className="amount">-24</td>
                <td>INV-88421</td>
                <td>09:05</td>
              </tr>
              <tr>
                <td><span className="pill pill-warn">تسوية</span></td>
                <td>زبادي طبيعي 170 جم</td>
                <td>الثلاجة 2</td>
                <td className="amount">-8</td>
                <td>ADJ-118</td>
                <td>10:40</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Inventory({ onOpenItem }: { onOpenItem: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [preset, setPreset] = useState("all");
  const [customPresets, setCustomPresets] = useState<
    { id: string; label: string; category: string; status: string }[]
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("moona-inv-presets") || "[]");
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState<string | null>(null);

  const applyPreset = (id: string, cat: string, st: string) => {
    setPreset(id);
    setCategory(cat);
    setStatus(st);
  };

  const saveCurrent = () => {
    const label = prompt("اسم الفلتر المحفوظ؟", "فلتر مخصص");
    if (!label) return;
    const next = [
      ...customPresets,
      { id: `c-${Date.now()}`, label, category, status },
    ];
    setCustomPresets(next);
    try {
      localStorage.setItem("moona-inv-presets", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setToast("تم حفظ الفلتر");
    setTimeout(() => setToast(null), 2200);
  };

  const rows = useMemo(() => {
    return inventoryRows.filter((row) => {
      const q = query.trim();
      const matchQ =
        !q ||
        row.name.includes(q) ||
        row.sku.toLowerCase().includes(q.toLowerCase());
      const matchCat = category === "all" || row.category === category;
      let matchStatus = true;
      if (status === "low") matchStatus = row.status === "منخفض" || row.status === "حرج";
      else if (status === "expiring") {
        const days =
          (new Date(row.expiry).getTime() - new Date("2026-09-04").getTime()) /
          86400000;
        matchStatus = days <= 30;
      } else if (status !== "all") matchStatus = row.status === status;
      return matchQ && matchCat && matchStatus;
    });
  }, [query, category, status]);

  const allPresets = [...inventoryFilterPresets, ...customPresets];

  return (
    <div>
      <div className="filter-chips">
        {allPresets.map((p) => (
          <button
            key={p.id}
            className={`chip ${preset === p.id ? "active" : ""}`}
            onClick={() => applyPreset(p.id, p.category, p.status)}
          >
            {p.label}
          </button>
        ))}
        <button className="chip chip-save" onClick={saveCurrent}>
          <BookmarkPlus size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} />
          حفظ الفلتر الحالي
        </button>
      </div>

      <div className="toolbar">
        <div className="field">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPreset("custom");
            }}
            placeholder="بحث بالاسم أو SKU..."
          />
        </div>
        <div className="field">
          <Filter size={15} />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPreset("custom");
            }}
          >
            <option value="all">كل الفئات</option>
            <option>حبوب</option>
            <option>ألبان</option>
            <option>مجمدات</option>
            <option>معلبات</option>
            <option>زيوت</option>
            <option>تمور</option>
          </select>
        </div>
        <div className="field">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPreset("custom");
            }}
          >
            <option value="all">كل الحالات</option>
            <option value="متوفر">متوفر</option>
            <option value="منخفض">منخفض</option>
            <option value="حرج">حرج</option>
            <option value="low">منخفض / حرج</option>
            <option value="expiring">قرب انتهاء الصلاحية</option>
          </select>
        </div>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost">استيراد</button>
          <button className="btn btn-primary">
            <Plus size={15} /> صنف جديد
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>نتائج المخزون</h3>
            <p>
              {rows.length} صنف مطابق للفلاتر
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>SKU</th>
                <th>الصنف</th>
                <th>الفئة</th>
                <th>الوحدة</th>
                <th>الرصيد</th>
                <th>حد الطلب</th>
                <th>التكلفة</th>
                <th>أقرب صلاحية</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-note">
                    لا توجد أصناف مطابقة — جرّب فلترًا آخر
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const pct = Math.min(100, Math.round((row.qty / (row.reorder * 3)) * 100));
                  return (
                    <tr key={row.sku}>
                      <td className="amount">{row.sku}</td>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td>{row.category}</td>
                      <td>{row.unit}</td>
                      <td style={{ minWidth: 120 }}>
                        <div className="amount">{row.qty}</div>
                        <div className="progress" style={{ marginTop: 6 }}>
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td>{row.reorder}</td>
                      <td className="amount">{row.cost}</td>
                      <td>{row.expiry}</td>
                      <td>
                        <span className={`pill ${statusPill(row.status)}`}>{row.status}</span>
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          title="عرض"
                          style={{ width: 34, height: 34 }}
                          onClick={onOpenItem}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function Purchases({ onOpenDoc }: { onOpenDoc: () => void }) {
  return (
    <div className="grid grid-2">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>أوامر الشراء</h3>
            <p>متابعة الاستلام والربط بالقيود</p>
          </div>
          <button className="btn btn-primary" onClick={onOpenDoc}>
            <Plus size={15} /> أمر شراء
          </button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>المورد</th>
                <th>التاريخ</th>
                <th>الأصناف</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {purchaseRows.map((r) => (
                <tr key={r.no}>
                  <td className="amount">{r.no}</td>
                  <td>{r.supplier}</td>
                  <td>{r.date}</td>
                  <td>{r.items}</td>
                  <td className="amount">{money(r.total)}</td>
                  <td>
                    <span className={`pill ${statusPill(r.status)}`}>{r.status}</span>
                  </td>
                  <td>
                    <button className="btn btn-ghost" style={{ height: 34 }} onClick={onOpenDoc}>
                      فتح <ChevronLeft size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>مسودة استلام سريعة</h3>
            <p>أو افتح شاشة الاستلام الكاملة</p>
          </div>
          <button className="btn btn-ghost" onClick={onOpenDoc}>
            الشاشة الكاملة
          </button>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <label className="label">
              أمر الشراء
              <select defaultValue="PO-260904">
                <option>PO-260904</option>
                <option>PO-260828</option>
              </select>
            </label>
            <label className="label">
              المستودع
              <select>
                <option>المستودع الرئيسي</option>
                <option>الثلاجة 1</option>
                <option>المجمدات</option>
              </select>
            </label>
            <label className="label">
              الصنف
              <select>
                <option>أرز بسمتي 5 كجم</option>
                <option>زيت ذرة 1.8 لتر</option>
              </select>
            </label>
            <label className="label">
              الكمية المستلمة
              <input defaultValue="120" />
            </label>
            <label className="label">
              رقم الدفعة
              <input placeholder="B-45xx" defaultValue="B-4531" />
            </label>
            <label className="label">
              تاريخ الانتهاء
              <input type="date" defaultValue="2027-03-12" />
            </label>
            <label className="label full">
              ملاحظات الاستلام
              <textarea placeholder="درجة حرارة الشاحنة، حالة العبوات..." />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost">حفظ مسودة</button>
            <button className="btn btn-primary" onClick={onOpenDoc}>
              تأكيد الاستلام
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Sales({
  onOpenInvoice,
  onOpenPartners,
}: {
  onOpenInvoice: () => void;
  onOpenPartners: () => void;
}) {
  return (
    <div>
      <div className="tabs">
        <button className="tab active">الفواتير</button>
        <button className="tab">عروض الأسعار</button>
        <button className="tab" onClick={onOpenPartners}>
          العملاء
        </button>
      </div>
      <div className="toolbar">
        <div className="field">
          <Search size={15} />
          <input placeholder="بحث برقم الفاتورة أو العميل..." />
        </div>
        <button className="btn btn-warn">خصم قرب انتهاء الصلاحية</button>
        <div style={{ marginInlineStart: "auto" }}>
          <button className="btn btn-primary" onClick={onOpenInvoice}>
            <Plus size={15} /> فاتورة بيع
          </button>
        </div>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>الفاتورة</th>
                <th>العميل</th>
                <th>التاريخ</th>
                <th>الإجمالي</th>
                <th>المستحق</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {salesRows.map((r) => (
                <tr key={r.no}>
                  <td className="amount">{r.no}</td>
                  <td>{r.customer}</td>
                  <td>{r.date}</td>
                  <td className="amount">{money(r.total)}</td>
                  <td className="amount">{money(r.due)}</td>
                  <td>
                    <span className={`pill ${statusPill(r.status)}`}>{r.status}</span>
                  </td>
                  <td>
                    <button className="btn btn-ghost" style={{ height: 34 }} onClick={onOpenInvoice}>
                      عرض <ChevronLeft size={14} />
                    </button>
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

function Accounting({ onOpenJournal }: { onOpenJournal: () => void }) {
  const [selected, setSelected] = useState("1200");
  return (
    <div className="split">
      <aside className="tree">
        <div style={{ padding: "6px 10px 12px", fontWeight: 700, fontSize: 14 }}>دليل الحسابات</div>
        {accounts.map((a) => (
          <button
            key={a.code}
            className={`tree-item ${a.level > 0 ? "indent" : ""} ${selected === a.code ? "active" : ""}`}
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
                      <span className={`pill ${statusPill(j.status)}`}>{j.status}</span>
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

function Expiry({
  onOpenFefo,
  onOpenWaste,
}: {
  onOpenFefo: () => void;
  onOpenWaste: () => void;
}) {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid grid-3">
        <div className="kpi danger">
          <h3>دفعات عالية المخاطر</h3>
          <div className="value">2</div>
          <div className="hint">أقل من 10 أيام</div>
        </div>
        <div className="kpi warm">
          <h3>قيمة معرضة للهدر</h3>
          <div className="value">18.9k</div>
          <div className="hint">ريال خلال أسبوعين</div>
        </div>
        <div className="kpi">
          <h3>اقتراحات FEFO</h3>
          <div className="value">7</div>
          <div className="hint">جاهزة للصرف في المبيعات</div>
        </div>
      </div>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={onOpenFefo}>
          فتح إدارة FEFO
        </button>
        <button className="btn btn-warn" onClick={onOpenWaste}>
          تنبيهات الهدر والإجراءات
        </button>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>متابعة الدفعات والصلاحية</h3>
            <p>الأولوية للأصناف القابلة للتلف</p>
          </div>
          <button className="btn btn-warn" onClick={onOpenFefo}>
            إنشاء عرض تصفية
          </button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>الدفعة</th>
                <th>الصنف</th>
                <th>المستودع</th>
                <th>الكمية</th>
                <th>الانتهاء</th>
                <th>الأيام المتبقية</th>
                <th>المخاطر</th>
              </tr>
            </thead>
            <tbody>
              {expiryBatches.map((b) => (
                <tr key={b.batch}>
                  <td className="amount">{b.batch}</td>
                  <td>{b.item}</td>
                  <td>{b.warehouse}</td>
                  <td className="amount">{b.qty}</td>
                  <td>{b.expiry}</td>
                  <td className="amount">{b.days}</td>
                  <td>
                    <span className={`pill ${statusPill(b.risk)}`}>{b.risk}</span>
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

function Reports({ onOpen }: { onOpen: (page: PageId) => void }) {
  return (
    <div className="grid grid-3">
      {reportCards.map((r) => (
        <section className="panel" key={r.title}>
          <div className="panel-body" style={{ minHeight: 170, display: "flex", flexDirection: "column" }}>
            <span className="pill pill-neutral" style={{ width: "fit-content", marginBottom: 12 }}>
              {r.tag}
            </span>
            <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>{r.title}</h3>
            <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.6, flex: 1 }}>
              {r.desc}
            </p>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 16, alignSelf: "flex-start" }}
              onClick={() => onOpen(r.page)}
            >
              فتح التقرير <ChevronLeft size={14} />
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}

type QuickModal = "invoice" | "receive" | null;

export default function App() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("moona-sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [modal, setModal] = useState<QuickModal>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [unread, setUnread] = useState(notificationSeed.length);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);
  const searchIndex = useMemo(() => buildSearchIndex(), []);
  const meta = pageMeta[page];

  const searchHits = useMemo(() => {
    const q = searchQ.trim();
    if (!q) return searchIndex.slice(0, 6);
    return searchIndex
      .filter(
        (h) =>
          h.title.includes(q) ||
          h.meta.includes(q) ||
          h.id.toLowerCase().includes(q.toLowerCase()) ||
          h.type.includes(q)
      )
      .slice(0, 8);
  }, [searchQ, searchIndex]);

  const navigate: Navigate = (next) => setPage(next);

  const body = useMemo(() => {
    switch (page) {
      case "dashboard":
        return <Dashboard />;
      case "inventory":
        return <Inventory onOpenItem={() => navigate("item-detail")} />;
      case "purchases":
        return <Purchases onOpenDoc={() => navigate("purchase-doc")} />;
      case "sales":
        return (
          <Sales
            onOpenInvoice={() => navigate("invoice")}
            onOpenPartners={() => navigate("partners")}
          />
        );
      case "accounting":
        return <Accounting onOpenJournal={() => navigate("journal-entry")} />;
      case "expiry":
        return (
          <Expiry
            onOpenFefo={() => navigate("fefo")}
            onOpenWaste={() => navigate("waste-alerts")}
          />
        );
      case "reports":
        return <Reports onOpen={navigate} />;
      case "partners":
        return <Partners onOpenInvoice={() => navigate("invoice")} />;
      case "item-detail":
        return <ItemDetail onBack={() => navigate("inventory")} />;
      case "invoice":
        return <InvoiceScreen onBack={() => navigate("sales")} />;
      case "purchase-doc":
        return <PurchaseDoc onBack={() => navigate("purchases")} />;
      case "journal-entry":
        return <JournalEntry onBack={() => navigate("accounting")} />;
      case "warehouses":
        return <WarehousesScreen />;
      case "stock-move":
        return <StockMoveScreen />;
      case "fefo":
        return <FefoScreen onOpenInvoice={() => navigate("invoice")} />;
      case "waste-alerts":
        return (
          <WasteAlertsScreen
            onOpenFefo={() => navigate("fefo")}
            onOpenPurchase={() => navigate("purchase-doc")}
            onOpenMove={() => navigate("stock-move")}
          />
        );
      case "trial-balance":
        return <TrialBalanceScreen />;
      case "profit-loss":
        return <ProfitLossScreen />;
      case "aging":
        return <AgingScreen />;
      case "period-close":
        return <PeriodCloseScreen />;
      case "users-roles":
        return <UsersRolesScreen />;
      case "settings":
        return <SettingsScreen />;
      case "system-states":
        return <SystemStatesScreen />;
    }
  }, [page]);

  const isNavActive = (id: PageId) => {
    if (page === id) return true;
    if (page === "item-detail" && id === "inventory") return true;
    if (page === "invoice" && id === "sales") return true;
    if (page === "purchase-doc" && id === "purchases") return true;
    if (page === "journal-entry" && id === "accounting") return true;
    if ((page === "trial-balance" || page === "profit-loss" || page === "aging") && id === "reports")
      return true;
    return false;
  };

  const setCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    setSidebarCollapsed((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      try {
        localStorage.setItem("moona-sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleSidebar = () => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setMobileOpen((v) => !v);
      return;
    }
    setCollapsed((v) => !v);
  };

  const goHit = (hit: SearchHit) => {
    if (hit.type === "صنف") setPage("item-detail");
    else if (hit.type === "فاتورة") setPage("invoice");
    else if (hit.type === "شراء") setPage("purchase-doc");
    else if (hit.type === "قيد") setPage("journal-entry");
    else setPage(hit.page);
    setSearchOpen(false);
    setSearchQ("");
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const submitQuick = () => {
    if (modal === "invoice") {
      setPage("invoice");
      showToast("تم فتح فاتورة البيع");
    } else {
      setPage("purchase-doc");
      showToast("تم فتح شاشة الاستلام");
    }
    setModal(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (window.matchMedia("(max-width: 900px)").matches) {
          setMobileOpen((v) => !v);
          return;
        }
        setSidebarCollapsed((prev) => {
          const next = !prev;
          try {
            localStorage.setItem("moona-sidebar-collapsed", next ? "1" : "0");
          } catch {
            /* ignore */
          }
          return next;
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setNotifyOpen(false);
        setQuickOpen(false);
        document.getElementById("global-search")?.focus();
      }
      if (e.key === "Escape") {
        setMobileOpen(false);
        setSearchOpen(false);
        setNotifyOpen(false);
        setQuickOpen(false);
        setModal(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(t)) setSearchOpen(false);
      if (notifyRef.current && !notifyRef.current.contains(t)) setNotifyOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen ? (
        <button
          className="sidebar-backdrop"
          aria-label="إغلاق القائمة"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`} aria-label="القائمة الرئيسية">
        <div className="brand">
          <div className="brand-mark" title="مؤونة">
            م
          </div>
          <div className="brand-text">
            <h1>مؤونة</h1>
            <p>ERP محاسبي للمواد الغذائية</p>
          </div>
          <button
            className="sidebar-collapse-btn desktop-only"
            onClick={toggleSidebar}
            title="طي القائمة (Ctrl+B)"
            aria-label="طي القائمة الجانبية"
          >
            <PanelRightClose size={16} />
          </button>
        </div>

        {navGroups.map((group) => (
          <div className="nav-section" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => {
              const Icon = icons[item.icon as keyof typeof icons];
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isNavActive(item.id) ? "active" : ""}`}
                  title={item.label}
                  onClick={() => {
                    setPage(item.id);
                    setMobileOpen(false);
                  }}
                >
                  <Icon size={17} />
                  <span className="nav-text">{item.label}</span>
                  {item.id === "expiry" ? <span className="badge">11</span> : null}
                </button>
              );
            })}
          </div>
        ))}

        <div className="sidebar-foot">
          <strong>فرع الرياض — المستودع الرئيسي</strong>
          <span>السنة المالية 2026 · فترة مفتوحة</span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn sidebar-toggle"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "توسيع القائمة (Ctrl+B)" : "طي القائمة (Ctrl+B)"}
            aria-label={sidebarCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <PanelRightOpen size={18} /> : <Menu size={18} />}
          </button>
          <div className="page-title">
            <h2>{meta.title}</h2>
            <span>{meta.subtitle}</span>
          </div>

          <div className="search" ref={searchRef}>
            <Search size={16} />
            <input
              id="global-search"
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="بحث سريع في الأصناف، الفواتير، القيود..."
            />
            <kbd className="kbd">Ctrl+K</kbd>
            {searchOpen ? (
              <div className="search-panel" role="listbox">
                <div className="search-panel-head">
                  <span>{searchQ ? "نتائج البحث" : "اقتراحات سريعة"}</span>
                  <span>{searchHits.length} نتيجة</span>
                </div>
                {searchHits.length === 0 ? (
                  <div className="search-empty">لا توجد نتائج مطابقة</div>
                ) : (
                  searchHits.map((hit) => (
                    <button
                      key={`${hit.type}-${hit.id}`}
                      className="search-hit"
                      onClick={() => goHit(hit)}
                    >
                      <span className={`pill pill-neutral type`}>{hit.type}</span>
                      <div>
                        <strong>{hit.title}</strong>
                        <span>{hit.meta}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="top-actions">
            <div className="popover-anchor" ref={notifyRef}>
              <button
                className="icon-btn"
                aria-label="الإشعارات"
                onClick={() => {
                  setNotifyOpen((v) => !v);
                  setSearchOpen(false);
                  setUnread(0);
                }}
              >
                <Bell size={17} />
                {unread > 0 ? <span className="dot" /> : null}
              </button>
              {notifyOpen ? (
                <div className="notify-panel">
                  <div className="notify-head">
                    <span>التنبيهات</span>
                    <span>{notificationSeed.length} عناصر</span>
                  </div>
                  {notificationSeed.map((n) => (
                    <button
                      key={n.id}
                      className="notify-item"
                      onClick={() => {
                        setPage(n.page);
                        setNotifyOpen(false);
                      }}
                    >
                      <i className={`tone ${n.tone}`} />
                      <div>
                        <strong>{n.title}</strong>
                        <span>{n.time}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="user-chip">
              <div className="avatar">ي</div>
              <div>
                <strong>ياسين المحاسبي</strong>
                <small>مدير مالي</small>
              </div>
            </div>
          </div>
        </header>
        <main className="content" key={page}>
          {body}
        </main>
      </div>

      <div className="quick-fab">
        {quickOpen ? (
          <div className="quick-menu">
            <div className="quick-menu-head">إجراء سريع</div>
            <button
              onClick={() => {
                setQuickOpen(false);
                setModal("invoice");
              }}
            >
              <Receipt size={16} />
              <div>
                <strong>فاتورة بيع سريعة</strong>
                <span>إنشاء فاتورة ببضع حقول</span>
              </div>
            </button>
            <button
              onClick={() => {
                setQuickOpen(false);
                setModal("receive");
              }}
            >
              <PackageCheck size={16} />
              <div>
                <strong>استلام مخزون سريع</strong>
                <span>دفعة + صلاحية + مستودع</span>
              </div>
            </button>
          </div>
        ) : null}
        <button
          className="quick-fab-btn"
          onClick={() => setQuickOpen((v) => !v)}
          aria-expanded={quickOpen}
        >
          {quickOpen ? <X size={18} /> : <Zap size={18} />}
          {quickOpen ? "إغلاق" : "إجراء سريع"}
        </button>
      </div>

      {modal ? (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="modal-head">
              <div>
                <h3>{modal === "invoice" ? "فاتورة بيع سريعة" : "استلام مخزون سريع"}</h3>
                <p>
                  {modal === "invoice"
                    ? "واجهة مختصرة للمبيعات اليومية"
                    : "تسجيل دفعة مع تاريخ الصلاحية"}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setModal(null)} aria-label="إغلاق">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                {modal === "invoice" ? (
                  <>
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
                      الصنف
                      <select>
                        <option>أرز بسمتي 5 كجم</option>
                        <option>زيت ذرة 1.8 لتر</option>
                        <option>حليب كامل الدسم 1 لتر</option>
                      </select>
                    </label>
                    <label className="label">
                      الكمية
                      <input defaultValue="10" />
                    </label>
                    <label className="label full">
                      ملاحظة
                      <textarea placeholder="خصم قرب صلاحية، توصيل..." />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="label">
                      أمر الشراء
                      <select>
                        <option>PO-260904</option>
                        <option>PO-260828</option>
                      </select>
                    </label>
                    <label className="label">
                      المستودع
                      <select>
                        <option>المستودع الرئيسي</option>
                        <option>الثلاجة 1</option>
                        <option>المجمدات</option>
                      </select>
                    </label>
                    <label className="label">
                      الصنف
                      <select>
                        <option>أرز بسمتي 5 كجم</option>
                        <option>دجاج مجمد 1 كجم</option>
                      </select>
                    </label>
                    <label className="label">
                      الكمية
                      <input defaultValue="50" />
                    </label>
                    <label className="label">
                      رقم الدفعة
                      <input defaultValue="B-4531" />
                    </label>
                    <label className="label">
                      تاريخ الانتهاء
                      <input type="date" defaultValue="2027-03-12" />
                    </label>
                  </>
                )}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                إلغاء
              </button>
              <button className="btn btn-primary" onClick={submitQuick}>
                {modal === "invoice" ? "حفظ الفاتورة" : "تأكيد الاستلام"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
