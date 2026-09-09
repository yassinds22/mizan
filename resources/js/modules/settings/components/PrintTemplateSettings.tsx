import React, { useState } from "react";
import {
  Printer,
  FileText,
  Sparkles,
  QrCode,
  CheckCircle2,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Eye,
  Sliders,
} from "lucide-react";

interface PrintTemplateSettingsProps {
  onNotify?: (msg: string) => void;
}

export const PrintTemplateSettings: React.FC<PrintTemplateSettingsProps> = ({ onNotify }) => {
  const [logoText, setLogoText] = useState("ميزان للتجارة الغذائية");
  const [footerText, setFooterText] = useState("شكراً لتعاملكم معنا — نسعد بخدمتكم دائماً");
  const [legalNote, setLegalNote] = useState(
    "فاتورة ضريبية مبسطة صادرة طبقاً لأحكام ولائحة الفوترة الإلكترونية بالمملكة العربية السعودية."
  );
  const [paperType, setPaperType] = useState<"thermal" | "a4">("thermal");
  const [showQr, setShowQr] = useState(true);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const logoPresets = ["ميزان", "ميزان للتجارة الغذائية", "مؤسسة ميزان الغذائية"];
  const footerPresets = [
    "شكراً لتعاملكم معنا — نسعد بخدمتكم دائماً",
    "البضاعة المباعة ترد وتستبدل خلال 3 أيام بشرط سلامة التغليف",
    "خدمة العملاء والاستفسارات: 920012345",
  ];
  const legalPresets = [
    "فاتورة ضريبية مبسطة صادرة طبقاً لأحكام ولائحة الفوترة الإلكترونية بالمملكة العربية السعودية.",
    "فاتورة ضريبية معتمدة وفق متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA).",
  ];

  const resetDefaults = () => {
    setLogoText("ميزان للتجارة الغذائية");
    setFooterText("شكراً لتعاملكم معنا — نسعد بخدمتكم دائماً");
    setLegalNote("فاتورة ضريبية مبسطة صادرة طبقاً لأحكام ولائحة الفوترة الإلكترونية بالمملكة العربية السعودية.");
    setPaperType("thermal");
    setShowQr(true);
    if (onNotify) onNotify("تمت استعادة قالب الطباعة الافتراضي");
  };

  return (
    <section className="panel" style={{ overflow: "hidden", borderColor: "#e2e8f0" }}>
      {/* ترويسة اللوحة مع التبويبات وزر الاستعادة */}
      <div
        className="panel-head"
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          borderBottom: "1px solid #e2e8f0",
          padding: "14px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
            }}
          >
            <Printer size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              قالب وتذييل الطباعة الموحد
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              التحكم في رأس وتذييل وهوية الفواتير الورقية والإلكترونية
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* تبديل العرض بين التعديل والمعاينة الفورية */}
          <div
            style={{
              display: "flex",
              background: "#e2e8f0",
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`btn ${activeTab === "edit" ? "btn-primary" : ""}`}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "none",
                background: activeTab === "edit" ? "#2563eb" : "transparent",
                color: activeTab === "edit" ? "#fff" : "#475569",
                boxShadow: activeTab === "edit" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Sliders size={13} /> الإعدادات
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`btn ${activeTab === "preview" ? "btn-primary" : ""}`}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "none",
                background: activeTab === "preview" ? "#2563eb" : "transparent",
                color: activeTab === "preview" ? "#fff" : "#475569",
                boxShadow: activeTab === "preview" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Eye size={13} /> المعاينة الحية
            </button>
          </div>

          <button
            type="button"
            className="btn"
            onClick={resetDefaults}
            title="استعادة النصوص الافتراضية"
            style={{ padding: "6px 10px", fontSize: 12, color: "#64748b" }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      <div className="panel-body" style={{ padding: 18 }}>
        {/* وضع التعديل مع شريط خيارات سريع */}
        {activeTab === "edit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* خيارات حجم الورق والـ QR */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "#f8fafc",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>نوع الورق:</span>
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
                  <FileText size={14} color="#2563eb" /> تقرير قياسي (A4)
                </label>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showQr}
                  onChange={(e) => setShowQr(e.target.checked)}
                />
                <QrCode size={14} color="#475569" /> إظهار رمز QR للفوترة الإلكترونية
              </label>
            </div>

            {/* الحقل 1: شعار الفاتورة النصي */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={15} color="#2563eb" />
                  شعار الفاتورة وعنوان الترويسة (Header Brand)
                </label>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{logoText.length} حرف</span>
              </div>
              <input
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                placeholder="أدخل الاسم التجاري الذي يظهر أعلى الفاتورة..."
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              />
              {/* اقتراحات سريعة */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>اقتراحات:</span>
                {logoPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLogoText(preset)}
                    style={{
                      border: "1px solid #e2e8f0",
                      background: logoText === preset ? "#eff6ff" : "#fff",
                      color: logoText === preset ? "#1d4ed8" : "#475569",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* الحقل 2: تذييل الفاتورة */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                  <Receipt size={15} color="#059669" />
                  تذييل الفاتورة وعبارات الترحيب (Footer Note)
                </label>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{footerText.length} حرف</span>
              </div>
              <input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="عبارة الشكر أو الترحيب أو سياسة الاسترجاع..."
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  color: "#0f172a",
                }}
              />
              {/* اقتراحات سريعة للتذييل */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>نصوص شائعة:</span>
                {footerPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFooterText(preset)}
                    style={{
                      border: "1px solid #e2e8f0",
                      background: footerText === preset ? "#f0fdf4" : "#fff",
                      color: footerText === preset ? "#15803d" : "#475569",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {preset.length > 32 ? preset.slice(0, 32) + "..." : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* الحقل 3: الملاحظة القانونية والضريبية */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={15} color="#7c3aed" />
                  الملاحظة القانونية للفوترة الإلكترونية (ZATCA Disclaimer)
                </label>
                <span
                  style={{
                    fontSize: 11,
                    background: "#ede9fe",
                    color: "#6d28d9",
                    padding: "2px 6px",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <CheckCircle2 size={11} /> متوافق مع هيئة الزكاة والضريبة
                </span>
              </div>
              <textarea
                value={legalNote}
                onChange={(e) => setLegalNote(e.target.value)}
                rows={2}
                placeholder="النص القانوني الإلزامي وفق متطلبات اللائحة..."
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "#334155",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>صيغ قياسية:</span>
                {legalPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLegalNote(preset)}
                    style={{
                      border: "1px solid #e2e8f0",
                      background: legalNote === preset ? "#f5f3ff" : "#fff",
                      color: legalNote === preset ? "#6d28d9" : "#475569",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    صيغة {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* وضع المعاينة الحية الفورية (Live Paper Preview) */}
        {(activeTab === "preview" || true) && (
          <div
            style={{
              marginTop: activeTab === "edit" ? 18 : 0,
              paddingTop: activeTab === "edit" ? 16 : 0,
              borderTop: activeTab === "edit" ? "1px dashed #cbd5e1" : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: 5 }}>
                <Eye size={13} color="#2563eb" />
                معاينة حية لشكل الورقة المطبوعة ({paperType === "thermal" ? "إيصال كاشير 80mm" : "ورقة رسمية A4"})
              </span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>تتحدث تلقائياً مع الكتابة</span>
            </div>

            {/* ورقة المعاينة المصغرة ذات المظهر الواقعي */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)",
                padding: paperType === "thermal" ? "16px 20px" : "20px 28px",
                maxWidth: paperType === "thermal" ? "380px" : "100%",
                margin: "0 auto",
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "#1e293b",
                position: "relative",
              }}
            >
              {/* شريط تمزيق حراري في الأعلى */}
              <div
                style={{
                  height: 3,
                  background: "repeating-linear-gradient(90deg, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px)",
                  marginBottom: 14,
                }}
              />

              {/* رأس الفاتورة والشعار */}
              <div style={{ textAlign: "center", borderBottom: "1px dashed #94a3b8", paddingBottom: 10 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.3px",
                  }}
                >
                  {logoText || "اسم المنشأة"}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  الرقم الضريبي: 310123456700003
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>
                  فاتورة ضريبية مبسطة #INV-2026-0042
                </div>
              </div>

              {/* عينات بنود الفاتورة */}
              <div style={{ margin: "10px 0", fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", borderBottom: "1px solid #f1f5f9", paddingBottom: 4, fontWeight: 600 }}>
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

              {/* الإجماليات والضريبة */}
              <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: 8, fontSize: 11, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>المجموع الخاضع للضريبة:</span>
                  <span>37.00 ر.س</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>ضريبة القيمة المضافة (15%):</span>
                  <span>5.55 ر.س</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13, marginTop: 4, borderTop: "1px solid #e2e8f0", paddingTop: 4 }}>
                  <span>الإجمالي شامل الضريبة:</span>
                  <span style={{ color: "#059669" }}>42.55 ر.س</span>
                </div>
              </div>

              {/* مربع QR Code هيئة الزكاة */}
              {showQr && (
                <div style={{ margin: "12px auto 8px", textAlign: "center" }}>
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      margin: "0 auto",
                      border: "1px solid #0f172a",
                      borderRadius: 4,
                      padding: 4,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f8fafc",
                    }}
                  >
                    <QrCode size={52} color="#0f172a" />
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>
                    رمز التحقق الإلكتروني (ZATCA QR)
                  </div>
                </div>
              )}

              {/* تذييل الفاتورة الديناميكي */}
              <div
                style={{
                  textAlign: "center",
                  borderTop: "1px dashed #cbd5e1",
                  paddingTop: 8,
                  marginTop: 6,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>
                  {footerText || "شكراً لتعاملكم معنا"}
                </div>
                {/* الملاحظة القانونية */}
                <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>
                  {legalNote}
                </div>
              </div>

              {/* خط تمزيق حراري في الأسفل */}
              <div
                style={{
                  height: 3,
                  background: "repeating-linear-gradient(90deg, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px)",
                  marginTop: 12,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
