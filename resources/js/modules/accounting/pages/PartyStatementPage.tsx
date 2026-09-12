import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Printer,
  Calendar,
  Building2,
  User,
  Search,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  CreditCard,
  Receipt,
  Download,
  ShieldCheck,
  ChevronDown,
  X,
  Eye,
} from "lucide-react";
import {
  fetchPartyStatement,
  PartyStatementData,
  PartyType,
  PartyStatementTransaction,
} from "@/api/statements";
import { purchasesApi, Supplier } from "@/api/purchases";
import { salesApi, Customer } from "@/api/sales";
import { coreApi, SystemSettingsApi } from "@/api/core";
import { tafqeet } from "@/utils/tafqeet";

interface PartyStatementPageProps {
  initialPartyType?: PartyType;
  initialPartyId?: number;
  onNavigate?: (page: string, params?: Record<string, any>) => void;
}

export const PartyStatementPage: React.FC<PartyStatementPageProps> = ({
  initialPartyType = "supplier",
  initialPartyId,
  onNavigate,
}) => {
  // 1. حالة الفلاتر ونوع الطرف
  const [partyType, setPartyType] = useState<PartyType>(initialPartyType);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(initialPartyId || null);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [activeDatePreset, setActiveDatePreset] = useState<string>("all");

  // 2. القوائم المنسدلة والبحث
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [partySearch, setPartySearch] = useState<string>("");
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState<boolean>(false);

  // 3. البيانات والحالة
  const [statementData, setStatementData] = useState<PartyStatementData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettingsApi | null>(null);

  // 4. نافذة المعاينة والطباعة
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // تحميل الإعدادات وقوائم الأطراف
  useEffect(() => {
    coreApi.getSettings().then((res) => setSettings(res)).catch(console.error);

    purchasesApi.getAllActiveSuppliers().then((res) => {
      setSuppliers(res);
      if (partyType === "supplier" && !selectedPartyId && res.length > 0) {
        setSelectedPartyId(res[0].id);
      }
    }).catch(console.error);

    salesApi.getAllActiveCustomers().then((res) => {
      setCustomers(res);
      if (partyType === "customer" && !selectedPartyId && res.length > 0) {
        setSelectedPartyId(res[0].id);
      }
    }).catch(console.error);
  }, []);

  // تحديث الطرف المختار عند التبديل بين مورد وعميل
  const handlePartyTypeChange = (newType: PartyType) => {
    setPartyType(newType);
    setStatementData(null);
    setPartySearch("");
    if (newType === "supplier") {
      if (suppliers.length > 0) {
        setSelectedPartyId(suppliers[0].id);
      } else {
        setSelectedPartyId(null);
      }
    } else {
      if (customers.length > 0) {
        setSelectedPartyId(customers[0].id);
      } else {
        setSelectedPartyId(null);
      }
    }
  };

  // قائمة الأطراف المفلترة حسب البحث
  const filteredParties = useMemo(() => {
    const list = partyType === "supplier" ? suppliers : customers;
    if (!partySearch.trim()) return list;
    const q = partySearch.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name_ar.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q))
    );
  }, [partyType, suppliers, customers, partySearch]);

  const selectedParty = useMemo(() => {
    if (!selectedPartyId) return null;
    return partyType === "supplier"
      ? suppliers.find((s) => s.id === selectedPartyId)
      : customers.find((c) => c.id === selectedPartyId);
  }, [partyType, selectedPartyId, suppliers, customers]);

  // جلب كشف الحساب
  const loadStatement = async () => {
    if (!selectedPartyId) {
      setError("يرجى اختيار الطرف (المورد أو العميل) أولاً");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPartyStatement({
        party_type: partyType,
        party_id: selectedPartyId,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setStatementData(data);
    } catch (err: any) {
      console.error("Error fetching statement:", err);
      setError(err?.response?.data?.message || err?.message || "فشل استخراج كشف الحساب");
    } finally {
      setLoading(false);
    }
  };

  // استدعاء الكشف تلقائياً عند تغيير الطرف أو الفلاتر الأساسية
  useEffect(() => {
    if (selectedPartyId) {
      loadStatement();
    }
  }, [selectedPartyId, partyType]);

  // معالجة اختصارات التواريخ السريعة
  const handleDatePreset = (preset: string) => {
    setActiveDatePreset(preset);
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");

    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (preset === "this_month") {
      setDateFrom(`${y}-${m}-01`);
      setDateTo(`${y}-${m}-${d}`);
    } else if (preset === "last_month") {
      const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
      const prevYear = today.getMonth() === 0 ? y - 1 : y;
      const lastDay = new Date(prevYear, prevMonth, 0).getDate();
      const pmStr = String(prevMonth).padStart(2, "0");
      setDateFrom(`${prevYear}-${pmStr}-01`);
      setDateTo(`${prevYear}-${pmStr}-${String(lastDay).padStart(2, "0")}`);
    } else if (preset === "this_year") {
      setDateFrom(`${y}-01-01`);
      setDateTo(`${y}-${m}-${d}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // تنسيق المبالغ المالية
  const formatMoney = (val: number | string | undefined | null) => {
    const num = Number(val || 0);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div
      className="party-statement-container"
      style={{
        padding: "20px 24px",
        maxWidth: "1350px",
        margin: "0 auto",
        fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
        color: "#0f172a",
        direction: "rtl",
      }}
    >
      {/* Scoped CSS for A4 Print Isolation & Micro-animations */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden;
          }
          #official-print-statement, #official-print-statement * {
            visibility: visible !important;
          }
          #official-print-statement {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          .screen-only, .no-print, header, nav, aside, .modal-backdrop {
            display: none !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
        .statement-row:hover {
          background-color: #f8fafc !important;
        }
        .preset-btn:hover {
          background-color: #e2e8f0 !important;
        }
      `}</style>

      {/* 1. Header & Top Action Bar (Screen Only) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1.5px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 16px rgba(5, 150, 105, 0.25)",
            }}
          >
            <FileText size={24} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#0f172a" }}>
                كشف الحساب المالي الموحد
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: "999px",
                  backgroundColor: "#ecfdf5",
                  color: "#065f46",
                  border: "1px solid #a7f3d0",
                }}
              >
                ● الأستاذ العام (GL Source of Truth)
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
              استعراض الحركات المالية للأطراف ومطابقتها مباشرة من القيود المحاسبية المرحّلة
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {statementData && (
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                fontSize: "13px",
                fontWeight: 800,
                borderRadius: "10px",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
                transition: "all 0.2s ease",
              }}
            >
              <Printer size={16} color="#34d399" />
              <span>معاينة وطباعة رسمية A4</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadStatement}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              fontSize: "13px",
              fontWeight: 700,
              borderRadius: "10px",
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} color="#059669" />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* 2. Sleek Filter Card Container */}
      <div
        className="no-print"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
          padding: "18px 20px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "230px 1fr 280px 140px",
            gap: "16px",
            alignItems: "flex-end",
          }}
        >
          {/* Party Type Toggle Switch */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 800,
                color: "#475569",
                marginBottom: "6px",
              }}
            >
              نوع الطرف:
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                padding: "3px",
                background: "#f1f5f9",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={() => handlePartyTypeChange("supplier")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 10px",
                  fontSize: "12px",
                  fontWeight: 800,
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: partyType === "supplier" ? "#ffffff" : "transparent",
                  color: partyType === "supplier" ? "#065f46" : "#64748b",
                  boxShadow: partyType === "supplier" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <Building2 size={15} />
                <span>كشف مورد</span>
              </button>

              <button
                type="button"
                onClick={() => handlePartyTypeChange("customer")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 10px",
                  fontSize: "12px",
                  fontWeight: 800,
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: partyType === "customer" ? "#ffffff" : "transparent",
                  color: partyType === "customer" ? "#1e40af" : "#64748b",
                  boxShadow: partyType === "customer" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <User size={15} />
                <span>كشف عميل</span>
              </button>
            </div>
          </div>

          {/* Intelligent Party Selector Dropdown */}
          <div style={{ position: "relative" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 800,
                color: "#475569",
                marginBottom: "6px",
              }}
            >
              {partyType === "supplier" ? "المورد المستهدف:" : "العميل المستهدف:"}
            </label>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setIsPartyDropdownOpen(!isPartyDropdownOpen)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "10px",
                  color: "#0f172a",
                  cursor: "pointer",
                  textAlign: "right",
                  boxSizing: "border-box",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedParty ? (
                    <>
                      <strong style={{ fontFamily: "monospace", color: "#64748b", marginLeft: "6px" }}>
                        [{selectedParty.code}]
                      </strong>
                      <span style={{ color: "#0f172a", fontWeight: 800 }}>{selectedParty.name_ar}</span>
                    </>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>اختر الطرف من القائمة...</span>
                  )}
                </span>
                <ChevronDown size={16} color="#64748b" style={{ flexShrink: 0 }} />
              </button>

              {/* Custom Animated Popup Menu */}
              {isPartyDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    width: "100%",
                    marginTop: "6px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                    zIndex: 50,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ position: "relative" }}>
                      <Search
                        size={15}
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "9px",
                          color: "#94a3b8",
                        }}
                      />
                      <input
                        type="text"
                        placeholder="بحث بالاسم أو الكود أو الجوال..."
                        value={partySearch}
                        onChange={(e) => setPartySearch(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 32px 7px 10px",
                          fontSize: "12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          outline: "none",
                          boxSizing: "border-box",
                          fontFamily: "inherit",
                        }}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div style={{ maxHeight: "240px", overflowY: "auto", padding: "4px" }}>
                    {filteredParties.length === 0 ? (
                      <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
                        لا توجد نتائج مطابقة
                      </div>
                    ) : (
                      filteredParties.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPartyId(p.id);
                            setIsPartyDropdownOpen(false);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            fontSize: "12px",
                            borderRadius: "8px",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "right",
                            marginBottom: "2px",
                            backgroundColor: selectedPartyId === p.id ? "#ecfdf5" : "transparent",
                            color: selectedPartyId === p.id ? "#065f46" : "#1e293b",
                            fontWeight: selectedPartyId === p.id ? 800 : 600,
                          }}
                        >
                          <div>
                            <span style={{ fontFamily: "monospace", color: "#64748b", marginLeft: "6px" }}>
                              [{p.code}]
                            </span>
                            <span>{p.name_ar}</span>
                          </div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontFamily: "monospace",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "#f1f5f9",
                              color: "#334155",
                            }}
                          >
                            {formatMoney(p.balance)} ر.س
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date Range Inputs */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 800,
                color: "#475569",
                marginBottom: "6px",
              }}
            >
              فترة الكشف (من / إلى):
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setActiveDatePreset("custom");
                }}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "12px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
                title="تاريخ البداية"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setActiveDatePreset("custom");
                }}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "12px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
                title="تاريخ النهاية"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="button"
              onClick={loadStatement}
              disabled={loading || !selectedPartyId}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "13px",
                fontWeight: 800,
                borderRadius: "10px",
                backgroundColor: "#059669",
                color: "#ffffff",
                border: "none",
                cursor: loading || !selectedPartyId ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                transition: "all 0.15s ease",
              }}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span>استخراج الكشف</span>
            </button>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "14px",
            paddingTop: "12px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", marginLeft: "4px" }}>
            فترات سريعة:
          </span>
          {[
            { id: "all", label: "كامل الفترة (تاريخي)" },
            { id: "this_month", label: "هذا الشهر" },
            { id: "last_month", label: "الشهر السابق" },
            { id: "this_year", label: "السنة الحالية" },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="preset-btn"
              onClick={() => handleDatePreset(preset.id)}
              style={{
                padding: "4px 12px",
                fontSize: "11px",
                fontWeight: 700,
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                backgroundColor: activeDatePreset === preset.id ? "#0f172a" : "#f1f5f9",
                color: activeDatePreset === preset.id ? "#ffffff" : "#475569",
                transition: "all 0.15s ease",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Notification */}
      {error && (
        <div
          className="no-print"
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: "13px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Statement Header: Profile & Accounting Reconciliation (2 Cards) */}
      {statementData && (
        <div
          className="no-print"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {/* Party Profile Card */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#64748b" }}>
                    {partyType === "supplier" ? "بيانات المورد المعتمد" : "بيانات العميل المعتمد"}
                  </span>
                  <h2 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 900, color: "#0f172a" }}>
                    {statementData.party.name}
                  </h2>
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: "8px",
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                  }}
                >
                  {statementData.party.code}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                  fontSize: "12px",
                  marginTop: "12px",
                  background: "#f8fafc",
                  padding: "12px",
                  borderRadius: "10px",
                }}
              >
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "10.5px" }}>الرقم الضريبي:</span>
                  <strong style={{ fontFamily: "monospace", color: "#0f172a" }}>
                    {statementData.party.tax_number || "غير مسجل"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "10.5px" }}>الهاتف / الجوال:</span>
                  <strong style={{ fontFamily: "monospace", color: "#0f172a" }}>
                    {statementData.party.phone || "—"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "10.5px" }}>المدينة / العنوان:</span>
                  <strong style={{ color: "#0f172a" }}>
                    {statementData.party.city || statementData.party.address || "—"}
                  </strong>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "14px",
                paddingTop: "10px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#64748b",
              }}
            >
              <div>
                فترة الكشف المحددة:{" "}
                <strong style={{ color: "#0f172a", fontFamily: "monospace" }}>
                  {statementData.filters.date_from || "من البداية"} ─── {statementData.filters.date_to || "تاريخه"}
                </strong>
              </div>
              <div>
                إجمالي حركات الفترة:{" "}
                <strong style={{ color: "#0f172a", fontFamily: "monospace" }}>
                  {statementData.transactions.length} حركة
                </strong>
              </div>
            </div>
          </div>

          {/* Triple Reconciliation Shield Card */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              color: "#ffffff",
              borderRadius: "16px",
              padding: "18px 20px",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.25)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px", color: "#34d399" }}>
                  <ShieldCheck size={18} />
                  <span>المطابقة المحاسبية مع الأستاذ العام</span>
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: "999px",
                    backgroundColor: statementData.reconciliation.is_reconciled
                      ? "rgba(16, 185, 129, 0.2)"
                      : "rgba(239, 68, 68, 0.2)",
                    color: statementData.reconciliation.is_reconciled ? "#6ee7b7" : "#fca5a5",
                    border: statementData.reconciliation.is_reconciled
                      ? "1px solid rgba(16, 185, 129, 0.4)"
                      : "1px solid rgba(239, 68, 68, 0.4)",
                  }}
                >
                  {statementData.reconciliation.is_reconciled ? "✓ مطابق 100%" : "⚠ فارق في الرصيد"}
                </span>
              </div>

              <p style={{ margin: "0 0 12px", fontSize: "11px", color: "#94a3b8", lineHeight: "1.5" }}>
                تم احتساب كافة المبالغ والحركات مباشرة من أسطر القيود المحاسبية المرحّلة (GL Lines) لحساب المراقبة لضمان مطابقة الكشف مع ميزان المراجعة.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  background: "rgba(15, 23, 42, 0.6)",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div>
                  <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>رصيد الأستاذ العام (GL):</span>
                  <div style={{ fontSize: "14px", fontWeight: 900, fontFamily: "monospace", color: "#ffffff", marginTop: "2px" }}>
                    {formatMoney(statementData.reconciliation.gl_all_time_balance)} ر.س
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>الرصيد التشغيلي:</span>
                  <div style={{ fontSize: "14px", fontWeight: 900, fontFamily: "monospace", color: "#34d399", marginTop: "2px" }}>
                    {formatMoney(statementData.reconciliation.party_operational_balance)} ر.س
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "10px", textAlign: "left", fontFamily: "monospace" }}>
              حساب التحكم: {partyType === "supplier" ? "2110 (موردو المواد الغذائية)" : "1121 (ذمم العملاء)"}
            </div>
          </div>
        </div>
      )}

      {/* 4. Financial KPI Metric Cards (4 Cards Grid) */}
      {statementData && (
        <div
          className="no-print"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          {/* Card 1: Opening Balance */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              padding: "16px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", display: "block", marginBottom: "4px" }}>
              الرصيد الافتتاحي (ما قبل الفترة)
            </span>
            <div style={{ fontSize: "19px", fontWeight: 900, fontFamily: "monospace", color: "#0f172a" }}>
              {formatMoney(statementData.opening_balance)}{" "}
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>{statementData.currency}</span>
            </div>
            <span style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
              رصيد الأستاذ السابق لتاريخ البداية
            </span>
          </div>

          {/* Card 2: Period Debits */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              padding: "16px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b" }}>
                إجمالي حركات المدين (Debit)
              </span>
              <ArrowDownRight size={16} color="#2563eb" />
            </div>
            <div style={{ fontSize: "19px", fontWeight: 900, fontFamily: "monospace", color: "#2563eb" }}>
              {formatMoney(statementData.total_debit)}{" "}
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>{statementData.currency}</span>
            </div>
            <span style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
              {partyType === "supplier" ? "سدادات واستردادات ومردودات" : "فواتير مبيعات صادرة للعميل"}
            </span>
          </div>

          {/* Card 3: Period Credits */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              padding: "16px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b" }}>
                إجمالي حركات الدائن (Credit)
              </span>
              <ArrowUpRight size={16} color="#059669" />
            </div>
            <div style={{ fontSize: "19px", fontWeight: 900, fontFamily: "monospace", color: "#059669" }}>
              {formatMoney(statementData.total_credit)}{" "}
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>{statementData.currency}</span>
            </div>
            <span style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
              {partyType === "supplier" ? "فواتير مشتريات مستحقة للمورد" : "تحصيلات ومردودات وسندات قبض"}
            </span>
          </div>

          {/* Card 4: Closing Balance */}
          <div
            style={{
              background: statementData.closing_balance > 0 ? "#fef3c7" : statementData.closing_balance < 0 ? "#e0f2fe" : "#ecfdf5",
              borderRadius: "14px",
              border: statementData.closing_balance > 0 ? "1.5px solid #fde68a" : statementData.closing_balance < 0 ? "1.5px solid #bae6fd" : "1.5px solid #a7f3d0",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#475569", display: "block", marginBottom: "4px" }}>
              الرصيد الختامي للفترة
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 900,
                fontFamily: "monospace",
                color: statementData.closing_balance > 0 ? "#92400e" : statementData.closing_balance < 0 ? "#075985" : "#065f46",
              }}
            >
              {formatMoney(statementData.closing_balance)}{" "}
              <span style={{ fontSize: "11px", fontWeight: 600 }}>{statementData.currency}</span>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                marginTop: "4px",
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.7)",
                color: statementData.closing_balance > 0 ? "#92400e" : statementData.closing_balance < 0 ? "#075985" : "#065f46",
              }}
            >
              {statementData.closing_balance > 0
                ? partyType === "supplier"
                  ? "التزام مستحق للمورد (له / دائن)"
                  : "مديونية مستحقة على العميل (عليه / مدين)"
                : statementData.closing_balance < 0
                ? partyType === "supplier"
                  ? "دفعة مقدمة / رصيد لنا طرف المورد"
                  : "رصيد دائن / دفعة مقدمة للعميل"
                : "الحساب متوازن وخالص (0.00)"}
            </span>
          </div>
        </div>
      )}

      {/* 5. Detailed Transactions Ledger Table */}
      {statementData && (
        <div
          className="no-print"
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.03)",
            overflow: "hidden",
            marginBottom: "30px",
          }}
        >
          {/* Table Header Bar */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FileCheck size={18} color="#059669" />
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 900, color: "#0f172a" }}>
                جدول حركات كشف الحساب التفصيلية (Ledger Entries)
              </h3>
            </div>
            <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace", fontWeight: 700 }}>
              {statementData.transactions.length} حركة مسجلة
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "right" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1", color: "#475569" }}>
                  <th style={{ padding: "10px 12px", textAlign: "center", width: "40px" }}>م</th>
                  <th style={{ padding: "10px 12px", width: "100px" }}>التاريخ</th>
                  <th style={{ padding: "10px 12px", width: "130px" }}>نوع الحركة</th>
                  <th style={{ padding: "10px 12px", width: "140px" }}>رقم المستند</th>
                  <th style={{ padding: "10px 12px", width: "120px" }}>رقم القيد</th>
                  <th style={{ padding: "10px 14px" }}>البيان / الوصف</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", width: "110px" }}>مدين (Debit)</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", width: "110px" }}>دائن (Credit)</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", width: "140px" }}>الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody>
                {/* Initial Opening Balance Row */}
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 700 }}>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8" }}>—</td>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#64748b" }}>
                    {statementData.filters.date_from || "سابق"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: "#e2e8f0",
                        color: "#334155",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      رصيد افتتاحي
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8", fontFamily: "monospace" }}>—</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8", fontFamily: "monospace" }}>—</td>
                  <td style={{ padding: "10px 14px", color: "#64748b" }}>
                    الرصيد الافتتاحي المرحّل ما قبل الفترة المحددة
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "left", fontFamily: "monospace", color: "#94a3b8" }}>—</td>
                  <td style={{ padding: "10px 12px", textAlign: "left", fontFamily: "monospace", color: "#94a3b8" }}>—</td>
                  <td
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontFamily: "monospace",
                      fontWeight: 900,
                      color: "#0f172a",
                    }}
                  >
                    {formatMoney(statementData.opening_balance)}
                  </td>
                </tr>

                {/* Data Rows */}
                {statementData.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>
                      لا توجد حركات مالية مسجلة خلال الفترة المحددة
                    </td>
                  </tr>
                ) : (
                  statementData.transactions.map((tx, idx) => (
                    <tr
                      key={tx.id}
                      className="statement-row"
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }}
                    >
                      <td style={{ padding: "9px 12px", textAlign: "center", color: "#94a3b8", fontFamily: "monospace" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "#334155" }}>
                        {tx.date}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "10.5px",
                            fontWeight: 800,
                            display: "inline-block",
                            backgroundColor:
                              tx.document_type === "purchase_invoice" || tx.document_type === "sales_invoice"
                                ? "#eff6ff"
                                : tx.document_type === "payment_voucher" || tx.document_type === "receipt_voucher"
                                ? "#ecfdf5"
                                : "#faf5ff",
                            color:
                              tx.document_type === "purchase_invoice" || tx.document_type === "sales_invoice"
                                ? "#1d4ed8"
                                : tx.document_type === "payment_voucher" || tx.document_type === "receipt_voucher"
                                ? "#047857"
                                : "#7e22ce",
                            border:
                              tx.document_type === "purchase_invoice" || tx.document_type === "sales_invoice"
                                ? "1px solid #bfdbfe"
                                : tx.document_type === "payment_voucher" || tx.document_type === "receipt_voucher"
                                ? "1px solid #a7f3d0"
                                : "1px solid #e9d5ff",
                          }}
                        >
                          {tx.document_type_label}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", fontFamily: "monospace", fontWeight: 800, color: "#0f172a" }}>
                        {tx.document_number}
                      </td>
                      <td style={{ padding: "9px 12px", fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>
                        {tx.journal_entry_number}
                      </td>
                      <td style={{ padding: "9px 14px", color: "#334155", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.description}
                        {tx.reference && tx.reference !== tx.document_number && (
                          <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace", marginRight: "6px" }}>
                            (مرجع: {tx.reference})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "left", fontFamily: "monospace", fontWeight: 800, color: "#2563eb" }}>
                        {tx.debit > 0 ? formatMoney(tx.debit) : "—"}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "left", fontFamily: "monospace", fontWeight: 800, color: "#059669" }}>
                        {tx.credit > 0 ? formatMoney(tx.credit) : "—"}
                      </td>
                      <td style={{ padding: "9px 14px", textAlign: "left", fontFamily: "monospace", fontWeight: 900, color: "#0f172a" }}>
                        {formatMoney(tx.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    borderTop: "2px solid #cbd5e1",
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  <td colSpan={6} style={{ padding: "12px 16px", textAlign: "right" }}>
                    إجمالي حركات الفترة وصافي التغير:
                  </td>
                  <td style={{ padding: "12px 12px", textAlign: "left", fontFamily: "monospace", color: "#2563eb", fontWeight: 900 }}>
                    {formatMoney(statementData.total_debit)}
                  </td>
                  <td style={{ padding: "12px 12px", textAlign: "left", fontFamily: "monospace", color: "#059669", fontWeight: 900 }}>
                    {formatMoney(statementData.total_credit)}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontFamily: "monospace",
                      fontWeight: 900,
                      fontSize: "14px",
                      color: "#0f172a",
                    }}
                  >
                    {formatMoney(statementData.closing_balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 6. Official A4 Print Layout Section (Direct browser print target) */}
      <div id="official-print-statement" className="print-only">
        {statementData && (
          <div
            style={{
              padding: "16px",
              maxWidth: "210mm",
              margin: "0 auto",
              background: "#ffffff",
              color: "#0f172a",
              fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
              direction: "rtl",
            }}
          >
            {/* Header / Letterhead */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid #0f172a",
                paddingBottom: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <h1 style={{ fontSize: "20px", fontWeight: 900, margin: 0, color: "#0f172a" }}>
                  {settings?.company_name || "ميزان لإدارة الأعمال ERP"}
                </h1>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "3px" }}>
                  الرقم الضريبي: {settings?.company_tax_number || "310000000000003"} | السجل التجاري:{" "}
                  {settings?.company_cr_number || "1010000000"}
                </div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>
                  {settings?.company_address || "المملكة العربية السعودية"}
                </div>
              </div>

              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 900,
                    color: partyType === "supplier" ? "#065f46" : "#1e40af",
                    border: "1.5px solid #cbd5e1",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    display: "inline-block",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  {partyType === "supplier" ? "كشف حساب مورد معتمد" : "كشف حساب عميل معتمد"}
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                  تاريخ الطباعة: {new Date().toLocaleDateString("ar-SA")}
                </div>
              </div>
            </div>

            {/* Party & Period Details Box */}
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                backgroundColor: "#f8fafc",
                fontSize: "11px",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", gap: "10px" }}>
                <div>
                  <span style={{ color: "#64748b" }}>
                    {partyType === "supplier" ? "اسم المورد:" : "اسم العميل:"}
                  </span>{" "}
                  <strong style={{ fontSize: "12px", color: "#0f172a" }}>
                    {statementData.party.name}
                  </strong>{" "}
                  <span style={{ color: "#64748b", fontFamily: "monospace" }}>
                    [{statementData.party.code}]
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>الرقم الضريبي:</span>{" "}
                  <strong style={{ fontFamily: "monospace" }}>
                    {statementData.party.tax_number || "—"}
                  </strong>
                </div>
                <div style={{ textAlign: "left" }}>
                  <span style={{ color: "#64748b" }}>الفترة المحددة:</span>{" "}
                  <strong>
                    {statementData.filters.date_from || "البداية"} إلى{" "}
                    {statementData.filters.date_to || "تاريخه"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Summary Highlights in Print */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "8px",
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px 8px" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>الرصيد الافتتاحي</div>
                <div style={{ fontSize: "13px", fontWeight: 800, fontFamily: "monospace", marginTop: "2px" }}>
                  {formatMoney(statementData.opening_balance)}
                </div>
              </div>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px 8px" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>إجمالي المدين (Debit)</div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    marginTop: "2px",
                    color: "#1d4ed8",
                  }}
                >
                  {formatMoney(statementData.total_debit)}
                </div>
              </div>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px 8px" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>إجمالي الدائن (Credit)</div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    marginTop: "2px",
                    color: "#047857",
                  }}
                >
                  {formatMoney(statementData.total_credit)}
                </div>
              </div>
              <div
                style={{
                  border: "1.5px solid #0f172a",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  backgroundColor: "#f1f5f9",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#0f172a" }}>
                  الرصيد الختامي المستحق
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    marginTop: "2px",
                    color: "#0f172a",
                  }}
                >
                  {formatMoney(statementData.closing_balance)} {statementData.currency}
                </div>
              </div>
            </div>

            {/* Arabic Tafqeet Box */}
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "8px 12px",
                backgroundColor: "#f8fafc",
                fontSize: "11px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <strong style={{ color: "#475569" }}>المبلغ المستحق كتابة وتفقيطاً:</strong>
              <span style={{ fontWeight: 800, color: "#0f172a" }}>
                {tafqeet(Math.abs(statementData.closing_balance), "ريال سعودي", "هللة")}
                {statementData.closing_balance < 0 ? " (رصيد دائن / لصالح الطرف)" : ""}
              </span>
            </div>

            {/* Printed Ledger Table */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10.5px",
                marginBottom: "20px",
                border: "1px solid #cbd5e1",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1.5px solid #0f172a" }}>
                  <th style={{ padding: "6px 8px", textAlign: "center", width: "30px" }}>م</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", width: "70px" }}>التاريخ</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", width: "95px" }}>نوع المستند</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", width: "95px" }}>رقم المستند</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>البيان والتفاصيل</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "75px" }}>مدين</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "75px" }}>دائن</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "90px" }}>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {/* Initial Balance Line */}
                <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <td style={{ padding: "6px 8px", textAlign: "center", color: "#64748b" }}>—</td>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>
                    {statementData.filters.date_from || "سابق"}
                  </td>
                  <td style={{ padding: "6px 8px", fontWeight: 700 }}>رصيد افتتاحي</td>
                  <td style={{ padding: "6px 8px", color: "#64748b" }}>—</td>
                  <td style={{ padding: "6px 8px", color: "#64748b" }}>
                    رصيد أول المدة ما قبل تاريخ البداية
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "left", fontFamily: "monospace" }}>—</td>
                  <td style={{ padding: "6px 8px", textAlign: "left", fontFamily: "monospace" }}>—</td>
                  <td
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      fontWeight: 800,
                      fontFamily: "monospace",
                    }}
                  >
                    {formatMoney(statementData.opening_balance)}
                  </td>
                </tr>

                {/* Rows */}
                {statementData.transactions.map((tx, i) => (
                  <tr key={tx.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "6px 8px", textAlign: "center", color: "#64748b" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{tx.date}</td>
                    <td style={{ padding: "6px 8px" }}>{tx.document_type_label}</td>
                    <td style={{ padding: "6px 8px", fontWeight: 700, fontFamily: "monospace" }}>
                      {tx.document_number}
                    </td>
                    <td style={{ padding: "6px 8px", color: "#334155" }}>{tx.description}</td>
                    <td
                      style={{
                        padding: "6px 8px",
                        textAlign: "left",
                        fontFamily: "monospace",
                        color: "#1d4ed8",
                        fontWeight: 700,
                      }}
                    >
                      {tx.debit > 0 ? formatMoney(tx.debit) : "—"}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        textAlign: "left",
                        fontFamily: "monospace",
                        color: "#047857",
                        fontWeight: 700,
                      }}
                    >
                      {tx.credit > 0 ? formatMoney(tx.credit) : "—"}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        textAlign: "left",
                        fontFamily: "monospace",
                        fontWeight: 800,
                      }}
                    >
                      {formatMoney(tx.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #0f172a", fontWeight: 800 }}>
                  <td colSpan={5} style={{ padding: "8px", textAlign: "right" }}>
                    الإجمالي النهائي للفترة والرصيد الختامي:
                  </td>
                  <td style={{ padding: "8px", textAlign: "left", fontFamily: "monospace", color: "#1d4ed8" }}>
                    {formatMoney(statementData.total_debit)}
                  </td>
                  <td style={{ padding: "8px", textAlign: "left", fontFamily: "monospace", color: "#047857" }}>
                    {formatMoney(statementData.total_credit)}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      textAlign: "left",
                      fontFamily: "monospace",
                      fontWeight: 900,
                      fontSize: "12px",
                    }}
                  >
                    {formatMoney(statementData.closing_balance)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Legal Disclaimer & Signatures */}
            <div
              style={{
                fontSize: "10px",
                color: "#64748b",
                lineHeight: "1.5",
                marginBottom: "20px",
                padding: "8px",
                background: "#f8fafc",
                borderRadius: "6px",
                border: "1px dashed #cbd5e1",
              }}
            >
              * إشعار مصادقة: يعتبر هذا الكشف صادرًا آلياً من القيود المحاسبية لنظام ميزان ERP. يُرجى مراجعة وتدقيق الحركات الموضحة أعلاه، وفي حال وجود أي اعتراض أو استفسار نرجو إشعار الإدارة المالية خلال 7 أيام عمل من تاريخه، وإلا اعتُبر الرصيد الموضح مصادقاً عليه ومطابقاً لدفاتركم.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "14px",
                borderTop: "1.5px solid #0f172a",
                paddingTop: "12px",
                textAlign: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>إعداد المحاسب</div>
                <div style={{ height: "40px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  الاسم والتوقيع
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>المراجعة المالية</div>
                <div style={{ height: "40px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  الاعتماد والتوقيع
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>ختم المنشأة</div>
                <div style={{ height: "40px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  الختم الرسمي
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>
                  مصادقة {partyType === "supplier" ? "المورد" : "العميل"}
                </div>
                <div style={{ height: "40px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  التوقيع والختم بالاستلام
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. Modal for Print Preview (Interactive overlay on screen) */}
      {showPrintModal && statementData && (
        <div
          className="no-print"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            padding: "16px",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              width: "100%",
              maxWidth: "920px",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>
                <Printer size={18} color="#059669" />
                <span>معاينة قالب الطباعة الرسمي A4 لكشف الحساب</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "8px",
                    backgroundColor: "#059669",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 800,
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Printer size={14} />
                  <span>طباعة فورية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  style={{
                    padding: "6px",
                    borderRadius: "8px",
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div
              style={{
                padding: "24px",
                overflowY: "auto",
                backgroundColor: "#f1f5f9",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "800px",
                  background: "#ffffff",
                  padding: "24px",
                  borderRadius: "8px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
                  boxSizing: "border-box",
                }}
              >
                {/* Visual Preview Content */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 900, margin: 0, color: "#0f172a" }}>
                      {settings?.company_name || "ميزان لإدارة الأعمال ERP"}
                    </h2>
                    <div style={{ fontSize: "11px", color: "#475569", marginTop: "3px" }}>
                      الرقم الضريبي: {settings?.company_tax_number || "310000000000003"} | السجل التجاري: {settings?.company_cr_number || "1010000000"}
                    </div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 900,
                        color: partyType === "supplier" ? "#065f46" : "#1e40af",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        padding: "4px 12px",
                        borderRadius: "6px",
                        display: "inline-block",
                      }}
                    >
                      {partyType === "supplier" ? "كشف حساب مورد معتمد" : "كشف حساب عميل معتمد"}
                    </div>
                  </div>
                </div>

                <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", backgroundColor: "#f8fafc", fontSize: "11px", marginBottom: "14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", gap: "8px" }}>
                    <div>الطرف: <strong>{statementData.party.name}</strong> <span style={{ fontFamily: "monospace" }}>[{statementData.party.code}]</span></div>
                    <div>الضريبي: <strong>{statementData.party.tax_number || "—"}</strong></div>
                    <div style={{ textAlign: "left" }}>الفترة: <strong>{statementData.filters.date_from || "البداية"} إلى {statementData.filters.date_to || "الآن"}</strong></div>
                  </div>
                </div>

                <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", backgroundColor: "#f8fafc", fontSize: "11px", marginBottom: "14px" }}>
                  المبلغ المستحق تفقيطاً: <strong style={{ color: "#0f172a" }}>{tafqeet(Math.abs(statementData.closing_balance), "ريال سعودي", "هللة")}</strong>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px", border: "1px solid #cbd5e1", marginBottom: "16px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                      <th style={{ padding: "6px", borderBottom: "1px solid #cbd5e1", textAlign: "center" }}>م</th>
                      <th style={{ padding: "6px", borderBottom: "1px solid #cbd5e1" }}>التاريخ</th>
                      <th style={{ padding: "6px", borderBottom: "1px solid #cbd5e1" }}>المستند</th>
                      <th style={{ padding: "6px", borderBottom: "1px solid #cbd5e1" }}>البيان</th>
                      <th style={{ padding: "6px", borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>مدين</th>
                      <th style={{ padding: "6px", borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>دائن</th>
                      <th style={{ padding: "6px", borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                      <td style={{ padding: "5px", textAlign: "center" }}>—</td>
                      <td style={{ padding: "5px" }}>{statementData.filters.date_from || "سابق"}</td>
                      <td style={{ padding: "5px", fontWeight: 700 }}>رصيد افتتاحي</td>
                      <td style={{ padding: "5px", color: "#64748b" }}>رصيد أول المدة ما قبل تاريخ البداية</td>
                      <td style={{ padding: "5px", textAlign: "left" }}>—</td>
                      <td style={{ padding: "5px", textAlign: "left" }}>—</td>
                      <td style={{ padding: "5px", textAlign: "left", fontWeight: 800 }}>{formatMoney(statementData.opening_balance)}</td>
                    </tr>
                    {statementData.transactions.map((tx, idx) => (
                      <tr key={tx.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "5px", textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ padding: "5px" }}>{tx.date}</td>
                        <td style={{ padding: "5px", fontWeight: 700 }}>{tx.document_number}</td>
                        <td style={{ padding: "5px" }}>{tx.description}</td>
                        <td style={{ padding: "5px", textAlign: "left", color: "#2563eb", fontWeight: 700 }}>{tx.debit > 0 ? formatMoney(tx.debit) : "—"}</td>
                        <td style={{ padding: "5px", textAlign: "left", color: "#059669", fontWeight: 700 }}>{tx.credit > 0 ? formatMoney(tx.credit) : "—"}</td>
                        <td style={{ padding: "5px", textAlign: "left", fontWeight: 800 }}>{formatMoney(tx.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #0f172a", backgroundColor: "#f8fafc", fontWeight: 800 }}>
                      <td colSpan={4} style={{ padding: "6px" }}>الإجمالي النهائي:</td>
                      <td style={{ padding: "6px", textAlign: "left", color: "#2563eb" }}>{formatMoney(statementData.total_debit)}</td>
                      <td style={{ padding: "6px", textAlign: "left", color: "#059669" }}>{formatMoney(statementData.total_credit)}</td>
                      <td style={{ padding: "6px", textAlign: "left", fontWeight: 900 }}>{formatMoney(statementData.closing_balance)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", borderTop: "1.5px solid #0f172a", paddingTop: "10px", textAlign: "center", marginTop: "20px" }}>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 800 }}>المحاسب</div>
                    <div style={{ height: "30px" }}></div>
                    <div style={{ borderTop: "1px dashed #cbd5e1", fontSize: "9px" }}>توقيع</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 800 }}>المراجعة</div>
                    <div style={{ height: "30px" }}></div>
                    <div style={{ borderTop: "1px dashed #cbd5e1", fontSize: "9px" }}>توقيع</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 800 }}>الختم</div>
                    <div style={{ height: "30px" }}></div>
                    <div style={{ borderTop: "1px dashed #cbd5e1", fontSize: "9px" }}>الختم</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 800 }}>مصادقة الطرف</div>
                    <div style={{ height: "30px" }}></div>
                    <div style={{ borderTop: "1px dashed #cbd5e1", fontSize: "9px" }}>توقيع</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyStatementPage;
