import React, { useState, type ReactNode } from "react";
import { AlertCircle, FileX, LoaderCircle, ShieldOff } from "lucide-react";

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
      <div
        className="empty-note"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "center",
        }}
      >
        {icon}
      </div>
    </section>
  );
}

export const SystemStatesPage: React.FC = () => {
  const [tab, setTab] = useState<"loading" | "empty" | "error" | "forbidden">("loading");

  return (
    <div>
      <div className="tabs">
        <button
          className={`tab ${tab === "loading" ? "active" : ""}`}
          onClick={() => setTab("loading")}
        >
          تحميل
        </button>
        <button
          className={`tab ${tab === "empty" ? "active" : ""}`}
          onClick={() => setTab("empty")}
        >
          فارغ
        </button>
        <button
          className={`tab ${tab === "error" ? "active" : ""}`}
          onClick={() => setTab("error")}
        >
          خطأ
        </button>
        <button
          className={`tab ${tab === "forbidden" ? "active" : ""}`}
          onClick={() => setTab("forbidden")}
        >
          بدون صلاحية
        </button>
      </div>

      {tab === "loading" && (
        <StateCard
          icon={<LoaderCircle className="spin" size={28} />}
          title="جاري التحميل"
        >
          <p
            style={{
              margin: 0,
              color: "var(--ink-soft)",
              textAlign: "center",
            }}
          >
            نحمّل أرصدة المخزون والدفعات...
          </p>
          <div className="progress" style={{ marginTop: 16 }}>
            <span style={{ width: "55%" }} />
          </div>
        </StateCard>
      )}

      {tab === "empty" && (
        <StateCard icon={<FileX size={28} />} title="لا توجد بيانات">
          <p
            style={{
              margin: "0 0 12px",
              color: "var(--ink-soft)",
              textAlign: "center",
            }}
          >
            لا توجد أصناف مطابقة للفلاتر الحالية.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="btn btn-primary">إعادة ضبط الفلاتر</button>
          </div>
        </StateCard>
      )}

      {tab === "error" && (
        <StateCard
          icon={<AlertCircle size={28} color="var(--danger)" />}
          title="تعذّر إكمال العملية"
        >
          <p
            style={{
              margin: "0 0 12px",
              color: "var(--ink-soft)",
              textAlign: "center",
            }}
          >
            فشل حفظ القيد. تحقق من التوازن ثم أعد المحاولة.
          </p>
          <div
            style={{ display: "flex", justifyContent: "center", gap: 8 }}
          >
            <button className="btn btn-ghost">تفاصيل الخطأ</button>
            <button className="btn btn-primary">إعادة المحاولة</button>
          </div>
        </StateCard>
      )}

      {tab === "forbidden" && (
        <StateCard icon={<ShieldOff size={28} />} title="ليست لديك صلاحية">
          <p
            style={{
              margin: "0 0 12px",
              color: "var(--ink-soft)",
              textAlign: "center",
            }}
          >
            إقفال الفترة متاح للمدير المالي فقط. اطلب صلاحية أو بدّل الدور من شاشة المستخدمين.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="btn btn-ghost">العودة</button>
          </div>
        </StateCard>
      )}
    </div>
  );
};
