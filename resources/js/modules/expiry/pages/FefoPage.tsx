import React, { useMemo, useState, useEffect } from "react";
import { Percent, ShoppingCart, ArrowRightLeft, Sparkles, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { inventoryApi, ItemBatch } from "@/api/inventory";
import { StatusPill } from "@/components/ui/StatusPill";
import { money } from "@/utils/formatters";

interface FefoPageProps {
  onOpenInvoice?: () => void;
  onOpenStockMove?: () => void;
}

export const FefoPage: React.FC<FefoPageProps> = ({ onOpenInvoice, onOpenStockMove }) => {
  const [batches, setBatches] = useState<ItemBatch[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadBatches = async () => {
    try {
      setLoading(true);
      // Fetch only active batches ordered by earliest expiry (FEFO)
      const data = await inventoryApi.listBatches({ fefo: true, status: "active" });
      setBatches(data);
      // Pre-select batches with <= 14 days
      const urgent = data.filter((b) => (b.days_until_expiry ?? 999) <= 14).map((b) => b.id);
      setSelectedBatchIds(urgent);
    } catch (err: any) {
      showToast(err.message || "فشل تحميل دفعات FEFO");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBatchIds.length === batches.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(batches.map((b) => b.id));
    }
  };

  // Selected batches total value & quantity
  const selectedBatches = useMemo(
    () => batches.filter((b) => selectedBatchIds.includes(b.id)),
    [batches, selectedBatchIds]
  );

  const selectedTotalValue = useMemo(() => {
    return selectedBatches.reduce((sum, b) => {
      const qty = b.current_quantity ?? 0;
      const val = b.total_value ?? (qty * Number(b.unit_cost || 0));
      return sum + Number(val);
    }, 0);
  }, [selectedBatches]);

  const selectedTotalQty = useMemo(() => {
    return selectedBatches.reduce((sum, b) => sum + Number(b.current_quantity ?? 0), 0);
  }, [selectedBatches]);

  const highPriorityCount = batches.filter((b) => (b.days_until_expiry ?? 999) <= 10).length;

  const getSuggestedAction = (b: ItemBatch) => {
    const days = b.days_until_expiry ?? 999;
    if (days <= 5) {
      return { text: "تصفية عاجلة بخصم 35%", tone: "danger" };
    }
    if (days <= 14) {
      return { text: "أولوية صرف في المبيعات الأولى", tone: "warn" };
    }
    if (days <= 30) {
      return { text: "عرض ترويجي مخفض 15%", tone: "info" };
    }
    return { text: "صرف اعتيادي مجدول", tone: "ok" };
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Top Metrics Cards */}
      <div className="grid grid-3">
        <div className="kpi danger">
          <h3>أولوية صرف قصوى</h3>
          <div className="value" style={{ fontSize: 28 }}>
            {highPriorityCount} <span style={{ fontSize: 13, fontWeight: "normal" }}>تشغيلة</span>
          </div>
          <div className="hint">تنتهي خلال أقل من 10 أيام</div>
        </div>

        <div className="kpi warm">
          <h3>القيمة المحددة للتصفية / الصرف</h3>
          <div className="value" style={{ fontSize: 26 }}>
            {money(selectedTotalValue)}
          </div>
          <div className="hint">
            إجمالي {selectedTotalQty.toLocaleString()} وحدة ({selectedBatchIds.length} دفعة محددة)
          </div>
        </div>

        <div className="kpi info">
          <h3>اقتراحات FEFO الجاهزة</h3>
          <div className="value" style={{ fontSize: 28 }}>
            {batches.length} <span style={{ fontSize: 13, fontWeight: "normal" }}>دفعة نشطة</span>
          </div>
          <div className="hint">مرتبة تنازلياً حسب أسبقية الانتهاء</div>
        </div>
      </div>

      {/* FEFO Operations Table Panel */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>قائمة التوزيع والتصفية الذكية (FEFO Smart Allocation)</h3>
            <p>رتّبت تلقائياً وفق سياسة ما ينتهي أولاً يخرج أولاً لحماية المنشأة من الهدر المالي</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn btn-warn"
              onClick={() => showToast(`تم إنشاء مذكرة خصم ترويجي لـ ${selectedBatchIds.length} دفعة بنجاح`)}
              disabled={selectedBatchIds.length === 0}
            >
              <Percent size={15} /> تطبيق خصم ترويجي
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onOpenInvoice?.()}
              disabled={selectedBatchIds.length === 0}
            >
              <ShoppingCart size={15} /> فتح فاتورة بيع للدفعات
            </button>
            <button
              className="btn btn-ghost"
              onClick={loadBatches}
              title="تحديث القائمة"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selectedBatchIds.length === batches.length && batches.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>أسبقية FEFO</th>
                <th>رقم الدفعة</th>
                <th>الصنف الغذائي</th>
                <th>المستودع والموقع</th>
                <th>الكمية المتاحة</th>
                <th>الأيام المتبقية</th>
                <th>القيمة الإجمالية</th>
                <th>الإجراء التشغيلي المقترح</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 24 }}>
                    جاري احتساب وتطبيق معايير FEFO...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 24, opacity: 0.7 }}>
                    لا توجد دفعات نشطة متاحة للتخصيص حالياً.
                  </td>
                </tr>
              ) : (
                batches.map((b, idx) => {
                  const isSelected = selectedBatchIds.includes(b.id);
                  const act = getSuggestedAction(b);
                  const totalQty = b.current_quantity ?? 0;
                  const totalVal = b.total_value ?? (totalQty * Number(b.unit_cost || 0));
                  const whDetails = (b.warehouses || [])
                    .map((w) => `${w.warehouse_name || w.warehouse_code} (${w.available_quantity})`)
                    .join(" · ");

                  return (
                    <tr
                      key={b.id}
                      style={{
                        backgroundColor: isSelected ? "rgba(59, 130, 246, 0.04)" : undefined,
                      }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(b.id)}
                        />
                      </td>
                      <td>
                        <span
                          className="pill"
                          style={{
                            fontWeight: 700,
                            backgroundColor: idx === 0 ? "#fee2e2" : idx < 3 ? "#fef3c7" : "#e0f2fe",
                            color: idx === 0 ? "#991b1b" : idx < 3 ? "#92400e" : "#075985",
                          }}
                        >
                          #{idx + 1} أولوية
                        </span>
                      </td>
                      <td className="amount" style={{ fontWeight: 600 }}>
                        {b.batch_number}
                      </td>
                      <td>
                        <strong>{b.item?.name_ar || "-"}</strong>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{b.item?.sku}</div>
                      </td>
                      <td>{whDetails || "المستودع الرئيسي"}</td>
                      <td className="amount" style={{ fontWeight: 600 }}>
                        {Number(totalQty).toLocaleString()} {b.item?.base_uom?.name_ar || "وحدة"}
                      </td>
                      <td className="amount">
                        <span
                          style={{
                            fontWeight: 700,
                            color: (b.days_until_expiry ?? 0) <= 10 ? "#ef4444" : (b.days_until_expiry ?? 0) <= 30 ? "#f59e0b" : "inherit",
                          }}
                        >
                          {b.days_until_expiry} يوم ({b.expiry_date?.split("T")[0]})
                        </span>
                      </td>
                      <td className="amount">{money(totalVal)}</td>
                      <td>
                        <span
                          className={`pill pill-${act.tone === "danger" ? "danger" : act.tone === "warn" ? "warn" : "info"}`}
                          style={{ fontSize: 11 }}
                        >
                          {act.text}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Toast Notification */}
      {toast && (
        <div
          className="toast toast-center"
          style={{
            position: "fixed",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "16px 28px",
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
