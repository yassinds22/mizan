import React from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { purchaseRows } from "@/data/purchases";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";

interface PurchasesPageProps {
  onOpenDoc: () => void;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({ onOpenDoc }) => {
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
                    <StatusPill status={r.status} />
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ height: 34 }}
                      onClick={onOpenDoc}
                    >
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
              <select defaultValue="المستودع الرئيسي">
                <option>المستودع الرئيسي</option>
                <option>الثلاجة 1</option>
                <option>المجمدات</option>
              </select>
            </label>
            <label className="label">
              الصنف
              <select defaultValue="أرز بسمتي 5 كجم">
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
              <input defaultValue="B-4530" />
            </label>
            <label className="label">
              تاريخ الانتهاء
              <input type="date" defaultValue="2027-03-12" />
            </label>
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={onOpenDoc}>
              تأكيد الاستلام المبدئي
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
