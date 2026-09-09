import React, { useState } from "react";
import { Download, Plus, Printer, Save, Trash2 } from "lucide-react";
import { BackBar } from "@/components/ui/BackBar";
import { Modal } from "@/components/ui/Modal";
import { money } from "@/utils/formatters";

interface Line {
  id: number;
  item: string;
  qty: number;
  price: number;
  discount: number;
}

interface InvoicePageProps {
  onBack: () => void;
}

export const InvoicePage: React.FC<InvoicePageProps> = ({ onBack }) => {
  const [lines, setLines] = useState<Line[]>([
    { id: 1, item: "أرز بسمتي 5 كجم", qty: 20, price: 34, discount: 0 },
    { id: 2, item: "زيت ذرة 1.8 لتر", qty: 8, price: 98, discount: 5 },
    { id: 3, item: "حليب كامل الدسم 1 لتر", qty: 12, price: 48.5, discount: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(15);
  const [showPrint, setShowPrint] = useState(false);

  const subtotal = lines.reduce(
    (s, l) => s + l.qty * l.price * (1 - l.discount / 100),
    0
  );
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { id: Date.now(), item: "صنف جديد", qty: 1, price: 0, discount: 0 },
    ]);

  const removeLine = (id: number) =>
    setLines((prev) => prev.filter((l) => l.id !== id));

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
              <select defaultValue="نقدي">
                <option>نقدي</option>
                <option>آجل</option>
                <option>تحويل</option>
              </select>
            </label>
            <label className="label">
              المستودع
              <select defaultValue="المستودع الرئيسي">
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
                            prev.map((x) =>
                              x.id === l.id ? { ...x, item: e.target.value } : x
                            )
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
                              x.id === l.id
                                ? { ...x, qty: Number(e.target.value) || 0 }
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
                        value={l.price}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((x) =>
                              x.id === l.id
                                ? { ...x, price: Number(e.target.value) || 0 }
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
                        value={l.discount}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((x) =>
                              x.id === l.id
                                ? { ...x, discount: Number(e.target.value) || 0 }
                                : x
                            )
                          )
                        }
                      />
                    </td>
                    <td className="amount">{money(Math.round(lineTotal))}</td>
                    <td>
                      <button
                        className="icon-btn"
                        style={{ width: 34, height: 34 }}
                        onClick={() => removeLine(l.id)}
                      >
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

      <Modal
        isOpen={showPrint}
        onClose={() => setShowPrint(false)}
        title="معاينة طباعة — INV-88430"
        subtitle="ميزان · فرع الرياض"
        footer={
          <button className="btn btn-primary" onClick={() => setShowPrint(false)}>
            <Printer size={15} /> طباعة
          </button>
        }
      >
        <div className="print-sheet">
          <header>
            <strong>ميزان</strong>
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
      </Modal>
    </div>
  );
};
