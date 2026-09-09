import React, { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
  Clock,
  ArrowRightLeft,
} from "lucide-react";
import { coreApi, FiscalPeriodApi } from "@/api/core";

interface ChecklistItem {
  id: string;
  label: string;
  category: "sales" | "inventory" | "accounting" | "bank";
  done: boolean;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "sales_invoices", label: "مراجعة وترحيل كافة فواتير المبيعات ونقاط البيع", category: "sales", done: false },
  { id: "purchase_bills", label: "مطابقة فواتير المشتريات ومردوداتها", category: "sales", done: false },
  { id: "stock_movements", label: "تسوية حركات المخزون والتحويلات بين المستودعات", category: "inventory", done: false },
  { id: "inventory_damages", label: "تسجيل الهوالك وتالف المواد منتهية الصلاحية", category: "inventory", done: false },
  { id: "bank_reconcile", label: "تسوية الحسابات البنكية ومطابقة كشوف الحساب", category: "bank", done: false },
  { id: "depreciation", label: "احتساب إهلاك الأصول الثابتة للفترة", category: "accounting", done: false },
  { id: "vat_return", label: "مراجعة إقرار ضريبة القيمة المضافة (ZATCA)", category: "accounting", done: false },
];

export const PeriodClosePage: React.FC = () => {
  const [periods, setPeriods] = useState<FiscalPeriodApi[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const data = await coreApi.getFiscalPeriods();
      setPeriods(data);
      if (data.length > 0 && selectedPeriodId === null) {
        // Default to current month or first open period
        const currentMonth = new Date().getMonth() + 1;
        const matched = data.find((p) => p.period_number === currentMonth) || data[0];
        setSelectedPeriodId(matched.id);
      }
    } catch (err: any) {
      showToast("تعذر تحميل الفترات المالية من الخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) || periods[0];
  const isClosed = selectedPeriod?.status === "closed";
  const isLocked = selectedPeriod?.status === "locked";
  const isOpen = selectedPeriod?.status === "open";
  const ready = items.every((i) => i.done);

  const toggleItem = (id: string) => {
    if (!isOpen) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
    );
  };

  const markAll = (status: boolean) => {
    if (!isOpen) return;
    setItems((prev) => prev.map((i) => ({ ...i, done: status })));
  };

  const handleClosePeriod = async () => {
    if (!selectedPeriod) return;
    if (!ready) {
      showToast("يرجى إكمال جميع بنود المراجعة والتدقيق قبل الإقفال", "error");
      return;
    }

    try {
      setActionLoading(true);
      const updated = await coreApi.closeFiscalPeriod(selectedPeriod.id);
      setPeriods((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast(`تم إقفال ${updated.name} بنجاح — تم حظر ترحيل القيود`, "success");
    } catch (err: any) {
      const msg = err.response?.data?.message || "حدث خطأ أثناء إقفال الفترة";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenPeriod = async () => {
    if (!selectedPeriod) return;
    try {
      setActionLoading(true);
      const updated = await coreApi.reopenFiscalPeriod(selectedPeriod.id);
      setPeriods((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast(`تمت إعادة فتح ${updated.name} للترحيل المحاسبي`, "success");
    } catch (err: any) {
      const msg = err.response?.data?.message || "حدث خطأ أثناء إعادة فتح الفترة";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockPeriod = async () => {
    if (!selectedPeriod) return;
    if (!window.confirm("تنبيه أمان: قفل الفترة نهائياً يمنع إعادة فتحها حتى لو من المحاسب. هل أنت متأكد؟")) {
      return;
    }
    try {
      setActionLoading(true);
      const updated = await coreApi.updateFiscalPeriodStatus(selectedPeriod.id, "locked");
      setPeriods((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast(`تم القفل النهائي لـ ${updated.name} بنجاح`, "success");
    } catch (err: any) {
      const msg = err.response?.data?.message || "تعذر قفل الفترة نهائياً";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* 1. الشريط العلوي واختيار الفترة */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fff",
          padding: "16px 20px",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <Calendar size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              إدارة وإقفال الفترات المالية (Period Closing)
            </h2>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              ضبط فترات الترحيل المحاسبي والرقابة على القيود اليومية ومنع التعديلات الرجعية
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>الفترة المستهدفة:</label>
          <select
            value={selectedPeriodId || ""}
            onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              fontWeight: 600,
              background: "#f8fafc",
            }}
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.status_label || (p.status === "open" ? "مفتوحة" : p.status === "closed" ? "مغلقة" : "مقفلة")})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadPeriods}
            disabled={loading}
            title="تحديث البيانات"
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* 2. مؤشرات الأداء الخاصة بالفترة المختارة */}
      {selectedPeriod && (
        <div className="grid grid-3">
          <div className="kpi">
            <h3>الفترة المالية</h3>
            <div className="value" style={{ fontSize: 22, color: "#0f172a" }}>
              {selectedPeriod.name}
            </div>
            <div className="hint">
              من {selectedPeriod.start_date} إلى {selectedPeriod.end_date}
            </div>
          </div>

          <div
            className={`kpi ${
              isLocked ? "danger" : isClosed ? "danger" : ""
            }`}
            style={{
              background: isOpen ? "#f0fdf4" : isLocked ? "#fdf2f8" : "#fef2f2",
              borderColor: isOpen ? "#bbf7d0" : isLocked ? "#fbcfe8" : "#fecaca",
            }}
          >
            <h3>حالة ترحيل القيود</h3>
            <div
              className="value"
              style={{
                fontSize: 22,
                color: isOpen ? "#166534" : isLocked ? "#9d174d" : "#991b1b",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {isOpen ? (
                <>
                  <CheckCircle2 size={24} color="#166534" /> مفتوحة للترحيل
                </>
              ) : isLocked ? (
                <>
                  <ShieldAlert size={24} color="#9d174d" /> مقفلة نهائياً (تدقيق)
                </>
              ) : (
                <>
                  <Lock size={24} color="#991b1b" /> مغلقة (الترحيل محظور)
                </>
              )}
            </div>
            <div className="hint" style={{ color: isOpen ? "#15803d" : "#991b1b" }}>
              {isOpen
                ? "يسمح بإصدار فواتير وسندات وقيدها في هذه الفترة"
                : isLocked
                ? "مقيدة بالكامل ولا تقبل أي عمليات جديدة أو تعديل"
                : "لا يمكن ترحيل قيود بتاريخ يقع ضمن هذه الفترة"}
            </div>
          </div>

          <div className="kpi warm">
            <h3>بنود المراجعة والجاهزية</h3>
            <div className="value" style={{ color: ready ? "#166534" : "#d97706" }}>
              {items.filter((i) => i.done).length} / {items.length}
            </div>
            <div className="hint">
              {ready ? "مكتملة وجاهزة للإقفال القانوني" : "مطلوب إكمال كافة البنود قبل الإقفال"}
            </div>
          </div>
        </div>
      )}

      {/* 3. قائمة المراجعة وإجراءات الإقفال */}
      {selectedPeriod && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>قائمة تدقيق وإقفال الشهر المحاسبي ({selectedPeriod.name})</h3>
              <p>تأكد من إتمام العمليات التشغيلية والمخزنية قبل إغلاق الفترة</p>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isOpen && (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => markAll(true)}
                    style={{ fontSize: 12, padding: "5px 12px" }}
                  >
                    تحديد الكل كمكتمل
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!ready || actionLoading}
                    onClick={handleClosePeriod}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: ready ? "#dc2626" : "#94a3b8",
                      borderColor: ready ? "#dc2626" : "#94a3b8",
                    }}
                  >
                    <Lock size={15} /> {actionLoading ? "جارِ الإقفال..." : "إقفال الفترة المحاسبية"}
                  </button>
                </>
              )}

              {isClosed && (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={actionLoading}
                    onClick={handleReopenPeriod}
                    style={{ display: "flex", alignItems: "center", gap: 6, color: "#166534" }}
                  >
                    <Unlock size={15} /> {actionLoading ? "جارِ الفتح..." : "إعادة فتح الفترة"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={actionLoading}
                    onClick={handleLockPeriod}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#9d174d",
                      borderColor: "#fbcfe8",
                      background: "#fdf2f8",
                    }}
                  >
                    <ShieldAlert size={15} /> قفل نهائي (مراجعة)
                  </button>
                </>
              )}

              {isLocked && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#9d174d",
                    background: "#fdf2f8",
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "1px solid #fbcfe8",
                  }}
                >
                  <ShieldAlert size={15} /> الفترة مقفلة قطعياً بواسطة المدقق
                </div>
              )}
            </div>
          </div>

          <div className="panel-body">
            <div className="alert-list">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`alert-item ${item.done ? "" : "warn"}`}
                  style={{
                    width: "100%",
                    cursor: isOpen ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onClick={() => toggleItem(item.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={`pill ${item.done ? "pill-ok" : "pill-warn"}`}>
                      {item.done ? "مكتمل" : "مطلوب"}
                    </span>
                    <div>
                      <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>
                        {item.label}
                      </strong>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        التصنيف:{" "}
                        {item.category === "sales"
                          ? "المبيعات والعملاء"
                          : item.category === "inventory"
                          ? "المخزون والمستودعات"
                          : item.category === "bank"
                          ? "البنوك والنقدية"
                          : "الحسابات العامة"}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: item.done ? "#166534" : "#d97706", fontWeight: 600 }}>
                    {isOpen
                      ? item.done
                        ? "✓ تم التحقق (اضغط للإلغاء)"
                        : "اضغط للتعليم كمكتمل"
                      : isClosed
                      ? "مقفل مع الفترة"
                      : "مقفل نهائياً"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. جدول عام لجميع الفترات المالية للسنة */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>جدول كافة الفترات المالية للسنة الحالية (12 شهراً)</h3>
            <p>نظرة شمولية لحالة كافة شهور السنة المالية</p>
          </div>
        </div>
        <div className="panel-body" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "right" }}>
                <th style={{ padding: "10px 12px" }}>رقم الفترة</th>
                <th style={{ padding: "10px 12px" }}>اسم الفترة</th>
                <th style={{ padding: "10px 12px" }}>تاريخ البداية</th>
                <th style={{ padding: "10px 12px" }}>تاريخ النهاية</th>
                <th style={{ padding: "10px 12px" }}>الحالة</th>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => {
                const isCurrent = p.id === selectedPeriodId;
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: isCurrent ? "#f0fdf4" : "transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b" }}>
                      #{p.period_number}
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>
                      {p.name}
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#475569" }}>
                      {p.start_date}
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#475569" }}>
                      {p.end_date}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontWeight: 700,
                          background:
                            p.status === "open"
                              ? "#f0fdf4"
                              : p.status === "closed"
                              ? "#fef2f2"
                              : "#fdf2f8",
                          color:
                            p.status === "open"
                              ? "#166534"
                              : p.status === "closed"
                              ? "#991b1b"
                              : "#9d174d",
                          border: `1px solid ${
                            p.status === "open"
                              ? "#bbf7d0"
                              : p.status === "closed"
                              ? "#fecaca"
                              : "#fbcfe8"
                          }`,
                        }}
                      >
                        {p.status === "open" ? "مفتوحة" : p.status === "closed" ? "مغلقة" : "مقفلة نهائياً"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "left" }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setSelectedPeriodId(p.id)}
                        style={{
                          fontSize: 12,
                          padding: "4px 10px",
                          color: isCurrent ? "#059669" : "#2563eb",
                          fontWeight: 700,
                        }}
                      >
                        {isCurrent ? "الفترة المحددة ✓" : "عرض وإدارة ↗"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* التنبيهات المنبثقة */}
      {toast && (
        <div
          className="toast"
          style={{
            background: toast.type === "error" ? "#ef4444" : "#0f172a",
            color: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};
