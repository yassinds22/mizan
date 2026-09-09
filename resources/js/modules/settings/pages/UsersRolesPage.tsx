import React, { useState } from "react";
import { Shield } from "lucide-react";
import { appUsers, roleMatrix } from "@/data/settings";
import { StatusPill } from "@/components/ui/StatusPill";

function CellCheck({ on }: { on: boolean }) {
  return on ? (
    <span className="pill pill-ok" style={{ fontSize: 11 }}>
      نعم
    </span>
  ) : (
    <span style={{ color: "var(--muted)", fontSize: 13 }}>—</span>
  );
}

export const UsersRolesPage: React.FC = () => {
  const [selected, setSelected] = useState(appUsers[0].id);
  const current = appUsers.find((u) => u.id === selected) ?? appUsers[0];

  return (
    <div className="split partners-split">
      <aside className="tree">
        <div
          style={{
            padding: "6px 10px 12px",
            fontWeight: 700,
            fontSize: 14,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <Shield size={16} /> المستخدمون
        </div>
        {appUsers.map((u) => (
          <button
            key={u.id}
            className={`tree-item ${selected === u.id ? "active" : ""}`}
            onClick={() => setSelected(u.id)}
          >
            <span style={{ flex: 1, textAlign: "right" }}>{u.name}</span>
            <span
              className={`pill ${u.status === "نشط" ? "pill-ok" : "pill-neutral"}`}
              style={{ fontSize: 10 }}
            >
              {u.role}
            </span>
          </button>
        ))}
      </aside>

      <div className="grid" style={{ gap: 16 }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{current.name}</h3>
              <p>
                {current.email} · {current.branch}
              </p>
            </div>
            <StatusPill status={current.status} />
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                الاسم
                <input defaultValue={current.name} key={current.id + "-n"} />
              </label>
              <label className="label">
                البريد
                <input defaultValue={current.email} key={current.id + "-e"} />
              </label>
              <label className="label">
                الدور
                <select defaultValue={current.role} key={current.id + "-r"}>
                  <option>مدير مالي</option>
                  <option>محاسب</option>
                  <option>أمين مستودع</option>
                  <option>مبيعات</option>
                </select>
              </label>
              <label className="label">
                الفرع
                <select defaultValue={current.branch} key={current.id + "-b"}>
                  <option>الرياض</option>
                  <option>جدة</option>
                  <option>الدمام</option>
                </select>
              </label>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary">حفظ المستخدم</button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>مصفوفة الصلاحيات</h3>
              <p>مدير · محاسب · أمين مستودع · مبيعات</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>الصلاحية</th>
                  <th>مدير</th>
                  <th>محاسب</th>
                  <th>أمين مستودع</th>
                  <th>مبيعات</th>
                </tr>
              </thead>
              <tbody>
                {roleMatrix.map((row) => (
                  <tr key={row.perm}>
                    <td>{row.perm}</td>
                    <td>
                      <CellCheck on={row.manager} />
                    </td>
                    <td>
                      <CellCheck on={row.accountant} />
                    </td>
                    <td>
                      <CellCheck on={row.warehouse} />
                    </td>
                    <td>
                      <CellCheck on={row.sales} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
