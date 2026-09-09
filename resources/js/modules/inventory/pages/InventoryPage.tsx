import React, { useMemo, useState } from "react";
import { BookmarkPlus, Eye, Filter, Plus, Search } from "lucide-react";
import { inventoryFilterPresets, inventoryRows } from "@/data/inventory";
import { StatusPill } from "@/components/ui/StatusPill";

interface InventoryPageProps {
  onOpenItem: () => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ onOpenItem }) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [preset, setPreset] = useState("all");
  const [customPresets, setCustomPresets] = useState<
    { id: string; label: string; category: string; status: string }[]
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("moona-inv-presets") || "[]");
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState<string | null>(null);

  const applyPreset = (id: string, cat: string, st: string) => {
    setPreset(id);
    setCategory(cat);
    setStatus(st);
  };

  const saveCurrent = () => {
    const label = prompt("اسم الفلتر المحفوظ؟", "فلتر مخصص");
    if (!label) return;
    const next = [
      ...customPresets,
      { id: `c-${Date.now()}`, label, category, status },
    ];
    setCustomPresets(next);
    try {
      localStorage.setItem("moona-inv-presets", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setToast("تم حفظ الفلتر");
    setTimeout(() => setToast(null), 2200);
  };

  const rows = useMemo(() => {
    return inventoryRows.filter((row) => {
      const q = query.trim();
      const matchQ =
        !q ||
        row.name.includes(q) ||
        row.sku.toLowerCase().includes(q.toLowerCase());
      const matchCat = category === "all" || row.category === category;
      let matchStatus = true;
      if (status === "low") matchStatus = row.status === "منخفض" || row.status === "حرج";
      else if (status === "expiring") {
        const days =
          (new Date(row.expiry).getTime() - new Date("2026-09-04").getTime()) /
          86400000;
        matchStatus = days <= 30;
      } else if (status !== "all") matchStatus = row.status === status;
      return matchQ && matchCat && matchStatus;
    });
  }, [query, category, status]);

  const allPresets = [...inventoryFilterPresets, ...customPresets];

  return (
    <div>
      <div className="filter-chips">
        {allPresets.map((p) => (
          <button
            key={p.id}
            className={`chip ${preset === p.id ? "active" : ""}`}
            onClick={() => applyPreset(p.id, p.category, p.status)}
          >
            {p.label}
          </button>
        ))}
        <button className="chip chip-save" onClick={saveCurrent}>
          <BookmarkPlus size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} />
          حفظ الفلتر الحالي
        </button>
      </div>

      <div className="toolbar">
        <div className="field">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPreset("custom");
            }}
            placeholder="بحث بالاسم أو SKU..."
          />
        </div>
        <div className="field">
          <Filter size={15} />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPreset("custom");
            }}
          >
            <option value="all">كل الفئات</option>
            <option>حبوب</option>
            <option>ألبان</option>
            <option>مجمدات</option>
            <option>معلبات</option>
            <option>زيوت</option>
            <option>تمور</option>
          </select>
        </div>
        <div className="field">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPreset("custom");
            }}
          >
            <option value="all">كل الحالات</option>
            <option value="متوفر">متوفر</option>
            <option value="منخفض">منخفض</option>
            <option value="حرج">حرج</option>
            <option value="low">منخفض / حرج</option>
            <option value="expiring">قرب انتهاء الصلاحية</option>
          </select>
        </div>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost">استيراد</button>
          <button className="btn btn-primary">
            <Plus size={15} /> صنف جديد
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>نتائج المخزون</h3>
            <p>{rows.length} صنف مطابق للفلاتر</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>SKU</th>
                <th>الصنف</th>
                <th>الفئة</th>
                <th>الوحدة</th>
                <th>الرصيد</th>
                <th>حد الطلب</th>
                <th>التكلفة</th>
                <th>أقرب صلاحية</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-note">
                    لا توجد أصناف مطابقة — جرّب فلترًا آخر
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const pct = Math.min(100, Math.round((row.qty / (row.reorder * 3)) * 100));
                  return (
                    <tr key={row.sku}>
                      <td className="amount">{row.sku}</td>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td>{row.category}</td>
                      <td>{row.unit}</td>
                      <td style={{ minWidth: 120 }}>
                        <div className="amount">{row.qty}</div>
                        <div className="progress" style={{ marginTop: 6 }}>
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td>{row.reorder}</td>
                      <td className="amount">{row.cost}</td>
                      <td>{row.expiry}</td>
                      <td>
                        <StatusPill status={row.status} />
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px" }}
                          onClick={onOpenItem}
                          title="عرض بطاقة الصنف"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
