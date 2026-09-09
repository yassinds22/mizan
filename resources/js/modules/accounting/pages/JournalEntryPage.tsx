import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BackBar } from "@/components/ui/BackBar";
import { money } from "@/utils/formatters";

interface JournalEntryPageProps {
  onBack: () => void;
}

export const JournalEntryPage: React.FC<JournalEntryPageProps> = ({ onBack }) => {
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
            <button className="btn btn-ghost" onClick={onBack}>
              حفظ مسودة
            </button>
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
};
