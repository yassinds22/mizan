import React, { useEffect, useState } from "react";
import {
  Save,
  Building2,
  Printer,
  Scale,
  CalendarDays,
  CheckCircle2,
  Sparkles,
  QrCode,
  RotateCcw,
  Receipt,
  FileText,
  ShieldCheck,
  Coins,
  MapPin,
  Clock,
  Lock,
} from "lucide-react";
import { coreApi, CurrencyApi, BranchApi, FiscalPeriodApi, TaxCategoryApi } from "@/api/core";
import { BranchManager } from "@/modules/settings/components/BranchManager";
import { TaxManager } from "@/modules/settings/components/TaxManager";
import type { PageId } from "@/types/navigation";

type SettingsTab = "company" | "print" | "fiscal" | "branches";

interface SettingsPageProps {
  onNavigate?: (page: PageId) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");
  const [toast, setToast] = useState<string | null>(null);

  // Core Data from API
  const [currencies, setCurrencies] = useState<CurrencyApi[]>([]);
  const [branches, setBranches] = useState<BranchApi[]>([]);
  const [periods, setPeriods] = useState<FiscalPeriodApi[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategoryApi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Form States - Company
  const [companyName, setCompanyName] = useState("ميزان للتجارة الغذائية");
  const [taxNumber, setTaxNumber] = useState("310123456700003");
  const [crNumber, setCrNumber] = useState("1010123456");
  const [city, setCity] = useState("الرياض");
  const [address, setAddress] = useState("حي الصناعية، طريق الخرج، الرياض");

  // Form States - Fiscal & Policy
  const [vatRate, setVatRate] = useState("15");
  const [fiscalStartDate, setFiscalStartDate] = useState("2026-01-01");
  const [selectedCurrency, setSelectedCurrency] = useState("SAR");
  const [stockPolicy, setStockPolicy] = useState("FEFO");

  // Form States - Print Template
  const [logoText, setLogoText] = useState("ميزان للتجارة الغذائية");
  const [footerText, setFooterText] = useState("شكراً لتعاملكم معنا — نسعد بخدمتكم دائماً");
  const [legalNote, setLegalNote] = useState(
    "فاتورة ضريبية مبسطة صادرة طبقاً لأحكام ولائحة الفوترة الإلكترونية بالمملكة العربية السعودية."
  );
  const [paperType, setPaperType] = useState<"thermal" | "a4">("thermal");
  const [showQr, setShowQr] = useState(true);

  useEffect(() => {
    coreApi
      .getCurrencies()
      .then((data) => {
        setCurrencies(data);
        const base = data.find((c) => c.is_base_currency);
        if (base) setSelectedCurrency(base.code);
      })
      .catch((e) => console.error(e));

    coreApi
      .getBranches()
      .then((data) => setBranches(data))
      .catch((e) => console.error(e));

    coreApi
      .getFiscalPeriods()
      .then((data) => setPeriods(data))
      .catch((e) => console.error(e));

    coreApi
      .getTaxCategories()
      .then((data) => {
        setTaxCategories(data);
        const standard = data.find((t) => t.code === "STANDARD");
        if (standard && standard.current_rate) {
          setVatRate(String(standard.current_rate.rate_float));
        }
      })
      .catch((e) => console.error(e));

    coreApi
      .getSettings()
      .then((s) => {
        if (s.company_name) setCompanyName(s.company_name);
        if (s.tax_number) setTaxNumber(s.tax_number);
        if (s.cr_number) setCrNumber(s.cr_number);
        if (s.city) setCity(s.city);
        if (s.address) setAddress(s.address);
        if (s.logo_text) setLogoText(s.logo_text);
        if (s.footer_text) setFooterText(s.footer_text);
        if (s.legal_note) setLegalNote(s.legal_note);
        if (s.paper_type) setPaperType(s.paper_type as any);
        if (s.show_qr !== undefined) setShowQr(s.show_qr === "1" || s.show_qr === true);
        if (s.vat_rate) setVatRate(s.vat_rate);
        if (s.fiscal_start_date) setFiscalStartDate(s.fiscal_start_date);
        if (s.stock_policy) setStockPolicy(s.stock_policy);
        if (s.base_currency_code) setSelectedCurrency(s.base_currency_code);
      })
      .catch((e) => console.error("Error loading settings:", e))
      .finally(() => setLoading(false));
  }, []);

  const reloadBranches = () => {
    coreApi
      .getBranches()
      .then((data) => setBranches(data))
      .catch((e) => console.error(e));
  };

  const reloadTaxCategories = () => {
    coreApi
      .getTaxCategories()
      .then((data) => {
        setTaxCategories(data);
        const standard = data.find((t) => t.code === "STANDARD");
        if (standard && standard.current_rate) {
          setVatRate(String(standard.current_rate.rate_float));
        }
      })
      .catch((e) => console.error(e));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        company_name: companyName,
        tax_number: taxNumber,
        cr_number: crNumber,
        city: city,
        address: address,

        logo_text: logoText,
        footer_text: footerText,
        legal_note: legalNote,
        paper_type: paperType,
        show_qr: showQr ? "1" : "0",

        vat_rate: vatRate,
        fiscal_start_date: fiscalStartDate,
        stock_policy: stockPolicy,
        selected_currency: selectedCurrency,
      };

      const res = await coreApi.updateSettings(payload);

      // Refresh currencies in case base currency was switched
      const updatedCurrencies = await coreApi.getCurrencies();
      setCurrencies(updatedCurrencies);

      setToast(res.message || "تم حفظ كافة الإعدادات والسياسات بنجاح في قاعدة البيانات");
    } catch (err: any) {
      const msg = err.response?.data?.message || "حدث خطأ أثناء حفظ الإعدادات";
      setToast(msg);
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const resetPrintTemplate = () => {
    setLogoText(companyName || "ميزان للتجارة الغذائية");
    setFooterText("شكراً لتعاملكم معنا — نسعد بخدمتكم دائماً");
    setLegalNote("فاتورة ضريبية مبسطة صادرة طبقاً لأحكام ولائحة الفوترة الإلكترونية بالمملكة العربية السعودية.");
    setPaperType("thermal");
    setShowQr(true);
    setToast("تمت استعادة قالب الطباعة الافتراضي");
    setTimeout(() => setToast(null), 2000);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "company", label: "بيانات المنشأة", icon: <Building2 size={16} /> },
    { id: "print", label: "قالب وتذييل الفاتورة", icon: <Printer size={16} /> },
    { id: "fiscal", label: "الضريبة والعملات والسياسات", icon: <Scale size={16} /> },
    { id: "branches", label: "الفروع والفترات المالية", icon: <CalendarDays size={16} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 1. الشريط العلوي للإعدادات مع زر الحفظ الموحد */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fff",
          padding: "12px 20px",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #059669, #10b981)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
              إعدادات النظام والشركة
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>الهوية التجارية، السياسات المحاسبية، وقوالب المستندات</span>
              <span
                style={{
                  fontSize: 11,
                  background: "#f0fdf4",
                  color: "#166534",
                  padding: "1px 8px",
                  borderRadius: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 600,
                  border: "1px solid #bbf7d0",
                }}
              >
                <CheckCircle2 size={11} /> متصل بالخادم
              </span>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <Save size={16} /> {saving ? "جارِ الحفظ..." : "حفظ التغييرات"}
        </button>
      </div>

      {/* 2. شريط التبويبات الرئيسي (Modern Tabs Bar) */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "#f1f5f9",
          padding: 6,
          borderRadius: 10,
          border: "1px solid #e2e8f0",
        }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                background: isActive ? "#fff" : "transparent",
                color: isActive ? "#0f172a" : "#64748b",
                boxShadow: isActive ? "0 2px 5px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ color: isActive ? "#059669" : "inherit" }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 3. محتوى التبويبات المخصص */}

      {/* ==================== التبويب 1: بيانات المنشأة ==================== */}
      {activeTab === "company" && (
        <section className="panel" style={{ background: "#fff" }}>
          <div className="panel-head">
            <div>
              <h3>البيانات الأساسية للمنشأة</h3>
              <p>تظهر هذه البيانات كترويسة رسمية في كافة الفواتير، عروض الأسعار، وسندات القبض</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label full">
                الاسم التجاري الرسمي
                <input
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setLogoText(e.target.value);
                  }}
                  placeholder="مثال: شركة ميزان للتجارة والتوزيع"
                />
              </label>

              <label className="label">
                الرقم الضريبي (15 رقماً)
                <input
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="310123456700003"
                  style={{ fontFamily: "monospace", letterSpacing: "0.5px" }}
                />
              </label>

              <label className="label">
                رقم السجل التجاري
                <input
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                  placeholder="1010123456"
                  style={{ fontFamily: "monospace" }}
                />
              </label>

              <label className="label">
                المدينة
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="الرياض" />
              </label>

              <label className="label">
                العنوان التفصيلي
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="حي السلي، مخرج 18، الرياض"
                />
              </label>
            </div>
          </div>
        </section>
      )}

      {/* ==================== التبويب 2: قالب وتذييل الفاتورة (عرض منقسم مريح) ==================== */}
      {activeTab === "print" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
          {/* الجانب الأيمن: أدوات التحكم والإدخال */}
          <section className="panel" style={{ background: "#fff" }}>
            <div className="panel-head" style={{ borderBottom: "1px solid #e2e8f0" }}>
              <div>
                <h3>تخصيص نصوص الفاتورة</h3>
                <p>التحكم بنصوص الرأس والتذييل والملاحظات النظامية</p>
              </div>
              <button
                type="button"
                className="btn"
                onClick={resetPrintTemplate}
                style={{ fontSize: 12, padding: "5px 10px", color: "#64748b" }}
                title="استعادة القيم الافتراضية"
              >
                <RotateCcw size={13} /> استعادة
              </button>
            </div>

            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* خيارات حجم الورق */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#f8fafc",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>نوع الطابعة:</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="paperType"
                      checked={paperType === "thermal"}
                      onChange={() => setPaperType("thermal")}
                    />
                    <Receipt size={14} color="#059669" /> كاشير حراري (80mm)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="paperType"
                      checked={paperType === "a4"}
                      onChange={() => setPaperType("a4")}
                    />
                    <FileText size={14} color="#2563eb" /> ورقة عادية (A4)
                  </label>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={showQr} onChange={(e) => setShowQr(e.target.checked)} />
                  <QrCode size={13} /> إظهار رمز QR
                </label>
              </div>

              {/* الشعار النصي */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={15} color="#2563eb" /> شعار الفاتورة في الترويسة
                </label>
                <input
                  value={logoText}
                  onChange={(e) => setLogoText(e.target.value)}
                  placeholder="اسم المنشأة في أعلى الفاتورة..."
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                  {["ميزان للتجارة الغذائية", "شركة ميزان للأغذية", "مؤسسة ميزان"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setLogoText(p)}
                      style={{
                        fontSize: 11,
                        background: logoText === p ? "#eff6ff" : "#f1f5f9",
                        color: logoText === p ? "#1d4ed8" : "#475569",
                        border: "none",
                        padding: "3px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* تذييل الفاتورة */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Receipt size={15} color="#059669" /> تذييل الفاتورة وعبارات الترحيب
                </label>
                <input
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="مثال: شكراً لتعاملكم معنا..."
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                  {[
                    "شكراً لتعاملكم معنا — نسعد بخدمتكم دائماً",
                    "البضاعة المباعة ترد وتستبدل خلال 3 أيام",
                    "خدمة العملاء: 920012345",
                  ].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFooterText(p)}
                      style={{
                        fontSize: 11,
                        background: footerText === p ? "#f0fdf4" : "#f1f5f9",
                        color: footerText === p ? "#15803d" : "#475569",
                        border: "none",
                        padding: "3px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      {p.slice(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* الملاحظة القانونية */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={15} color="#7c3aed" /> الملاحظة القانونية والضريبية
                  </label>
                  <span
                    style={{
                      fontSize: 11,
                      background: "#ede9fe",
                      color: "#6d28d9",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontWeight: 600,
                    }}
                  >
                    متوافق مع هيئة الزكاة (ZATCA)
                  </span>
                </div>
                <textarea
                  value={legalNote}
                  onChange={(e) => setLegalNote(e.target.value)}
                  rows={2}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>
          </section>

          {/* الجانب الأيسر: المعاينة الحية المباشرة بجانب المدخلات */}
          <section className="panel" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div className="panel-head" style={{ borderBottom: "1px solid #e2e8f0" }}>
              <div>
                <h3>المعاينة الحية الفورية</h3>
                <p>تتحدث هذه الورقة فوراً أثناء كتابتك</p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  background: "#e0e7ff",
                  color: "#3730a3",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                {paperType === "thermal" ? "إيصال كاشير 80mm" : "A4 رسمي"}
              </span>
            </div>

            <div className="panel-body">
              {/* ورقة الفاتورة المصغرة الواقعية */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "18px 22px",
                  maxWidth: paperType === "thermal" ? "340px" : "100%",
                  margin: "0 auto",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {/* رأس الفاتورة */}
                <div style={{ textAlign: "center", borderBottom: "1px dashed #94a3b8", paddingBottom: 10 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                    {logoText || companyName}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    الرقم الضريبي: {taxNumber}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>
                    فاتورة ضريبية مبسطة #INV-2026-0089
                  </div>
                </div>

                {/* بنود افتراضية */}
                <div style={{ margin: "10px 0", fontSize: 11 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#64748b",
                      borderBottom: "1px solid #f1f5f9",
                      paddingBottom: 4,
                      fontWeight: 600,
                    }}
                  >
                    <span>الصنف</span>
                    <span>الكمية × السعر</span>
                    <span>المجموع</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span>حليب كامل الدسم 1 لتر</span>
                    <span style={{ color: "#64748b" }}>2 × 6.50</span>
                    <span style={{ fontWeight: 600 }}>13.00 ر.س</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span>جبن شيدر أبيض 500جم</span>
                    <span style={{ color: "#64748b" }}>1 × 24.00</span>
                    <span style={{ fontWeight: 600 }}>24.00 ر.س</span>
                  </div>
                </div>

                {/* الإجماليات */}
                <div
                  style={{
                    borderTop: "1px dashed #94a3b8",
                    paddingTop: 8,
                    fontSize: 11,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>المجموع الخاضع للضريبة:</span>
                    <span>37.00 ر.س</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>ضريبة القيمة المضافة ({vatRate}%):</span>
                    <span>5.55 ر.س</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 800,
                      fontSize: 13,
                      marginTop: 4,
                      borderTop: "1px solid #e2e8f0",
                      paddingTop: 4,
                    }}
                  >
                    <span>الإجمالي شامل الضريبة:</span>
                    <span style={{ color: "#059669" }}>42.55 ر.س</span>
                  </div>
                </div>

                {/* رمز QR */}
                {showQr && (
                  <div style={{ margin: "12px auto 8px", textAlign: "center" }}>
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        margin: "0 auto",
                        border: "1px solid #0f172a",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#f8fafc",
                      }}
                    >
                      <QrCode size={48} color="#0f172a" />
                    </div>
                    <div style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>
                      رمز التحقق الإلكتروني (ZATCA)
                    </div>
                  </div>
                )}

                {/* التذييل */}
                <div style={{ textAlign: "center", borderTop: "1px dashed #cbd5e1", paddingTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>{footerText}</div>
                  <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>
                    {legalNote}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ==================== التبويب 3: الضرائب والعملات والسياسات ==================== */}
      {activeTab === "fiscal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <section className="panel" style={{ background: "#fff" }}>
              <div className="panel-head">
                <div>
                  <h3>السياسات العامة والسنة المالية</h3>
                  <p>تحدد طريقة صرف المخزون وتاريخ بداية الدورة المحاسبية</p>
                </div>
              </div>
              <div className="panel-body">
                <div className="form-grid">
                  <label className="label">
                    تاريخ بداية السنة المالية
                    <input
                      type="date"
                      value={fiscalStartDate}
                      onChange={(e) => setFiscalStartDate(e.target.value)}
                    />
                  </label>

                  <label className="label">
                    العملة الأساسية للنظام
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                    >
                      {currencies.map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.name} ({c.symbol}) {c.is_base_currency ? "— الأساسية" : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="label full">
                    سياسة صرف المخزون والرقابة على الصلاحية
                    <select value={stockPolicy} onChange={(e) => setStockPolicy(e.target.value)}>
                      <option value="FEFO">FEFO (الأقرب انتهاءً أولاً — إلزامي لقطاع التوزيع والمواد الغذائية)</option>
                      <option value="FIFO">FIFO (الوارد أولاً صادر أولاً)</option>
                      <option value="WEIGHTED_AVG">متوسط التكلفة المرجح</option>
                    </select>
                  </label>
                </div>
              </div>
            </section>

            {/* جدول العملات وأسعار الصرف */}
            <section className="panel" style={{ background: "#fff" }}>
              <div className="panel-head">
                <div>
                  <h3>العملات المعتمدة وأسعار الصرف</h3>
                  <p>مأخوذة مباشرة من قاعدة بيانات النظام</p>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onNavigate("currencies")}
                    style={{ fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <Coins size={13} /> شاشة إدارة العملات ↗
                  </button>
                )}
              </div>
              <div className="panel-body">
                <table className="w-full" style={{ width: "100%", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "right", color: "#64748b" }}>
                      <th style={{ padding: "8px 4px" }}>العملة</th>
                      <th style={{ padding: "8px 4px" }}>الكود</th>
                      <th style={{ padding: "8px 4px" }}>الرمز</th>
                      <th style={{ padding: "8px 4px" }}>سعر الصرف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currencies.map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px dashed #f1f5f9" }}>
                        <td style={{ padding: "10px 4px", fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: "10px 4px", fontFamily: "monospace" }}>{c.code}</td>
                        <td style={{ padding: "10px 4px" }}>{c.symbol}</td>
                        <td style={{ padding: "10px 4px" }}>
                          {c.is_base_currency ? (
                            <span
                              style={{
                                background: "#f0fdf4",
                                color: "#166534",
                                padding: "2px 8px",
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              الأساسية (1.00)
                            </span>
                          ) : c.latest_exchange_rate ? (
                            <span style={{ fontFamily: "monospace", color: "#2563eb" }}>
                              {Number(c.latest_exchange_rate.rate).toFixed(3)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* مدير الضرائب ومحرك الحساب الفوري */}
          <TaxManager
            categories={taxCategories}
            onReload={reloadTaxCategories}
            onNotify={(msg) => {
              setToast(msg);
              setTimeout(() => setToast(null), 2500);
            }}
          />
        </div>
      )}

      {/* ==================== التبويب 4: الفروع والفترات المالية ==================== */}
      {activeTab === "branches" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* مدير الفروع والمستودعات المتصل بـ CRUD API */}
          <BranchManager
            branches={branches}
            onReload={reloadBranches}
            onNotify={(msg) => {
              setToast(msg);
              setTimeout(() => setToast(null), 2500);
            }}
          />


          {/* الفترات المالية للسنة الحالية */}
          <section className="panel" style={{ background: "#fff" }}>
            <div className="panel-head">
              <div>
                <h3>الفترات المالية لسنة 2026 ({periods.length} فترات)</h3>
                <p>الشهور المالية المعتمدة للترحيل المحاسبي</p>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onNavigate("period-close")}
                  style={{ fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}
                >
                  <Lock size={13} /> شاشة إقفال الفترات ↗
                </button>
              )}
            </div>
            <div className="panel-body">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 8,
                  maxHeight: 280,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {periods.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>
                        {p.start_date} إلى {p.end_date}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        background:
                          p.status === "open"
                            ? "#f0fdf4"
                            : p.status === "closed"
                            ? "#fef2f2"
                            : "#fdf2f8",
                        color:
                          p.status === "open"
                            ? "#166534"
                            : p.status === "closed"
                            ? "#991b1b"
                            : "#9d174d",
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontWeight: 700,
                      }}
                    >
                      {p.status === "open" ? "مفتوحة" : p.status === "closed" ? "مغلقة" : "مقفلة"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
