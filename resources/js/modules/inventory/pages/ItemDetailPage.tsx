import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Layers,
  Package,
  Printer,
  RefreshCw,
  Search,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { BackBar } from "@/components/ui/BackBar";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";
import { productsApi, Item } from "@/api/products";
import { warehousesApi, Warehouse } from "@/api/warehouses";
import {
  inventoryReportsApi,
  ItemCardData,
  ItemCardTransaction,
} from "@/api/inventoryReports";

interface ItemDetailPageProps {
  itemId?: number | null;
  onBack: () => void;
}

export const ItemDetailPage: React.FC<ItemDetailPageProps> = ({
  itemId: initialItemId,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"card" | "specs" | "balances">("card");
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(initialItemId || null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Filters for Item Card
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [warehouseId, setWarehouseId] = useState<string>("all");

  // Data state
  const [cardData, setCardData] = useState<ItemCardData | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. تحميل قائمة الأصناف والمستودعات
  useEffect(() => {
    let isMounted = true;
    const loadPrerequisites = async () => {
      try {
        setLoadingItems(true);
        const [itemsRes, whs] = await Promise.all([
          productsApi.getItems({ is_active: true, per_page: 200 }),
          warehousesApi.list(),
        ]);

        if (!isMounted) return;
        setItems(itemsRes.data);
        setWarehouses(whs);

        if (!selectedItemId && itemsRes.data.length > 0) {
          setSelectedItemId(itemsRes.data[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load prerequisites", err);
      } finally {
        if (isMounted) setLoadingItems(false);
      }
    };

    loadPrerequisites();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. جلب كارت الصنف
  const loadItemCard = useCallback(async () => {
    if (!selectedItemId) return;
    try {
      setLoadingCard(true);
      setError(null);
      const data = await inventoryReportsApi.fetchItemCard(selectedItemId, {
        date_from: dateFrom,
        date_to: dateTo,
        warehouse_id: warehouseId !== "all" ? warehouseId : undefined,
      });
      setCardData(data);
    } catch (err: any) {
      console.error("Failed to fetch item card", err);
      setError(err.response?.data?.message || "فشل تحميل بيانات كارت الصنف");
    } finally {
      setLoadingCard(false);
    }
  }, [selectedItemId, dateFrom, dateTo, warehouseId]);

  useEffect(() => {
    loadItemCard();
  }, [loadItemCard]);

  // تصدير CSV نظيف ومتوافق مع Excel بالعربية
  const exportCsv = () => {
    if (!cardData || !cardData.transactions.length) return;

    const headers = [
      "رقم القيد",
      "التاريخ",
      "نوع المستند",
      "رقم المستند",
      "الجهة/الطرف",
      "المستودع",
      "الموقع",
      "رقم الدفعة",
      "تاريخ الانتهاء",
      "وارد (+)",
      "منصرف (-)",
      "سعر الوحدة",
      "القيمة المالية",
      "الرصيد التراكمي",
      "القيمة التراكمية",
      "ملاحظات",
    ];

    const rows = cardData.transactions.map((t) => [
      t.entry_number,
      t.entry_date,
      t.voucher_type_label,
      t.voucher_number,
      t.party_name || "—",
      t.warehouse_name,
      t.location_name,
      t.batch_number,
      t.expiry_date,
      t.quantity_in,
      t.quantity_out,
      t.unit_cost,
      t.total_value_delta,
      t.running_balance,
      t.running_value,
      `"${(t.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `item_card_${cardData.item.sku}_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentItem = cardData?.item || items.find((i) => i.id === selectedItemId);

  return (
    <div className="grid" style={{ gap: 20 }}>
      {/* شريط الرجوع والإجراءات العلوية */}
      <BackBar
        onBack={onBack}
        label="العودة للمخزون"
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-ghost"
              onClick={() => window.print()}
              title="طباعة كارت الصنف"
            >
              <Printer size={15} /> طباعة
            </button>
            <button
              className="btn btn-ghost"
              onClick={exportCsv}
              disabled={!cardData || cardData.transactions.length === 0}
              title="تصدير إلى CSV"
            >
              <Download size={15} /> تصدير CSV
            </button>
            <button
              className="btn btn-primary"
              onClick={loadItemCard}
              disabled={loadingCard}
            >
              <RefreshCw size={15} className={loadingCard ? "spin" : ""} /> تحديث
            </button>
          </div>
        }
      />

      {/* لوحة تعريف واختيار الصنف */}
      <section className="panel" style={{ padding: "18px 22px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 280 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary, #059669)",
              }}
            >
              <Package size={26} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
                  {currentItem?.name_ar || "تحميل بيانات الصنف..."}
                </h2>
                {currentItem?.sku && (
                  <span className="pill pill-neutral" style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {currentItem.sku}
                  </span>
                )}
              </div>
              <p style={{ margin: "4px 0 0", color: "var(--ink-soft)", fontSize: "0.85rem" }}>
                {cardData?.item.category_name || (currentItem as any)?.category?.name_ar || "مواد غذائية"} · الوحدة الأساسية:{" "}
                <strong>{cardData?.item.base_uom || (currentItem as any)?.base_uom?.name_ar || "قطعة"}</strong>
              </p>
            </div>
          </div>

          {/* محدد اختيار الصنف السريع */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink-soft)" }}>
              تغيير الصنف:
            </label>
            <select
              className="input"
              style={{ minWidth: 240, height: 38, fontWeight: 600 }}
              value={selectedItemId || ""}
              onChange={(e) => setSelectedItemId(Number(e.target.value))}
              disabled={loadingItems}
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.sku} — {i.name_ar}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* شريط التبويبات الثلاثية */}
        <div
          style={{
            display: "flex",
            gap: 12,
            borderBottom: "1px solid var(--line)",
            marginTop: 20,
            paddingBottom: 2,
          }}
        >
          <button
            className={`btn ${activeTab === "card" ? "btn-primary" : "btn-ghost"}`}
            style={{ borderRadius: "8px 8px 0 0", fontWeight: 700 }}
            onClick={() => setActiveTab("card")}
          >
            <FileText size={16} /> كارت أستاذ الصنف (Ledger Card)
          </button>
          <button
            className={`btn ${activeTab === "specs" ? "btn-primary" : "btn-ghost"}`}
            style={{ borderRadius: "8px 8px 0 0", fontWeight: 700 }}
            onClick={() => setActiveTab("specs")}
          >
            <Layers size={16} /> المواصفات والأسعار
          </button>
        </div>
      </section>

      {/* التبويب الأول: كارت حركة الصنف التاريخي */}
      {activeTab === "card" && (
        <>
          {/* شريط فلاتر الفترة والمستودع */}
          <section className="panel" style={{ padding: "14px 20px" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Filter size={16} color="var(--color-primary)" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>تصفية الفترة:</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>من:</label>
                  <input
                    type="date"
                    className="input"
                    style={{ height: 36, fontSize: "0.85rem" }}
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>إلى:</label>
                  <input
                    type="date"
                    className="input"
                    style={{ height: 36, fontSize: "0.85rem" }}
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              </div>

              <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                الفرز القطعي المعتمد: <strong>التاريخ تصاعدياً ← وقت الإنشاء ← رقم السجل</strong>
              </div>
            </div>
          </section>

          {/* لوحة المؤشرات (KPIs) الخاصة بالصنف */}
          {cardData && (
            <div className="grid grid-4" style={{ gap: 14 }}>
              <div className="kpi-card" style={{ borderRight: "4px solid #3b82f6" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
                  الرصيد الافتتاحي (قبل {dateFrom})
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, margin: "6px 0 2px" }}>
                  {cardData.summary.opening_quantity.toLocaleString()}{" "}
                  <span style={{ fontSize: "0.8rem", fontWeight: 400 }}>{cardData.item.base_uom}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  القيمة: <strong>{money(cardData.summary.opening_value)}</strong>
                </div>
              </div>

              <div className="kpi-card" style={{ borderRight: "4px solid #10b989" }}>
                <div style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600 }}>
                  إجمالي الوارد خلال الفترة (+)
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, margin: "6px 0 2px", color: "#059669" }}>
                  +{cardData.summary.total_in_quantity.toLocaleString()}{" "}
                  <span style={{ fontSize: "0.8rem", fontWeight: 400 }}>{cardData.item.base_uom}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#059669" }}>
                  القيمة: <strong>{money(cardData.summary.total_in_value)}</strong>
                </div>
              </div>

              <div className="kpi-card" style={{ borderRight: "4px solid #ef4444" }}>
                <div style={{ fontSize: "0.8rem", color: "#dc2626", fontWeight: 600 }}>
                  إجمالي المنصرف خلال الفترة (-)
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, margin: "6px 0 2px", color: "#dc2626" }}>
                  -{cardData.summary.total_out_quantity.toLocaleString()}{" "}
                  <span style={{ fontSize: "0.8rem", fontWeight: 400 }}>{cardData.item.base_uom}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#dc2626" }}>
                  القيمة: <strong>{money(cardData.summary.total_out_value)}</strong>
                </div>
              </div>

              <div className="kpi-card" style={{ borderRight: "4px solid #8b5cf6" }}>
                <div style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: 600 }}>
                  الرصيد الختامي في {dateTo}
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, margin: "6px 0 2px", color: "#7c3aed" }}>
                  {cardData.summary.closing_quantity.toLocaleString()}{" "}
                  <span style={{ fontSize: "0.8rem", fontWeight: 400 }}>{cardData.item.base_uom}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6b21a8" }}>
                  القيمة: <strong>{money(cardData.summary.closing_value)}</strong> (متوسط:{" "}
                  {money(cardData.summary.average_unit_cost)})
                </div>
              </div>
            </div>
          )}

          {/* جدول الحركات اللحظية ودفتر أستاذ المخزون */}
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
                  سجل حركة الصنف التفصيلي والرصيد التراكمي
                </h3>
                <p style={{ margin: "3px 0 0", color: "var(--ink-soft)", fontSize: "0.82rem" }}>
                  استناداً حصراً إلى قيود دفتر أستاذ المخزون التراكمي (stock_ledger_entries)
                </p>
              </div>
              {cardData && (
                <span className="pill pill-neutral" style={{ fontWeight: 700 }}>
                  {cardData.transactions.length} حركة مسجلة
                </span>
              )}
            </div>

            {loadingCard ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--ink-soft)" }}>
                <RefreshCw size={28} className="spin" style={{ margin: "0 auto 12px" }} />
                <p>جاري استخراج وتسلسل حركات الصنف التراكمية...</p>
              </div>
            ) : error ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-danger)" }}>
                <p>{error}</p>
                <button className="btn btn-ghost" onClick={loadItemCard}>
                  إعادة المحاولة
                </button>
              </div>
            ) : !cardData || cardData.transactions.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--ink-soft)" }}>
                <Package size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                <h4>لا توجد حركات مسجلة لهذا الصنف في هذه الفترة</h4>
                <p style={{ fontSize: "0.85rem" }}>
                  الرصيد الافتتاحي هو: <strong>{cardData?.summary.opening_quantity ?? 0}</strong> وحدة.
                </p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data" style={{ fontSize: "0.86rem" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 105 }}>التاريخ</th>
                      <th style={{ width: 120 }}>رقم القيد</th>
                      <th>المستند المصدري</th>
                      <th>الجهة / الطرف</th>
                      <th>المستودع والموقع</th>
                      <th>الدفعة والصلاحية</th>
                      <th style={{ textAlign: "center", width: 85 }}>وارد (+)</th>
                      <th style={{ textAlign: "center", width: 85 }}>منصرف (-)</th>
                      <th style={{ textAlign: "right", width: 95 }}>تكلفة الوحدة</th>
                      <th style={{ textAlign: "right", width: 110 }}>فارق القيمة</th>
                      <th style={{ textAlign: "center", width: 110, background: "rgba(139, 92, 246, 0.05)" }}>
                        الرصيد اللحظي
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* سطر الرصيد الافتتاحي */}
                    <tr style={{ background: "rgba(59, 130, 246, 0.04)", fontWeight: 700 }}>
                      <td>{dateFrom}</td>
                      <td>
                        <span className="pill pill-neutral" style={{ fontSize: "0.75rem" }}>
                          افتتاحي
                        </span>
                      </td>
                      <td colSpan={4} style={{ color: "#2563eb" }}>
                        رصيد ما قبل الفترة التاريخية ({dateFrom})
                      </td>
                      <td style={{ textAlign: "center" }}>—</td>
                      <td style={{ textAlign: "center" }}>—</td>
                      <td style={{ textAlign: "right" }}>
                        {cardData.summary.opening_quantity > 0
                          ? money(cardData.summary.opening_value / cardData.summary.opening_quantity)
                          : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>{money(cardData.summary.opening_value)}</td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: 800,
                          color: "#1d4ed8",
                          background: "rgba(59, 130, 246, 0.08)",
                        }}
                      >
                        {cardData.summary.opening_quantity.toLocaleString()}
                      </td>
                    </tr>

                    {/* حركات الفترة */}
                    {cardData.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td style={{ whiteSpace: "nowrap", fontFamily: "monospace" }}>{tx.entry_date}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{tx.entry_number}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              className={`pill ${
                                tx.voucher_type === "sales_invoice"
                                  ? "pill-danger"
                                  : tx.voucher_type === "purchase_invoice"
                                  ? "pill-success"
                                  : "pill-neutral"
                              }`}
                              style={{ fontSize: "0.75rem" }}
                            >
                              {tx.voucher_type_label}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: "0.8rem", fontFamily: "monospace" }}>
                              {tx.voucher_number}
                            </span>
                          </div>
                        </td>
                        <td style={{ color: "var(--ink)" }}>{tx.party_name || "—"}</td>
                        <td>
                          <div style={{ fontSize: "0.82rem" }}>
                            <strong>{tx.warehouse_name}</strong>
                            {tx.location_name !== "—" && (
                              <span style={{ color: "var(--ink-soft)", marginRight: 4 }}>
                                ({tx.location_name})
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {tx.batch_number !== "—" ? (
                            <div style={{ fontSize: "0.78rem", fontFamily: "monospace" }}>
                              <span style={{ fontWeight: 600 }}>{tx.batch_number}</span>
                              <br />
                              <span style={{ color: "#d97706" }}>ص: {tx.expiry_date}</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700, color: "#059669" }}>
                          {tx.quantity_in > 0 ? `+${tx.quantity_in.toLocaleString()}` : "—"}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700, color: "#dc2626" }}>
                          {tx.quantity_out > 0 ? `-${tx.quantity_out.toLocaleString()}` : "—"}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{money(tx.unit_cost)}</td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 600,
                            color: tx.total_value_delta >= 0 ? "#059669" : "#dc2626",
                          }}
                        >
                          {tx.total_value_delta >= 0 ? "+" : ""}
                          {money(tx.total_value_delta)}
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            fontWeight: 800,
                            fontSize: "0.95rem",
                            background: "rgba(139, 92, 246, 0.05)",
                            color: tx.running_balance < 0 ? "#dc2626" : "inherit",
                          }}
                        >
                          {tx.running_balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 800, background: "var(--bg-subtle)", borderTop: "2px solid var(--line)" }}>
                      <td colSpan={6}>الإجمالي وحركة الفترة الصافية:</td>
                      <td style={{ textAlign: "center", color: "#059669" }}>
                        +{cardData.summary.total_in_quantity.toLocaleString()}
                      </td>
                      <td style={{ textAlign: "center", color: "#dc2626" }}>
                        -{cardData.summary.total_out_quantity.toLocaleString()}
                      </td>
                      <td style={{ textAlign: "right" }}>—</td>
                      <td
                        style={{
                          textAlign: "right",
                          color: cardData.summary.net_value_delta >= 0 ? "#059669" : "#dc2626",
                        }}
                      >
                        {cardData.summary.net_value_delta >= 0 ? "+" : ""}
                        {money(cardData.summary.net_value_delta)}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontSize: "1.05rem",
                          color: "#7c3aed",
                          background: "rgba(139, 92, 246, 0.1)",
                        }}
                      >
                        {cardData.summary.closing_quantity.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* التبويب الثاني: المواصفات والأسعار */}
      {activeTab === "specs" && (
        <section className="panel" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontWeight: 800 }}>بيانات الصنف والسياسات المخزنية</h3>
          <div className="grid grid-2" style={{ gap: 20 }}>
            <div>
              <label className="label">
                الاسم بالعربية
                <input className="input" defaultValue={currentItem?.name_ar} readOnly />
              </label>
              <label className="label" style={{ marginTop: 12 }}>
                رمز SKU
                <input className="input" defaultValue={currentItem?.sku} readOnly />
              </label>
              <label className="label" style={{ marginTop: 12 }}>
                الباركود الدولي
                <input className="input" defaultValue={currentItem?.barcode || "—"} readOnly />
              </label>
            </div>
            <div>
              <label className="label">
                التكلفة المعيارية الحالية
                <input className="input" defaultValue={money(Number((currentItem as any)?.cost_price || (currentItem as any)?.standard_cost || 0))} readOnly />
              </label>
              <label className="label" style={{ marginTop: 12 }}>
                حد إعادة الطلب (Reorder Point)
                <input className="input" defaultValue={currentItem?.reorder_level || 0} readOnly />
              </label>
              <label className="label" style={{ marginTop: 12 }}>
                حالة الصنف
                <div style={{ marginTop: 6 }}>
                  <StatusPill status={(currentItem as any)?.is_active ?? true ? "نشط" : "معطل"} />
                </div>
              </label>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
