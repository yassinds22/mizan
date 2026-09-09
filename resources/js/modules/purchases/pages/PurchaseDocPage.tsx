import React, { useState } from "react";
import { Plus, Save } from "lucide-react";
import { BackBar } from "@/components/ui/BackBar";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";

interface PurchaseDocPageProps {
  onBack: () => void;
}

export const PurchaseDocPage: React.FC<PurchaseDocPageProps> = ({ onBack }) => {
  const [tab, setTab] = useState<"order" | "receive">("order");

  return (
    <div className="grid" style={{ gap: 16 }}>
      <BackBar
        onBack={onBack}
        label="العودة للمشتريات"
        actions={
          <>
            <button className="btn btn-ghost" onClick={onBack}>
              حفظ مسودة
            </button>
            <button className="btn btn-primary">
              <Save size={15} /> {tab === "order" ? "اعتماد الأمر" : "تأكيد الاستلام"}
            </button>
          </>
        }
      />

      <div className="tabs">
        <button
          className={`tab ${tab === "order" ? "active" : ""}`}
          onClick={() => setTab("order")}
        >
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
              <select defaultValue="المستودع الرئيسي">
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
                    <StatusPill status="مكتمل" />
                  </td>
                </tr>
                <tr>
                  <td>زيت ذرة 1.8 لتر</td>
                  <td className="amount">80</td>
                  <td className="amount">40</td>
                  <td className="amount">86</td>
                  <td className="amount">{money(6880)}</td>
                  <td>
                    <StatusPill status="جزئي" />
                  </td>
                </tr>
                <tr>
                  <td>تمر سكري فاخر 3 كجم</td>
                  <td className="amount">50</td>
                  <td className="amount">0</td>
                  <td className="amount">54</td>
                  <td className="amount">{money(2700)}</td>
                  <td>
                    <StatusPill status="معلق" />
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
                <select defaultValue="زيت ذرة 1.8 لتر">
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
                <select defaultValue="سليمة">
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
};
