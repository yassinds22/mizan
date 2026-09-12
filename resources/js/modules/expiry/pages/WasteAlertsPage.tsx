import React, { useState, useEffect, useMemo } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  FileText,
  Plus,
  Save,
  Trash2,
  Thermometer,
  Warehouse as WarehouseIcon,
  Clock,
  ShieldAlert,
  ArrowRightLeft,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { inventoryApi, ItemBatch, StockMovement, StockBalance } from "@/api/inventory";
import { productsApi, Item } from "@/api/products";
import { warehousesApi, Warehouse, WarehouseLocation } from "@/api/warehouses";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";
import { useBaseCurrency } from "../../../utils/currency";

interface WasteAlertsPageProps {
  onOpenFefo?: () => void;
  onOpenPurchase?: () => void;
  onOpenMove?: () => void;
}

export const WasteAlertsPage: React.FC<WasteAlertsPageProps> = ({
  onOpenFefo,
  onOpenPurchase,
  onOpenMove,
}) => {
  const { currencySymbol } = useBaseCurrency();
  // Master Lists
  const [items, setItems] = useState<Item[]>([]);
  const [batches, setBatches] = useState<ItemBatch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [wasteMovements, setWasteMovements] = useState<StockMovement[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [viewModalMovement, setViewModalMovement] = useState<StockMovement | null>(null);

  // New Waste Report Form State
  const [formItemId, setFormItemId] = useState<number | null>(null);
  const [formBatchId, setFormBatchId] = useState<number | null>(null);
  const [formWarehouseId, setFormWarehouseId] = useState<number | null>(null);
  const [formLocationId, setFormLocationId] = useState<number | null>(null);
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formUnitCost, setFormUnitCost] = useState<number>(0);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formReason, setFormReason] = useState<string>("انتهاء الصلاحية وتلف الأغذية");
  const [formInspector, setFormInspector] = useState<string>("أمين المستودع ومشرف الجودة");
  const [formNotes, setFormNotes] = useState<string>("");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load all foundational data
  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, batchesRes, whsRes, movsRes] = await Promise.all([
        productsApi.getItems({ per_page: 100, is_active: true }),
        inventoryApi.listBatches({ fefo: true }),
        warehousesApi.list(true),
        inventoryApi.listMovements({ type: "waste" }),
      ]);

      setItems(itemsRes.data);
      setBatches(batchesRes);
      setWarehouses(whsRes);
      setWasteMovements(movsRes.filter((m) => m.type === "waste"));

      if (itemsRes.data.length > 0 && !formItemId) {
        setFormItemId(itemsRes.data[0].id);
      }
      if (whsRes.length > 0 && !formWarehouseId) {
        setFormWarehouseId(whsRes[0].id);
      }
    } catch (err: any) {
      showToast(err.message || "فشل تحميل بيانات الهدر والتنبيهات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When Warehouse changes, load its locations
  useEffect(() => {
    if (!formWarehouseId) {
      setLocations([]);
      setFormLocationId(null);
      return;
    }
    warehousesApi.listLocations(formWarehouseId).then((locs) => {
      setLocations(locs);
      setFormLocationId(locs.length > 0 ? locs[0].id : null);
    }).catch(() => setLocations([]));
  }, [formWarehouseId]);

  // When Item changes, load item balances & batches
  useEffect(() => {
    if (!formItemId) {
      setBalances([]);
      return;
    }
    inventoryApi.listBalances({ item_id: formItemId, in_stock_only: 1 }).then((bals) => {
      setBalances(bals);
    }).catch(() => setBalances([]));

    // Find first batch for this item
    const itemBatches = batches.filter((b) => b.item_id === formItemId);
    if (itemBatches.length > 0) {
      setFormBatchId(itemBatches[0].id);
      setFormUnitCost(Number(itemBatches[0].unit_cost) || 0);
    } else {
      setFormBatchId(null);
      const item = items.find((i) => i.id === formItemId);
      setFormUnitCost(Number(item?.cost_price) || 0);
    }
  }, [formItemId, batches]);

  // When Batch changes, update cost
  useEffect(() => {
    if (formBatchId) {
      const b = batches.find((x) => x.id === formBatchId);
      if (b) {
        setFormUnitCost(Number(b.unit_cost) || 0);
      }
    }
  }, [formBatchId, batches]);

  // Available quantity in the selected coordinates
  const currentAvailableBalance = useMemo(() => {
    const matched = balances.find(
      (b) =>
        b.item_id === formItemId &&
        b.warehouse_id === formWarehouseId &&
        (formBatchId ? b.batch_id === formBatchId : true) &&
        (formLocationId ? b.location_id === formLocationId : true)
    );
    return matched ? Number(matched.available_quantity) : 0;
  }, [balances, formItemId, formWarehouseId, formBatchId, formLocationId]);

  // Critical alerts: Expired batches or <= 5 days
  const criticalWasteBatches = useMemo(() => {
    return batches.filter((b) => {
      const days = b.days_until_expiry ?? 999;
      return b.is_expired || days <= 5;
    });
  }, [batches]);

  // Prepopulate form from an alert card
  const handlePrepopulateFromAlert = (b: ItemBatch) => {
    setFormItemId(b.item_id);
    setFormBatchId(b.id);
    const firstWh = b.warehouses && b.warehouses.length > 0 ? b.warehouses[0] : null;
    if (firstWh) {
      setFormWarehouseId(firstWh.warehouse_id);
      setFormLocationId(firstWh.location_id || null);
      setFormQuantity(Math.max(1, Number(firstWh.available_quantity || 1)));
    }
    setFormUnitCost(Number(b.unit_cost) || 0);
    setFormReason(b.is_expired ? "انتهاء تاريخ الصلاحية الفعلي" : "قرب انتهاء الصلاحية الشديد وتلف متوقع");
    showToast(`تم تجهيز محضر إتلاف للدفعة: ${b.batch_number}`);
  };

  // Submit Waste Report (Draft or Direct Post)
  const handleSubmitWasteReport = async (autoPost: boolean) => {
    if (!formItemId || !formWarehouseId) {
      showToast("يرجى تحديد الصنف والمستودع", "error");
      return;
    }
    if (formQuantity <= 0) {
      showToast("الكمية التالفة يجب أن تكون أكبر من صفر", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        movement_type: "waste" as const,
        type: "waste" as const,
        movement_date: formDate,
        from_warehouse_id: formWarehouseId,
        to_warehouse_id: null,
        reason: `${formReason} - لجنة الفحص: ${formInspector}`,
        notes: formNotes,
        auto_post: autoPost,
        lines: [
          {
            item_id: formItemId,
            from_location_id: formLocationId || null,
            batch_id: formBatchId || null,
            quantity: Number(formQuantity),
            unit_cost: Number(formUnitCost) || 0,
            notes: `محضر إتلاف رسمي: ${formReason}`,
          },
        ],
      };

      const created = await inventoryApi.createMovement(payload);
      if (autoPost) {
        showToast(
          `تم اعتماد وترحيل محضر الإتلاف ${created.movement_number} بنجاح (قيد محاسبي #${created.journal_entry?.entry_number || "-"})`
        );
      } else {
        showToast(`تم حفظ محضر الإتلاف ${created.movement_number} كمسودة للتدقيق والمراجعة`);
      }

      // Reload movements and balances
      const [movsRes, balsRes] = await Promise.all([
        inventoryApi.listMovements({ type: "waste" }),
        inventoryApi.listBalances({ item_id: formItemId, in_stock_only: 1 }),
      ]);
      setWasteMovements(movsRes.filter((m) => m.type === "waste"));
      setBalances(balsRes);
    } catch (err: any) {
      showToast(err.message || "فشل حفظ محضر الإتلاف", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Approve & Post a draft waste movement
  const handleApproveDraft = async (movementId: number) => {
    try {
      setSubmitting(true);
      const posted = await inventoryApi.postMovement(movementId);
      showToast(
        `تم اعتماد وترحيل محضر الإتلاف ${posted.movement_number} وقيده محاسبياً بنجاح!`
      );
      loadData();
    } catch (err: any) {
      showToast(err.message || "فشل ترحيل محضر الإتلاف", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel / Reject a draft waste movement
  const handleCancelDraft = async (movementId: number) => {
    if (!window.confirm("هل أنت متأكد من رغبتك بإلغاء محضر الإتلاف هذا؟")) return;
    try {
      setSubmitting(true);
      await inventoryApi.cancelMovement(movementId, "رفض محضر الإتلاف من المشرف");
      showToast("تم إلغاء محضر الإتلاف بنجاح");
      loadData();
    } catch (err: any) {
      showToast(err.message || "فشل إلغاء محضر الإتلاف", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs
  const draftReports = wasteMovements.filter((m) => m.status === "draft");
  const postedReports = wasteMovements.filter((m) => m.status === "posted");
  const totalApprovedWasteValue = postedReports.reduce((sum, m) => sum + Number(m.total_amount || 0), 0);

  const selectedItemObj = items.find((i) => i.id === formItemId);
  const selectedBatchObj = batches.find((b) => b.id === formBatchId);
  const totalWasteCost = Number(formQuantity || 0) * Number(formUnitCost || 0);

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Top Metrics Cards */}
      <div className="grid grid-3">
        <div className="kpi danger">
          <h3>تنبيهات حرجة فورية</h3>
          <div className="value" style={{ fontSize: 28 }}>
            {criticalWasteBatches.length} <span style={{ fontSize: 13, fontWeight: "normal" }}>دفعة</span>
          </div>
          <div className="hint">انتهت أو أقل من 5 أيام صلاحية</div>
        </div>

        <div className="kpi warm">
          <h3>محاضر قيد المراجعة والتدقيق</h3>
          <div className="value" style={{ fontSize: 28 }}>
            {draftReports.length} <span style={{ fontSize: 13, fontWeight: "normal" }}>محضر مسودة</span>
          </div>
          <div className="hint">تتطلب اعتماد المشرف للترحيل المالي</div>
        </div>

        <div className="kpi info">
          <h3>إجمالي الهدر المعتمد والمثبت</h3>
          <div className="value" style={{ fontSize: 26 }}>
            {money(totalApprovedWasteValue)}
          </div>
          <div className="hint">مقيد محاسبياً على حساب التالف 5130</div>
        </div>
      </div>

      {/* Section 1: Immediate Critical Spoilage Alerts */}
      {criticalWasteBatches.length > 0 && (
        <section className="panel" style={{ borderRight: "4px solid #ef4444" }}>
          <div className="panel-head">
            <div>
              <h3 style={{ color: "#b91c1c", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertOctagon size={18} /> تنبيهات مواد غذائية منتهية أو قاربت على التلف الفوري
              </h3>
              <p>تتطلب إجراءً إدارياً عاجلاً: إما إتلاف معتمد لمنع التداول، أو حجر مخبري</p>
            </div>
            <button className="btn btn-ghost" onClick={onOpenFefo}>
              فحص إمكانية FEFO
            </button>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>الدفعة</th>
                  <th>الصنف</th>
                  <th>المستودع والموقع</th>
                  <th>الكمية المعرضة</th>
                  <th>تاريخ الصلاحية</th>
                  <th>الحالة</th>
                  <th>إجراء فوري</th>
                </tr>
              </thead>
              <tbody>
                {criticalWasteBatches.map((b) => {
                  const days = b.days_until_expiry ?? 999;
                  const totalQty = b.current_quantity ?? 0;
                  const whStr = (b.warehouses || [])
                    .map((w) => `${w.warehouse_name} (${w.available_quantity})`)
                    .join(" · ");

                  return (
                    <tr key={b.id}>
                      <td className="amount" style={{ fontWeight: 600 }}>{b.batch_number}</td>
                      <td>
                        <strong>{b.item?.name_ar || "-"}</strong>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{b.item?.sku}</div>
                      </td>
                      <td>{whStr || "المستودع الرئيسي"}</td>
                      <td className="amount" style={{ fontWeight: 700, color: "#ef4444" }}>
                        {Number(totalQty).toLocaleString()} {b.item?.base_uom?.name_ar || "وحدة"}
                      </td>
                      <td>{b.expiry_date?.split("T")[0]}</td>
                      <td>
                        <span className="pill pill-danger">
                          {b.is_expired || days < 0 ? "منتهية الصلاحية" : `متبقي ${days} أيام فقط`}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-warn"
                          style={{ padding: "3px 8px", fontSize: 11 }}
                          onClick={() => handlePrepopulateFromAlert(b)}
                        >
                          تجهيز محضر إتلاف
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Section 2: Formal Waste Inspection Form & Impact Preview */}
      <div className="grid grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>إعداد محضر إتلاف مواد غذائية</h3>
              <p>دورة تدقيق مستندية معتمدة: فحص · مراجعة · ترحيل محاسبي</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                الصنف الغذائي *
                <select
                  value={formItemId || ""}
                  onChange={(e) => setFormItemId(Number(e.target.value))}
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name_ar} ({it.sku})
                    </option>
                  ))}
                </select>
              </label>

              <label className="label">
                الدفعة / التشغيلة *
                <select
                  value={formBatchId || ""}
                  onChange={(e) => setFormBatchId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">بدون تشغيلة محددة</option>
                  {batches
                    .filter((b) => b.item_id === formItemId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batch_number} — ينتهي: {b.expiry_date?.split("T")[0]}
                      </option>
                    ))}
                </select>
              </label>

              <label className="label">
                المستودع *
                <select
                  value={formWarehouseId || ""}
                  onChange={(e) => setFormWarehouseId(Number(e.target.value))}
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
                  value={formLocationId || ""}
                  onChange={(e) => setFormLocationId(e.target.value ? Number(e.target.value) : null)}
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
                الكمية التالفة المطلوب إتلافها *
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(Number(e.target.value))}
                />
              </label>

              <label className="label">
                تكلفة {selectedItemObj?.base_uom?.name_ar || "الوحدة"} الواحد ({currencySymbol})
                <input
                  type="number"
                  step="0.01"
                  value={formUnitCost}
                  onChange={(e) => setFormUnitCost(Number(e.target.value))}
                />
              </label>

              <label className="label">
                تاريخ المعاينة والإتلاف
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </label>

              <label className="label">
                السبب النظامي للإتلاف *
                <select value={formReason} onChange={(e) => setFormReason(e.target.value)}>
                  <option value="انتهاء الصلاحية وتلف الأغذية">انتهاء الصلاحية وتلف الأغذية</option>
                  <option value="سوء تخزين وانحراف درجة التبريد">سوء تخزين وانحراف درجة التبريد</option>
                  <option value="كسر وتلف عبوات أثناء المناولة">كسر وتلف عبوات أثناء المناولة</option>
                  <option value="عينات فحص مخبري وتذوق تالفة">عينات فحص مخبري وتذوق تالفة</option>
                </select>
              </label>

              <label className="label">
                المشرف / لجنة الفحص والإتلاف
                <input
                  value={formInspector}
                  onChange={(e) => setFormInspector(e.target.value)}
                  placeholder="أسماء أعضاء اللجنة"
                />
              </label>

              <label className="label full">
                ملاحظات ورقم المحضر الورقي
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="رقم المحضر الرسمي، إفادة أمين المستودع، طريقة التخلص الآمن..."
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => handleSubmitWasteReport(false)}
              >
                <Save size={15} /> حفظ كمسودة للتدقيق
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={() => handleSubmitWasteReport(true)}
              >
                <CheckCircle2 size={15} /> اعتماد وترحيل فوري
              </button>
            </div>
          </div>
        </section>

        {/* Real-time Financial & Audit Preview */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>الأثر المحاسبي والتدقيقي لمحضر الإتلاف</h3>
              <p>معاينة القيود المزدوجة قبل الترحيل النهائي</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="stat-row">
              <span>نوع المستند</span>
              <strong>سند إتلاف مخزني معتمد (Food Spoilage & Waste)</strong>
            </div>
            <div className="stat-row">
              <span>الصنف والتشغيلة</span>
              <strong>
                {selectedItemObj?.name_ar || "-"} · {selectedBatchObj?.batch_number || "بدون دفعة"}
              </strong>
            </div>
            <div className="stat-row">
              <span>الرصيد المتاح الحالي</span>
              <strong style={{ color: currentAvailableBalance >= formQuantity ? "#10b981" : "#ef4444" }}>
                {currentAvailableBalance.toLocaleString()} {selectedItemObj?.base_uom?.name_ar || "وحدة"}
              </strong>
            </div>
            <div className="stat-row">
              <span>إجمالي قيمة الخسارة المحققة</span>
              <strong style={{ fontSize: 18, color: "#dc2626" }}>
                {totalWasteCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </strong>
            </div>

            <div style={{ marginTop: 16, borderTop: "1px solid var(--color-border, #e5e7eb)", paddingTop: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>القيد المحاسبي المتولد آلياً في دفتر اليومية:</div>
              <div style={{ fontSize: 12, padding: "10px 12px", background: "var(--color-bg-subtle, rgba(0,0,0,0.03))", borderRadius: 6, lineHeight: 1.7 }}>
                <div>• <strong>مدين (Debit):</strong> 5130 تالف وفوائد الأغذية ومنتهية الصلاحية — {totalWasteCost.toFixed(2)} {currencySymbol}</div>
                <div>• <strong>دائن (Credit):</strong> 1131 مخزون المواد الغذائية — {totalWasteCost.toFixed(2)} {currencySymbol}</div>
              </div>
            </div>

            <div className="alert-list" style={{ marginTop: 16 }}>
              <div className="alert-item">
                <ShieldAlert size={18} />
                <div>
                  <strong>الأثر على قائمة الدخل (P&L Impact)</strong>
                  <span>
                    يُثبت هذا السند خسارة تشغيلية مباشرة في قائمة الدخل لحفظ عدالة الأرقام المحاسبية، ويخصم الكمية من رصيد المستودع ودفتر أستاذ المخزون التاريخي فور الترحيل.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 3: Draft Waste Reports Pending Review */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>محاضر الإتلاف قيد المراجعة والتدقيق ({draftReports.length})</h3>
            <p>تتطلب موافقة المشرف لاعتماد خصم المخزون وإنشاء القيد المحاسبي</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>رقم المحضر</th>
                <th>التاريخ</th>
                <th>المستودع</th>
                <th>السبب / اللجنة</th>
                <th>القيمة الإجمالية</th>
                <th>الحالة</th>
                <th>إجراءات الاعتماد</th>
              </tr>
            </thead>
            <tbody>
              {draftReports.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24, opacity: 0.7 }}>
                    لا توجد محاضر إتلاف مسودة قيد الانتظار حالياً.
                  </td>
                </tr>
              ) : (
                draftReports.map((m) => (
                  <tr key={m.id}>
                    <td className="amount" style={{ fontWeight: 600 }}>{m.movement_number}</td>
                    <td>{m.movement_date}</td>
                    <td>{m.from_warehouse?.name || "-"}</td>
                    <td>{m.reason || "-"}</td>
                    <td className="amount" style={{ color: "#dc2626", fontWeight: 600 }}>
                      {money(Number(m.total_amount || 0))}
                    </td>
                    <td>
                      <StatusPill status="مسودة" />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          disabled={submitting}
                          onClick={() => handleApproveDraft(m.id)}
                        >
                          <CheckCircle2 size={13} /> اعتماد وترحيل
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", fontSize: 11, color: "#ef4444" }}
                          disabled={submitting}
                          onClick={() => handleCancelDraft(m.id)}
                        >
                          <XCircle size={13} /> إلغاء
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() => setViewModalMovement(m)}
                        >
                          عرض
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: Approved & Posted Waste Archive */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>سجل محاضر الإتلاف المعتمدة والمرحلة ({postedReports.length})</h3>
            <p>سجل أرشيفي وتدقيقي لمحاضر الإتلاف المنفذة والمقيدة في دفتر اليومية العام</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>رقم السند</th>
                <th>تاريخ الترحيل</th>
                <th>المستودع</th>
                <th>السبب والملاحظات</th>
                <th>إجمالي الخسارة</th>
                <th>القيد المحاسبي</th>
                <th>الحالة</th>
                <th>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {postedReports.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24, opacity: 0.7 }}>
                    لا توجد محاضر إتلاف مرحلة في السجل حتى الآن.
                  </td>
                </tr>
              ) : (
                postedReports.map((m) => (
                  <tr key={m.id}>
                    <td className="amount" style={{ fontWeight: 600 }}>{m.movement_number}</td>
                    <td>{m.movement_date}</td>
                    <td>{m.from_warehouse?.name || "-"}</td>
                    <td>{m.reason || "-"}</td>
                    <td className="amount" style={{ fontWeight: 600, color: "#dc2626" }}>
                      {money(Number(m.total_amount || 0))}
                    </td>
                    <td>
                      {m.journal_entry ? (
                        <span className="pill pill-ok" style={{ fontSize: 11 }}>
                          قيد اليومية #{m.journal_entry.entry_number}
                        </span>
                      ) : (
                        <span style={{ opacity: 0.5, fontSize: 11 }}>-</span>
                      )}
                    </td>
                    <td>
                      <StatusPill status="مرحل" />
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        onClick={() => setViewModalMovement(m)}
                      >
                        عرض
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* View Movement Modal */}
      {viewModalMovement && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 1000,
          }}
        >
          <div className="panel" style={{ width: 640, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="panel-head">
              <div>
                <h3>محضر إتلاف: {viewModalMovement.movement_number}</h3>
                <p>بتاريخ {viewModalMovement.movement_date} · <StatusPill status={viewModalMovement.status === "posted" ? "مرحل" : viewModalMovement.status === "draft" ? "مسودة" : "ملغي"} /></p>
              </div>
              <button className="btn btn-ghost" onClick={() => setViewModalMovement(null)}>✕</button>
            </div>
            <div className="panel-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
                <div>
                  <small style={{ opacity: 0.7 }}>المستودع:</small>
                  <div style={{ fontWeight: 600 }}>{viewModalMovement.from_warehouse?.name || "-"}</div>
                </div>
                <div>
                  <small style={{ opacity: 0.7 }}>القيد المحاسبي المرتبط:</small>
                  <div style={{ fontWeight: 600 }}>
                    {viewModalMovement.journal_entry ? `سند قيد #${viewModalMovement.journal_entry.entry_number}` : "لا يوجد (مسودة)"}
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <small style={{ opacity: 0.7 }}>السبب / اللجنة:</small>
                  <div style={{ fontWeight: 600 }}>{viewModalMovement.reason || "-"}</div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <small style={{ opacity: 0.7 }}>إجمالي الخسارة المالية:</small>
                  <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 18 }}>
                    {money(Number(viewModalMovement.total_amount || 0))}
                  </div>
                </div>
              </div>

              <h4>البنود المشمولة في محضر الإتلاف</h4>
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>الصنف</th>
                      <th>الدفعة</th>
                      <th>الموقع</th>
                      <th>الكمية التالفة</th>
                      <th>تكلفة الوحدة</th>
                      <th>الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewModalMovement.lines || []).map((l, i) => (
                      <tr key={i}>
                        <td>{l.item?.name_ar || `صنف #${l.item_id}`}</td>
                        <td>{l.batch?.batch_number || "-"}</td>
                        <td>{l.from_location?.code || "-"}</td>
                        <td className="amount">{Number(l.quantity).toLocaleString()}</td>
                        <td className="amount">{money(Number(l.unit_cost || 0))}</td>
                        <td className="amount">{money(Number(l.quantity) * Number(l.unit_cost || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
            backgroundColor: toast.type === "error" ? "#dc2626" : "#059669",
            boxShadow: "0 20px 35px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
            fontSize: 15,
            fontWeight: 600,
            maxWidth: "90vw",
            display: "flex",
            alignItems: "center",
            gap: 12,
            lineHeight: 1.5,
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          {toast.type === "error" ? <AlertOctagon size={22} /> : <CheckCircle2 size={22} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
