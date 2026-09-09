import React, { useState } from "react";
import { Plus, Save, Warehouse } from "lucide-react";
import { warehouses } from "@/data/warehouses";
import { StatusPill } from "@/components/ui/StatusPill";

export const WarehousesPage: React.FC = () => {
  const [selected, setSelected] = useState(warehouses[0].id);
  const current = warehouses.find((w) => w.id === selected) ?? warehouses[0];
  const usedPct = Math.round((current.used / current.capacity) * 100);

  return (
    <div className="split partners-split">
      <aside className="tree">
        <div style={{ padding: "6px 10px 12px", fontWeight: 700, fontSize: 14 }}>
          المستودعات
        </div>
        {warehouses.map((w) => (
          <button
            key={w.id}
            className={`tree-item ${selected === w.id ? "active" : ""}`}
            onClick={() => setSelected(w.id)}
          >
            <Warehouse size={14} />
            <span style={{ flex: 1, textAlign: "right" }}>{w.name}</span>
          </button>
        ))}
        <button className="btn btn-ghost" style={{ marginTop: 12, width: "100%" }}>
          <Plus size={15} /> مستودع جديد
        </button>
      </aside>

      <div className="grid" style={{ gap: 16 }}>
        <div className="grid grid-3">
          <div className="kpi">
            <h3>الإشغال</h3>
            <div className="value" style={{ fontSize: 26 }}>
              {usedPct}%
            </div>
            <div className="hint">
              {current.used} / {current.capacity} موقع
            </div>
            <div className="progress" style={{ marginTop: 10 }}>
              <span style={{ width: `${usedPct}%` }} />
            </div>
          </div>
          <div className="kpi info">
            <h3>الأصناف النشطة</h3>
            <div className="value" style={{ fontSize: 26 }}>
              {current.skus}
            </div>
            <div className="hint">SKU داخل المستودع</div>
          </div>
          <div className={`kpi ${current.type === "جاف" ? "" : "warm"}`}>
            <h3>الحرارة</h3>
            <div className="value" style={{ fontSize: 22 }}>
              {current.temp}
            </div>
            <div className="hint">{current.type}</div>
          </div>
        </div>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{current.name}</h3>
              <p>
                {current.id} · <StatusPill status={current.status} />
              </p>
            </div>
            <button className="btn btn-primary">
              <Save size={15} /> حفظ
            </button>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                الاسم
                <input defaultValue={current.name} key={current.id + "-n"} />
              </label>
              <label className="label">
                النوع
                <select defaultValue={current.type} key={current.id + "-t"}>
                  <option>جاف</option>
                  <option>مبرد</option>
                  <option>مجمّد</option>
                </select>
              </label>
              <label className="label">
                نطاق الحرارة
                <input defaultValue={current.temp} key={current.id + "-temp"} />
              </label>
              <label className="label">
                الطاقة الاستيعابية
                <input defaultValue={String(current.capacity)} key={current.id + "-c"} />
              </label>
              <label className="label full">
                ملاحظات التشغيل
                <textarea
                  key={current.id + "-note"}
                  defaultValue={
                    current.type === "جاف"
                      ? "تهوية جيدة · بعيد عن أشعة الشمس"
                      : "مراقبة درجة الحرارة كل ساعتين · إنذار عند الانحراف"
                  }
                />
              </label>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>المواقع داخل المستودع</h3>
              <p>مناطق تخزين فرعية</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>الموقع</th>
                  <th>الوصف</th>
                  <th>الإشغال</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="amount">A-01</td>
                  <td>ممر أمامي</td>
                  <td>
                    <div className="progress">
                      <span style={{ width: "70%" }} />
                    </div>
                  </td>
                  <td>
                    <StatusPill status="متوفر" />
                  </td>
                </tr>
                <tr>
                  <td className="amount">A-02</td>
                  <td>ممر خلفي</td>
                  <td>
                    <div className="progress">
                      <span style={{ width: "88%" }} />
                    </div>
                  </td>
                  <td>
                    <StatusPill status="منخفض" />
                  </td>
                </tr>
                <tr>
                  <td className="amount">B-01</td>
                  <td>{current.type === "جاف" ? "رفوف علوية" : "أرفف تبريد"}</td>
                  <td>
                    <div className="progress">
                      <span style={{ width: "45%" }} />
                    </div>
                  </td>
                  <td>
                    <StatusPill status="متوفر" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
