import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Clock,
  Filter,
  Search,
  ArrowRightLeft,
  Trash2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Plus,
  Edit3,
  Calendar,
  Save,
} from "lucide-react";
import { inventoryApi, ItemBatch } from "@/api/inventory";
import { productsApi, Item } from "@/api/products";
import { warehousesApi, Warehouse, WarehouseLocation } from "@/api/warehouses";
import { coreApi } from "@/api/core";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";

import { getCachedBaseCurrencySymbol } from "../../../utils/currency";

interface ExpiryPageProps {
  onOpenFefo?: () => void;
  onOpenWaste?: () => void;
}

export const ExpiryPage: React.FC<ExpiryPageProps> = ({
  onOpenFefo,
  onOpenWaste,
}) => {
  const [batches, setBatches] = useState<ItemBatch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState<string>(() => getCachedBaseCurrencySymbol());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState<"all" | "critical" | "warning" | "expired" | "safe">("all");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | "all">("all");
  const [toast, setToast] = useState<string | null>(null);

  // Modal States
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [newBatchForm, setNewBatchForm] = useState({
    item_id: 0,
    batch_number: "",
    production_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    warehouse_id: 1,
    location_id: null as number | null,
    initial_quantity: 50,
    unit_cost: 0,
    notes: "تسجيل تشغيلة جديدة من الكرتون",
  });

  const [editingBatch, setEditingBatch] = useState<ItemBatch | null>(null);
  const [editBatchForm, setEditBatchForm] = useState({
    batch_number: "",
    production_date: "",
    expiry_date: "",
    unit_cost: 0,
    notes: "",
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesRes, itemsRes, whsRes, currsRes] = await Promise.all([
        inventoryApi.listBatches({ fefo: true }),
        productsApi.getItems({ per_page: 100, is_active: true }),
        warehousesApi.list(true),
        coreApi.getCurrencies(),
      ]);
      setBatches(batchesRes);
      setItems(itemsRes.data);
      setWarehouses(whsRes);

      const baseCurr = currsRes.find((c) => c.is_base_currency) || currsRes[0];
      if (baseCurr) {
        const sym = baseCurr.symbol || baseCurr.code || "";
        setCurrencySymbol(sym);
        if (sym) localStorage.setItem("mizan_base_currency_symbol", sym);
      }

      if (itemsRes.data.length > 0 && newBatchForm.item_id === 0) {
        setNewBatchForm((prev) => ({
          ...prev,
          item_id: itemsRes.data[0].id,
          unit_cost: Number(itemsRes.data[0].cost_price) || 0,
        }));
      }
      if (whsRes.length > 0) {
        warehousesApi.listLocations(whsRes[0].id).then(setLocations).catch(() => setLocations([]));
      }
    } catch (err: any) {
      showToast(err.message || "فشل تحميل بيانات الصلاحية والدفعات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When Warehouse in new batch form changes, load its locations
  const handleWarehouseChange = (whId: number) => {
    setNewBatchForm((prev) => ({ ...prev, warehouse_id: whId, location_id: null }));
    warehousesApi.listLocations(whId).then(setLocations).catch(() => setLocations([]));
  };

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const days = b.days_until_expiry ?? 999;
      const isExpired = b.is_expired || days < 0;

      // Filter by risk category
      if (filterRisk === "expired" && !isExpired) return false;
      if (filterRisk === "critical" && (isExpired || days > 10)) return false;
      if (filterRisk === "warning" && (days <= 10 || days > 30)) return false;
      if (filterRisk === "safe" && (isExpired || days <= 30)) return false;

      // Filter by warehouse
      if (selectedWarehouseId !== "all") {
        const inWh = (b.warehouses || []).some((w) => w.warehouse_id === selectedWarehouseId);
        if (!inWh) return false;
      }

      // Filter by search
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const bNum = (b.batch_number || "").toLowerCase();
        const itemName = (b.item?.name_ar || "").toLowerCase();
        const itemSku = (b.item?.sku || "").toLowerCase();
        return bNum.includes(term) || itemName.includes(term) || itemSku.includes(term);
      }

      return true;
    });
  }, [batches, filterRisk, selectedWarehouseId, search]);

  // Derived KPI calculations
  const criticalCount = batches.filter((b) => (b.days_until_expiry ?? 999) <= 10 && !b.is_expired).length;
  const expiredCount = batches.filter((b) => b.is_expired || (b.days_until_expiry ?? 999) < 0).length;
  const warningCount = batches.filter((b) => {
    const d = b.days_until_expiry ?? 999;
    return d > 10 && d <= 30;
  }).length;

  const valueAtRisk = batches
    .filter((b) => (b.days_until_expiry ?? 999) <= 14)
    .reduce((sum, b) => sum + Number(b.total_value || (Number(b.current_quantity || 0) * Number(b.unit_cost || 0))), 0);

  const getRiskLabelAndColor = (b: ItemBatch) => {
    const days = b.days_until_expiry ?? 999;
    if (b.is_expired || days < 0) {
      return { label: "منتهي الصلاحية", status: "تالف" };
    }
    if (days <= 5) {
      return { label: "حرج جداً (≤ 5 أيام)", status: "حرج" };
    }
    if (days <= 10) {
      return { label: "حرج (≤ 10 أيام)", status: "حرج" };
    }
    if (days <= 30) {
      return { label: "قريب (≤ 30 يوم)", status: "منخفض" };
    }
    return { label: "آمن", status: "متوفر" };
  };

  // Submit New Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchForm.item_id || !newBatchForm.expiry_date) {
      showToast("يرجى تحديد الصنف وتاريخ انتهاء الصلاحية");
      return;
    }

    try {
      setSubmittingBatch(true);
      await inventoryApi.createBatch({
        item_id: newBatchForm.item_id,
        batch_number: newBatchForm.batch_number.trim() || undefined,
        production_date: newBatchForm.production_date || null,
        expiry_date: newBatchForm.expiry_date,
        unit_cost: Number(newBatchForm.unit_cost) || 0,
        warehouse_id: newBatchForm.warehouse_id,
        location_id: newBatchForm.location_id || undefined,
        initial_quantity: Number(newBatchForm.initial_quantity) || 0,
        notes: newBatchForm.notes,
      });

      showToast("تم تسجيل الدفعة وتاريخ الصلاحية الحقيقي بنجاح!");
      setShowNewBatchModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "فشل تسجيل الدفعة");
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Start Edit Batch
  const handleStartEdit = (b: ItemBatch) => {
    setEditingBatch(b);
    setEditBatchForm({
      batch_number: b.batch_number,
      production_date: b.production_date ? b.production_date.split("T")[0] : "",
      expiry_date: b.expiry_date ? b.expiry_date.split("T")[0] : "",
      unit_cost: Number(b.unit_cost) || 0,
      notes: b.notes || "",
    });
  };

  // Submit Edit Batch
  const handleSaveEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    try {
      setSubmittingBatch(true);
      await inventoryApi.updateBatch(editingBatch.id, {
        batch_number: editBatchForm.batch_number.trim() || undefined,
        production_date: editBatchForm.production_date || null,
        expiry_date: editBatchForm.expiry_date,
        unit_cost: Number(editBatchForm.unit_cost) || 0,
        notes: editBatchForm.notes,
      });

      showToast("تم تحديث تاريخ الصلاحية للدفعة بنجاح!");
      setEditingBatch(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "فشل تحديث الدفعة");
    } finally {
      setSubmittingBatch(false);
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Top Metrics Cards */}
      <div className="grid grid-3">
        <div className="kpi danger">
          <h3>دفعات عالية المخاطر</h3>
          <div className="value" style={{ fontSize: 28, display: "flex", alignItems: "baseline", gap: 8 }}>
            {criticalCount + expiredCount}
            <small style={{ fontSize: 13, fontWeight: "normal", opacity: 0.8 }}>
              ({expiredCount} منتهية · {criticalCount} وشيكة)
            </small>
          </div>
          <div className="hint">أقل من 10 أيام أو انتهت بالكامل</div>
        </div>

        <div className="kpi warm">
          <h3>قيمة معرضة للهدر والتلف</h3>
          <div className="value" style={{ fontSize: 26 }}>
            {money(valueAtRisk)}
          </div>
          <div className="hint">إجمالي تكلفة دفعات خلال أسبوعين</div>
        </div>

        <div className="kpi info">
          <h3>دفعات في دائرة المتابعة</h3>
          <div className="value" style={{ fontSize: 28 }}>
            {warningCount} <span style={{ fontSize: 13, fontWeight: "normal" }}>دفعة</span>
          </div>
          <div className="hint">صلاحيتها خلال 10 إلى 30 يوماً</div>
        </div>
      </div>

      {/* Main Operations Toolbar */}
      <div className="toolbar" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowNewBatchModal(true)}>
            <Plus size={15} /> تسجيل دفعة وصلاحية جديدة
          </button>
          <button className="btn btn-secondary" onClick={onOpenFefo}>
            <Sparkles size={15} /> إدارة FEFO
          </button>
          <button className="btn btn-warn" onClick={onOpenWaste}>
            <Trash2 size={15} /> محاضر الهدر
          </button>
          <button className="btn btn-ghost" onClick={loadData} title="تحديث البيانات">
            <RefreshCw size={15} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value as any)}
            style={{ padding: "6px 12px", borderRadius: 6 }}
          >
            <option value="all">كافة مستويات المخاطر</option>
            <option value="critical">حرجة فقط (≤ 10 أيام)</option>
            <option value="expired">منتهية الصلاحية فقط</option>
            <option value="warning">تنبيه متوسط (10-30 يوم)</option>
            <option value="safe">آمنة (&gt; 30 يوم)</option>
          </select>

          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value === "all" ? "all" : Number(e.target.value))}
            style={{ padding: "6px 12px", borderRadius: 6 }}
          >
            <option value="all">كافة المستودعات</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="بحث برقم الدفعة أو الصنف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingRight: 28 }}
            />
            <Search size={14} style={{ position: "absolute", right: 8, top: 10, opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Batches Table Panel */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>متابعة الدفعات والصلاحية (FEFO Tracking)</h3>
            <p>سجل تشغيلي لكافة التشغيلات الغذائية مرتبة تلقائياً وفق تاريخ الانتهاء الأقرب</p>
          </div>
          <button className="btn btn-ghost" onClick={onOpenFefo}>
            عرض تصفية وترويج FEFO
          </button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>رقم الدفعة</th>
                <th>الصنف الغذائي</th>
                <th>المستودع والموقع</th>
                <th>الكمية المتاحة</th>
                <th>تاريخ الصلاحية</th>
                <th>الأيام المتبقية</th>
                <th>القيمة الإجمالية ({currencySymbol})</th>
                <th>حالة المخاطر</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 24 }}>
                    جاري تحميل بيانات الصلاحية والدفعات...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 24, opacity: 0.7 }}>
                    لا توجد دفعات تطابق معايير البحث المحددة.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => {
                  const risk = getRiskLabelAndColor(b);
                  const totalQty = b.current_quantity ?? 0;
                  const totalVal = b.total_value ?? (totalQty * Number(b.unit_cost || 0));
                  const whLocations = (b.warehouses || [])
                    .map((w) => `${w.warehouse_name || w.warehouse_code} (${w.available_quantity})`)
                    .join(" · ");

                  return (
                    <tr key={b.id}>
                      <td className="amount" style={{ fontWeight: 600 }}>
                        {b.batch_number}
                      </td>
                      <td>
                        <strong>{b.item?.name_ar || "-"}</strong>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{b.item?.sku}</div>
                      </td>
                      <td>{whLocations || "المستودع الرئيسي"}</td>
                      <td className="amount" style={{ fontWeight: 600 }}>
                        {Number(totalQty).toLocaleString()} {b.item?.base_uom?.name_ar || "وحدة"}
                      </td>
                      <td style={{ fontWeight: 600 }}>{b.expiry_date?.split("T")[0]}</td>
                      <td className="amount">
                        <span style={{ fontWeight: 700, color: (b.days_until_expiry ?? 0) <= 10 ? "#ef4444" : "inherit" }}>
                          {(b.days_until_expiry ?? 0) < 0 ? `منتهي منذ ${Math.abs(b.days_until_expiry ?? 0)} يوم` : `${b.days_until_expiry} يوم`}
                        </span>
                      </td>
                      <td className="amount">{money(totalVal)} {currencySymbol}</td>
                      <td>
                        <StatusPill status={risk.status} />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "3px 6px" }}
                            title="تعديل تاريخ الانتهاء ورقم الدفعة"
                            onClick={() => handleStartEdit(b)}
                          >
                            <Edit3 size={13} />
                          </button>
                          {(b.days_until_expiry ?? 0) <= 0 ? (
                            <button
                              className="btn btn-warn"
                              style={{ padding: "3px 8px", fontSize: 11 }}
                              onClick={onOpenWaste}
                            >
                              محضر إتلاف
                            </button>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "3px 8px", fontSize: 11 }}
                              onClick={onOpenFefo}
                            >
                              تصفية FEFO
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: New Batch & Expiry Registration */}
      {showNewBatchModal && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 1000,
          }}
        >
          <div className="panel" style={{ width: 560, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="panel-head">
              <div>
                <h3>تسجيل دفعة وصلاحية جديدة من الكرتون</h3>
                <p>إدخال بيانات التشغيلة وتاريخ الانتهاء المطبوع على عبوة المنتج</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowNewBatchModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateBatch} className="panel-body">
              <div className="form-grid">
                <label className="label full">
                  الصنف الغذائي *
                  <select
                    required
                    value={newBatchForm.item_id}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const it = items.find((x) => x.id === id);
                      setNewBatchForm((prev) => ({
                        ...prev,
                        item_id: id,
                        unit_cost: Number(it?.cost_price) || 0,
                      }));
                    }}
                  >
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name_ar} ({it.sku})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="label">
                  رقم التشغيلة / الدفعة المطبوع (Batch No)
                  <input
                    placeholder="مثال: LOT-2027-01 أو اتركه لتوليد تلقائي"
                    value={newBatchForm.batch_number}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, batch_number: e.target.value })}
                  />
                </label>

                <label className="label">
                  تاريخ انتهاء الصلاحية المكتوب على الكرتون *
                  <input
                    type="date"
                    required
                    value={newBatchForm.expiry_date}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, expiry_date: e.target.value })}
                  />
                </label>

                <label className="label">
                  تاريخ الإنتاج (اختياري)
                  <input
                    type="date"
                    value={newBatchForm.production_date}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, production_date: e.target.value })}
                  />
                </label>

                <label className="label">
                  المستودع المستلم *
                  <select
                    value={newBatchForm.warehouse_id}
                    onChange={(e) => handleWarehouseChange(Number(e.target.value))}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="label">
                  موقع التخزين الداخلي
                  <select
                    value={newBatchForm.location_id || ""}
                    onChange={(e) =>
                      setNewBatchForm({
                        ...newBatchForm,
                        location_id: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  >
                    <option value="">الموقع الافتراضي</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code} ({loc.full_code})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="label">
                  الكمية المستلمة ({items.find((x) => x.id === newBatchForm.item_id)?.base_uom?.name_ar || "وحدة"}) *
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={newBatchForm.initial_quantity}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, initial_quantity: Number(e.target.value) })}
                  />
                </label>

                <label className="label">
                  تكلفة {items.find((x) => x.id === newBatchForm.item_id)?.base_uom?.name_ar || "الوحدة"} الواحد ({currencySymbol}) *
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newBatchForm.unit_cost}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, unit_cost: Number(e.target.value) })}
                  />
                  <div style={{ fontSize: 11, opacity: 0.8, color: "var(--color-primary, #3b82f6)", marginTop: 4 }}>
                    إجمالي القيمة: {(Number(newBatchForm.initial_quantity || 0) * Number(newBatchForm.unit_cost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                  </div>
                </label>

                <label className="label full">
                  ملاحظات الاستلام
                  <input
                    placeholder="رقم إذن الاستلام، المورد، فحص الجودة..."
                    value={newBatchForm.notes}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, notes: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowNewBatchModal(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingBatch}
                >
                  <Save size={15} /> {submittingBatch ? "جاري الحفظ..." : "حفظ الدفعة في المستودع"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Batch */}
      {editingBatch && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 1000,
          }}
        >
          <div className="panel" style={{ width: 500, maxWidth: "95vw" }}>
            <div className="panel-head">
              <div>
                <h3>تعديل بيانات التشغيلة: {editingBatch.batch_number}</h3>
                <p>{editingBatch.item?.name_ar}</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setEditingBatch(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEditBatch} className="panel-body">
              <div className="form-grid">
                <label className="label">
                  رقم التشغيلة (Batch Number)
                  <input
                    value={editBatchForm.batch_number}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, batch_number: e.target.value })}
                  />
                </label>

                <label className="label">
                  تاريخ الانتهاء المطبوع *
                  <input
                    type="date"
                    required
                    value={editBatchForm.expiry_date}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, expiry_date: e.target.value })}
                  />
                </label>

                <label className="label">
                  تاريخ الإنتاج
                  <input
                    type="date"
                    value={editBatchForm.production_date}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, production_date: e.target.value })}
                  />
                </label>

                <label className="label">
                  تكلفة الوحدة ({currencySymbol})
                  <input
                    type="number"
                    step="0.01"
                    value={editBatchForm.unit_cost}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, unit_cost: Number(e.target.value) })}
                  />
                </label>

                <label className="label full">
                  ملاحظات
                  <input
                    value={editBatchForm.notes}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, notes: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingBatch(null)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingBatch}
                >
                  <Save size={15} /> حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className="toast toast-center"
          style={{
            position: "fixed",
            top: "50%",
            bottom: "auto",
            left: "50%",
            right: "auto",
            transform: "translate(-50%, -50%)",
            width: "max-content",
            height: "auto",
            minHeight: "auto",
            padding: "14px 26px",
            borderRadius: 12,
            zIndex: 9999,
            color: "#fff",
            backgroundColor: "#059669",
            boxShadow: "0 20px 35px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
            fontSize: 15,
            fontWeight: 600,
            maxWidth: "90vw",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};
