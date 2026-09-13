import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  DollarSign,
  Download,
  Filter,
  Layers,
  Package,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { money } from "@/utils/formatters";
import { productsApi, ItemCategory } from "@/api/products";
import { warehousesApi, Warehouse } from "@/api/warehouses";
import {
  inventoryReportsApi,
  InventoryValuationData,
  InventoryReconciliationData,
  InventoryAnalyticsData,
  ValuationItemRow,
} from "@/api/inventoryReports";
import type { PageId } from "@/types/navigation";

interface InventoryValuationPageProps {
  onOpenItemCard?: (itemId: number) => void;
}

export const InventoryValuationPage: React.FC<InventoryValuationPageProps> = ({
  onOpenItemCard,
}) => {
  const [activeTab, setActiveTab] = useState<"valuation" | "reconciliation" | "analytics">("valuation");

  // Filter States
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [priceTier, setPriceTier] = useState<string>("retail");
  const [search, setSearch] = useState<string>("");
  const [daysThreshold, setDaysThreshold] = useState<number>(30);

  // Metadata
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);

  // Report Data States
  const [valuationData, setValuationData] = useState<InventoryValuationData | null>(null);
  const [reconciliationData, setReconciliationData] = useState<InventoryReconciliationData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<InventoryAnalyticsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. تحميل البيانات المرجعية (المستودعات والتصنيفات)
  useEffect(() => {
    let isMounted = true;
    const loadPrerequisites = async () => {
      try {
        const [whs, cats] = await Promise.all([
          warehousesApi.list(),
          productsApi.getCategories(),
        ]);
        if (!isMounted) return;
        setWarehouses(whs);
        setCategories(cats);
      } catch (e) {
        console.error("Failed to load metadata", e);
      }
    };
    loadPrerequisites();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. جلب تقارير المخزون
  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [val, rec, ana] = await Promise.all([
        inventoryReportsApi.fetchValuation({
          warehouse_id: warehouseId !== "all" ? warehouseId : undefined,
          category_id: categoryId !== "all" ? categoryId : undefined,
          price_tier: priceTier,
          search: search.trim() || undefined,
        }),
        inventoryReportsApi.fetchReconciliation(),
        inventoryReportsApi.fetchAnalytics({
          warehouse_id: warehouseId !== "all" ? warehouseId : undefined,
          days_threshold: daysThreshold,
        }),
      ]);

      setValuationData(val);
      setReconciliationData(rec);
      setAnalyticsData(ana);
    } catch (err: any) {
      console.error("Failed to load inventory reports", err);
      setError(err.response?.data?.message || "فشل تحميل تقارير المخزون");
    } finally {
      setLoading(false);
    }
  }, [warehouseId, categoryId, priceTier, search, daysThreshold]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // تصدير CSV
  const exportValuationCsv = () => {
    if (!valuationData || !valuationData.items.length) return;

    const headers = [
      "SKU",
      "الباركود",
      "الصنف",
      "التصنيف",
      "الوحدة",
      "الرصيد المتوفر",
      "الرصيد المتاح",
      "المحجوز",
      "تكلفة الوحدة",
      "إجمالي التكلفة",
      "سعر البيع",
      "إجمالي القيمة البيعية",
      "الهامش المتوقع",
      "نسبة الهامش %",
    ];

    const rows = valuationData.items.map((i) => [
      i.sku,
      i.barcode || "—",
      `"${i.name_ar.replace(/"/g, '""')}"`,
      `"${i.category_name.replace(/"/g, '""')}"`,
      i.base_uom,
      i.quantity_on_hand,
      i.quantity_available,
      i.quantity_reserved,
      i.unit_cost,
      i.total_cost_value,
      i.selling_price,
      i.total_retail_value,
      i.expected_margin,
      `${i.margin_percent}%`,
    ]);

    const csv =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_valuation_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isGlBalanced = reconciliationData?.status === "MATCHED";

  return (
    <div className="grid" style={{ gap: 20 }}>
      {/* رأس الصفحة والإجراءات */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800 }}>
            تقييم المخزون المالي والرقابة التحليلية
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-soft)", fontSize: "0.88rem" }}>
            تقييم رأس المال المخزني بالتكلفة وسعر البيع، والمطابقة اللحظية مع الأستاذ العام (GL)
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            <Printer size={16} /> طباعة التقرير
          </button>
          <button
            className="btn btn-ghost"
            onClick={exportValuationCsv}
            disabled={!valuationData || valuationData.items.length === 0}
          >
            <Download size={16} /> تصدير CSV
          </button>
          <button className="btn btn-primary" onClick={loadReports} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} /> تحديث البيانات
          </button>
        </div>
      </div>

      {/* شريط حالة المطابقة المحاسبية مع الأستاذ العام (GL Reconciliation Banner) */}
      {reconciliationData && (
        <div
          style={{
            borderRadius: 12,
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
            background: isGlBalanced
              ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.06))"
              : "linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(217, 119, 6, 0.08))",
            border: isGlBalanced
              ? "1px solid rgba(16, 185, 129, 0.35)"
              : "1px solid rgba(245, 158, 11, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: isGlBalanced ? "#10b981" : "#f59e0b",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isGlBalanced ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: isGlBalanced ? "#065f46" : "#92400e" }}>
                {isGlBalanced
                  ? "المطابقة المحاسبية متطابقة تماماً (GL Reconciliation: MATCHED)"
                  : "تنبيه مطابقة محاسبية: يوجد فارق تسوية بين تقييم المخزون ودفتر الأستاذ (GL Difference)"}
              </div>
              <div style={{ fontSize: "0.82rem", color: isGlBalanced ? "#047857" : "#b45309", marginTop: 2 }}>
                قيمة المخزون الفعلي بالمستودعات:{" "}
                <strong>{money(reconciliationData.summary.total_inventory_valuation)}</strong> · رصيد حسابات الأصول
                في الـ GL: <strong>{money(reconciliationData.summary.total_gl_inventory_balance)}</strong>
                {!isGlBalanced && (
                  <>
                    {" "}· صافي الفارق:{" "}
                    <strong style={{ color: "#b91c1c" }}>
                      {money(reconciliationData.summary.net_difference)}
                    </strong>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            className="btn btn-ghost"
            style={{
              fontWeight: 700,
              fontSize: "0.82rem",
              color: isGlBalanced ? "#065f46" : "#92400e",
              borderColor: isGlBalanced ? "#10b981" : "#f59e0b",
            }}
            onClick={() => setActiveTab("reconciliation")}
          >
            عرض كشف المطابقة الحسابية <ChevronLeft size={14} />
          </button>
        </div>
      )}

      {/* لوحة بطاقات الـ KPIs الرئيسية */}
      {valuationData && (
        <div className="grid grid-4" style={{ gap: 14 }}>
          <div className="kpi-card" style={{ borderRight: "4px solid #3b82f6" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
              رأس المال المخزني (بالتكلفة)
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, margin: "6px 0 2px", color: "#1e40af" }}>
              {money(valuationData.summary.total_cost_value)}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
              متوسط تكلفة البضاعة في المستودعات
            </div>
          </div>

          <div className="kpi-card" style={{ borderRight: "4px solid #10b989" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
              القيمة البيعية التقديرية (Retail)
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, margin: "6px 0 2px", color: "#065f46" }}>
              {money(valuationData.summary.total_retail_value)}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#059669" }}>
              بناءً على قائمة أسعار ({priceTier === "retail" ? "التجزئة" : priceTier})
            </div>
          </div>

          <div className="kpi-card" style={{ borderRight: "4px solid #8b5cf6" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
              هامش الربح الكامن (Potential Margin)
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, margin: "6px 0 2px", color: "#6b21a8" }}>
              {money(valuationData.summary.total_expected_margin)}{" "}
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                ({valuationData.summary.overall_margin_percent}%)
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#7c3aed" }}>
              الربح الإجمالي المتوقع عند التصريف
            </div>
          </div>

          <div className="kpi-card" style={{ borderRight: "4px solid #f59e0b" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
              إجمالي الأصناف والوحدات
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, margin: "6px 0 2px", color: "#92400e" }}>
              {valuationData.summary.total_quantity.toLocaleString()}{" "}
              <span style={{ fontSize: "0.85rem", fontWeight: 400 }}>وحدة</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#b45309" }}>
              موزعة على <strong>{valuationData.summary.total_skus}</strong> صنف نشط
            </div>
          </div>
        </div>
      )}

      {/* شريط التبويبات الرئيسية الثلاثة */}
      <div
        style={{
          display: "flex",
          gap: 12,
          borderBottom: "1px solid var(--line)",
          paddingBottom: 2,
        }}
      >
        <button
          className={`btn ${activeTab === "valuation" ? "btn-primary" : "btn-ghost"}`}
          style={{ borderRadius: "8px 8px 0 0", fontWeight: 700 }}
          onClick={() => setActiveTab("valuation")}
        >
          <BarChart3 size={16} /> تقييم الأصناف بالتكلفة وسعر البيع
        </button>
        <button
          className={`btn ${activeTab === "reconciliation" ? "btn-primary" : "btn-ghost"}`}
          style={{ borderRadius: "8px 8px 0 0", fontWeight: 700 }}
          onClick={() => setActiveTab("reconciliation")}
        >
          <ShieldCheck size={16} /> المطابقة المحاسبية مع الـ GL
        </button>
        <button
          className={`btn ${activeTab === "analytics" ? "btn-primary" : "btn-ghost"}`}
          style={{ borderRadius: "8px 8px 0 0", fontWeight: 700 }}
          onClick={() => setActiveTab("analytics")}
        >
          <Siren size={16} /> تنبيهات إعادة الطلب والركود (Analytics)
        </button>
      </div>

      {/* التبويب 1: جدول تقييم الأصناف المالي */}
      {activeTab === "valuation" && (
        <>
          {/* شريط فلاتر التقييم */}
          <section className="panel" style={{ padding: "14px 20px" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                {/* البحث السريع */}
                <div style={{ position: "relative", minWidth: 220 }}>
                  <Search
                    size={15}
                    style={{ position: "absolute", right: 10, top: 11, color: "var(--ink-soft)" }}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="بحث باسم الصنف أو SKU أو الباركود..."
                    style={{ paddingRight: 32, height: 36, fontSize: "0.85rem", width: "100%" }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* تصفية المستودع */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <WarehouseIcon size={15} color="var(--ink-soft)" />
                  <select
                    className="input"
                    style={{ height: 36, fontSize: "0.85rem" }}
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                  >
                    <option value="all">كافة المستودعات</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* تصفية الفئة */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Layers size={15} color="var(--ink-soft)" />
                  <select
                    className="input"
                    style={{ height: 36, fontSize: "0.85rem" }}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="all">كافة الفئات</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_ar}
                      </option>
                    ))}
                  </select>
                </div>

                {/* قائمة الأسعار */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <DollarSign size={15} color="var(--ink-soft)" />
                  <select
                    className="input"
                    style={{ height: 36, fontSize: "0.85rem" }}
                    value={priceTier}
                    onChange={(e) => setPriceTier(e.target.value)}
                  >
                    <option value="retail">سعر التجزئة (Retail)</option>
                    <option value="wholesale">سعر الجملة (Wholesale)</option>
                    <option value="special">سعر خاص (Special)</option>
                  </select>
                </div>
              </div>

              {valuationData && (
                <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                  إجمالي الأصناف المعروضة: <strong>{valuationData.items.length}</strong> صنف
                </div>
              )}
            </div>
          </section>

          {/* جدول بيانات تقييم المخزون */}
          <section className="panel">
            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--ink-soft)" }}>
                <RefreshCw size={28} className="spin" style={{ margin: "0 auto 12px" }} />
                <p>جاري احتساب تقييم المخزون وهوامش الربح...</p>
              </div>
            ) : !valuationData || valuationData.items.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--ink-soft)" }}>
                <Package size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                <h4>لا توجد أصناف مطابقة لمعايير البحث الحالية</h4>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>SKU / كود</th>
                      <th>اسم الصنف</th>
                      <th>الفئة</th>
                      <th>الوحدة</th>
                      <th style={{ textAlign: "center", width: 90 }}>الرصيد الفعلي</th>
                      <th style={{ textAlign: "center", width: 85 }}>المتاح</th>
                      <th style={{ textAlign: "right", width: 95 }}>تكلفة الوحدة</th>
                      <th style={{ textAlign: "right", width: 115, background: "rgba(59, 130, 246, 0.04)" }}>
                        إجمالي التكلفة
                      </th>
                      <th style={{ textAlign: "right", width: 95 }}>سعر البيع</th>
                      <th style={{ textAlign: "right", width: 115, background: "rgba(16, 185, 129, 0.04)" }}>
                        القيمة البيعية
                      </th>
                      <th style={{ textAlign: "right", width: 115, background: "rgba(139, 92, 246, 0.04)" }}>
                        الهامش المتوقع
                      </th>
                      <th style={{ textAlign: "center", width: 90 }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valuationData.items.map((item) => (
                      <tr key={item.item_id}>
                        <td style={{ fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 600 }}>
                          {item.sku}
                        </td>
                        <td>
                          <div>
                            <strong>{item.name_ar}</strong>
                            {item.is_low_stock && (
                              <span
                                className="pill pill-danger"
                                style={{ marginRight: 6, fontSize: "0.7rem", padding: "1px 6px" }}
                              >
                                تحت حد الطلب
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: "var(--ink-soft)" }}>{item.category_name}</td>
                        <td style={{ color: "var(--ink-soft)" }}>{item.base_uom}</td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>
                          {item.quantity_on_hand.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "center", color: "#059669" }}>
                          {item.quantity_available.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{money(item.unit_cost)}</td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#1e40af",
                            background: "rgba(59, 130, 246, 0.04)",
                          }}
                        >
                          {money(item.total_cost_value)}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{money(item.selling_price)}</td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#065f46",
                            background: "rgba(16, 185, 129, 0.04)",
                          }}
                        >
                          {money(item.total_retail_value)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: item.expected_margin >= 0 ? "#6b21a8" : "#dc2626",
                            background: "rgba(139, 92, 246, 0.04)",
                          }}
                        >
                          {money(item.expected_margin)}
                          <br />
                          <span style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>
                            ({item.margin_percent}%)
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {onOpenItemCard && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                              onClick={() => onOpenItemCard(item.item_id)}
                              title="عرض كارت الصنف التاريخي"
                            >
                              كارت الصنف
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 800, background: "var(--bg-subtle)", borderTop: "2px solid var(--line)" }}>
                      <td colSpan={4}>المجموع الإجمالي:</td>
                      <td style={{ textAlign: "center", fontSize: "0.95rem" }}>
                        {valuationData.summary.total_quantity.toLocaleString()}
                      </td>
                      <td style={{ textAlign: "center" }}>—</td>
                      <td style={{ textAlign: "right" }}>—</td>
                      <td style={{ textAlign: "right", color: "#1e40af", fontSize: "0.95rem" }}>
                        {money(valuationData.summary.total_cost_value)}
                      </td>
                      <td style={{ textAlign: "right" }}>—</td>
                      <td style={{ textAlign: "right", color: "#065f46", fontSize: "0.95rem" }}>
                        {money(valuationData.summary.total_retail_value)}
                      </td>
                      <td style={{ textAlign: "right", color: "#6b21a8", fontSize: "0.95rem" }}>
                        {money(valuationData.summary.total_expected_margin)} ({valuationData.summary.overall_margin_percent}%)
                      </td>
                      <td style={{ textAlign: "center" }}>—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* التبويب 2: المطابقة المحاسبية مع الأستاذ العام */}
      {activeTab === "reconciliation" && reconciliationData && (
        <div className="grid" style={{ gap: 16 }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3 style={{ margin: 0, fontWeight: 800 }}>
                  كشف مطابقة المخزون الفعلي مع حسابات الأصول في دفتر الأستاذ العام
                </h3>
                <p style={{ margin: "4px 0 0", color: "var(--ink-soft)", fontSize: "0.83rem" }}>
                  مطابقة ديناميكية مبنية على الفئات والحسابات التابعة لـ 1130 وقيود اليومية المرحلة
                </p>
              </div>
              <span
                className={`pill ${isGlBalanced ? "pill-success" : "pill-danger"}`}
                style={{ fontWeight: 800, fontSize: "0.85rem" }}
              >
                {reconciliationData.status_label}
              </span>
            </div>

            <div className="table-wrap">
              <table className="data" style={{ fontSize: "0.88rem" }}>
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>كود الحساب</th>
                    <th>اسم الحساب المحاسبي</th>
                    <th>الفئات المرتبطة</th>
                    <th style={{ textAlign: "center", width: 100 }}>كمية المخزون</th>
                    <th style={{ textAlign: "right", width: 140 }}>قيمة المخزون الفعلي</th>
                    <th style={{ textAlign: "right", width: 120 }}>مدين الـ GL</th>
                    <th style={{ textAlign: "right", width: 120 }}>دائن الـ GL</th>
                    <th style={{ textAlign: "right", width: 140 }}>رصيد الأستاذ (GL)</th>
                    <th style={{ textAlign: "right", width: 130 }}>فارق التسوية</th>
                    <th style={{ textAlign: "center", width: 110 }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliationData.accounts.map((acc) => (
                    <tr key={acc.account_id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{acc.account_code}</td>
                      <td>
                        <strong>{acc.account_name}</strong>
                      </td>
                      <td style={{ color: "var(--ink-soft)" }}>{acc.linked_categories}</td>
                      <td style={{ textAlign: "center" }}>{acc.inventory_quantity.toLocaleString()}</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#1e40af" }}>
                        {money(acc.inventory_valuation)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>{money(acc.gl_debit)}</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>{money(acc.gl_credit)}</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#065f46" }}>
                        {money(acc.gl_balance)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: acc.status === "MATCHED" ? "#059669" : "#dc2626",
                        }}
                      >
                        {acc.difference === 0 ? "0.00" : money(acc.difference)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`pill ${acc.status === "MATCHED" ? "pill-success" : "pill-danger"}`}
                          style={{ fontSize: "0.75rem" }}
                        >
                          {acc.status_label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: "var(--bg-subtle)", borderTop: "2px solid var(--line)" }}>
                    <td colSpan={4}>الإجمالي الموحد لكافة الحسابات:</td>
                    <td style={{ textAlign: "right", color: "#1e40af", fontSize: "0.95rem" }}>
                      {money(reconciliationData.summary.total_inventory_valuation)}
                    </td>
                    <td colSpan={2} style={{ textAlign: "center" }}>
                      —
                    </td>
                    <td style={{ textAlign: "right", color: "#065f46", fontSize: "0.95rem" }}>
                      {money(reconciliationData.summary.total_gl_inventory_balance)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontSize: "0.95rem",
                        color: isGlBalanced ? "#059669" : "#dc2626",
                      }}
                    >
                      {money(reconciliationData.summary.net_difference)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`pill ${isGlBalanced ? "pill-success" : "pill-danger"}`}>
                        {isGlBalanced ? "متطابق" : "فارق"}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* نصائح ومعايير المطابقة المحاسبية */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 10,
              background: "rgba(59, 130, 246, 0.05)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              fontSize: "0.85rem",
              lineHeight: 1.6,
            }}
          >
            <h4 style={{ margin: "0 0 6px", color: "#1e40af", fontWeight: 700 }}>
              معايير التدقيق والرقابة المحاسبية:
            </h4>
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>
              يتم استخراج رصيد دفتر الأستاذ العام حصراً من قيود اليومية ذات الحالة <strong>مرحلة (POSTED)</strong>.
              في حال وجود فارق، يرجى التحقق من وجود قيود يومية مسودة غير مرحلة، أو حركات مخزنية جارية لم يتم ترحيل قيودها،
              أو تنفيذ محضر <strong>جرد مخزني فعلي وتسوية فروقات</strong> لمطابقة الأرصدة الفعلية مع الدفاتر.
            </p>
          </div>
        </div>
      )}

      {/* التبويب 3: الرقابة والتحليلات (Reorder & Dead Stock) */}
      {activeTab === "analytics" && analyticsData && (
        <div className="grid" style={{ gap: 20 }}>
          {/* مؤشرات الرقابة والركود */}
          <div className="grid grid-2" style={{ gap: 16 }}>
            {/* بطاقة إعادة الطلب */}
            <section className="panel">
              <div className="panel-head">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(239, 68, 68, 0.12)",
                      color: "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Siren size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
                      أصناف قاربت على النفاد (تنبيهات إعادة الطلب)
                    </h3>
                    <p style={{ margin: "2px 0 0", color: "var(--ink-soft)", fontSize: "0.8rem" }}>
                      الرصيد المتاح حالياً $\le$ حد إعادة الطلب المحدد
                    </p>
                  </div>
                </div>
                <span className="pill pill-danger" style={{ fontWeight: 700 }}>
                  {analyticsData.summary.low_stock_items_count} صنف
                </span>
              </div>

              {analyticsData.reorder_alerts.length === 0 ? (
                <div style={{ padding: 36, textAlign: "center", color: "var(--ink-soft)" }}>
                  <CheckCircle2 size={32} color="#10b981" style={{ margin: "0 auto 10px" }} />
                  <h4>مستويات المخزون ممتازة</h4>
                  <p style={{ fontSize: "0.85rem" }}>لا توجد أصناف تحت حد إعادة الطلب حالياً.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data" style={{ fontSize: "0.84rem" }}>
                    <thead>
                      <tr>
                        <th>الصنف</th>
                        <th style={{ textAlign: "center" }}>الرصيد</th>
                        <th style={{ textAlign: "center" }}>حد الطلب</th>
                        <th style={{ textAlign: "center" }}>العجز</th>
                        <th style={{ textAlign: "center" }}>المقترح طلبه</th>
                        <th style={{ textAlign: "right" }}>التكلفة التقديرية</th>
                        <th style={{ textAlign: "center" }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.reorder_alerts.map((alert) => (
                        <tr key={alert.item_id}>
                          <td>
                            <strong>{alert.name_ar}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontFamily: "monospace" }}>
                              {alert.sku}
                            </div>
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>
                            {alert.available_quantity.toLocaleString()}
                          </td>
                          <td style={{ textAlign: "center" }}>{alert.reorder_level.toLocaleString()}</td>
                          <td style={{ textAlign: "center", color: "#dc2626", fontWeight: 700 }}>
                            {alert.shortage_quantity.toLocaleString()}
                          </td>
                          <td style={{ textAlign: "center", color: "#059669", fontWeight: 800 }}>
                            {alert.suggested_order_qty.toLocaleString()}
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                            {money(alert.estimated_order_cost)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className={`pill ${alert.urgency === "CRITICAL" ? "pill-danger" : "pill-warn"}`}
                              style={{ fontSize: "0.72rem" }}
                            >
                              {alert.urgency_label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* بطاقة الأصناف الراكدة وبطيئة الحركة */}
            <section className="panel">
              <div className="panel-head">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(245, 158, 11, 0.14)",
                      color: "#d97706",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
                      الأصناف الراكدة وبطيئة الحركة (Dead Stock)
                    </h3>
                    <p style={{ margin: "2px 0 0", color: "var(--ink-soft)", fontSize: "0.8rem" }}>
                      بناءً على آخر حركة خروج فعلية سالبة مرحّلة
                    </p>
                  </div>
                </div>

                {/* محدد عتبة الأيام */}
                <select
                  className="input"
                  style={{ height: 32, fontSize: "0.8rem", width: 130 }}
                  value={daysThreshold}
                  onChange={(e) => setDaysThreshold(Number(e.target.value))}
                >
                  <option value={30}>خلال 30 يوم</option>
                  <option value={60}>خلال 60 يوم</option>
                  <option value={90}>خلال 90 يوم</option>
                </select>
              </div>

              {analyticsData.slow_moving_stock.length === 0 ? (
                <div style={{ padding: 36, textAlign: "center", color: "var(--ink-soft)" }}>
                  <CheckCircle2 size={32} color="#10b981" style={{ margin: "0 auto 10px" }} />
                  <h4>معدل دوران المخزون ممتاز</h4>
                  <p style={{ fontSize: "0.85rem" }}>
                    لا توجد أصناف راكدة بدون حركة خروج لأكثر من {daysThreshold} يوم.
                  </p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data" style={{ fontSize: "0.84rem" }}>
                    <thead>
                      <tr>
                        <th>الصنف</th>
                        <th style={{ textAlign: "center" }}>الرصيد الراكد</th>
                        <th style={{ textAlign: "right" }}>رأس المال المجمد</th>
                        <th style={{ textAlign: "center" }}>آخر حركة خروج</th>
                        <th style={{ textAlign: "center" }}>فترة الركود</th>
                        <th style={{ textAlign: "center" }}>التصنيف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.slow_moving_stock.map((slow) => (
                        <tr key={slow.item_id}>
                          <td>
                            <strong>{slow.name_ar}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontFamily: "monospace" }}>
                              {slow.sku}
                            </div>
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>
                            {slow.current_quantity.toLocaleString()}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "#dc2626",
                            }}
                          >
                            {money(slow.frozen_capital)}
                          </td>
                          <td style={{ textAlign: "center", fontSize: "0.78rem", fontFamily: "monospace" }}>
                            {slow.last_out_date}
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 600 }}>{slow.days_inactive}</td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className={`pill ${
                                slow.tone === "danger"
                                  ? "pill-danger"
                                  : slow.tone === "warn"
                                  ? "pill-warn"
                                  : "pill-neutral"
                              }`}
                              style={{ fontSize: "0.72rem" }}
                            >
                              {slow.classification_label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
