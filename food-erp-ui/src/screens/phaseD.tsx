import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  FileX,
  LoaderCircle,
  Printer,
  Save,
  ShieldOff,
} from "lucide-react";
import { money, trialBalanceRows } from "../data";

export function SettingsScreen() {
  const [toast, setToast] = useState<string | null>(null);
  const save = () => {
    setToast("تم حفظ إعدادات الشركة (واجهة تجريبية)");
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>بيانات المنشأة</h3>
            <p>تظهر في الفواتير والتقارير المطبوعة</p>
          </div>
          <button className="btn btn-primary" onClick={save}>
            <Save size={15} /> حفظ
          </button>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <label className="label">
              الاسم التجاري
              <input defaultValue="مؤونة للتجارة الغذائية" />
            </label>
            <label className="label">
              الرقم الضريبي
              <input defaultValue="310123456700003" />
            </label>
            <label className="label">
              السجل التجاري
              <input defaultValue="1010123456" />
            </label>
            <label className="label">
              المدينة
              <input defaultValue="الرياض" />
            </label>
            <label className="label full">
              العنوان
              <input defaultValue="حي الصناعية، طريق الخرج، الرياض" />
            </label>
          </div>
        </div>
      </section>

      <div className="grid grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>الضريبة والسنة المالية</h3>
              <p>تُطبَّق على الفواتير والإقفال</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                نسبة ضريبة القيمة المضافة %
                <input defaultValue="15" />
              </label>
              <label className="label">
                بداية السنة المالية
                <input type="date" defaultValue="2026-01-01" />
              </label>
              <label className="label">
                العملة
                <select defaultValue="SAR">
                  <option value="SAR">ريال سعودي</option>
                  <option value="AED">درهم إماراتي</option>
                </select>
              </label>
              <label className="label">
                سياسة المخزون
                <select>
                  <option>متوسط التكلفة المرجح</option>
                  <option>FEFO</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>قالب الطباعة</h3>
              <p>رأس وتذييل موحّدان لكل المستندات</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                شعار (نصي)
                <input defaultValue="مؤونة" />
              </label>
              <label className="label">
                تذييل الفاتورة
                <input defaultValue="شكراً لتعاملكم معنا" />
              </label>
              <label className="label full">
                ملاحظة قانونية
                <textarea defaultValue="فاتورة ضريبية مبسطة وفق أنظمة هيئة الزكاة والضريبة والجمارك." />
              </label>
            </div>
          </div>
        </section>
      </div>
      <PrintCenterScreen />
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function StateCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="panel-body">{children}</div>
      <div className="empty-note" style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        {icon}
      </div>
    </section>
  );
}

export function SystemStatesScreen() {
  const [tab, setTab] = useState<"loading" | "empty" | "error" | "forbidden">("loading");

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === "loading" ? "active" : ""}`} onClick={() => setTab("loading")}>
          تحميل
        </button>
        <button className={`tab ${tab === "empty" ? "active" : ""}`} onClick={() => setTab("empty")}>
          فارغ
        </button>
        <button className={`tab ${tab === "error" ? "active" : ""}`} onClick={() => setTab("error")}>
          خطأ
        </button>
        <button className={`tab ${tab === "forbidden" ? "active" : ""}`} onClick={() => setTab("forbidden")}>
          بدون صلاحية
        </button>
      </div>

      {tab === "loading" ? (
        <StateCard icon={<LoaderCircle className="spin" size={28} />} title="جاري التحميل">
          <p style={{ margin: 0, color: "var(--ink-soft)", textAlign: "center" }}>
            نحمّل أرصدة المخزون والدفعات...
          </p>
          <div className="progress" style={{ marginTop: 16 }}>
            <span style={{ width: "55%" }} />
          </div>
        </StateCard>
      ) : null}

      {tab === "empty" ? (
        <StateCard icon={<FileX size={28} />} title="لا توجد بيانات">
          <p style={{ margin: "0 0 12px", color: "var(--ink-soft)", textAlign: "center" }}>
            لا توجد أصناف مطابقة للفلاتر الحالية.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="btn btn-primary">إعادة ضبط الفلاتر</button>
          </div>
        </StateCard>
      ) : null}

      {tab === "error" ? (
        <StateCard icon={<AlertCircle size={28} color="var(--danger)" />} title="تعذّر إكمال العملية">
          <p style={{ margin: "0 0 12px", color: "var(--ink-soft)", textAlign: "center" }}>
            فشل حفظ القيد. تحقق من التوازن ثم أعد المحاولة.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            <button className="btn btn-ghost">تفاصيل الخطأ</button>
            <button className="btn btn-primary">إعادة المحاولة</button>
          </div>
        </StateCard>
      ) : null}

      {tab === "forbidden" ? (
        <StateCard icon={<ShieldOff size={28} />} title="ليست لديك صلاحية">
          <p style={{ margin: "0 0 12px", color: "var(--ink-soft)", textAlign: "center" }}>
            إقفال الفترة متاح للمدير المالي فقط. اطلب صلاحية أو بدّل الدور من شاشة المستخدمين.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="btn btn-ghost">العودة</button>
          </div>
        </StateCard>
      ) : null}
    </div>
  );
}

export function UnifiedPrintPreview({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal print-preview" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <button className="btn btn-primary" onClick={onClose}>
            <Printer size={15} /> طباعة
          </button>
        </div>
        <div className="modal-body">
          <div className="print-sheet">
            <header>
              <strong>مؤونة للتجارة الغذائية</strong>
              <span>الرقم الضريبي 310123456700003</span>
            </header>
            {children}
            <footer>
              <span>فاتورة / تقرير وفق قالب الشركة الموحّد</span>
              <strong>فرع الرياض</strong>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrintCenterScreen() {
  const [open, setOpen] = useState(false);
  const debit = trialBalanceRows.reduce((s, r) => s + r.debit, 0);
  const credit = trialBalanceRows.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>مركز الطباعة الموحّد</h3>
            <p>نفس الرأس والتذييل للفواتير والتقارير</p>
          </div>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Printer size={15} /> معاينة ميزان المراجعة
          </button>
        </div>
        <div className="panel-body">
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.7 }}>
            استخدم هذا القالب من الفواتير والتقارير. الإعدادات تُدار من شاشة إعدادات الشركة.
          </p>
        </div>
      </section>
      {open ? (
        <UnifiedPrintPreview
          title="معاينة طباعة — ميزان المراجعة"
          subtitle="حتى 2026-09-04"
          onClose={() => setOpen(false)}
        >
          <p>فرع الرياض · السنة المالية 2026</p>
          <ul>
            {trialBalanceRows.slice(0, 6).map((r) => (
              <li key={r.code}>
                {r.code} {r.name} — مدين {money(r.debit)} / دائن {money(r.credit)}
              </li>
            ))}
          </ul>
          <p>
            الإجمالي: مدين {money(debit)} · دائن {money(credit)}
          </p>
        </UnifiedPrintPreview>
      ) : null}
    </div>
  );
}
