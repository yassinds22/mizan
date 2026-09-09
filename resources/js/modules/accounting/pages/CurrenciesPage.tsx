import React, { useEffect, useState } from "react";
import {
  Coins,
  Plus,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  History,
  Star,
  Power,
  Sliders,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { coreApi, CurrencyApi, ExchangeRateApi } from "@/api/core";

export const CurrenciesPage: React.FC = () => {
  const [currencies, setCurrencies] = useState<CurrencyApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyApi | null>(null);

  // New Currency Form State
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newDecimals, setNewDecimals] = useState(2);
  const [newIsBase, setNewIsBase] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Update Rate Form State
  const [rateCurrencyId, setRateCurrencyId] = useState<number | "">("");
  const [updateRateValue, setUpdateRateValue] = useState("");
  const [updateRateDate, setUpdateRateDate] = useState(new Date().toISOString().slice(0, 10));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const openHistory = async (currency: CurrencyApi) => {
    setSelectedCurrency(currency);
    setHistoryModalOpen(true);
    try {
      const history = await coreApi.getExchangeRatesHistory(currency.id);
      setSelectedCurrency((prev) => (prev ? { ...prev, exchange_rates: history } : prev));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const data = await coreApi.getCurrencies();
      setCurrencies(data);
    } catch (err) {
      console.error(err);
      showToast("تعذر جلب بيانات العملات من الخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const handleCreateCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || !newSymbol) {
      showToast("يرجى ملء كود العملة واسمها ورمزها");
      return;
    }
    setSubmitting(true);
    try {
      await coreApi.createCurrency({
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        symbol: newSymbol.trim(),
        decimal_places: Number(newDecimals),
        is_base_currency: newIsBase,
        initial_rate: newRate ? Number(newRate) : undefined,
      });
      showToast(`تمت إضافة العملة (${newCode.toUpperCase()}) بنجاح`);
      setAddModalOpen(false);
      // Reset form
      setNewCode("");
      setNewName("");
      setNewSymbol("");
      setNewDecimals(2);
      setNewIsBase(false);
      setNewRate("");
      fetchCurrencies();
    } catch (err: any) {
      const msg = err.response?.data?.message || "حدث خطأ أثناء إضافة العملة";
      showToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateCurrencyId || !updateRateValue) {
      showToast("يرجى اختيار العملة وتحديد سعر الصرف الجديد");
      return;
    }
    setSubmitting(true);
    try {
      await coreApi.addExchangeRate(Number(rateCurrencyId), {
        rate: Number(updateRateValue),
        valid_from: updateRateDate,
      });
      showToast("تم تحديث سعر الصرف وتثبيته في السجل بنجاح");
      setRateModalOpen(false);
      setUpdateRateValue("");
      fetchCurrencies();
    } catch (err: any) {
      const msg = err.response?.data?.message || "تعذر حفظ سعر الصرف";
      showToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCurrency = async (currency: CurrencyApi) => {
    if (currency.is_base_currency) {
      showToast("لا يمكن تعطيل العملة الأساسية للنظام");
      return;
    }
    try {
      await coreApi.toggleCurrency(currency.id);
      showToast(`تم ${currency.is_active ? "تعطيل" : "تفعيل"} عملة (${currency.code})`);
      fetchCurrencies();
    } catch (err: any) {
      showToast(err.response?.data?.message || "فشلت العملية");
    }
  };

  const baseCurrency = currencies.find((c) => c.is_base_currency);
  const activeCount = currencies.filter((c) => c.is_active).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 1. بطاقات المؤشرات العلوية */}
      <div className="grid grid-3" style={{ gap: 14 }}>
        {/* بطاقة العملة الأساسية */}
        <div
          style={{
            background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
            color: "#fff",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 14px rgba(5, 150, 105, 0.2)",
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.85, display: "flex", alignItems: "center", gap: 5 }}>
              <Star size={13} fill="#fbbf24" color="#fbbf24" /> العملة الأساسية للنظام
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
              {baseCurrency ? `${baseCurrency.name} (${baseCurrency.code})` : "ريال سعودي (SAR)"}
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
              كافة القيود والدفاتر المحاسبية تُقوّم بها (1.000)
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Coins size={24} />
          </div>
        </div>

        {/* بطاقة العملات النشطة */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "16px 20px",
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>العملات المعتمدة</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
              {activeCount} <span style={{ fontSize: 13, fontWeight: 500, color: "#64748b" }}>من إجمالي {currencies.length}</span>
            </div>
            <div style={{ fontSize: 11, color: "#059669", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={12} /> تدعم التسعير والتحويل الآلي
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DollarSign size={22} />
          </div>
        </div>

        {/* بطاقة آخر تحديث لأسعار الصرف */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "16px 20px",
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>سجل أسعار الصرف التاريخي</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
              نشط ومحدّث
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              يتم حفظ كل تغيير مع تاريخ السريان
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* 2. اللوحة الرئيسية: جدول العملات مع الأزرار والإجراءات */}
      <section className="panel" style={{ background: "#fff" }}>
        <div
          className="panel-head"
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              قائمة العملات وأسعار الصرف المعتمدة
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              تُستخدم في فواتير المبيعات، المشتريات، وتعدد العملات في القيود اليومية
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn"
              onClick={fetchCurrencies}
              disabled={loading}
              title="تحديث البيانات"
              style={{ fontSize: 13, padding: "7px 12px" }}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>

            <button
              className="btn"
              onClick={() => {
                const firstNonBase = currencies.find((c) => !c.is_base_currency);
                if (firstNonBase) setRateCurrencyId(firstNonBase.id);
                setRateModalOpen(true);
              }}
              style={{
                fontSize: 13,
                padding: "7px 14px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderColor: "#cbd5e1",
              }}
            >
              <TrendingUp size={14} color="#2563eb" /> تحديث سعر صرف
            </button>

            <button
              className="btn btn-primary"
              onClick={() => setAddModalOpen(true)}
              style={{
                fontSize: 13,
                padding: "7px 16px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
              }}
            >
              <Plus size={15} /> إضافة عملة جديدة
            </button>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <table className="w-full" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  textAlign: "right",
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                <th style={{ padding: "12px 18px" }}>كود العملة</th>
                <th style={{ padding: "12px 18px" }}>اسم العملة</th>
                <th style={{ padding: "12px 18px" }}>الرمز</th>
                <th style={{ padding: "12px 18px" }}>النوع</th>
                <th style={{ padding: "12px 18px" }}>سعر الصرف الحالي (مقابل الأساس)</th>
                <th style={{ padding: "12px 18px" }}>تاريخ السريان</th>
                <th style={{ padding: "12px 18px" }}>الحالة</th>
                <th style={{ padding: "12px 18px", textAlign: "left" }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((currency) => {
                const isBase = currency.is_base_currency;
                const latestRate = currency.latest_exchange_rate;

                return (
                  <tr
                    key={currency.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: isBase ? "#f0fdf422" : "transparent",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* كود العملة */}
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 800,
                            fontSize: 14,
                            background: isBase ? "#dcfce7" : "#e2e8f0",
                            color: isBase ? "#15803d" : "#1e293b",
                            padding: "3px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {currency.code}
                        </span>
                      </div>
                    </td>

                    {/* اسم العملة */}
                    <td style={{ padding: "14px 18px", fontWeight: 700, color: "#0f172a" }}>
                      {currency.name}
                    </td>

                    {/* الرمز */}
                    <td style={{ padding: "14px 18px", fontSize: 15, fontWeight: 700, color: "#475569" }}>
                      {currency.symbol}
                    </td>

                    {/* النوع */}
                    <td style={{ padding: "14px 18px" }}>
                      {isBase ? (
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Star size={11} fill="#15803d" /> أساسية
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: 12,
                          }}
                        >
                          أجنبية
                        </span>
                      )}
                    </td>

                    {/* سعر الصرف */}
                    <td style={{ padding: "14px 18px" }}>
                      {isBase ? (
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#166534" }}>
                          1.000000 (أساس)
                        </span>
                      ) : latestRate ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 800,
                              fontSize: 14,
                              color: "#2563eb",
                            }}
                          >
                            {Number(latestRate.rate).toFixed(currency.decimal_places || 2)}
                          </span>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {baseCurrency?.symbol || "ر.س"}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "#dc2626", fontSize: 12, display: "flex", alignItems: "center", gap: 3 }}>
                          <AlertCircle size={12} /> لم يحدد بعد
                        </span>
                      )}
                    </td>

                    {/* تاريخ السريان */}
                    <td style={{ padding: "14px 18px", color: "#64748b", fontSize: 12 }}>
                      {isBase ? "دائم" : latestRate?.valid_from ? String(latestRate.valid_from).slice(0, 10) : "—"}
                    </td>

                    {/* الحالة */}
                    <td style={{ padding: "14px 18px" }}>
                      <span
                        style={{
                          background: currency.is_active ? "#f0fdf4" : "#fef2f2",
                          color: currency.is_active ? "#15803d" : "#991b1b",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 8,
                        }}
                      >
                        {currency.is_active ? "نشطة" : "معطلة"}
                      </span>
                    </td>

                    {/* الإجراءات */}
                    <td style={{ padding: "14px 18px", textAlign: "left" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {/* سجل أسعار الصرف */}
                        {!isBase && (
                          <button
                            type="button"
                            className="btn"
                            title="عرض السجل التاريخي لأسعار الصرف"
                            onClick={() => openHistory(currency)}
                            style={{ padding: "4px 8px", fontSize: 12, color: "#475569" }}
                          >
                            <History size={13} />
                          </button>
                        )}

                        {/* زر إضافة سعر جديد */}
                        {!isBase && (
                          <button
                            type="button"
                            className="btn"
                            title="تحديث سعر الصرف"
                            onClick={() => {
                              setRateCurrencyId(currency.id);
                              setRateModalOpen(true);
                            }}
                            style={{ padding: "4px 8px", fontSize: 12, color: "#2563eb" }}
                          >
                            <ArrowUpRight size={13} /> تحديث السعر
                          </button>
                        )}

                        {/* زر تفعيل/تعطيل */}
                        {!isBase && (
                          <button
                            type="button"
                            className="btn"
                            title={currency.is_active ? "تعطيل العملة" : "تفعيل العملة"}
                            onClick={() => handleToggleCurrency(currency)}
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              color: currency.is_active ? "#dc2626" : "#059669",
                            }}
                          >
                            <Power size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= MODAL 1: إضافة عملة جديدة ================= */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="إضافة عملة جديدة"
        subtitle="تعريف عملة معتمدة للتعاملات المالية والفواتير"
      >
        <form onSubmit={handleCreateCurrency} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <label className="label">
              كود العملة (ISO 3)
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="USD / EUR"
                maxLength={3}
                style={{ fontFamily: "monospace", fontWeight: 700 }}
                required
              />
            </label>

            <label className="label">
              اسم العملة بالعربية
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: يورو أوروبي"
                required
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label className="label">
              رمز العملة
              <input
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                placeholder="مثال: € أو د.ك"
                required
              />
            </label>

            <label className="label">
              عدد المنازل العشرية
              <input
                type="number"
                min={0}
                max={4}
                value={newDecimals}
                onChange={(e) => setNewDecimals(Number(e.target.value))}
              />
            </label>
          </div>

          {/* سعر الصرف المبدئي إذا لم تكن أساسية */}
          {!newIsBase && (
            <label className="label">
              سعر الصرف المبدئي (مقابل {baseCurrency?.name || "الريال السعودي"})
              <input
                type="number"
                step="0.000001"
                min="0.000001"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="مثال: 4.150000"
              />
            </label>
          )}

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
              background: "#f8fafc",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            <input
              type="checkbox"
              checked={newIsBase}
              onChange={(e) => setNewIsBase(e.target.checked)}
            />
            <span style={{ fontWeight: 600 }}>تعيين كعملة أساسية للنظام (Base Currency)</span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => setAddModalOpen(false)}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "جاري الحفظ..." : "حفظ العملة"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL 2: تحديث سعر الصرف ================= */}
      <Modal
        isOpen={rateModalOpen}
        onClose={() => setRateModalOpen(false)}
        title="تحديث سعر الصرف"
        subtitle={`تسجيل سعر صرف جديد مقابل العملة الأساسية (${baseCurrency?.name || "الريال السعودي"})`}
      >
        <form onSubmit={handleAddRate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label className="label">
            اختر العملة
            <select
              value={rateCurrencyId}
              onChange={(e) => setRateCurrencyId(Number(e.target.value))}
              required
            >
              <option value="">-- اختر عملة --</option>
              {currencies
                .filter((c) => !c.is_base_currency)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) — الرمز {c.symbol}
                  </option>
                ))}
            </select>
          </label>

          <label className="label">
            سعر الصرف الجديد (1 وحدة من العملة = كم {baseCurrency?.symbol || "ر.س"})
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              value={updateRateValue}
              onChange={(e) => setUpdateRateValue(e.target.value)}
              placeholder="مثال: 3.750000"
              required
            />
          </label>

          <label className="label">
            تاريخ بدء السريان
            <input
              type="date"
              value={updateRateDate}
              onChange={(e) => setUpdateRateDate(e.target.value)}
              required
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => setRateModalOpen(false)}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "جاري الحفظ..." : "تثبيت سعر الصرف"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL 3: السجل التاريخي لأسعار الصرف ================= */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`السجل التاريخي لأسعار: ${selectedCurrency?.name || ""}`}
        subtitle={`تغيرات سعر صرف (${selectedCurrency?.code}) مقابل ${baseCurrency?.name || "الريال"}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selectedCurrency?.exchange_rates && selectedCurrency.exchange_rates.length > 0 ? (
            <table className="w-full" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "right", color: "#64748b" }}>
                  <th style={{ padding: 8 }}>تاريخ السريان</th>
                  <th style={{ padding: 8 }}>سعر الصرف</th>
                  <th style={{ padding: 8 }}>تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {selectedCurrency.exchange_rates.map((rate) => (
                  <tr key={rate.id} style={{ borderBottom: "1px dashed #f1f5f9" }}>
                    <td style={{ padding: 8, fontWeight: 700 }}>{rate.valid_from}</td>
                    <td style={{ padding: 8, fontFamily: "monospace", color: "#2563eb", fontWeight: 700 }}>
                      {Number(rate.rate).toFixed(6)} {baseCurrency?.symbol || "ر.س"}
                    </td>
                    <td style={{ padding: 8, color: "#94a3b8", fontSize: 11 }}>
                      {rate.created_at ? String(rate.created_at).slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
              لا يوجد سجل أسعار تاريخية سابقة لهذه العملة
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => setHistoryModalOpen(false)}>
              إغلاق
            </button>
          </div>
        </div>
      </Modal>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
