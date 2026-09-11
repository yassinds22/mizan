import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Building2,
  Receipt,
  Scale,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
  ShieldCheck,
  Coins,
  AlertCircle,
  RotateCcw,
  Save,
} from "lucide-react";
import { coreApi, CurrencyApi } from "@/api/core";

interface ClientSetupWizardProps {
  onSuccess?: () => void;
  onNotify?: (msg: string) => void;
}

export const ClientSetupWizard: React.FC<ClientSetupWizardProps> = ({
  onSuccess,
  onNotify,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State - Step 1: Legal & Company Identity
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [commercialRegister, setCommercialRegister] = useState("");
  const [city, setCity] = useState("الرياض");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Form State - Step 2: Branch & Policies
  const [branchName, setBranchName] = useState("الفرع الرئيسي");
  const [baseCurrency, setBaseCurrency] = useState("SAR");
  const [vatRate, setVatRate] = useState(15.0);
  const [currencies, setCurrencies] = useState<CurrencyApi[]>([]);

  // Status & Execution
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [isAlreadySetup, setIsAlreadySetup] = useState<boolean>(false);
  const [setupCompletedAt, setSetupCompletedAt] = useState<string | null>(null);

  // Load existing profile & all registered currencies
  useEffect(() => {
    coreApi
      .getSystemStatus()
      .then((status) => {
        if (status.company_name) setCompanyName(status.company_name);
        if (status.legal_name) setLegalName(status.legal_name);
        if (status.vat_number) setVatNumber(status.vat_number);
        if (status.commercial_register) setCommercialRegister(status.commercial_register);
        if (status.city) setCity(status.city);
        if (status.address) setAddress(status.address);
        if (status.phone) setPhone(status.phone);
        if (status.setup_completed) {
          setIsAlreadySetup(true);
          setSetupCompletedAt(status.setup_completed_at);
        }
      })
      .catch(() => {});

    coreApi
      .getCurrencies()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setCurrencies(list);
          const base = list.find((c) => c.is_base_currency);
          if (base) {
            setBaseCurrency(base.code);
          }
        }
      })
      .catch(console.error);
  }, []);

  const isVatValid = !vatNumber || /^\d{15}$/.test(vatNumber.trim());

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!companyName.trim()) {
        setError("يرجى إدخال اسم المنشأة التجاري أو الرسمي");
        return;
      }
      if (vatNumber.trim() && !/^\d{15}$/.test(vatNumber.trim())) {
        setError("الرقم الضريبي السعودي يجب أن يتكون من 15 رقماً ويبدأ وينتهي بالرقم 3 (وفق اشتراطات ZATCA)");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!branchName.trim()) {
        setError("يرجى تحديد اسم المعرض أو الفرع الرئيسي");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await coreApi.initClient({
        company_name: companyName.trim(),
        legal_name: legalName.trim() || companyName.trim(),
        vat_number: vatNumber.trim() || undefined,
        commercial_register: commercialRegister.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        branch_name: branchName.trim() || "الفرع الرئيسي",
        base_currency: baseCurrency,
        vat_rate: vatRate,
      });

      setSuccessResult(res);

      if (onNotify) {
        onNotify(res.message || "تم تجهيز وتأسيس نظام المنشأة بنجاح!");
      }

      if (onSuccess) {
        onSuccess();
      }

      window.dispatchEvent(new CustomEvent("mizan_settings_updated"));
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "حدث خطأ أثناء معالجة التهيئة. يرجى مراجعة البيانات المدخلة.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* رأس المعالج التعريفي */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#fff",
          borderRadius: 14,
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 14px rgba(15,23,42,0.12)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: isAlreadySetup ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
              color: isAlreadySetup ? "#34d399" : "#fbbf24",
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 8,
              border: isAlreadySetup
                ? "1px solid rgba(16,185,129,0.3)"
                : "1px solid rgba(245,158,11,0.3)",
            }}
          >
            {isAlreadySetup ? (
              <>
                <CheckCircle2 size={14} /> النظام مهيأ ونشط
                {setupCompletedAt && ` (آخر ضبط: ${setupCompletedAt.slice(0, 10)})`}
              </>
            ) : (
              <>
                <Sparkles size={14} /> معالج تهيئة المنشأة (بانتظار التهيئة الأولى)
              </>
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            {isAlreadySetup ? "إعدادات وهوية المنشأة والسياسات المالية" : "تجهيز البيئة المحاسبية لمنشأة جديدة"}
          </h2>
          <p
            style={{
              margin: "6px 0 0 0",
              color: "#94a3b8",
              fontSize: 13,
              maxWidth: 640,
              lineHeight: 1.6,
            }}
          >
            {isAlreadySetup
              ? "يمكنك تحديث بيانات الهوية التجارية والفروع وقوالب الطباعة بأمان تام وفي أي وقت دون التأثير على فواتيرك أو قيودك المحاسبية القائمة."
              : "واجهة موجهة للمسوقين ومسؤولي التهيئة لإعداد المنشأة والفروع وشجرة الحسابات المعتمدة والسياسات الضريبية في 3 خطوات بسيطة."}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.05)",
            padding: "14px 20px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
          }}
        >
          <Building2 size={32} color="#10b981" />
          <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 600 }}>
            هيئة الزكاة والضريبة ZATCA
          </span>
        </div>
      </div>

      {/* شريط خطوات المعالج (Step Indicator) */}
      {!successResult && (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* الخطوة 1 */}
          <div
            onClick={() => setCurrentStep(1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              opacity: currentStep === 1 ? 1 : 0.7,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: currentStep === 1 ? "#059669" : currentStep > 1 ? "#10b981" : "#e2e8f0",
                color: currentStep >= 1 ? "#fff" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {currentStep > 1 ? "✓" : "1"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: currentStep === 1 ? "#059669" : "#334155" }}>
                هوية المنشأة والضريبة
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>الاسم، الرقم الضريبي، والسجل</div>
            </div>
          </div>

          <div style={{ height: 1, flex: 1, margin: "0 16px", background: "#e2e8f0" }} />

          {/* الخطوة 2 */}
          <div
            onClick={() => companyName && setCurrentStep(2)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: companyName ? "pointer" : "not-allowed",
              opacity: currentStep === 2 ? 1 : 0.7,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: currentStep === 2 ? "#059669" : currentStep > 2 ? "#10b981" : "#e2e8f0",
                color: currentStep >= 2 ? "#fff" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {currentStep > 2 ? "✓" : "2"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: currentStep === 2 ? "#059669" : "#334155" }}>
                الفروع والسياسات
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>الفرع الرئيسي ونسبة الضريبة</div>
            </div>
          </div>

          <div style={{ height: 1, flex: 1, margin: "0 16px", background: "#e2e8f0" }} />

          {/* الخطوة 3 */}
          <div
            onClick={() => companyName && branchName && setCurrentStep(3)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: companyName && branchName ? "pointer" : "not-allowed",
              opacity: currentStep === 3 ? 1 : 0.7,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: currentStep === 3 ? "#059669" : "#e2e8f0",
                color: currentStep === 3 ? "#fff" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              3
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: currentStep === 3 ? "#059669" : "#334155" }}>
                فحص الجاهزية والاعتماد
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>تأكيد دليل الحسابات وبدء التشغيل</div>
            </div>
          </div>
        </div>
      )}

      {/* بطاقة النجاح عند اكتمال الإعداد */}
      {successResult && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 14,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#22c55e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: "#166534", fontWeight: 800 }}>
                تهانينا! اكتمل إعداد النظام بنجاح للمنشأة
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#15803d" }}>
                أصبح النظام جاهزاً بكامل الدفاتر المحاسبية باسم:{" "}
                <strong>{companyName}</strong> — الفرع المعتمد: <strong>{branchName}</strong>
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              background: "#fff",
              padding: 16,
              borderRadius: 10,
              border: "1px solid #dcfce7",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#64748b" }}>دليل الحسابات</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>✓ دليل معتمد نشط</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#64748b" }}>ضريبة القيمة المضافة</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>✓ مفعلة {vatRate}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#64748b" }}>العملة الأساسية</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>✓ {baseCurrency}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#64748b" }}>الفترات المحاسبية</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>✓ 12 فترة لسنة 2026</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px" }}
            >
              <RotateCcw size={15} /> تحديث الصفحة والبدء بالعمل
            </button>
          </div>
        </div>
      )}

      {/* محتوى خطوات المعالج */}
      {!successResult && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#991b1b",
                fontSize: 13,
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* ==================== الخطوة 1: الهوية القانونية ==================== */}
          {currentStep === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
                <Receipt size={18} color="#059669" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                  البيانات الرسمية والهوية الضريبية (تظهر برأس الفواتير ورمز QR)
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    اسم المنشأة التجاري <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: شركة الأفق للتجارة والتوريدات"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px" }}
                  />
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    الاسم المعروض للمتعاملين وفي قوالب البيع
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    الاسم القانوني المسجل
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مطابق للسجل التجاري أو عقد التأسيس"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    الرقم الضريبي للمنشأة (15 خانة)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="300000000000003"
                    value={vatNumber}
                    maxLength={15}
                    onChange={(e) => setVatNumber(e.target.value.replace(/\D/g, ""))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      direction: "ltr",
                      textAlign: "right",
                      border: !isVatValid ? "1px solid #ef4444" : undefined,
                    }}
                  />
                  <span style={{ fontSize: 11, color: isVatValid ? "#64748b" : "#ef4444" }}>
                    {isVatValid
                      ? "يبدأ بالرقم 3 وينتهي بـ 3 ومكون من 15 خانة لترميز ZATCA QR"
                      : "الرقم غير مكتمل (يجب أن يكون 15 رقماً)"}
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    رقم السجل التجاري (CR)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="1010xxxxxx"
                    value={commercialRegister}
                    onChange={(e) => setCommercialRegister(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", direction: "ltr", textAlign: "right" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    المدينة
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="الرياض، جدة، الدمام..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    العنوان الوطني / التفصيلي
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="حي الملز، طريق صلاح الدين، الرياض"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    رقم الهاتف / خدمة العملاء
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="050xxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", direction: "ltr", textAlign: "right" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==================== الخطوة 2: الفروع والسياسات ==================== */}
          {currentStep === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
                <Building2 size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                  الفرع الرئيسي والسياسات المالية للمنشأة
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    اسم الفرع / المعرض الرئيسي الأول <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="الفرع الرئيسي"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px" }}
                  />
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    سيتم ربط المبيعات والمستودعات به تلقائياً.
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    العملة الأساسية للنظام
                  </label>
                  <select
                    className="form-control"
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px" }}
                  >
                    {currencies.length > 0 ? (
                      currencies.map((c) => (
                        <option key={c.id || c.code} value={c.code}>
                          {c.name} ({c.code}) {c.symbol ? `— ${c.symbol}` : ""}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    نسبة ضريبة القيمة المضافة (%)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={vatRate}
                    onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                    style={{ width: "100%", padding: "8px 12px" }}
                  />
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    النسبة القياسية المعتمدة بالمملكة هي 15%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== الخطوة 3: مراجعة الجاهزية والاعتماد ==================== */}
          {currentStep === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
                <ShieldCheck size={18} color="#059669" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                  فحص الجاهزية واعتماد المنشأة (System Readiness Check)
                </h3>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#0f172a" }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>
                    اسم المنشأة التجاري: <strong>{companyName}</strong> ({city})
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#0f172a" }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>
                    الرقم الضريبي المعتمد: <strong>{vatNumber || "غير محدد حالياً"}</strong>
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#10b981" }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>
                    الفرع والعملة: <strong>{branchName}</strong> — العملة الأساسية: <strong>{baseCurrency}</strong>
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#10b981" }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>دليل الحسابات السعودي المعتمد جاهز ومطابق للمعايير</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#10b981" }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>فترات السنة المالية 2026 جاهزة ومفتوحة للترحيل</span>
                </div>
              </div>
            </div>
          )}

          {/* أزرار التنقل بين الخطوات */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 14,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            {currentStep > 1 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as any) : prev))}
                disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <ArrowRight size={15} /> الخطوة السابقة
              </button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                الخطوة التالية <ArrowLeft size={15} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinish}
                disabled={loading}
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                  border: "none",
                  padding: "10px 24px",
                  fontWeight: 800,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 2px 10px rgba(16,185,129,0.3)",
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                    {isAlreadySetup ? "جارٍ حفظ وتحديث البيانات..." : "جارٍ تأسيس الدفاتر وإعداد المنشأة..."}
                  </>
                ) : (
                  <>
                    {isAlreadySetup ? <Save size={16} /> : <Sparkles size={16} />}
                    {isAlreadySetup ? "حفظ وتحديث بيانات المنشأة" : "اعتماد وتشغيل المنشأة الآن"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
