import React from "react";
import { ChevronLeft, Plus, Search } from "lucide-react";
import { salesRows } from "@/data/sales";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";

interface SalesPageProps {
  onOpenInvoice: () => void;
  onOpenPartners: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  onOpenInvoice,
  onOpenPartners,
}) => {
  return (
    <div>
      <div className="tabs">
        <button className="tab active">الفواتير</button>
        <button className="tab">عروض الأسعار</button>
        <button className="tab" onClick={onOpenPartners}>
          العملاء
        </button>
      </div>
      <div className="toolbar">
        <div className="field">
          <Search size={15} />
          <input placeholder="بحث برقم الفاتورة أو العميل..." />
        </div>
        <button className="btn btn-warn">خصم قرب انتهاء الصلاحية</button>
        <div style={{ marginInlineStart: "auto" }}>
          <button className="btn btn-primary" onClick={onOpenInvoice}>
            <Plus size={15} /> فاتورة بيع
          </button>
        </div>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>الفاتورة</th>
                <th>العميل</th>
                <th>التاريخ</th>
                <th>الإجمالي</th>
                <th>المستحق</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {salesRows.map((r) => (
                <tr key={r.no}>
                  <td className="amount">{r.no}</td>
                  <td>{r.customer}</td>
                  <td>{r.date}</td>
                  <td className="amount">{money(r.total)}</td>
                  <td className="amount">{money(r.due)}</td>
                  <td>
                    <StatusPill status={r.status} />
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ height: 34 }}
                      onClick={onOpenInvoice}
                    >
                      عرض <ChevronLeft size={14} />
                    </button>
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
