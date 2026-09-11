import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Database,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  X,
  FileArchive,
  RefreshCw,
} from "lucide-react";
import { coreApi } from "@/api/core";

interface DataResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onNotify?: (msg: string) => void;
}

export const DataResetModal: React.FC<DataResetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNotify,
}) => {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<{
    company_name: string;
    counts: {
      sales_invoices: number;
      sales_invoice_items: number;
      journal_entries: number;
      journal_entry_lines: number;
      customers: number;
    };
    total_records_to_wipe: number;
    preserved_entities: string[];
  } | null>(null);

  const [confirmInput, setConfirmInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupResult, setBackupResult] = useState<{
    filename: string;
    size_kb: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmInput("");
      setError(null);
      setBackupResult(null);
      fetchPreview();
    }
  }, [isOpen]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const data = await coreApi.getResetPreview();
      setPreview(data);
    } catch (err: any) {
      setError("تعذر تحميل معاينة بيانات النظام");
    } finally {
      setLoadingPreview(false);
    }
  };

  const isNameMatched =
    preview &&
    confirmInput.trim().toLowerCase() === preview.company_name.trim().toLowerCase();

  const handleReset = async () => {
    if (!isNameMatched) return;

    setResetting(true);
    setError(null);

    try {
      const res = await coreApi.resetData({
        confirmation_name: confirmInput.trim(),
      });

      setBackupResult({
        filename: res.backup.filename,
        size_kb: res.backup.size_kb,
      });

      if (onNotify) {
        onNotify(res.message);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.confirmation_name?.[0] ||
        "حدث خطأ أثناء تصفير الحركات";
      setError(msg);
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 620,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          border: "1px solid #fee2e2",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* رأس النافذة التحذيري */}
        <div
          style={{
            background: "linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)",
            color: "#fff",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                تصفير بيانات التشغيل والبدء من جديد
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#fecaca" }}>
                مسح الحركات والفواتير السابقة مع الاحتفاظ بالهوية ودليل الحسابات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* محتوى النافذة */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
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
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {backupResult ? (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: 12,
                padding: 20,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
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
                <h4 style={{ margin: 0, fontSize: 16, color: "#166534", fontWeight: 800 }}>
                  تم تصفير الحركات بنجاح وأخذ نسخة احتياطية
                </h4>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#15803d" }}>
                  تم حفظ نسخة احتياطية كاملة قبل المسح في:
                </p>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #bbf7d0",
                    padding: "8px 14px",
                    borderRadius: 8,
                    marginTop: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: "#166534",
                  }}
                >
                  <FileArchive size={16} />
                  <span>{backupResult.filename} ({backupResult.size_kb} KB)</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                style={{ marginTop: 8 }}
              >
                تحديث الصفحة والبدء بالعمل النظيف
              </button>
            </div>
          ) : (
            <>
              {loadingPreview ? (
                <div style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 8px" }} />
                  <div>جاري فحص الحركات وقواعد البيانات...</div>
                </div>
              ) : preview ? (
                <>
                  {/* إحصائيات المعاينة الحية */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                      ملخص السجلات التشغيلية التي سيتم تصفيرها:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          padding: 10,
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
                          {preview.counts.sales_invoices}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>فواتير مبيعات</div>
                      </div>
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          padding: 10,
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
                          {preview.counts.journal_entries}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>قيود يومية</div>
                      </div>
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          padding: 10,
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
                          {preview.counts.journal_entry_lines}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>سطور القيود</div>
                      </div>
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          padding: 10,
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#059669" }}>
                          ✓ محفوظ
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>شجرة الحسابات</div>
                      </div>
                    </div>
                  </div>

                  {/* تنبيه الأمان والنسخ الاحتياطي */}
                  <div
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: 10,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 12,
                      color: "#1e40af",
                    }}
                  >
                    <Database size={20} color="#2563eb" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>حماية البيانات:</strong> سيقوم النظام تلقائياً بإنشاء نسخة احتياطية كاملة لقاعدة
                      البيانات في مجلد التخزين الآمن قبل تنفيذ المسح، ولن تبدأ العملية إذا تعذر أخذ النسخة.
                    </span>
                  </div>

                  {/* تأكيد اسم المنشأة */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                      لتأكيد التصفير، يرجى كتابة اسم المنشأة الحالي:{" "}
                      <span style={{ color: "#b91c1c", userSelect: "all" }}>
                        "{preview.company_name}"
                      </span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`اكتب "${preview.company_name}" هنا للتأكيد...`}
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: isNameMatched ? "2px solid #22c55e" : "1px solid #cbd5e1",
                        fontSize: 14,
                      }}
                    />
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>

        {/* أزرار الإجراءات */}
        {!backupResult && (
          <div
            style={{
              padding: "16px 24px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={resetting}
            >
              إلغاء التراجع
            </button>

            <button
              type="button"
              className="btn"
              disabled={!isNameMatched || resetting}
              onClick={handleReset}
              style={{
                background: isNameMatched ? "#dc2626" : "#fca5a5",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                fontWeight: 700,
                cursor: isNameMatched ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {resetting ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  جاري النسخ الاحتياطي والتصفير...
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  تأكيد تصفير الحركات نهائياً
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
