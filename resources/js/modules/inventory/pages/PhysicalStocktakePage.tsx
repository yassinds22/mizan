import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardCheck,
  Plus,
  Save,
  Printer,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Eye,
  EyeOff,
  Barcode,
  Search,
  Lock,
  ArrowRight,
  ShieldCheck,
  Warehouse as WarehouseIcon,
  Layers,
  Sparkles,
  FileCheck2,
} from "lucide-react";
import {
  inventoryApi,
  PhysicalStocktake,
  PhysicalStocktakeLine,
  StocktakeStatus,
  UpdateCountLinePayload,
} from "@/api/inventory";
import { warehousesApi, Warehouse, WarehouseLocation } from "@/api/warehouses";
import { productsApi, ItemCategory } from "@/api/products";
import { StatusPill } from "@/components/ui/StatusPill";
import { useBaseCurrency } from "@/utils/currency";

export const PhysicalStocktakePage: React.FC = () => {
  const { currencySymbol } = useBaseCurrency();

  // Master Data
  const [stocktakes, setStocktakes] = useState<PhysicalStocktake[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [activeLocations, setActiveLocations] = useState<WarehouseLocation[]>([]);

  // Selected Stocktake Workspace
  const [currentStocktake, setCurrentStocktake] = useState<PhysicalStocktake | null>(null);

  // Local Count Editing State (line_id -> { counted_quantity, variance_reason, notes })
  const [countInputs, setCountInputs] = useState<Record<number, { counted: number; reason: string; notes: string }>>({});

  // UI Filters in workspace
  const [filterType, setFilterType] = useState<"all" | "shortage" | "surplus" | "matched">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [blindMode, setBlindMode] = useState<boolean>(false);

  // Modals & Actions
  const [loading, setLoading] = useState(true);
  const [savingCounts, setSavingCounts] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPostConfirmModal, setShowPostConfirmModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // New Stocktake Form
  const [newForm, setNewForm] = useState({
    warehouse_id: 1,
    location_id: "" as string | number,
    category_id: "" as string | number,
    stocktake_date: new Date().toISOString().split("T")[0],
    scope: "full" as "full" | "partial",
    is_blind: false,
    freeze_movements: true,
    supervisor_name: "أمين المستودع ومشرف الجرد",
    notes: "محضر جرد مخزني فعلي دوري",
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Initial List
  const loadStocktakes = async () => {
    try {
      setLoading(true);
      const [listRes, whsRes, catsRes] = await Promise.all([
        inventoryApi.listStocktakes(),
        warehousesApi.list(true),
        productsApi.getCategories(),
      ]);
      setStocktakes(listRes);
      setWarehouses(whsRes);
      setCategories(catsRes);
      if (whsRes.length > 0 && !newForm.warehouse_id) {
        setNewForm((prev) => ({ ...prev, warehouse_id: whsRes[0].id }));
      }
    } catch (err: any) {
      showToast(err.message || "فشل تحميل محاضر الجرد", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStocktakes();
  }, []);

  // When opening a stocktake workspace, initialize local counts
  const handleOpenStocktake = async (stk: PhysicalStocktake) => {
    try {
      setLoading(true);
      const full = await inventoryApi.getStocktake(stk.id);
      setCurrentStocktake(full);
      setBlindMode(Boolean(full.is_blind));

      // Populate countInputs map
      const initialMap: Record<number, { counted: number; reason: string; notes: string }> = {};
      (full.lines || []).forEach((line) => {
        initialMap[line.id] = {
          counted: Number(line.counted_quantity),
          reason: line.variance_reason || "",
          notes: line.notes || "",
        };
      });
      setCountInputs(initialMap);
    } catch (err: any) {
      showToast(err.message || "فشل فتح محضر الجرد", "error");
    } finally {
      setLoading(false);
    }
  };

  // Load locations when new form warehouse changes
  useEffect(() => {
    if (newForm.warehouse_id) {
      warehousesApi.listLocations(Number(newForm.warehouse_id)).then((locs) => {
        setActiveLocations(locs);
      }).catch(() => setActiveLocations([]));
    }
  }, [newForm.warehouse_id]);

  // Create New Stocktake
  const handleCreateStocktake = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const created = await inventoryApi.createStocktake({
        warehouse_id: Number(newForm.warehouse_id),
        location_id: newForm.location_id ? Number(newForm.location_id) : null,
        category_id: newForm.category_id ? Number(newForm.category_id) : null,
        stocktake_date: newForm.stocktake_date,
        scope: newForm.location_id ? "partial" : newForm.scope,
        is_blind: newForm.is_blind,
        freeze_movements: newForm.freeze_movements,
        supervisor_name: newForm.supervisor_name,
        notes: newForm.notes,
      });

      setShowNewModal(false);
      showToast(`تم فتح محضر الجرد ${created.stocktake_number} بنجاح!`);
      loadStocktakes();
      handleOpenStocktake(created);
    } catch (err: any) {
      showToast(err.message || "فشل فتح جلسة الجرد", "error");
    } finally {
      setLoading(false);
    }
  };

  // Update line count input locally
  const handleLineCountChange = (lineId: number, val: number) => {
    setCountInputs((prev) => ({
      ...prev,
      [lineId]: {
        ...(prev[lineId] || { reason: "", notes: "" }),
        counted: Math.max(0, val),
      },
    }));
  };

  // Update line variance reason locally
  const handleLineReasonChange = (lineId: number, reason: string) => {
    setCountInputs((prev) => ({
      ...prev,
      [lineId]: {
        ...(prev[lineId] || { counted: 0, notes: "" }),
        reason,
      },
    }));
  };

  // Quick match all remaining lines to book quantities
  const handleMatchAll = () => {
    if (!currentStocktake || currentStocktake.status === "posted") return;
    const updated = { ...countInputs };
    (currentStocktake.lines || []).forEach((line) => {
      updated[line.id] = {
        counted: Number(line.book_quantity),
        reason: "",
        notes: "مطابقة تلقائية للجرد",
      };
    });
    setCountInputs(updated);
    showToast("تمت مطابقة جميع الأصناف مع الأرصدة الدفترية!");
  };

  // Save Count Updates to Server
  const handleSaveCounts = async () => {
    if (!currentStocktake || currentStocktake.status === "posted") return;
    try {
      setSavingCounts(true);
      const payload: UpdateCountLinePayload[] = Object.entries(countInputs).map(([lineId, data]) => ({
        line_id: Number(lineId),
        counted_quantity: Number(data.counted),
        variance_reason: data.reason || null,
        notes: data.notes || null,
      }));

      const updated = await inventoryApi.updateStocktakeCounts(currentStocktake.id, payload);
      setCurrentStocktake(updated);
      showToast("تم حفظ وتحديث نتائج العد الميداني بنجاح!");
      loadStocktakes();
    } catch (err: any) {
      showToast(err.message || "فشل حفظ كميات العد", "error");
    } finally {
      setSavingCounts(false);
    }
  };

  // Post & Reconcile Stocktake
  const handleConfirmPost = async () => {
    if (!currentStocktake || currentStocktake.status === "posted") return;
    try {
      setPosting(true);
      // First ensure latest count updates are saved
      const payload: UpdateCountLinePayload[] = Object.entries(countInputs).map(([lineId, data]) => ({
        line_id: Number(lineId),
        counted_quantity: Number(data.counted),
        variance_reason: data.reason || null,
        notes: data.notes || null,
      }));
      await inventoryApi.updateStocktakeCounts(currentStocktake.id, payload);

      // Post and generate atomic GL & Stock adjustment
      const posted = await inventoryApi.postStocktake(currentStocktake.id);
      setCurrentStocktake(posted);
      setShowPostConfirmModal(false);
      showToast(`تم اعتماد وترحيل محضر الجرد ${posted.stocktake_number} بنجاح!`);
      loadStocktakes();
    } catch (err: any) {
      showToast(err.message || "فشل ترحيل واعتماد الجرد", "error");
    } finally {
      setPosting(false);
    }
  };

  // Filter lines for display
  const filteredLines = useMemo(() => {
    if (!currentStocktake || !currentStocktake.lines) return [];
    return currentStocktake.lines.filter((line) => {
      const liveCount = countInputs[line.id]?.counted ?? Number(line.counted_quantity);
      const bookQty = Number(line.book_quantity);
      const diff = liveCount - bookQty;

      // Filter by variance category
      if (filterType === "shortage" && diff >= -0.0001) return false;
      if (filterType === "surplus" && diff <= 0.0001) return false;
      if (filterType === "matched" && Math.abs(diff) > 0.0001) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (line.item?.name_ar || "").toLowerCase();
        const code = (line.item?.code || "").toLowerCase();
        const barcode = (line.item?.barcode || "").toLowerCase();
        const batch = (line.batch?.batch_number || "").toLowerCase();
        const loc = (line.location?.code || "").toLowerCase();
        if (!name.includes(q) && !code.includes(q) && !barcode.includes(q) && !batch.includes(q) && !loc.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [currentStocktake, countInputs, filterType, searchQuery]);

  // Dynamic Live Totals in Workspace
  const workspaceLiveTotals = useMemo(() => {
    if (!currentStocktake || !currentStocktake.lines) {
      return { matched: 0, shortages: 0, surpluses: 0, shortageVal: 0, surplusVal: 0, netVal: 0 };
    }

    let matched = 0;
    let shortages = 0;
    let surpluses = 0;
    let shortageVal = 0;
    let surplusVal = 0;

    currentStocktake.lines.forEach((line) => {
      const liveCount = countInputs[line.id]?.counted ?? Number(line.counted_quantity);
      const bookQty = Number(line.book_quantity);
      const diff = liveCount - bookQty;
      const val = diff * Number(line.unit_cost);

      if (Math.abs(diff) < 0.0001) {
        matched++;
      } else if (diff < 0) {
        shortages++;
        shortageVal += Math.abs(val);
      } else {
        surpluses++;
        surplusVal += val;
      }
    });

    return {
      matched,
      shortages,
      surpluses,
      shortageVal,
      surplusVal,
      netVal: surplusVal - shortageVal,
    };
  }, [currentStocktake, countInputs]);

  // Overall Statistics across sessions
  const overallStats = useMemo(() => {
    const totalSessions = stocktakes.length;
    const postedSessions = stocktakes.filter((s) => s.status === "posted").length;
    const totalShortage = stocktakes.reduce((sum, s) => sum + Number(s.total_shortage_value || 0), 0);
    const totalSurplus = stocktakes.reduce((sum, s) => sum + Number(s.total_surplus_value || 0), 0);
    return { totalSessions, postedSessions, totalShortage, totalSurplus };
  }, [stocktakes]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardCheck size={26} color="var(--color-primary, #059669)" />
            الجرد المخزني الفعلي وتسوية الفروقات (Physical Stocktake)
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.8 }}>
            حصر الأرصدة الميدانية، مطابقة الدفتري، توليد قيود التسوية الجردية، وإثبات العجز والفائض في دفتر اليومية
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {currentStocktake && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentStocktake(null)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <ArrowRight size={15} /> العودة لقائمة المحاضر
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowNewModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={16} /> بدء محضر جرد جديد
          </button>
        </div>
      </div>

      {/* Overview KPI Cards */}
      {!currentStocktake && (
        <div className="grid grid-4" style={{ gap: 12 }}>
          <div className="kpi">
            <h3>محاضر الجرد المعتمدة</h3>
            <div className="value">{overallStats.postedSessions} <small style={{ fontSize: 13, fontWeight: 400 }}>من {overallStats.totalSessions}</small></div>
            <div className="hint">محاضر معتمدة ومرحلة بالدفاتر</div>
          </div>
          <div className="kpi danger">
            <h3>إجمالي عجز الجرد المسجل</h3>
            <div className="value" style={{ color: "#dc2626" }}>
              {overallStats.totalShortage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </div>
            <div className="hint">خسائر تشغيلية محملة على حساب 5140</div>
          </div>
          <div className="kpi info">
            <h3>إجمالي فائض وزيادة الجرد</h3>
            <div className="value" style={{ color: "#059669" }}>
              {overallStats.totalSurplus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </div>
            <div className="hint">أرباح وفائض جرد مثبتة في حساب 4210</div>
          </div>
          <div className="kpi warm">
            <h3>سياسة الرقابة والتجميد</h3>
            <div className="value" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={20} color="#f59e0b" />
              تجميد النطاق آلياً
            </div>
            <div className="hint">حماية الأرصدة من التغيير أثناء العد الميداني</div>
          </div>
        </div>
      )}

      {/* Main Workspace / List */}
      {!currentStocktake ? (
        /* View A: Stocktakes History List */
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>سجل جلسات ومحاضر الجرد ({stocktakes.length})</h3>
              <p>استعراض ومتابعة جلسات الجرد الدورية والسنوية</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>رقم المحضر</th>
                  <th>المستودع</th>
                  <th>التاريخ</th>
                  <th>النطاق</th>
                  <th>الحالة</th>
                  <th>إجمالي الأصناف</th>
                  <th>المطابقة / الفروقات</th>
                  <th>صافي الفارق المالي</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {stocktakes.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: 32, opacity: 0.7 }}>
                      لا توجد جلسات جرد سابقة. انقر على "بدء محضر جرد جديد" للبدء بحصر المستودع.
                    </td>
                  </tr>
                ) : (
                  stocktakes.map((stk) => (
                    <tr key={stk.id}>
                      <td style={{ fontWeight: 700 }}>{stk.stocktake_number}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{stk.warehouse?.name || "-"}</div>
                        <small style={{ opacity: 0.7 }}>{stk.location ? `رف: ${stk.location.code}` : "كامل المستودع"}</small>
                      </td>
                      <td>{stk.stocktake_date}</td>
                      <td>
                        <span className="pill" style={{ fontSize: 11 }}>
                          {stk.scope === "full" ? "جرد شامل" : "جرد جزئي"}
                        </span>
                      </td>
                      <td>
                        <StatusPill status={stk.status} />
                      </td>
                      <td>{stk.total_items_count} صنف</td>
                      <td>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>{stk.matched_items_count} مطابق</span>
                        {stk.variance_items_count > 0 && (
                          <span style={{ color: "#ef4444", marginRight: 8, fontWeight: 600 }}>
                            · {stk.variance_items_count} فارق
                          </span>
                        )}
                      </td>
                      <td className="amount" style={{ fontWeight: 700 }}>
                        <span style={{ color: Number(stk.net_variance_value) < 0 ? "#dc2626" : Number(stk.net_variance_value) > 0 ? "#059669" : "inherit" }}>
                          {Number(stk.net_variance_value).toLocaleString(undefined, { minimumFractionDigits: 2 })} {currencySymbol}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleOpenStocktake(stk)}
                          style={{ padding: "4px 10px", fontSize: 12 }}
                        >
                          {stk.status === "posted" ? "عرض المحضر والقيود" : "متابعة العد الميداني"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* View B: Interactive Physical Count Workspace */
        <div className="grid" style={{ gap: 16 }}>
          {/* Header Card for Selected Stocktake */}
          <div
            className="panel"
            style={{
              borderTop: currentStocktake.status === "posted" ? "4px solid #10b981" : "4px solid #f59e0b",
            }}
          >
            <div className="panel-body" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3 style={{ margin: 0 }}>محضر جرد: {currentStocktake.stocktake_number}</h3>
                    <StatusPill status={currentStocktake.status} />
                    {currentStocktake.status === "posted" && (
                      <span className="pill pill-ok" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Lock size={12} /> مرحل ومقفل نهائياً
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 13, opacity: 0.85, flexWrap: "wrap" }}>
                    <span><strong>المستودع:</strong> {currentStocktake.warehouse?.name}</span>
                    <span><strong>التاريخ:</strong> {currentStocktake.stocktake_date}</span>
                    <span><strong>المشرف:</strong> {currentStocktake.supervisor_name || "لجنة الجرد"}</span>
                    <span><strong>النطاق:</strong> {currentStocktake.location ? `موقع ${currentStocktake.location.code}` : "شامل"}</span>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Blind Mode Toggle */}
                  <button
                    type="button"
                    className={`btn ${blindMode ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setBlindMode(!blindMode)}
                    title="إخفاء الرصيد الدفتري لمنع التساهل أثناء العد الميداني"
                    style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {blindMode ? <EyeOff size={14} /> : <Eye size={14} />}
                    {blindMode ? "الجرد الأعمى (الرصيد الدفتري مخفي)" : "إظهار الرصيد الدفتري"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPrintModal(true)}
                    style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Printer size={14} /> استمارة العد الورقية
                  </button>

                  {currentStocktake.status !== "posted" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleMatchAll}
                        title="مطابقة الأصناف التي لم يتم تغييرها لتوفير وقت الإدخال"
                        style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Sparkles size={14} /> مطابقة كل المتبقي
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleSaveCounts}
                        disabled={savingCounts}
                        style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Save size={14} /> {savingCounts ? "جاري الحفظ..." : "حفظ مسودة العد"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setShowPostConfirmModal(true)}
                        style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, backgroundColor: "#059669" }}
                      >
                        <FileCheck2 size={15} /> اعتماد وتسوية الجرد (Post)
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Live Status Bar */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 12,
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: "1px solid var(--color-border, #e5e7eb)",
                }}
              >
                <div>
                  <small style={{ opacity: 0.7 }}>الأصناف المطابقة:</small>
                  <div style={{ fontWeight: 700, color: "#10b981", fontSize: 16 }}>{workspaceLiveTotals.matched} صنف</div>
                </div>
                <div>
                  <small style={{ opacity: 0.7 }}>أصناف فيها عجز (نقص):</small>
                  <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 16 }}>{workspaceLiveTotals.shortages} صنف</div>
                </div>
                <div>
                  <small style={{ opacity: 0.7 }}>أصناف فيها فائض (زيادة):</small>
                  <div style={{ fontWeight: 700, color: "#2563eb", fontSize: 16 }}>{workspaceLiveTotals.surpluses} صنف</div>
                </div>
                <div>
                  <small style={{ opacity: 0.7 }}>قيمة العجز (خسارة 5140):</small>
                  <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 16 }}>
                    {workspaceLiveTotals.shortageVal.toFixed(2)} {currencySymbol}
                  </div>
                </div>
                <div>
                  <small style={{ opacity: 0.7 }}>قيمة الفائض (إيراد 4210):</small>
                  <div style={{ fontWeight: 700, color: "#059669", fontSize: 16 }}>
                    {workspaceLiveTotals.surplusVal.toFixed(2)} {currencySymbol}
                  </div>
                </div>
                <div>
                  <small style={{ opacity: 0.7 }}>صافي التسوية:</small>
                  <div style={{ fontWeight: 800, fontSize: 16, color: workspaceLiveTotals.netVal < 0 ? "#dc2626" : "#059669" }}>
                    {workspaceLiveTotals.netVal.toFixed(2)} {currencySymbol}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lines Table & Filter Bar */}
          <section className="panel">
            <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              {/* Filter Tabs */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className={`btn ${filterType === "all" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setFilterType("all")}
                  style={{ fontSize: 12 }}
                >
                  الكل ({currentStocktake.lines?.length || 0})
                </button>
                <button
                  type="button"
                  className={`btn ${filterType === "shortage" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setFilterType("shortage")}
                  style={{ fontSize: 12, color: filterType === "shortage" ? "#fff" : "#dc2626" }}
                >
                  عجز فقط ({workspaceLiveTotals.shortages})
                </button>
                <button
                  type="button"
                  className={`btn ${filterType === "surplus" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setFilterType("surplus")}
                  style={{ fontSize: 12, color: filterType === "surplus" ? "#fff" : "#2563eb" }}
                >
                  فائض فقط ({workspaceLiveTotals.surpluses})
                </button>
                <button
                  type="button"
                  className={`btn ${filterType === "matched" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setFilterType("matched")}
                  style={{ fontSize: 12, color: filterType === "matched" ? "#fff" : "#10b981" }}
                >
                  مطابق ({workspaceLiveTotals.matched})
                </button>
              </div>

              {/* Barcode & Search Input */}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", minWidth: 260 }}>
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، الكود، الباركود..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingRight: 30, fontSize: 13 }}
                  />
                  <Search size={14} style={{ position: "absolute", right: 10, top: 12, opacity: 0.5 }} />
                </div>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>الصنف والوحدة</th>
                    <th>الرف / الموقع</th>
                    <th>التشغيلة (Batch)</th>
                    {!blindMode && <th>الرصيد الدفتري</th>}
                    <th style={{ width: 150 }}>الكمية المجرودة فعلياً *</th>
                    <th>الفارق (الكمية)</th>
                    <th>الفارق (القيمة {currencySymbol})</th>
                    <th>سبب الفارق / تبرير الجرد</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: 28, opacity: 0.7 }}>
                        لا توجد أصناف تطابق الفلتر المحدد.
                      </td>
                    </tr>
                  ) : (
                    filteredLines.map((line) => {
                      const inputData = countInputs[line.id] || { counted: Number(line.counted_quantity), reason: "", notes: "" };
                      const bookQty = Number(line.book_quantity);
                      const diffQty = inputData.counted - bookQty;
                      const unitCost = Number(line.unit_cost);
                      const diffVal = diffQty * unitCost;
                      const isShortage = diffQty < -0.0001;
                      const isSurplus = diffQty > 0.0001;
                      const isMatched = Math.abs(diffQty) < 0.0001;
                      const isReadOnly = currentStocktake.status === "posted";

                      return (
                        <tr
                          key={line.id}
                          style={{
                            backgroundColor: isShortage
                              ? "rgba(239, 68, 68, 0.04)"
                              : isSurplus
                              ? "rgba(37, 99, 235, 0.04)"
                              : "transparent",
                          }}
                        >
                          {/* Item Name */}
                          <td>
                            <div style={{ fontWeight: 600 }}>{line.item?.name_ar}</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>
                              كود: {line.item?.code} · {line.item?.base_uom?.name_ar || "وحدة"}
                            </div>
                          </td>

                          {/* Location */}
                          <td>
                            <span className="pill" style={{ fontSize: 11 }}>
                              {line.location?.code || "الموقع الافتراضي"}
                            </span>
                          </td>

                          {/* Batch */}
                          <td>
                            {line.batch ? (
                              <div>
                                <span style={{ fontWeight: 600, fontSize: 12 }}>{line.batch.batch_number}</span>
                                {line.batch.expiry_date && (
                                  <div style={{ fontSize: 10, opacity: 0.7 }}>انتهاء: {line.batch.expiry_date}</div>
                                )}
                              </div>
                            ) : (
                              <span style={{ opacity: 0.5, fontSize: 11 }}>—</span>
                            )}
                          </td>

                          {/* Book Qty */}
                          {!blindMode && (
                            <td className="amount" style={{ fontWeight: 600 }}>
                              {bookQty.toLocaleString()}
                            </td>
                          )}

                          {/* Counted Quantity Input */}
                          <td>
                            {isReadOnly ? (
                              <strong style={{ fontSize: 14 }}>{inputData.counted.toLocaleString()}</strong>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={inputData.counted}
                                onChange={(e) => handleLineCountChange(line.id, Number(e.target.value))}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  fontWeight: 700,
                                  fontSize: 14,
                                  textAlign: "center",
                                  border: isShortage
                                    ? "2px solid #ef4444"
                                    : isSurplus
                                    ? "2px solid #2563eb"
                                    : "1px solid var(--color-border, #d1d5db)",
                                  borderRadius: 6,
                                }}
                              />
                            )}
                          </td>

                          {/* Difference Quantity */}
                          <td className="amount">
                            {isMatched ? (
                              <span style={{ color: "#10b981", fontWeight: 700 }}>0 (مطابق)</span>
                            ) : isShortage ? (
                              <span style={{ color: "#dc2626", fontWeight: 700 }}>
                                {diffQty.toLocaleString()} (عجز)
                              </span>
                            ) : (
                              <span style={{ color: "#2563eb", fontWeight: 700 }}>
                                +{diffQty.toLocaleString()} (فائض)
                              </span>
                            )}
                          </td>

                          {/* Difference Value */}
                          <td className="amount" style={{ fontWeight: 700 }}>
                            <span style={{ color: isShortage ? "#dc2626" : isSurplus ? "#2563eb" : "#10b981" }}>
                              {diffVal > 0 ? `+${diffVal.toFixed(2)}` : diffVal.toFixed(2)}
                            </span>
                          </td>

                          {/* Variance Reason */}
                          <td>
                            {isReadOnly ? (
                              <span style={{ fontSize: 12 }}>{inputData.reason || "—"}</span>
                            ) : isMatched ? (
                              <span style={{ fontSize: 11, opacity: 0.5 }}>مطابق للرصيد</span>
                            ) : (
                              <select
                                value={inputData.reason}
                                onChange={(e) => handleLineReasonChange(line.id, e.target.value)}
                                style={{ fontSize: 12, padding: "4px 8px" }}
                              >
                                <option value="">اختر سبب الفارق...</option>
                                <option value="سوء تخزين وتلف رطوبة">سوء تخزين وتلف رطوبة</option>
                                <option value="خطأ استلام إرسالية سابقة">خطأ استلام إرسالية سابقة</option>
                                <option value="عينات ترويج وتسويق">عينات ترويج وتسويق</option>
                                <option value="بضاعة بدون استكر باركود">بضاعة بدون استكر باركود</option>
                                <option value="خطأ في كرتنة التعبئة">خطأ في كرتنة التعبئة</option>
                                <option value="أخرى - مسجلة بالملاحظات">أخرى (سجل بالملاحظات)</option>
                              </select>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td>
                            {isMatched ? (
                              <span className="pill pill-ok" style={{ fontSize: 11 }}>مطابق</span>
                            ) : isShortage ? (
                              <span className="pill pill-danger" style={{ fontSize: 11 }}>عجز</span>
                            ) : (
                              <span className="pill pill-info" style={{ fontSize: 11 }}>فائض</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* GL Accounting Impact Summary Box */}
          {currentStocktake.journal_entry && (
            <div className="panel" style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid #10b981" }}>
              <div className="panel-body">
                <h4 style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8, color: "#065f46" }}>
                  <CheckCircle2 size={18} />
                  تم توليد وترحيل القيد المحاسبي المعتمد رقم: #{currentStocktake.journal_entry.entry_number}
                </h4>
                <p style={{ margin: 0, fontSize: 13 }}>
                  تم تحديث أرصدة المستودعات بدقة وإثبات فوارق الجرد في حسابات الأرباح والخسائر والمخزون وفقاً لمعايير المحاسبة المزدوجة.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: New Stocktake Session */}
      {showNewModal && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 1000,
          }}
        >
          <div className="panel" style={{ width: 550, maxWidth: "95vw" }}>
            <div className="panel-head">
              <div>
                <h3>بدء محضر جرد مخزني فعلي جديد</h3>
                <p>تثبيت لقطة الأرصدة الدفترية وتجهيز كشوفات العد الميداني</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowNewModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateStocktake} className="panel-body">
              <div className="form-grid">
                {/* Warehouse */}
                <label className="label">
                  المستودع المراد جرده *
                  <select
                    required
                    value={newForm.warehouse_id}
                    onChange={(e) => setNewForm({ ...newForm, warehouse_id: Number(e.target.value), location_id: "" })}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </label>

                {/* Date */}
                <label className="label">
                  تاريخ الجرد *
                  <input
                    type="date"
                    required
                    value={newForm.stocktake_date}
                    onChange={(e) => setNewForm({ ...newForm, stocktake_date: e.target.value })}
                  />
                </label>

                {/* Specific Location (Optional) */}
                <label className="label">
                  تخصيص رف أو موقع محدد (اختياري)
                  <select
                    value={newForm.location_id}
                    onChange={(e) => setNewForm({ ...newForm, location_id: e.target.value })}
                  >
                    <option value="">كامل المستودع (جرد شامل)</option>
                    {activeLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code} ({loc.full_code})
                      </option>
                    ))}
                  </select>
                </label>

                {/* Specific Category (Optional) */}
                <label className="label">
                  تصنيف الأصناف (اختياري للجرد الدوري)
                  <select
                    value={newForm.category_id}
                    onChange={(e) => setNewForm({ ...newForm, category_id: e.target.value })}
                  >
                    <option value="">جميع التصنيفات الغذائية</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_ar}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Supervisor Name */}
                <label className="label full">
                  المسؤول / لجنة الجرد
                  <input
                    placeholder="اسم أمين المستودع والمشرفين الميدانيين..."
                    value={newForm.supervisor_name}
                    onChange={(e) => setNewForm({ ...newForm, supervisor_name: e.target.value })}
                  />
                </label>

                {/* Blind Count Option */}
                <label className="label full" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={newForm.is_blind}
                    onChange={(e) => setNewForm({ ...newForm, is_blind: e.target.checked })}
                  />
                  <span>
                    <strong>تفعيل خيار "الجرد الأعمى (Blind Count)"</strong>
                    <br />
                    <small style={{ opacity: 0.7 }}>
                      إخفاء الرصيد الدفتري المسجل في النظام لإجبار فريق الجرد على العد الفعلي الصارم لكل صندوق.
                    </small>
                  </span>
                </label>

                {/* Freeze Movements Option */}
                <label className="label full" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={newForm.freeze_movements}
                    onChange={(e) => setNewForm({ ...newForm, freeze_movements: e.target.checked })}
                  />
                  <span>
                    <strong>تجميد الحركات المخزنية أثناء الجرد</strong>
                    <br />
                    <small style={{ opacity: 0.7 }}>
                      منع تسجيل تحويلات أو حركات صرف على هذا المستودع حتى اعتماد محضر الجرد لضمان سلامة الأرقام.
                    </small>
                  </span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "جاري إنشاء الجلسة..." : "بدء الجرد وأخذ اللقطة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Confirmation Before Posting & Reconciling */}
      {showPostConfirmModal && currentStocktake && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 1100,
          }}
        >
          <div className="panel" style={{ width: 560, maxWidth: "95vw" }}>
            <div className="panel-head">
              <div>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, color: "#059669" }}>
                  <Lock size={18} /> تأكيد ترحيل واعتماد الجرد النهائي
                </h3>
                <p>محضر جرد رقم: {currentStocktake.stocktake_number}</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowPostConfirmModal(false)}>✕</button>
            </div>
            <div className="panel-body">
              <div
                style={{
                  padding: 14,
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  borderRight: "4px solid #f59e0b",
                  borderRadius: 6,
                  fontSize: 13,
                  marginBottom: 16,
                  lineHeight: 1.6,
                }}
              >
                <strong>تنبيه هام لا يقبل التراجع:</strong>
                <br />
                ترحيل الجرد سيقوم <strong>بتسوية أرصدة المخزون فورياً</strong> لتطابق العد الفعلي، وسيتم توليد القيود المحاسبية تلقائياً في دفتر اليومية العام وقفل المحضر نهائياً من أي تعديل.
              </div>

              <div style={{ background: "var(--color-bg-subtle, #f9fafb)", padding: 14, borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>ملخص القيود المحاسبية التي ستتولد:</div>
                {workspaceLiveTotals.shortageVal > 0 && (
                  <div style={{ marginBottom: 6, color: "#dc2626" }}>
                    • <strong>عجز الجرد ({workspaceLiveTotals.shortageVal.toFixed(2)} {currencySymbol}):</strong>
                    <div style={{ fontSize: 12, paddingRight: 12 }}>
                      مدين: 5140 فروقات وعجز تسويات الجرد المخزني
                      <br />
                      دائن: 1131 مخزون المواد الغذائية
                    </div>
                  </div>
                )}
                {workspaceLiveTotals.surplusVal > 0 && (
                  <div style={{ color: "#059669" }}>
                    • <strong>فائض الجرد ({workspaceLiveTotals.surplusVal.toFixed(2)} {currencySymbol}):</strong>
                    <div style={{ fontSize: 12, paddingRight: 12 }}>
                      مدين: 1131 مخزون المواد الغذائية
                      <br />
                      دائن: 4210 أرباح وفائض تسويات الجرد المخزني
                    </div>
                  </div>
                )}
                {workspaceLiveTotals.shortageVal === 0 && workspaceLiveTotals.surplusVal === 0 && (
                  <div style={{ color: "#10b981", fontWeight: 600 }}>
                    كافة الأصناف مطابقة تماماً (لا توجد فروقات مالية تستدعي قيد تسوية).
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowPostConfirmModal(false)}>
                  مراجعة الحسابات
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmPost}
                  disabled={posting}
                  style={{ backgroundColor: "#059669" }}
                >
                  {posting ? "جاري الترحيل المزدوج..." : "نعم، اعتمد وقفل الجرد"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Printable Physical Count Sheet & Report */}
      {showPrintModal && currentStocktake && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 1200,
          }}
        >
          <div className="panel" style={{ width: 850, maxWidth: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div className="panel-head" style={{ borderBottom: "1px solid var(--color-border, #e5e7eb)" }}>
              <div>
                <h3>استمارة العد الميداني الورقية</h3>
                <p>كشف مرمز لمطابقة الأرفف وتوقيع لجان الجرد</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                  <Printer size={15} /> طباعة الاستمارة
                </button>
                <button className="btn btn-ghost" onClick={() => setShowPrintModal(false)}>✕</button>
              </div>
            </div>
            <div className="panel-body" style={{ overflowY: "auto", padding: 24 }}>
              <div id="printable-count-sheet" style={{ fontFamily: "inherit" }}>
                <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 12, marginBottom: 16 }}>
                  <h2 style={{ margin: 0 }}>ميزان — استمارة الجرد المخزني الفعلي الميداني</h2>
                  <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 8, fontSize: 13 }}>
                    <span><strong>رقم المحضر:</strong> {currentStocktake.stocktake_number}</span>
                    <span><strong>المستودع:</strong> {currentStocktake.warehouse?.name}</span>
                    <span><strong>التاريخ:</strong> {currentStocktake.stocktake_date}</span>
                    <span><strong>المشرف:</strong> {currentStocktake.supervisor_name || "اللجنة المعتمدة"}</span>
                  </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 24 }}>
                  <thead>
                    <tr style={{ background: "#f3f4f6", borderBottom: "1px solid #000" }}>
                      <th style={{ padding: "8px 6px", border: "1px solid #ccc", textAlign: "right" }}>م</th>
                      <th style={{ padding: "8px 6px", border: "1px solid #ccc", textAlign: "right" }}>الصنف الغذائي</th>
                      <th style={{ padding: "8px 6px", border: "1px solid #ccc", textAlign: "center" }}>الباركود</th>
                      <th style={{ padding: "8px 6px", border: "1px solid #ccc", textAlign: "center" }}>الموقع (الرف)</th>
                      <th style={{ padding: "8px 6px", border: "1px solid #ccc", textAlign: "center" }}>التشغيلة (Batch)</th>
                      <th style={{ padding: "8px 6px", border: "1px solid #ccc", textAlign: "center" }}>الوحدة</th>
                      <th style={{ padding: "8px 6px", border: "1px solid #ccc", textAlign: "center", width: 90 }}>العد الفعلي بالقلم</th>
                      <th style={{ padding: "8px 6px", border: "1px solid #ccc", textAlign: "right" }}>ملاحظات الفاحص</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentStocktake.lines || []).map((line, idx) => (
                      <tr key={line.id}>
                        <td style={{ padding: "6px 6px", border: "1px solid #ccc", textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ padding: "6px 6px", border: "1px solid #ccc", fontWeight: 600 }}>{line.item?.name_ar}</td>
                        <td style={{ padding: "6px 6px", border: "1px solid #ccc", textAlign: "center" }}>{line.item?.barcode || line.item?.code}</td>
                        <td style={{ padding: "6px 6px", border: "1px solid #ccc", textAlign: "center" }}>{line.location?.code || "افتراضي"}</td>
                        <td style={{ padding: "6px 6px", border: "1px solid #ccc", textAlign: "center" }}>{line.batch?.batch_number || "-"}</td>
                        <td style={{ padding: "6px 6px", border: "1px solid #ccc", textAlign: "center" }}>{line.item?.base_uom?.name_ar || "وحدة"}</td>
                        <td style={{ padding: "6px 6px", border: "1px solid #ccc", textAlign: "center", background: "#fafafa" }}>
                          {currentStocktake.status === "posted" ? line.counted_quantity : ""}
                        </td>
                        <td style={{ padding: "6px 6px", border: "1px solid #ccc" }}>{line.variance_reason || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signatures */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36, paddingTop: 16, borderTop: "1px dashed #ccc", fontSize: 13 }}>
                  <div style={{ textAlign: "center", minWidth: 160 }}>
                    <div><strong>أمين المستودع</strong></div>
                    <div style={{ height: 40 }}></div>
                    <div>التوقيع: ..........................</div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 160 }}>
                    <div><strong>عضو لجنة الجرد</strong></div>
                    <div style={{ height: 40 }}></div>
                    <div>التوقيع: ..........................</div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 160 }}>
                    <div><strong>مدير الحسابات / المالي</strong></div>
                    <div style={{ height: 40 }}></div>
                    <div>التوقيع: ..........................</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Centered Modern Toast Notification */}
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
