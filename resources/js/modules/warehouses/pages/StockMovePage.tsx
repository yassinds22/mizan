import React, { useState, useEffect } from "react";
import { ArrowLeftRight, Save, Sparkles, AlertCircle, FileText, CheckCircle2, Clock } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { productsApi, Item } from "@/api/products";
import { warehousesApi, Warehouse, WarehouseLocation } from "@/api/warehouses";
import { inventoryApi, StockMovement, StockBalance, ItemBatch, MovementType } from "@/api/inventory";
import { useBaseCurrency } from "../../../utils/currency";

export const StockMovePage: React.FC = () => {
  const { currencySymbol } = useBaseCurrency();
  // Master lists
  const [itemsList, setItemsList] = useState<Item[]>([]);
  const [warehousesList, setWarehousesList] = useState<Warehouse[]>([]);
  const [fromLocations, setFromLocations] = useState<WarehouseLocation[]>([]);
  const [toLocations, setToLocations] = useState<WarehouseLocation[]>([]);
  const [itemBatches, setItemBatches] = useState<ItemBatch[]>([]);
  const [itemBalances, setItemBalances] = useState<StockBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Form State
  const [moveType, setMoveType] = useState<MovementType>("transfer");
  const [moveDate, setMoveDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [fromWarehouseId, setFromWarehouseId] = useState<number | null>(null);
  const [fromLocationId, setFromLocationId] = useState<number | null>(null);
  const [toWarehouseId, setToWarehouseId] = useState<number | null>(null);
  const [toLocationId, setToLocationId] = useState<number | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [reason, setReason] = useState<string>("إعادة توزيع");
  const [notes, setNotes] = useState<string>("");

  // UI / Action State
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [viewMovementModal, setViewMovementModal] = useState<StockMovement | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Initial Load: Items, Warehouses, Recent Movements
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [itemsRes, whsRes, movsRes] = await Promise.all([
          productsApi.getItems({ per_page: 100, is_active: true }),
          warehousesApi.list(true),
          inventoryApi.listMovements(),
        ]);

        setItemsList(itemsRes.data);
        setWarehousesList(whsRes);
        setMovements(movsRes);

        if (itemsRes.data.length > 0) {
          setSelectedItemId(itemsRes.data[0].id);
        }
        if (whsRes.length > 0) {
          setFromWarehouseId(whsRes[0].id);
          if (whsRes.length > 1) {
            setToWarehouseId(whsRes[1].id);
          }
        }
      } catch (err: any) {
        showToast(err.message || "فشل تحميل البيانات الأساسية", "error");
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // When From Warehouse changes, load its locations
  useEffect(() => {
    if (!fromWarehouseId) {
      setFromLocations([]);
      setFromLocationId(null);
      return;
    }
    warehousesApi.listLocations(fromWarehouseId).then((locs) => {
      setFromLocations(locs);
      setFromLocationId(locs.length > 0 ? locs[0].id : null);
    }).catch(() => setFromLocations([]));
  }, [fromWarehouseId]);

  // When To Warehouse changes, load its locations
  useEffect(() => {
    if (!toWarehouseId) {
      setToLocations([]);
      setToLocationId(null);
      return;
    }
    warehousesApi.listLocations(toWarehouseId).then((locs) => {
      setToLocations(locs);
      setToLocationId(locs.length > 0 ? locs[0].id : null);
    }).catch(() => setToLocations([]));
  }, [toWarehouseId]);

  // When Selected Item changes, load its Batches and Balances
  useEffect(() => {
    if (!selectedItemId) {
      setItemBatches([]);
      setItemBalances([]);
      setSelectedBatchId(null);
      return;
    }

    Promise.all([
      inventoryApi.listBatches({ item_id: selectedItemId, fefo: true }),
      inventoryApi.listBalances({ item_id: selectedItemId, in_stock_only: 1 }),
    ]).then(([batches, balances]) => {
      setItemBatches(batches);
      setItemBalances(balances);

      if (batches.length > 0) {
        // Auto-select earliest expiry batch
        setSelectedBatchId(batches[0].id);
        setUnitCost(Number(batches[0].unit_cost) || 0);
      } else {
        setSelectedBatchId(null);
        const item = itemsList.find((i) => i.id === selectedItemId);
        setUnitCost(Number(item?.cost_price) || 0);
      }
    }).catch((err) => console.error("Error fetching batches:", err));
  }, [selectedItemId]);

  // When selectedBatchId changes, update unitCost
  useEffect(() => {
    if (selectedBatchId) {
      const b = itemBatches.find((batch) => batch.id === selectedBatchId);
      if (b) {
        setUnitCost(Number(b.unit_cost) || 0);
      }
    }
  }, [selectedBatchId, itemBatches]);

  // Auto-align location & batch with available stock in the selected warehouse
  useEffect(() => {
    if (!selectedItemId || !fromWarehouseId || itemBalances.length === 0) return;

    const available = itemBalances.filter(
      (b) => b.item_id === selectedItemId && b.warehouse_id === fromWarehouseId && Number(b.available_quantity) > 0
    );

    if (available.length > 0) {
      // Pick the first available balance
      const top = available[0];
      if (top.batch_id) {
        setSelectedBatchId(top.batch_id);
      }
      if (top.location_id) {
        setFromLocationId(top.location_id);
      }
      if (top.unit_cost) {
        setUnitCost(Number(top.unit_cost));
      }
    }
  }, [fromWarehouseId, selectedItemId, itemBalances]);

  // FEFO Auto-Allocation Trigger
  const handleFefoAllocate = async () => {
    if (!selectedItemId) return;
    try {
      const res = await inventoryApi.allocateFefo(selectedItemId, quantity || 1, fromWarehouseId);
      if (res.allocations.length > 0) {
        const topAllocation = res.allocations[0];
        if (topAllocation.batch_id) {
          setSelectedBatchId(topAllocation.batch_id);
        }
        if (topAllocation.location_id) {
          setFromLocationId(topAllocation.location_id);
        }
        setUnitCost(topAllocation.unit_cost);
        showToast(
          `تم تخصيص الدفعة الأقرب صلاحية: ${topAllocation.batch_number || "افتراضي"} (تنتهي: ${topAllocation.expiry_date || "-"})`
        );
      } else {
        showToast("لا توجد أرصدة كافية في هذا المستودع للتخصيص", "error");
      }
    } catch (err: any) {
      showToast(err.message || "فشل تخصيص دفعات FEFO", "error");
    }
  };

  // Find currently available stock for selected combination
  const selectedBalance = itemBalances.find(
    (b) =>
      b.item_id === selectedItemId &&
      b.warehouse_id === fromWarehouseId &&
      (selectedBatchId ? b.batch_id === selectedBatchId : true) &&
      (fromLocationId ? b.location_id === fromLocationId : true)
  );
  const currentAvailableQty = selectedBalance ? Number(selectedBalance.available_quantity) : 0;

  // Submit and Post Movement
  const handleSubmitMovement = async () => {
    if (!selectedItemId || !fromWarehouseId) {
      showToast("يرجى تحديد الصنف ومستودع المصدر", "error");
      return;
    }
    if (moveType === "transfer" && !toWarehouseId) {
      showToast("يرجى تحديد مستودع الوجهة لحركة التحويل", "error");
      return;
    }
    if (moveType === "transfer" && fromWarehouseId === toWarehouseId) {
      showToast("لا يمكن التحويل لنفس المستودع بدون تحديد مواقع مختلفة", "error");
      return;
    }
    if (quantity <= 0) {
      showToast("الكمية يجب أن تكون أكبر من صفر", "error");
      return;
    }
    if (currentAvailableQty < quantity) {
      showToast(`الرصيد المتاح حالياً (${currentAvailableQty}) غير كافٍ لتحويل (${quantity}) وحدة من هذا الصنف والدفعة.`, "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        movement_type: moveType,
        type: moveType,
        movement_date: moveDate,
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: moveType === "transfer" ? toWarehouseId : null,
        reason,
        notes,
        auto_post: true, // Direct atomic GL & Stock ledger posting
        lines: [
          {
            item_id: selectedItemId,
            from_location_id: fromLocationId || null,
            to_location_id: moveType === "transfer" ? toLocationId || null : null,
            batch_id: selectedBatchId || null,
            quantity: Number(quantity),
            unit_cost: Number(unitCost) || 0,
            notes: `${reason} - ${notes}`,
          },
        ],
      };

      const created = await inventoryApi.createMovement(payload);
      showToast(
        `تم ترحيل الحركة ${created.movement_number} بنجاح! ${
          created.journal_entry ? `(القيد المحاسبي #${created.journal_entry.entry_number})` : ""
        }`
      );

      // Refresh movements list and balances
      const [updatedMovs, updatedBals] = await Promise.all([
        inventoryApi.listMovements(),
        inventoryApi.listBalances({ item_id: selectedItemId, in_stock_only: 1 }),
      ]);
      setMovements(updatedMovs);
      setItemBalances(updatedBals);
    } catch (err: any) {
      showToast(err.message || "فشل ترحيل حركة المخزون", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItem = itemsList.find((i) => i.id === selectedItemId);
  const selectedBatch = itemBatches.find((b) => b.id === selectedBatchId);
  const totalCost = Number(quantity || 0) * Number(unitCost || 0);

  // Helper labels
  const getMoveTypeLabel = (t: MovementType) => {
    switch (t) {
      case "transfer":
        return "تحويل داخلي";
      case "issue":
        return "صرف تشغيلي";
      case "waste":
        return "إهلاك هدر وتلف";
      case "adjustment":
        return "تسوية عجز جردي";
      default:
        return t;
    }
  };

  const getGlImpactLabel = () => {
    switch (moveType) {
      case "waste":
        return "مدين: 5130 تالف وفوائد الأغذية · دائن: 1131 المخزون";
      case "adjustment":
        return "مدين: 5140 فروقات وعجز الجرد · دائن: 1131 المخزون";
      case "issue":
        return "مدين: 5110 تكلفة المبيعات · دائن: 1131 المخزون";
      case "transfer":
      default:
        return "تحويل أصول مخزنية داخلية (لا يؤثر على الأرباح والخسائر P&L)";
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid grid-2">
        {/* Creation Form Panel */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>حركة مخزنية جديدة</h3>
              <p>تحويل داخلي · صرف · تسوية جردية · إهلاك هدر</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSubmitMovement}
              disabled={submitting}
            >
              <Save size={15} /> {submitting ? "جاري الترحيل..." : "ترحيل الحركة"}
            </button>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              {/* Movement Type */}
              <label className="label">
                نوع الحركة *
                <select
                  value={moveType}
                  onChange={(e) => setMoveType(e.target.value as MovementType)}
                >
                  <option value="transfer">تحويل داخلي (Transfer)</option>
                  <option value="issue">صرف تشغيلي (Issue)</option>
                  <option value="waste">إهلاك هدر وتلف (Waste)</option>
                  <option value="adjustment">تسوية عجز جردي (Adjustment)</option>
                </select>
              </label>

              {/* Movement Date */}
              <label className="label">
                تاريخ الحركة *
                <input
                  type="date"
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                />
              </label>

              {/* Item Selection */}
              <label className="label">
                الصنف الغذائي *
                <select
                  value={selectedItemId || ""}
                  onChange={(e) => setSelectedItemId(Number(e.target.value))}
                >
                  {itemsList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name_ar} ({item.sku})
                    </option>
                  ))}
                </select>
              </label>

              {/* Batch (FEFO) Selection */}
              <label className="label">
                الدفعة والصلاحية (FEFO)
                <div style={{ display: "flex", gap: 6 }}>
                  <select
                    style={{ flex: 1 }}
                    value={selectedBatchId || ""}
                    onChange={(e) => setSelectedBatchId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">بدون دفعة محددة</option>
                    {itemBatches.map((b) => {
                      const bBal = itemBalances.find(
                        (bal) => bal.item_id === selectedItemId && bal.warehouse_id === fromWarehouseId && bal.batch_id === b.id
                      );
                      const qty = bBal ? Number(bBal.available_quantity) : 0;
                      return (
                        <option key={b.id} value={b.id}>
                          {b.batch_number} — انتهاء: {b.expiry_date}
                          {qty > 0 ? ` (المتوفر هنا: ${qty})` : " (غير متوفر بهذا المستودع)"}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    title="تخصيص تلقائي للدفعة الأقرب انتهاءً وفق مبدأ FEFO"
                    onClick={handleFefoAllocate}
                    style={{ padding: "0 8px" }}
                  >
                    <Sparkles size={14} /> FEFO
                  </button>
                </div>
              </label>

              {/* Source Warehouse */}
              <label className="label">
                من مستودع *
                <select
                  value={fromWarehouseId || ""}
                  onChange={(e) => setFromWarehouseId(Number(e.target.value))}
                >
                  {warehousesList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </label>

              {/* Source Location */}
              <label className="label">
                من موقع التخزين (الممر / الرف)
                <select
                  value={fromLocationId || ""}
                  onChange={(e) => setFromLocationId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">الموقع الافتراضي</option>
                  {fromLocations.map((loc) => {
                    const locBal = itemBalances.find(
                      (bal) =>
                        bal.item_id === selectedItemId &&
                        bal.warehouse_id === fromWarehouseId &&
                        bal.location_id === loc.id &&
                        (selectedBatchId ? bal.batch_id === selectedBatchId : true)
                    );
                    const qty = locBal ? Number(locBal.available_quantity) : 0;
                    return (
                      <option key={loc.id} value={loc.id}>
                        {loc.code} ({loc.full_code})
                        {qty > 0 ? ` — متوفر: ${qty}` : " — فارغ (0)"}
                      </option>
                    );
                  })}
                </select>
              </label>

              {/* Destination Warehouse (only for transfer) */}
              <label className="label">
                إلى مستودع {moveType === "transfer" ? "*" : ""}
                <select
                  disabled={moveType !== "transfer"}
                  value={toWarehouseId || ""}
                  onChange={(e) => setToWarehouseId(Number(e.target.value))}
                >
                  <option value="">
                    {moveType === "transfer" ? "اختر مستودع الوجهة..." : "غير متاح (صرف/هدر خارج النظام)"}
                  </option>
                  {warehousesList
                    .filter((w) => w.id !== fromWarehouseId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                </select>
              </label>

              {/* Destination Location */}
              <label className="label">
                إلى موقع الوجهة
                <select
                  disabled={moveType !== "transfer"}
                  value={toLocationId || ""}
                  onChange={(e) => setToLocationId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">الموقع الافتراضي في الوجهة</option>
                  {toLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} ({loc.full_code})
                    </option>
                  ))}
                </select>
              </label>

              {/* Quantity */}
              <label className="label">
                الكمية المطلوبة ({itemsList.find((i) => i.id === selectedItemId)?.base_uom?.name_ar || "وحدة"}) *
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </label>

              {/* Reason */}
              <label className="label">
                السبب / الغرض
                <select value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="إعادة توزيع">إعادة توزيع بين المستودعات</option>
                  <option value="قرب انتهاء صلاحية">قرب انتهاء الصلاحية (FEFO)</option>
                  <option value="جرد / تسوية">تسوية فروقات جرد</option>
                  <option value="تلف وهدر">تلف أو سوء تخزين وتبريد</option>
                  <option value="صرف تشغيلي">صرف للتشغيل والمبيعات</option>
                </select>
              </label>

              {/* Unit Cost */}
              <label className="label">
                تكلفة {itemsList.find((i) => i.id === selectedItemId)?.base_uom?.name_ar || "الوحدة"} الواحد ({currencySymbol})
                <input
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                />
              </label>

              {/* Notes */}
              <label className="label full">
                ملاحظات وتفاصيل السند
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="رقم محضر الإتلاف، المرجع الخارجي، اسم المشرف المستلم..."
                />
              </label>
            </div>
          </div>
        </section>

        {/* Real-time Impact & Financial Preview Panel */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>ملخص الأثر المحاسبي والمخزني</h3>
              <p>معاينة دقيقة ومباشرة قبل الترحيل</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="stat-row">
              <span>نوع الحركة</span>
              <strong>{getMoveTypeLabel(moveType)}</strong>
            </div>
            <div className="stat-row">
              <span>الصنف والوحدة</span>
              <strong>
                {selectedItem?.name_ar || "-"} ({selectedItem?.base_uom?.name_ar || "وحدة"})
              </strong>
            </div>
            <div className="stat-row">
              <span>الرصيد المتاح حالياً</span>
              <strong style={{ color: currentAvailableQty >= quantity ? "var(--color-success, #10b981)" : "var(--color-danger, #ef4444)" }}>
                {currentAvailableQty.toLocaleString()} {selectedItem?.base_uom?.name_ar || "وحدة"}
              </strong>
            </div>
            <div className="stat-row">
              <span>الدفعة المحددة</span>
              <strong>
                {selectedBatch ? (
                  <span>
                    {selectedBatch.batch_number}{" "}
                    <small style={{ opacity: 0.8 }}>(تنتهي: {selectedBatch.expiry_date})</small>
                  </span>
                ) : (
                  "بدون تخصيص دفعة"
                )}
              </strong>
            </div>
            <div className="stat-row">
              <span>إجمالي القيمة التقديرية</span>
              <strong style={{ fontSize: 18, color: "var(--color-primary, #3b82f6)" }}>
                {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </strong>
            </div>

            <div style={{ marginTop: 16, borderTop: "1px solid var(--color-border, #e5e7eb)", paddingTop: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>الأثر المحاسبي في دفتر اليومية العام:</div>
              <div style={{ fontSize: 12, padding: "8px 12px", background: "var(--color-bg-subtle, rgba(0,0,0,0.03))", borderRadius: 6, lineHeight: 1.6 }}>
                {getGlImpactLabel()}
              </div>
            </div>

            <div className="alert-list" style={{ marginTop: 16 }}>
              <div className="alert-item">
                <ArrowLeftRight size={16} />
                <div>
                  <strong>تحديث الأرصدة ودفتر الأستاذ فورياً</strong>
                  <span>
                    الترحيل يولد قيود دفتر أستاذ المخزون (Stock Ledger) والقيد المحاسبي المزدوج تلقائيًا داخل معاملة ذرية متكاملة.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Movements Log Table */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>سجل حركات المخزون ({movements.length})</h3>
            <p>سجل تشغيلي ومحاسبي معتمد للحركات المنفذة</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>رقم الحركة</th>
                <th>النوع</th>
                <th>من مستودع</th>
                <th>إلى مستودع</th>
                <th>إجمالي القيمة</th>
                <th>القيد المحاسبي</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 24, opacity: 0.7 }}>
                    لا توجد حركات مخزنية مسجلة بعد. قم بإنشاء حركة جديدة وترحيلها.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id}>
                    <td className="amount" style={{ fontWeight: 600 }}>{m.movement_number}</td>
                    <td>
                      <StatusPill status={m.type_label || getMoveTypeLabel(m.type)} />
                    </td>
                    <td>{m.from_warehouse?.name || "-"}</td>
                    <td>{m.to_warehouse?.name || (m.type === "transfer" ? "-" : "خارجي")}</td>
                    <td className="amount">{Number(m.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {currencySymbol}</td>
                    <td>
                      {m.journal_entry ? (
                        <span className="pill pill-ok" style={{ fontSize: 11 }}>
                          قيد #{m.journal_entry.entry_number}
                        </span>
                      ) : (
                        <span style={{ opacity: 0.5, fontSize: 11 }}>بدون أثر P&L</span>
                      )}
                    </td>
                    <td>{m.movement_date}</td>
                    <td>
                      <StatusPill status={m.status_label || (m.status === "posted" ? "مرحّل" : m.status === "cancelled" ? "ملغي" : "مسودة")} />
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        onClick={() => setViewMovementModal(m)}
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

      {/* Movement Details Modal */}
      {viewMovementModal && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 1000,
          }}
        >
          <div className="panel" style={{ width: 680, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="panel-head">
              <div>
                <h3>وثيقة حركة المخزون: {viewMovementModal.movement_number}</h3>
                <p>بتاريخ {viewMovementModal.movement_date} · <StatusPill status={viewMovementModal.status_label || viewMovementModal.status} /></p>
              </div>
              <button className="btn btn-ghost" onClick={() => setViewMovementModal(null)}>✕</button>
            </div>
            <div className="panel-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                <div>
                  <small style={{ opacity: 0.7 }}>نوع الحركة:</small>
                  <div style={{ fontWeight: 600 }}>{viewMovementModal.type_label || viewMovementModal.type}</div>
                </div>
                <div>
                  <small style={{ opacity: 0.7 }}>من مستودع:</small>
                  <div style={{ fontWeight: 600 }}>{viewMovementModal.from_warehouse?.name || "-"}</div>
                </div>
                <div>
                  <small style={{ opacity: 0.7 }}>إلى مستودع:</small>
                  <div style={{ fontWeight: 600 }}>{viewMovementModal.to_warehouse?.name || "-"}</div>
                </div>
                <div>
                  <small style={{ opacity: 0.7 }}>القيد المحاسبي المرتبط:</small>
                  <div style={{ fontWeight: 600 }}>
                    {viewMovementModal.journal_entry ? `سند قيد #${viewMovementModal.journal_entry.entry_number}` : "لا يوجد (حركة داخلية)"}
                  </div>
                </div>
                <div>
                  <small style={{ opacity: 0.7 }}>السبب:</small>
                  <div style={{ fontWeight: 600 }}>{viewMovementModal.reason || "-"}</div>
                </div>
                <div>
                  <small style={{ opacity: 0.7 }}>إجمالي المبلغ:</small>
                  <div style={{ fontWeight: 600 }}>{Number(viewMovementModal.total_amount).toLocaleString()} {currencySymbol}</div>
                </div>
              </div>

              <h4>بنود الحركة ({viewMovementModal.lines?.length || 0})</h4>
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>الصنف</th>
                      <th>الدفعة</th>
                      <th>من موقع</th>
                      <th>إلى موقع</th>
                      <th>الكمية</th>
                      <th>التكلفة</th>
                      <th>الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewMovementModal.lines || []).map((line, idx) => (
                      <tr key={idx}>
                        <td>{line.item?.name_ar || `صنف #${line.item_id}`}</td>
                        <td>{line.batch?.batch_number || "-"}</td>
                        <td>{line.from_location?.code || "-"}</td>
                        <td>{line.to_location?.code || "-"}</td>
                        <td className="amount">{Number(line.quantity).toLocaleString()}</td>
                        <td className="amount">{Number(line.unit_cost).toFixed(2)} {currencySymbol}</td>
                        <td className="amount">{(Number(line.quantity) * Number(line.unit_cost)).toFixed(2)} {currencySymbol}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {viewMovementModal.notes && (
                <div style={{ marginTop: 12, padding: 8, background: "var(--color-bg-subtle, #f9fafb)", borderRadius: 6 }}>
                  <small style={{ opacity: 0.7 }}>ملاحظات:</small>
                  <p style={{ margin: 0, fontSize: 13 }}>{viewMovementModal.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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
          {toast.type === "error" ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
