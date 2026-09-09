import React from "react";
import { expiryBatches } from "@/data/expiry";
import { StatusPill } from "@/components/ui/StatusPill";

interface ExpiryPageProps {
  onOpenFefo: () => void;
  onOpenWaste: () => void;
}

export const ExpiryPage: React.FC<ExpiryPageProps> = ({
  onOpenFefo,
  onOpenWaste,
}) => {
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
                    <StatusPill status={b.risk} />
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
