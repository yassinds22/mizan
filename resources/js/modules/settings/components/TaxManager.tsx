import React, { useState } from "react";
import {
  Scale,
  Plus,
  Edit2,
  Calendar,
  History,
  CheckCircle2,
  Calculator,
  Percent,
  AlertCircle,
  X,
} from "lucide-react";
import { coreApi, TaxCategoryApi, TaxRateApi } from "@/api/core";

interface TaxManagerProps {
  categories: TaxCategoryApi[];
  onReload: () => void;
  onNotify: (msg: string) => void;
}

export const TaxManager: React.FC<TaxManagerProps> = ({
  categories,
  onReload,
  onNotify,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TaxCategoryApi | null>(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyRates, setHistoryRates] = useState<TaxRateApi[]>([]);
  const [newRate, setNewRate] = useState<string>("15");
  const [validFrom, setValidFrom] = useState<string>(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  // Live Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcCategory, setCalcCategory] = useState<string>("STANDARD");
  const [calcResult, setCalcResult] = useState<{
    rate: number;
    tax_amount: number;
    total_with_tax: number;
  } | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const handleOpenAddRate = (cat: TaxCategoryApi) => {
    setSelectedCategory(cat);
    setNewRate(cat.current_rate ? String(cat.current_rate.rate_float) : "15");
    setValidFrom(new Date().toISOString().split("T")[0]);
    setRateModalOpen(true);
  };

  const handleOpenHistory = async (cat: TaxCategoryApi) => {
    setSelectedCategory(cat);
    try {
      const data = await coreApi.getTaxRatesHistory(cat.id);
      setHistoryRates(data);
      setHistoryModalOpen(true);
    } catch (err: any) {
      onNotify("تعذر جلب سجل نسب الضريبة");
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    try {
      setSubmitting(true);
      await coreApi.addTaxRate(selectedCategory.id, {
        rate: parseFloat(newRate),
        valid_from: validFrom,
        is_active: true,
      });
      onNotify(`تم تحديث نسبة ${selectedCategory.name} بنجاح`);
      setRateModalOpen(false);
      onReload();
    } catch (err: any) {
      const msg = err.response?.data?.message || "تعذر حفظ نسبة الضريبة";
      onNotify(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCalculate = async () => {
    try {
      setCalcLoading(true);
      const res = await coreApi.calculateTax({
        taxable_amount: calcAmount,
        category: calcCategory,
      });
      setCalcResult(res);
    } catch (err: any) {
      onNotify("تعذر احتساب الضريبة من الخادم");
    } finally {
      setCalcLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 1. جدول فئات الضريبة الرسمية */}
      <section className="panel" style={{ background: "#fff" }}>
        <div className="panel-head">
          <div>
            <h3>فئات ونسب ضريبة القيمة المضافة (ZATCA VAT)</h3>
            <p>الفئات القانونية المعتمدة لاحتساب ضريبة الفواتير وسندات القبض</p>
          </div>
        </div>

        <div className="panel-body" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "right" }}>
                <th style={{ padding: "10px 12px" }}>كود الفئة</th>
                <th style={{ padding: "10px 12px" }}>اسم الفئة والوصف</th>
                <th style={{ padding: "10px 12px" }}>النسبة الحالية %</th>
                <th style={{ padding: "10px 12px" }}>تاريخ السريان</th>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      {c.code}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{c.description}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: c.current_rate && c.current_rate.rate_float > 0 ? "#059669" : "#64748b",
                      }}
                    >
                      {c.current_rate ? `${Number(c.current_rate.rate).toFixed(1)}%` : "0.0%"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#475569" }}>
                    {c.current_rate?.valid_from || "—"}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "left" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleOpenHistory(c)}
                        style={{ fontSize: 12, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                        title="سجل النسب وتواريخ السريان"
                      >
                        <History size={13} /> السجل
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleOpenAddRate(c)}
                        style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <Plus size={13} /> نسبة جديدة
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. حاسبة الضريبة الفورية لاختبار العمليات مباشرة */}
      <section className="panel" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div className="panel-head" style={{ borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1d4ed8",
              }}
            >
              <Calculator size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, margin: 0 }}>حاسبة الضريبة المباشرة (Live Tax Engine)</h3>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
                اختبار فوري لمحرك احتساب الضريبة في الخادم
              </p>
            </div>
          </div>
        </div>

        <div className="panel-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
            <label className="label" style={{ margin: 0 }}>
              المبلغ الخاضع للضريبة (ر.س)
              <input
                type="number"
                min="0"
                step="0.01"
                value={calcAmount}
                onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
              />
            </label>

            <label className="label" style={{ margin: 0 }}>
              فئة الضريبة
              <select
                value={calcCategory}
                onChange={(e) => setCalcCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.name} ({c.current_rate ? `${Number(c.current_rate.rate).toFixed(0)}%` : "0%"})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCalculate}
              disabled={calcLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                height: 38,
              }}
            >
              <Calculator size={15} /> {calcLoading ? "جارِ الحساب..." : "احسب الضريبة"}
            </button>
          </div>

          {calcResult && (
            <div
              style={{
                marginTop: 14,
                padding: "12px 16px",
                borderRadius: 8,
                background: "#fff",
                border: "1px solid #cbd5e1",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontSize: 12, color: "#64748b" }}>نسبة الضريبة المطبقة: </span>
                <strong style={{ color: "#0f172a" }}>{calcResult.rate}%</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#64748b" }}>مبلغ الضريبة: </span>
                <strong style={{ color: "#2563eb", fontSize: 15 }}>
                  {calcResult.tax_amount.toFixed(2)} ر.س
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#64748b" }}>الإجمالي شامل الضريبة: </span>
                <strong style={{ color: "#059669", fontSize: 16 }}>
                  {calcResult.total_with_tax.toFixed(2)} ر.س
                </strong>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* مودال إضافة نسبة ضريبة جديدة */}
      {rateModalOpen && selectedCategory && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: 10,
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                تحديث نسبة ضريبة: {selectedCategory.name}
              </h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setRateModalOpen(false)}
                style={{ padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="label">
                نسبة الضريبة %
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                />
              </label>

              <label className="label">
                تاريخ بداية السريان (Valid From)
                <input
                  type="date"
                  required
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </label>

              <div style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: 8, borderRadius: 6 }}>
                💡 عند إضافة نسبة جديدة بتاريخ سريان، يعتمد النظام تلقائياً النسبة المناسبة لأي فاتورة حسب تاريخ إصدارها.
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setRateModalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "جارِ الحفظ..." : "حفظ النسبة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال سجل نسب الضريبة وتاريخ السريان */}
      {historyModalOpen && selectedCategory && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: 10,
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                سجل نسب الضريبة: {selectedCategory.name}
              </h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setHistoryModalOpen(false)}
                style={{ padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>
                    <th style={{ padding: "8px 10px" }}>النسبة %</th>
                    <th style={{ padding: "8px 10px" }}>تاريخ السريان</th>
                    <th style={{ padding: "8px 10px" }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRates.map((r, idx) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#059669" }}>
                        {Number(r.rate).toFixed(2)}%
                      </td>
                      <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>
                        {r.valid_from}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {idx === 0 ? (
                          <span
                            style={{
                              background: "#f0fdf4",
                              color: "#166534",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 6,
                            }}
                          >
                            الحالية
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 11 }}>سابقة</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setHistoryModalOpen(false)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
