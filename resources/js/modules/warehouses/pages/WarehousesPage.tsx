import React, { useState, useEffect, useTransition } from "react";
import { Plus, Save, Warehouse, MapPin, Thermometer, Box, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { warehousesApi, Warehouse as IWarehouse, WarehouseLocation } from "@/api/warehouses";
import { inventoryApi, StockBalance } from "@/api/inventory";
import { StatusPill } from "@/components/ui/StatusPill";

export const WarehousesPage: React.FC = () => {
  const [warehousesList, setWarehousesList] = useState<IWarehouse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [, startTransition] = useTransition();

  // Form State for editing selected warehouse
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    type: "dry" as "dry" | "chilled" | "frozen",
    target_temperature: "",
    capacity_sqm: 100,
    manager_name: "",
    phone: "",
    address: "",
    notes: "",
  });

  // Modal State for New Warehouse
  const [showNewWarehouseModal, setShowNewWarehouseModal] = useState(false);
  const [newWarehouseForm, setNewWarehouseForm] = useState({
    name: "",
    code: "",
    type: "dry" as "dry" | "chilled" | "frozen",
    target_temperature: "20°C إلى 25°C",
    capacity_sqm: 200,
    manager_name: "",
    phone: "",
    address: "",
    notes: "",
  });

  // Modal State for New Location
  const [showNewLocationModal, setShowNewLocationModal] = useState(false);
  const [newLocationForm, setNewLocationForm] = useState({
    code: "",
    aisle: "",
    rack: "",
    shelf: "",
    bin: "",
    notes: "",
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load all warehouses
  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const data = await warehousesApi.list();
      setWarehousesList(data);
      if (data.length > 0) {
        // If current selected is not valid, pick the first
        const cur = data.find(w => w.id === selectedId) || data[0];
        setSelectedId(cur.id);
        initEditForm(cur);
      }
    } catch (err: any) {
      showToast(err.message || 'فشل تحميل بيانات المستودعات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const initEditForm = (w: IWarehouse) => {
    setEditForm({
      name: w.name || "",
      code: w.code || "",
      type: w.type || "dry",
      target_temperature: w.target_temperature || "",
      capacity_sqm: Number(w.capacity_sqm) || 100,
      manager_name: w.manager_name || "",
      phone: w.phone || "",
      address: w.address || "",
      notes: w.notes || "",
    });
  };

  // When selected warehouse changes, fetch locations & balances
  const loadSelectedWarehouseData = async (whId: number) => {
    try {
      const [locs, bals] = await Promise.all([
        warehousesApi.listLocations(whId),
        inventoryApi.listBalances({ warehouse_id: whId, in_stock_only: 1 }),
      ]);
      setLocations(locs);
      setBalances(bals);
    } catch (err: any) {
      showToast(err.message || 'فشل جلب تفاصيل المستودع', 'error');
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedId) {
      const current = warehousesList.find(w => w.id === selectedId);
      if (current) {
        initEditForm(current);
        loadSelectedWarehouseData(selectedId);
      }
    }
  }, [selectedId]);

  const currentWarehouse = warehousesList.find(w => w.id === selectedId);

  // Derived metrics
  const activeSkusCount = new Set(balances.map(b => b.item_id)).size;
  const totalStockQty = balances.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
  const totalStockVal = balances.reduce((sum, b) => sum + Number(b.total_value || 0), 0);

  // Save changes to current warehouse
  const handleSaveWarehouse = async () => {
    if (!selectedId) return;
    try {
      const updated = await warehousesApi.update(selectedId, editForm);
      setWarehousesList(prev => prev.map(w => (w.id === updated.id ? updated : w)));
      showToast('تم حفظ تعديلات المستودع بنجاح');
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ التعديلات', 'error');
    }
  };

  // Create new warehouse
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await warehousesApi.create(newWarehouseForm);
      setWarehousesList(prev => [...prev, created]);
      setSelectedId(created.id);
      setShowNewWarehouseModal(false);
      setNewWarehouseForm({
        name: "",
        code: "",
        type: "dry",
        target_temperature: "20°C إلى 25°C",
        capacity_sqm: 200,
        manager_name: "",
        phone: "",
        address: "",
        notes: "",
      });
      showToast('تم إنشاء المستودع الجديد بنجاح');
    } catch (err: any) {
      showToast(err.message || 'فشل إنشاء المستودع', 'error');
    }
  };

  // Create new location
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      const created = await warehousesApi.createLocation(selectedId, newLocationForm);
      setLocations(prev => [...prev, created]);
      setShowNewLocationModal(false);
      setNewLocationForm({ code: "", aisle: "", rack: "", shelf: "", bin: "", notes: "" });
      showToast('تم إضافة موقع التخزين بنجاح');
    } catch (err: any) {
      showToast(err.message || 'فشل إضافة الموقع', 'error');
    }
  };

  // Delete location
  const handleDeleteLocation = async (locId: number) => {
    if (!selectedId) return;
    if (!window.confirm('هل أنت متأكد من رغبتك بحذف هذا الموقع؟')) return;
    try {
      await warehousesApi.deleteLocation(selectedId, locId);
      setLocations(prev => prev.filter(l => l.id !== locId));
      showToast('تم حذف الموقع بنجاح');
    } catch (err: any) {
      showToast(err.message || 'فشل حذف الموقع', 'error');
    }
  };

  if (loading && warehousesList.length === 0) {
    return (
      <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
        <p>جاري تحميل بيانات المستودعات والمواقع...</p>
      </div>
    );
  }

  return (
    <div className="split partners-split">
      {/* Sidebar: Warehouses Tree */}
      <aside className="tree">
        <div style={{ padding: "6px 10px 12px", fontWeight: 700, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>المستودعات ({warehousesList.length})</span>
        </div>
        {warehousesList.map((w) => (
          <button
            key={w.id}
            className={`tree-item ${selectedId === w.id ? "active" : ""}`}
            onClick={() => setSelectedId(w.id)}
          >
            <Warehouse size={14} />
            <span style={{ flex: 1, textAlign: "right" }}>{w.name}</span>
            <small style={{ opacity: 0.6, fontSize: 11 }}>{w.code}</small>
          </button>
        ))}
        <button
          className="btn btn-ghost"
          style={{ marginTop: 12, width: "100%" }}
          onClick={() => setShowNewWarehouseModal(true)}
        >
          <Plus size={15} /> مستودع جديد
        </button>
      </aside>

      {/* Main Content Area */}
      {currentWarehouse ? (
        <div className="grid" style={{ gap: 16 }}>
          {/* Top KPIs for Selected Warehouse */}
          <div className="grid grid-3">
            <div className="kpi">
              <h3>المساحة والمواقع</h3>
              <div className="value" style={{ fontSize: 26 }}>
                {locations.length} <span style={{ fontSize: 14, fontWeight: 500 }}>موقع تخزين</span>
              </div>
              <div className="hint">
                المساحة: {currentWarehouse.capacity_sqm || 0} م²
              </div>
              <div className="progress" style={{ marginTop: 10 }}>
                <span style={{ width: `${Math.min(100, Math.max(15, locations.length * 10))}%` }} />
              </div>
            </div>

            <div className="kpi info">
              <h3>المخزون الفعلي والـ SKU</h3>
              <div className="value" style={{ fontSize: 26 }}>
                {activeSkusCount} <span style={{ fontSize: 14, fontWeight: 500 }}>صنف نشط</span>
              </div>
              <div className="hint">
                إجمالي {totalStockQty.toLocaleString()} وحدة · {totalStockVal.toLocaleString()} ر.س
              </div>
            </div>

            <div className={`kpi ${currentWarehouse.type === "dry" ? "" : "warm"}`}>
              <h3>نظام التبريد والحرارة</h3>
              <div className="value" style={{ fontSize: 22, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Thermometer size={20} />
                {currentWarehouse.target_temperature || currentWarehouse.temperature_range || "حرارة الغرفة"}
              </div>
              <div className="hint">
                {currentWarehouse.type_label || (currentWarehouse.type === 'frozen' ? 'مجمّد' : currentWarehouse.type === 'chilled' ? 'مبرد' : 'جاف')}
              </div>
            </div>
          </div>

          {/* Warehouse Settings & Edit Panel */}
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>{currentWarehouse.name} ({currentWarehouse.code})</h3>
                <p>
                  المعرف: #{currentWarehouse.id} · <StatusPill status={currentWarehouse.is_active ? "نشط" : "معلق"} />
                </p>
              </div>
              <button className="btn btn-primary" onClick={handleSaveWarehouse}>
                <Save size={15} /> حفظ التعديلات
              </button>
            </div>
            <div className="panel-body">
              <div className="form-grid">
                <label className="label">
                  اسم المستودع
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </label>
                <label className="label">
                  الرمز التعريفي (Code)
                  <input
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  />
                </label>
                <label className="label">
                  النوع
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                  >
                    <option value="dry">جاف (Dry)</option>
                    <option value="chilled">مبرد (Chilled)</option>
                    <option value="frozen">مجمّد (Frozen)</option>
                  </select>
                </label>
                <label className="label">
                  نطاق درجة الحرارة
                  <input
                    value={editForm.target_temperature}
                    onChange={(e) => setEditForm({ ...editForm, target_temperature: e.target.value })}
                    placeholder="مثال: 2°C إلى 6°C"
                  />
                </label>
                <label className="label">
                  المساحة التخزينية (م²)
                  <input
                    type="number"
                    value={editForm.capacity_sqm}
                    onChange={(e) => setEditForm({ ...editForm, capacity_sqm: Number(e.target.value) })}
                  />
                </label>
                <label className="label">
                  مسؤول المستودع
                  <input
                    value={editForm.manager_name}
                    onChange={(e) => setEditForm({ ...editForm, manager_name: e.target.value })}
                    placeholder="اسم أمين المستودع"
                  />
                </label>
                <label className="label">
                  هاتف التواصل
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="رقم هاتف المستودع"
                  />
                </label>
                <label className="label">
                  العنوان / الموقع الجغرافي
                  <input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="المدينة، الحي، رقم البوابة"
                  />
                </label>
                <label className="label full">
                  ملاحظات التشغيل وبروتوكول التخزين
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="إجراءات التبريد، شروط الرطوبة والتهوية..."
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Locations Section */}
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>المواقع التخزينية داخل المستودع ({locations.length})</h3>
                <p>ممرات، أرفف، وحجيرات التخزين الدقيقة (Aisle - Rack - Shelf - Bin)</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowNewLocationModal(true)}>
                <Plus size={15} /> إضافة موقع جديد
              </button>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>رمز الموقع</th>
                    <th>الممر (Aisle)</th>
                    <th>الرف (Rack)</th>
                    <th>المستوى (Shelf)</th>
                    <th>الحاوية (Bin)</th>
                    <th>الكود الكامل</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 24, opacity: 0.7 }}>
                        لا توجد مواقع مسجلة داخل هذا المستودع بعد. اضغط "إضافة موقع جديد" لتهيئة مواقع التخزين.
                      </td>
                    </tr>
                  ) : (
                    locations.map((loc) => (
                      <tr key={loc.id}>
                        <td className="amount" style={{ fontWeight: 600 }}>{loc.code}</td>
                        <td>{loc.aisle || "-"}</td>
                        <td>{loc.rack || "-"}</td>
                        <td>{loc.shelf || "-"}</td>
                        <td>{loc.bin || "-"}</td>
                        <td style={{ fontFamily: 'monospace', direction: 'ltr', textAlign: 'right' }}>
                          {loc.full_code}
                        </td>
                        <td>
                          <StatusPill status={loc.is_active ? "نشط" : "معلق"} />
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', color: 'var(--color-danger, #ef4444)' }}
                            onClick={() => handleDeleteLocation(loc.id)}
                            title="حذف الموقع"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
          <p>يرجى اختيار مستودع من القائمة الجانبية أو إنشاء مستودع جديد.</p>
        </div>
      )}

      {/* Modal: New Warehouse */}
      {showNewWarehouseModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="panel" style={{ width: 540, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-head">
              <h3>مستودع جديد</h3>
              <button className="btn btn-ghost" onClick={() => setShowNewWarehouseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="panel-body">
              <div className="form-grid">
                <label className="label">
                  اسم المستودع *
                  <input
                    required
                    value={newWarehouseForm.name}
                    onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, name: e.target.value })}
                    placeholder="مثال: مستودع المجمدات المركزي"
                  />
                </label>
                <label className="label">
                  الرمز التعريفي (Code) *
                  <input
                    required
                    value={newWarehouseForm.code}
                    onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, code: e.target.value })}
                    placeholder="WH-03"
                  />
                </label>
                <label className="label">
                  النوع
                  <select
                    value={newWarehouseForm.type}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setNewWarehouseForm({
                        ...newWarehouseForm,
                        type: t,
                        target_temperature: t === 'frozen' ? '-18°C إلى -22°C' : t === 'chilled' ? '2°C إلى 6°C' : '20°C إلى 25°C',
                      });
                    }}
                  >
                    <option value="dry">جاف (Dry)</option>
                    <option value="chilled">مبرد (Chilled)</option>
                    <option value="frozen">مجمّد (Frozen)</option>
                  </select>
                </label>
                <label className="label">
                  نطاق درجة الحرارة
                  <input
                    value={newWarehouseForm.target_temperature}
                    onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, target_temperature: e.target.value })}
                  />
                </label>
                <label className="label">
                  المساحة (م²)
                  <input
                    type="number"
                    value={newWarehouseForm.capacity_sqm}
                    onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, capacity_sqm: Number(e.target.value) })}
                  />
                </label>
                <label className="label">
                  أمين المستودع
                  <input
                    value={newWarehouseForm.manager_name}
                    onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, manager_name: e.target.value })}
                  />
                </label>
                <label className="label full">
                  ملاحظات
                  <textarea
                    value={newWarehouseForm.notes}
                    onChange={(e) => setNewWarehouseForm({ ...newWarehouseForm, notes: e.target.value })}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewWarehouseModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  إنشاء المستودع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Location */}
      {showNewLocationModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="panel" style={{ width: 480, maxWidth: '95vw' }}>
            <div className="panel-head">
              <h3>إضافة موقع تخزين في {currentWarehouse?.name}</h3>
              <button className="btn btn-ghost" onClick={() => setShowNewLocationModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateLocation} className="panel-body">
              <div className="form-grid">
                <label className="label full">
                  رمز الموقع الداخلي *
                  <input
                    required
                    value={newLocationForm.code}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, code: e.target.value })}
                    placeholder="A-01 أو R1-S2"
                  />
                </label>
                <label className="label">
                  الممر (Aisle)
                  <input
                    value={newLocationForm.aisle}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, aisle: e.target.value })}
                    placeholder="A"
                  />
                </label>
                <label className="label">
                  الرف (Rack)
                  <input
                    value={newLocationForm.rack}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, rack: e.target.value })}
                    placeholder="01"
                  />
                </label>
                <label className="label">
                  المستوى (Shelf)
                  <input
                    value={newLocationForm.shelf}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, shelf: e.target.value })}
                    placeholder="01"
                  />
                </label>
                <label className="label">
                  الحاوية (Bin)
                  <input
                    value={newLocationForm.bin}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, bin: e.target.value })}
                    placeholder="01"
                  />
                </label>
                <label className="label full">
                  ملاحظات
                  <input
                    value={newLocationForm.notes}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, notes: e.target.value })}
                    placeholder="أرفف سفلية، مواد حساسة..."
                  />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewLocationModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  إضافة الموقع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className="toast"
          style={{
            position: 'fixed', bottom: 24, left: 24, padding: '12px 20px',
            borderRadius: 8, zIndex: 2000, color: '#fff',
            backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};
