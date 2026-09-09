import React from "react";
import { AlertTriangle, Download, Package, Plus, Truck } from "lucide-react";
import { kpis } from "@/data/dashboard";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusPill } from "@/components/ui/StatusPill";
import type { PageId } from "@/types/navigation";

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="grid grid-4">
        {kpis.map((k) => (
          <MetricCard
            key={k.title}
            title={k.title}
            value={k.value}
            hint={k.hint}
            delta={k.delta}
            deltaDown={k.deltaDown}
            tone={k.tone}
            icon={k.icon}
          />
        ))}
      </div>

      <div className="grid grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>مبيعات الأسبوع</h3>
              <p>مقارنة يومية بالمتوسط التشغيلي</p>
            </div>
            <button className="btn btn-ghost">
              <Download size={15} /> تصدير
            </button>
          </div>
          <div className="panel-body">
            <div className="chart-bars">
              {[55, 72, 48, 90, 66, 80, 95].map((h, i) => (
                <div className="bar" key={i}>
                  <i style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }} />
                  <span>{["س", "أ", "ث", "ر", "خ", "ج", "س"][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>تنبيهات الصلاحية والمخزون</h3>
              <p>إجراءات مقترحة قبل الهدر</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="alert-list">
              <div
                className="alert-item danger"
                style={{ cursor: "pointer" }}
                onClick={() => onNavigate("expiry")}
              >
                <AlertTriangle size={18} />
                <div>
                  <strong>دفعة حليب تنتهي خلال 6 أيام</strong>
                  <span>42 كرتون في الثلاجة 1 — يُفضّل خصم ترويجي أو تحويل للمبيعات السريعة</span>
                </div>
              </div>
              <div
                className="alert-item warn"
                style={{ cursor: "pointer" }}
                onClick={() => onNavigate("inventory")}
              >
                <Package size={18} />
                <div>
                  <strong>طماطم معلبة تحت حد إعادة الطلب</strong>
                  <span>الرصيد 18 / الحد 40 — مسودة أمر شراء جاهزة للمراجعة</span>
                </div>
              </div>
              <div
                className="alert-item"
                style={{ cursor: "pointer" }}
                onClick={() => onNavigate("purchases")}
              >
                <Truck size={18} />
                <div>
                  <strong>استلام جزئي لأمر PO-260828</strong>
                  <span>متبقي 3 أصناف مجمدة من مجمدات الخليج</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>آخر حركات المخزون</h3>
            <p>دخول، صرف، وتسويات اليوم</p>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate("stock-move")}>
            <Plus size={15} /> حركة جديدة
          </button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>النوع</th>
                <th>الصنف</th>
                <th>المستودع</th>
                <th>الكمية</th>
                <th>المرجع</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><StatusPill status="استلام" /></td>
                <td>أرز بسمتي 5 كجم</td>
                <td>المستودع الرئيسي</td>
                <td className="amount">+120</td>
                <td>PO-260904</td>
                <td>08:20</td>
              </tr>
              <tr>
                <td><StatusPill status="صرف" /></td>
                <td>زيت ذرة 1.8 لتر</td>
                <td>المستودع الرئيسي</td>
                <td className="amount">-24</td>
                <td>INV-88421</td>
                <td>09:05</td>
              </tr>
              <tr>
                <td><StatusPill status="تسوية" /></td>
                <td>زبادي طبيعي 170 جم</td>
                <td>الثلاجة 2</td>
                <td className="amount">-8</td>
                <td>ADJ-118</td>
                <td>10:40</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
