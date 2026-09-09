import React from "react";
import { Plus, Save } from "lucide-react";
import { BackBar } from "@/components/ui/BackBar";
import { StatusPill } from "@/components/ui/StatusPill";
import { itemBatches } from "@/data/inventory";
import { money } from "@/utils/formatters";

interface ItemDetailPageProps {
  onBack: () => void;
}

export const ItemDetailPage: React.FC<ItemDetailPageProps> = ({ onBack }) => {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <BackBar
        onBack={onBack}
        label="العودة للمخزون"
        actions={
          <>
            <button className="btn btn-ghost" onClick={onBack}>
              إلغاء
            </button>
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
            <StatusPill status="نشط" />
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
              <StatusPill status="متوفر" />
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
                    <StatusPill status={b.qty === 0 ? "معلق" : "متوفر"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
