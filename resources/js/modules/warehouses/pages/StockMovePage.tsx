import React, { useState } from "react";
import { ArrowLeftRight, Save } from "lucide-react";
import { stockMoves } from "@/data/warehouses";
import { StatusPill } from "@/components/ui/StatusPill";

export const StockMovePage: React.FC = () => {
  const [moveType, setMoveType] = useState("تحويل");
  const [toast, setToast] = useState<string | null>(null);

  const submit = () => {
    setToast("تم حفظ حركة المخزون بنجاح");
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
                <select defaultValue="حليب كامل الدسم 1 لتر">
                  <option>حليب كامل الدسم 1 لتر</option>
                  <option>زيت ذرة 1.8 لتر</option>
                  <option>دجاج مجمد 1 كجم</option>
                </select>
              </label>
              <label className="label">
                الدفعة (FEFO)
                <select defaultValue="B-4491 — ينتهي 2026-09-10">
                  <option>B-4491 — ينتهي 2026-09-10</option>
                  <option>B-4518 — ينتهي 2026-10-02</option>
                </select>
              </label>
              <label className="label">
                من مستودع
                <select defaultValue="الثلاجة 1">
                  <option>الثلاجة 1</option>
                  <option>المستودع الرئيسي</option>
                  <option>المجمدات</option>
                </select>
              </label>
              <label className="label">
                إلى
                <select
                  disabled={moveType === "تسوية" || moveType === "إهلاك هدر"}
                  defaultValue="الثلاجة 2"
                >
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
                <select defaultValue="إعادة توزيع">
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
                {moveType === "إهلاك هدر"
                  ? "5200 هدر"
                  : moveType === "صرف"
                  ? "5100 تكلفة"
                  : "تحويل داخلي"}
              </strong>
            </div>
            <div className="alert-list" style={{ marginTop: 12 }}>
              <div className="alert-item">
                <ArrowLeftRight size={16} />
                <div>
                  <strong>سيتم تحديث أرصدة الدفعات فورًا</strong>
                  <span>حركة المخزون تخضع للتدقيق المحاسبي</span>
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
                    <StatusPill status={m.type} />
                  </td>
                  <td>{m.item}</td>
                  <td>{m.from}</td>
                  <td>{m.to}</td>
                  <td className="amount">{m.qty}</td>
                  <td className="amount">{m.batch}</td>
                  <td>{m.date}</td>
                  <td>
                    <StatusPill status={m.status} />
                  </td>
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
