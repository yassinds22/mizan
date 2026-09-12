import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Printer,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Calendar,
  Building,
  User,
  CreditCard,
  Hash,
  Coins,
  Receipt,
  FileSpreadsheet,
  X,
  Plus,
  Eye,
  QrCode as QrIcon,
} from "lucide-react";
import QRCode from "qrcode";
import { Modal } from "@/components/ui/Modal";
import { money } from "@/utils/formatters";
import { tafqeet } from "@/utils/tafqeet";
import { treasuryApi, VoucherRecord, OpenInvoiceItem } from "@/api/treasury";
import { salesApi, Customer } from "@/api/sales";
import { coreApi } from "@/api/core";
import axios from "axios";

interface VoucherDocPageProps {
  voucherIdToView?: number | null;
  initialType?: "receipt" | "payment";
  onBack: () => void;
}

export const VoucherDocPage: React.FC<VoucherDocPageProps> = ({
  voucherIdToView,
  initialType = "receipt",
  onBack,
}) => {
  const isEditing = Boolean(voucherIdToView);

  // Form State
  const [voucherType, setVoucherType] = useState<"receipt" | "payment">(initialType);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [partyType, setPartyType] = useState<"customer" | "supplier" | "account">("customer");
  const [partyId, setPartyId] = useState<number | null>(null);
  const [partyName, setPartyName] = useState<string>("");
  const [treasuryAccountId, setTreasuryAccountId] = useState<number | null>(null);
  const [counterAccountId, setCounterAccountId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "cheque" | "pos">("cash");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [receivedFrom, setReceivedFrom] = useState<string>("");
  const [paidTo, setPaidTo] = useState<string>("");

  // Lookups data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState<any[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceItem[]>([]);
  const [allocatedInvoices, setAllocatedInvoices] = useState<Record<number, number>>({});
  const [isAllocationMode, setIsAllocationMode] = useState<boolean>(false);

  // Selected Voucher View state
  const [currentVoucher, setCurrentVoucher] = useState<VoucherRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [companySettings, setCompanySettings] = useState<any>({
    company_name: "ميزان لتجارة وتوزيع المواد الغذائية",
    vat_number: "300000000000003",
    commercial_register: "1010000000",
    address: "المملكة العربية السعودية - الرياض",
  });

  const [baseCurrency, setBaseCurrency] = useState<{ code: string; name: string; symbol: string }>({
    code: "YR",
    name: "ريال يمني",
    symbol: "YR",
  });

  // Success Modal State (Replaces native browser alert)
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    voucherNumber: string;
    voucherType: "receipt" | "payment";
    amount: number | string;
    partyName: string;
    isPosted: boolean;
  }>({
    isOpen: false,
    voucherNumber: "",
    voucherType: "receipt",
    amount: 0,
    partyName: "",
    isPosted: false,
  });

  // QR Code & Print Preview Modal
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const generateQrCode = async (vNumber: string, vAmount: number, vDate: string) => {
    try {
      const qrData = `سند مالي: ${vNumber}\nالمنشأة: ${companySettings.company_name}\nالرقم الضريبي: ${companySettings.vat_number}\nالتاريخ: ${vDate}\nالمبلغ: ${vAmount} ${baseCurrency.symbol || baseCurrency.name}`;
      const url = await QRCode.toDataURL(qrData, {
        width: 130,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrCodeUrl(url);
    } catch (e) {
      console.error("QR generation error:", e);
    }
  };

  // Selected party current balance
  const selectedCustomer = customers.find((c) => c.id === partyId);
  const selectedSupplier = suppliers.find((s) => s.id === partyId);

  // Load initial lookups
  useEffect(() => {
    const loadLookups = async () => {
      try {
        // Company settings
        coreApi.getSettings().then((res) => {
          if (res) setCompanySettings((prev: any) => ({ ...prev, ...res }));
        });

        // Currencies & Base Currency
        coreApi.getCurrencies().then((curs) => {
          const base = curs.find((c) => c.is_base_currency) || curs[0];
          if (base) {
            setBaseCurrency({
              code: base.code,
              name: base.name,
              symbol: base.symbol || base.code,
            });
          }
        }).catch(() => {});

        // Customers
        salesApi.getAllActiveCustomers().then(setCustomers).catch(() => {});

        // Suppliers
        axios.get("/api/v1/purchases/suppliers/all-active").then((res) => {
          setSuppliers(res.data.data || []);
        }).catch(() => {});

        // Leaf Accounts for direct GL selection
        axios.get("/api/v1/accounting/accounts/leaf").then((res) => {
          const list = res.data.data || [];
          setAccounts(list);

          // Filter treasury accounts (cash and banks)
          const treasuries = list.filter((acc: any) => {
            const code = String(acc.code);
            const name = String(acc.name_ar).toLowerCase();
            return (
              code.startsWith("111") ||
              name.includes("صندوق") ||
              name.includes("بنك") ||
              name.includes("نقدية") ||
              name.includes("خزينة")
            );
          });
          setTreasuryAccounts(treasuries);
          if (treasuries.length > 0 && !treasuryAccountId) {
            setTreasuryAccountId(treasuries[0].id);
          }
        }).catch(() => {});
      } catch (e) {
        console.error("Error loading lookups:", e);
      }
    };

    loadLookups();
  }, []);

  // Generate QR Code whenever voucher data changes
  useEffect(() => {
    const vNum = currentVoucher?.voucher_number || "RV-2026-0004";
    const vAmt = Number(amount || currentVoucher?.amount || 0);
    generateQrCode(vNum, vAmt, date);
  }, [currentVoucher, amount, date, companySettings, baseCurrency]);

  // Load voucher details if viewing
  useEffect(() => {
    if (voucherIdToView) {
      setLoading(true);
      treasuryApi.getVoucher(voucherIdToView)
        .then((v) => {
          setCurrentVoucher(v);
          setVoucherType(v.voucher_type);
          setDate(v.date);
          setPartyType(v.party_type);
          setPartyId(v.party_id);
          setPartyName(v.party_name);
          setTreasuryAccountId(v.treasury_account_id);
          setCounterAccountId(v.counter_account_id);
          setPaymentMethod(v.payment_method);
          setReferenceNumber(v.reference_number || "");
          setAmount(Number(v.amount));
          setNotes(v.notes || "");
          setReceivedFrom(v.received_from || "");
          setPaidTo(v.paid_to || "");
        })
        .catch((err) => {
          alert("تعذر تحميل السند: " + err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [voucherIdToView]);

  // Load open invoices when customer or supplier changes
  useEffect(() => {
    if (!isEditing && (partyType === "customer" || partyType === "supplier") && partyId) {
      treasuryApi.getOpenInvoices(partyType, partyId)
        .then((invs) => {
          setOpenInvoices(invs);
          setAllocatedInvoices({});
        })
        .catch(() => {
          setOpenInvoices([]);
        });
    } else {
      setOpenInvoices([]);
      setAllocatedInvoices({});
    }
  }, [partyType, partyId, isEditing]);

  // Handle auto-allocation
  const handleAutoAllocate = () => {
    if (amount <= 0 || openInvoices.length === 0) return;
    let remainingToAllocate = amount;
    const newAllocations: Record<number, number> = {};

    for (const inv of openInvoices) {
      if (remainingToAllocate <= 0) break;
      const canAlloc = Math.min(remainingToAllocate, inv.remaining_amount);
      if (canAlloc > 0) {
        newAllocations[inv.invoice_id] = parseFloat(canAlloc.toFixed(4));
        remainingToAllocate -= canAlloc;
      }
    }

    setAllocatedInvoices(newAllocations);
    setIsAllocationMode(true);
  };

  const handleInvoiceAllocationChange = (invoiceId: number, val: number, maxVal: number) => {
    const validAmount = Math.max(0, Math.min(val, maxVal));
    setAllocatedInvoices((prev) => {
      const updated = { ...prev };
      if (validAmount > 0) {
        updated[invoiceId] = validAmount;
      } else {
        delete updated[invoiceId];
      }
      return updated;
    });
  };

  const totalAllocated = Object.values(allocatedInvoices).reduce((acc, v) => acc + v, 0);

  // Projected balance calculation
  const getProjectedBalance = () => {
    if (partyType === "customer" && selectedCustomer) {
      const current = Number(selectedCustomer.balance);
      return voucherType === "receipt" ? current - amount : current + amount;
    }
    if (partyType === "supplier" && selectedSupplier) {
      const current = Number(selectedSupplier.balance);
      return voucherType === "payment" ? current - amount : current + amount;
    }
    return null;
  };

  const projectedBalance = getProjectedBalance();

  // Save handler
  const handleSave = async (postImmediately: boolean) => {
    if (amount <= 0) {
      alert("يرجى إدخال مبلغ صحيح أكبر من الصفر.");
      return;
    }
    if (!treasuryAccountId) {
      alert("يرجى اختيار حساب الخزينة أو البنك.");
      return;
    }
    if (partyType === "account" && !counterAccountId) {
      alert("يرجى اختيار الحساب المالي المقابل من دليل الحسابات.");
      return;
    }
    if ((partyType === "customer" || partyType === "supplier") && !partyId) {
      alert(`يرجى تحديد ${partyType === "customer" ? "العميل" : "المورد"}.`);
      return;
    }

    // Allocation validation
    if (isAllocationMode && totalAllocated > amount) {
      alert(`إجمالي المبالغ المخصصة (${money(totalAllocated)}) يتجاوز مبلغ السند (${money(amount)}).`);
      return;
    }

    const allocationsPayload = isAllocationMode
      ? Object.entries(allocatedInvoices).map(([invId, allocAmt]) => ({
          invoice_type: partyType === "customer" ? "sales_invoice" : "purchase_invoice",
          invoice_id: Number(invId),
          allocated_amount: allocAmt,
        }))
      : [];

    const payload = {
      voucher_type: voucherType,
      date,
      party_type: partyType,
      party_id: partyId,
      party_name: partyName || undefined,
      treasury_account_id: treasuryAccountId,
      counter_account_id: counterAccountId,
      payment_method: paymentMethod,
      reference_number: referenceNumber || null,
      amount,
      notes: notes || null,
      received_from: receivedFrom || null,
      paid_to: paidTo || null,
      allocations: allocationsPayload,
      post_immediately: postImmediately,
    };

    setSaving(true);
    try {
      let saved: VoucherRecord;
      if (currentVoucher && currentVoucher.status === "draft") {
        saved = await treasuryApi.updateVoucher(currentVoucher.id, payload);
        if (postImmediately) {
          saved = await treasuryApi.postVoucher(currentVoucher.id);
        }
      } else {
        saved = await treasuryApi.createVoucher(payload);
      }

      setCurrentVoucher(saved);
      setSuccessModal({
        isOpen: true,
        voucherNumber: saved.voucher_number,
        voucherType: saved.voucher_type,
        amount: saved.amount,
        partyName: saved.party_name || partyName,
        isPosted: saved.status === "posted",
      });
    } catch (err: any) {
      alert("حدث خطأ أثناء الحفظ: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleNewVoucher = () => {
    setCurrentVoucher(null);
    setAmount(0);
    setReferenceNumber("");
    setNotes("");
    setAllocatedInvoices({});
    setIsAllocationMode(false);
    setSuccessModal((p) => ({ ...p, isOpen: false }));
  };

  const isReadOnly = currentVoucher ? currentVoucher.status !== "draft" : false;
  const isReceipt = voucherType === "receipt";

  return (
    <div className="page-container" style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Scoped Print Styles */}
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
          #official-print-voucher, #official-print-voucher * {
            visibility: visible !important;
          }
          #official-print-voucher {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          .screen-only, .no-print, header, nav, aside {
            display: none !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Navigation */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <button
          onClick={onBack}
          className="btn btn-outline"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <ArrowRight size={16} />
          <span>رجوع للسندات</span>
        </button>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Live Preview Button - Available Anytime */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="btn btn-outline"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              borderColor: "#059669",
              color: "#059669",
              fontWeight: 700,
              backgroundColor: "#f0fdf4",
            }}
          >
            <Eye size={16} />
            <span>معاينة السند كفاتورة للعميل</span>
          </button>

          {isReadOnly && (
            <button
              onClick={() => window.print()}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Printer size={16} />
              <span>طباعة السند الرسمي</span>
            </button>
          )}

          {!isReadOnly && (
            <>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="btn btn-outline"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Save size={16} />
                <span>حفظ كمسودة</span>
              </button>

              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="btn"
                style={{
                  backgroundColor: isReceipt ? "#059669" : "#dc2626",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={16} />
                <span>{saving ? "جاري الترحيل..." : "حفظ وترحيل فوري"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Screen Form Container */}
      <div
        className="screen-only"
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
          padding: "2rem",
          position: "relative",
        }}
      >
        {/* Status Watermark for Cancelled */}
        {currentVoucher?.status === "cancelled" && (
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "30%",
              fontSize: "4rem",
              fontWeight: 900,
              color: "rgba(220, 38, 38, 0.15)",
              transform: "rotate(-25deg)",
              border: "6px solid rgba(220, 38, 38, 0.2)",
              padding: "0.5rem 2rem",
              borderRadius: "16px",
              pointerEvents: "none",
            }}
          >
            سند ملغى
          </div>
        )}

        {/* Voucher Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2px solid #0f172a",
            paddingBottom: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
              {companySettings.company_name}
            </h1>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
              الرقم الضريبي: {companySettings.vat_number} · س.ت: {companySettings.commercial_register}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{companySettings.address}</div>
          </div>

          <div style={{ textAlign: "left" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 1.2rem",
                borderRadius: "8px",
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "#fff",
                backgroundColor: isReceipt ? "#059669" : "#dc2626",
              }}
            >
              {isReceipt ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
              <span>{isReceipt ? "سند قبض نقدية / بنك" : "سند صرف نقدية / بنك"}</span>
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, marginTop: "0.5rem", fontFamily: "monospace" }}>
              رقم السند: {currentVoucher?.voucher_number || "توليد آلي عند الحفظ"}
            </div>
          </div>
        </div>

        {/* Receipt / Payment Switcher Buttons (Only when creating) */}
        {!isReadOnly && (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "1.5rem",
              background: "#f8fafc",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setVoucherType("receipt");
                setPartyType("customer");
              }}
              style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                cursor: "pointer",
                transition: "all 0.2s",
                border: voucherType === "receipt" ? "2px solid #059669" : "1px solid #cbd5e1",
                backgroundColor: voucherType === "receipt" ? "#ecfdf5" : "#fff",
                color: voucherType === "receipt" ? "#065f46" : "#475569",
              }}
            >
              <ArrowDownLeft size={18} />
              <span>🧾 سند قبض (تحصيل نقدية / شيك)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setVoucherType("payment");
                setPartyType("supplier");
              }}
              style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                cursor: "pointer",
                transition: "all 0.2s",
                border: voucherType === "payment" ? "2px solid #dc2626" : "1px solid #cbd5e1",
                backgroundColor: voucherType === "payment" ? "#fef2f2" : "#fff",
                color: voucherType === "payment" ? "#991b1b" : "#475569",
              }}
            >
              <ArrowUpRight size={18} />
              <span>💸 سند صرف (سداد مورد / مصروف)</span>
            </button>
          </div>
        )}

        {/* Voucher Metadata Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Date */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
              تاريخ السند:
            </label>
            <input
              type="date"
              value={date}
              disabled={isReadOnly}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
              }}
            />
          </div>

          {/* Payment Method */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
              طريقة الدفع:
            </label>
            <select
              value={paymentMethod}
              disabled={isReadOnly}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
              }}
            >
              <option value="cash">نقداً (كاش)</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="cheque">شيك بنكي</option>
              <option value="pos">مدى / شبكة</option>
            </select>
          </div>

          {/* Reference / Cheque Number */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
              رقم المرجع / الشيك / الحوالة:
            </label>
            <input
              type="text"
              placeholder="مثال: رقم الحوالة أو الشيك"
              value={referenceNumber}
              disabled={isReadOnly}
              onChange={(e) => setReferenceNumber(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
              }}
            />
          </div>

          {/* Treasury Account (Cash/Bank) */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
              الخزينة أو حساب البنك:
            </label>
            <select
              value={treasuryAccountId || ""}
              disabled={isReadOnly}
              onChange={(e) => setTreasuryAccountId(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              {treasuryAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name_ar}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counterparty Box */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }}>الطرف المتعامل:</span>
            {!isReadOnly && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="partyType"
                    checked={partyType === "customer"}
                    onChange={() => {
                      setPartyType("customer");
                      setPartyId(null);
                      setPartyName("");
                    }}
                  />
                  عميل مبيعات
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="partyType"
                    checked={partyType === "supplier"}
                    onChange={() => {
                      setPartyType("supplier");
                      setPartyId(null);
                      setPartyName("");
                    }}
                  />
                  مورد مشتريات
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="partyType"
                    checked={partyType === "account"}
                    onChange={() => {
                      setPartyType("account");
                      setPartyId(null);
                      setPartyName("");
                    }}
                  />
                  حساب مباشر من الدليل
                </label>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            {/* Party Selection Dropdown */}
            {partyType === "customer" && (
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                  اختر العميل:
                </label>
                <select
                  value={partyId || ""}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setPartyId(id);
                    const cust = customers.find((c) => c.id === id);
                    if (cust) {
                      setPartyName(cust.name_ar);
                      setReceivedFrom(cust.name_ar);
                    }
                  }}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                >
                  <option value="">-- حدد العميل --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar} (رصيد: {money(c.balance)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {partyType === "supplier" && (
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                  اختر المورد:
                </label>
                <select
                  value={partyId || ""}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setPartyId(id);
                    const sup = suppliers.find((s) => s.id === id);
                    if (sup) {
                      setPartyName(sup.name_ar);
                      setPaidTo(sup.name_ar);
                    }
                  }}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                >
                  <option value="">-- حدد المورد --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name_ar} (رصيد: {money(s.balance)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {partyType === "account" && (
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                  الحساب المقابل في القيد المحاسبي:
                </label>
                <select
                  value={counterAccountId || ""}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setCounterAccountId(id);
                    const acc = accounts.find((a) => a.id === id);
                    if (acc) setPartyName(acc.name_ar);
                  }}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                >
                  <option value="">-- اختر الحساب من الدليل --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Received from / Paid to Person Name */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                {isReceipt ? "استلمنا من المكرم:" : "صرفنا إلى المكرم:"}
              </label>
              <input
                type="text"
                value={isReceipt ? receivedFrom : paidTo}
                disabled={isReadOnly}
                onChange={(e) => {
                  if (isReceipt) setReceivedFrom(e.target.value);
                  else setPaidTo(e.target.value);
                }}
                placeholder="اسم الشخص المستلم أو المسلّم"
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              />
            </div>
          </div>

          {/* Party Balance Snapshot */}
          {projectedBalance !== null && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem 1rem",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                fontSize: "0.85rem",
              }}
            >
              <div>
                <span style={{ color: "#64748b" }}>الرصيد الحالي للطرف: </span>
                <strong style={{ color: "#0f172a" }}>
                  {money(partyType === "customer" ? selectedCustomer?.balance : selectedSupplier?.balance)}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748b" }}>المبلغ المسدد: </span>
                <strong style={{ color: isReceipt ? "#059669" : "#dc2626" }}>{money(amount)}</strong>
              </div>

              <div>
                <span style={{ color: "#64748b" }}>الرصيد المتوقع بعد السند: </span>
                <strong style={{ color: projectedBalance < 0 ? "#059669" : "#0f172a" }}>
                  {money(projectedBalance)} {projectedBalance < 0 && "(رصيد دائن / دفعة مقدمة)"}
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Amount & Tafqeet Section */}
        <div
          style={{
            background: isReceipt ? "#f0fdf4" : "#fef2f2",
            border: isReceipt ? "1px solid #bbf7d0" : "1px solid #fecaca",
            borderRadius: "8px",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ minWidth: 220 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: isReceipt ? "#166534" : "#991b1b", marginBottom: "0.35rem" }}>
                مبلغ السند بالأرقام ({baseCurrency.symbol || baseCurrency.name}):
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount || ""}
                disabled={isReadOnly}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                style={{
                  width: "100%",
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  padding: "0.4rem 0.75rem",
                  borderRadius: "6px",
                  border: isReceipt ? "2px solid #059669" : "2px solid #dc2626",
                  color: isReceipt ? "#065f46" : "#991b1b",
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.25rem" }}>
                المبلغ كتابة بالحروف (تفقيط رسمي):
              </span>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  backgroundColor: "#fff",
                  padding: "0.6rem 1rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                }}
              >
                {tafqeet(amount, baseCurrency.name, baseCurrency.code === "SAR" ? "هللة" : "فلس")}
              </div>
            </div>
          </div>
        </div>

        {/* Open Invoices Allocation Section */}
        {!isReadOnly && openInvoices.length > 0 && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileSpreadsheet size={18} color="#0284c7" />
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  الفواتير المفتوحة المستحقة (تخصيص السداد)
                </span>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  ({openInvoices.length} فواتير معلقة)
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleAutoAllocate}
                  style={{ fontSize: "0.75rem" }}
                >
                  ⚡ سداد تلقائي لأقدم الفواتير
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setAllocatedInvoices({});
                    setIsAllocationMode(false);
                  }}
                  style={{ fontSize: "0.75rem" }}
                >
                  إلغاء التخصيص (سداد على الحساب)
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>رقم الفاتورة</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>تاريخها</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>الإجمالي</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>المسدد سابقاً</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>المتبقي المطلوب</th>
                    <th style={{ padding: "0.5rem", textAlign: "right", width: 150 }}>المبلغ المخصص</th>
                  </tr>
                </thead>
                <tbody>
                  {openInvoices.map((inv) => {
                    const allocatedVal = allocatedInvoices[inv.invoice_id] || 0;
                    return (
                      <tr key={inv.invoice_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.5rem", fontWeight: 700, fontFamily: "monospace" }}>
                          {inv.invoice_number}
                        </td>
                        <td style={{ padding: "0.5rem" }}>{inv.invoice_date}</td>
                        <td style={{ padding: "0.5rem" }}>{money(inv.total_amount)}</td>
                        <td style={{ padding: "0.5rem", color: "#059669" }}>{money(inv.paid_amount)}</td>
                        <td style={{ padding: "0.5rem", fontWeight: 700, color: "#dc2626" }}>
                          {money(inv.remaining_amount)}
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={inv.remaining_amount}
                            value={allocatedVal || ""}
                            onChange={(e) =>
                              handleInvoiceAllocationChange(
                                inv.invoice_id,
                                parseFloat(e.target.value) || 0,
                                inv.remaining_amount
                              )
                            }
                            placeholder="0.00"
                            style={{
                              width: "100%",
                              padding: "0.3rem 0.5rem",
                              borderRadius: "4px",
                              border: allocatedVal > 0 ? "1px solid #059669" : "1px solid #cbd5e1",
                              fontWeight: 700,
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalAllocated > 0 && (
              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.85rem",
                  padding: "0.5rem",
                  backgroundColor: totalAllocated <= amount ? "#f0fdf4" : "#fef2f2",
                  borderRadius: "6px",
                }}
              >
                <span>إجمالي المبالغ المخصصة للفواتير: <strong>{money(totalAllocated)}</strong></span>
                <span>
                  المتبقي كدفعة عامة على الحساب:{" "}
                  <strong style={{ color: amount - totalAllocated >= 0 ? "#059669" : "#dc2626" }}>
                    {money(amount - totalAllocated)}
                  </strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Allocations History for Viewed Vouchers */}
        {currentVoucher && currentVoucher.allocations && currentVoucher.allocations.length > 0 && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.5rem", color: "#1e293b" }}>
              الفواتير المخصصة والمسددة بهذا السند:
            </div>
            <ul style={{ margin: 0, paddingRight: "1.25rem", fontSize: "0.85rem", color: "#334155" }}>
              {currentVoucher.allocations.map((a, i) => (
                <li key={i} style={{ marginBottom: "0.25rem" }}>
                  فاتورة رقم:{" "}
                  <strong>
                    {a.sales_invoice?.invoice_number || a.purchase_invoice?.invoice_number || `#${a.invoice_id}`}
                  </strong>{" "}
                  — تم سداد: <strong>{money(a.allocated_amount)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Statement / Notes */}
        <div style={{ marginBottom: "2rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
            البيان والملاحظات:
          </label>
          <textarea
            rows={2}
            value={notes}
            disabled={isReadOnly}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اكتب بيان السند هنا..."
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.875rem",
            }}
          />
        </div>

        {/* Signatures Section (Official Printable Layout) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1.5rem",
            borderTop: "1px dashed #cbd5e1",
            paddingTop: "1.5rem",
            marginTop: "2rem",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>المستلم</div>
            <div style={{ height: "45px" }}></div>
            <div style={{ borderTop: "1px solid #94a3b8", fontSize: "0.75rem", color: "#64748b", paddingTop: "4px" }}>
              التوقيع والاسم
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>أمين الصندوق / البنك</div>
            <div style={{ height: "45px" }}></div>
            <div style={{ borderTop: "1px solid #94a3b8", fontSize: "0.75rem", color: "#64748b", paddingTop: "4px" }}>
              التوقيع والاعتماد
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>المحاسب</div>
            <div style={{ height: "45px" }}></div>
            <div style={{ borderTop: "1px solid #94a3b8", fontSize: "0.75rem", color: "#64748b", paddingTop: "4px" }}>
              التوقيع والمراجعة
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>المدير المالي</div>
            <div style={{ height: "45px" }}></div>
            <div style={{ borderTop: "1px solid #94a3b8", fontSize: "0.75rem", color: "#64748b", paddingTop: "4px" }}>
              الاعتماد النهائي
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Official Printable Voucher Layout */}
      <div id="official-print-voucher" className="print-only">
        <div
          style={{
            border: "2px solid #0f172a",
            borderRadius: "8px",
            padding: "16px 20px",
            background: "#ffffff",
            color: "#0f172a",
            fontFamily: "'Cairo', sans-serif",
            position: "relative",
            minHeight: "260mm",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
          }}
        >
          {/* Top Section */}
          <div>
            {/* Header: Company Info | Voucher Badge | Voucher Meta */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1.2fr",
                alignItems: "center",
                borderBottom: "2px solid #0f172a",
                paddingBottom: "12px",
                marginBottom: "14px",
                gap: "10px",
              }}
            >
              {/* Right: Company Info */}
              <div style={{ textAlign: "right" }}>
                <h1 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 900, color: "#0f172a" }}>
                  {companySettings.company_name}
                </h1>
                <div style={{ fontSize: "11px", color: "#334155", lineHeight: "1.5" }}>
                  <div>الرقم الضريبي: <strong>{companySettings.vat_number || "—"}</strong></div>
                  <div>السجل التجاري: <strong>{companySettings.commercial_register || "—"}</strong></div>
                  <div>العنوان: {companySettings.address || "اليمن - المركز الرئيسي"}</div>
                  {companySettings.phone && <div>الهاتف: {companySettings.phone}</div>}
                </div>
              </div>

              {/* Center: Official Voucher Title Badge */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    border: `2px solid ${isReceipt ? "#059669" : "#dc2626"}`,
                    backgroundColor: isReceipt ? "#ecfdf5" : "#fef2f2",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    display: "inline-block",
                  }}
                >
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 900,
                      color: isReceipt ? "#065f46" : "#991b1b",
                      margin: 0,
                    }}
                  >
                    {isReceipt ? "سند قبض نقدية / بنك" : "سند صرف نقدية / بنك"}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748b",
                      letterSpacing: "1px",
                      marginTop: "2px",
                      textTransform: "uppercase",
                    }}
                  >
                    {isReceipt ? "RECEIPT VOUCHER" : "PAYMENT VOUCHER"}
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "#059669", fontWeight: 700, marginTop: "4px" }}>
                  ● سند مالي معتمد ومرحل
                </div>
              </div>

              {/* Left: Voucher Metadata Box & QR Code */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-end" }}>
                {qrCodeUrl && (
                  <div style={{ textAlign: "center" }}>
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "4px",
                        border: "1px solid #cbd5e1",
                        display: "block",
                      }}
                    />
                    <div style={{ fontSize: "8.5px", color: "#64748b", marginTop: "2px", fontWeight: 700 }}>
                      تحقق إلكتروني
                    </div>
                  </div>
                )}
                <div
                  style={{
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "6px",
                    background: "#f8fafc",
                    padding: "8px 12px",
                    display: "inline-block",
                    minWidth: "175px",
                    textAlign: "right",
                    direction: "rtl",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>رقم السند:</span>
                    <strong style={{ fontFamily: "monospace", fontSize: "13px", color: "#0f172a" }}>
                      {currentVoucher?.voucher_number || "RV-2026-0004"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>التاريخ:</span>
                    <strong>{date}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>طريقة القبض:</span>
                    <strong>
                      {paymentMethod === "cash"
                        ? "نقداً (كاش)"
                        : paymentMethod === "bank_transfer"
                        ? "تحويل بنكي"
                        : paymentMethod === "cheque"
                        ? "شيك بنكي"
                        : "مدى / شبكة"}
                    </strong>
                  </div>
                  {referenceNumber && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#64748b" }}>رقم المرجع:</span>
                      <strong>{referenceNumber}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Prominent Amount Box */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "260px 1fr",
                border: "1.5px solid #0f172a",
                borderRadius: "8px",
                overflow: "hidden",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  background: isReceipt ? "#ecfdf5" : "#fef2f2",
                  borderLeft: "1.5px solid #0f172a",
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>المبلغ بالأرقام:</div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 900,
                    color: isReceipt ? "#065f46" : "#991b1b",
                    fontFamily: "sans-serif",
                    marginTop: "2px",
                  }}
                >
                  {money(Number(amount || currentVoucher?.amount || 0))} {baseCurrency.symbol || baseCurrency.name}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "10px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>المبلغ كتابة وتفقيطاً:</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                  {tafqeet(
                    Number(amount || currentVoucher?.amount || 0),
                    baseCurrency.name,
                    baseCurrency.code === "SAR" ? "هللة" : "فلس"
                  )}
                </div>
              </div>
            </div>

            {/* Official Legal Formulary Table */}
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                overflow: "hidden",
                marginBottom: "16px",
                fontSize: "12px",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 700,
                        color: "#475569",
                        backgroundColor: "#f8fafc",
                        width: "180px",
                      }}
                    >
                      {isReceipt ? "استلمنا من المكرم / السيد:" : "صرفنا إلى المكرم / السيد:"}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 800, color: "#0f172a", fontSize: "13px" }}>
                      {receivedFrom ||
                        paidTo ||
                        (partyType === "customer"
                          ? selectedCustomer?.name_ar || partyName
                          : partyType === "supplier"
                          ? selectedSupplier?.name_ar || partyName
                          : accounts.find((a) => a.id === counterAccountId)?.name_ar || partyName) ||
                        "عميل عام"}
                    </td>
                  </tr>

                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 700,
                        color: "#475569",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      {isReceipt ? "أودع في حساب (الخزينة / البنك):" : "صرف خصماً من حساب:"}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>
                      {treasuryAccounts.find((a) => a.id === treasuryAccountId)?.code || "1111"} -{" "}
                      {treasuryAccounts.find((a) => a.id === treasuryAccountId)?.name_ar ||
                        currentVoucher?.treasury_account?.name_ar ||
                        "الصندوق الرئيسي"}
                    </td>
                  </tr>

                  <tr>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 700,
                        color: "#475569",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      وذلك عن (البيان والغرض):
                    </td>
                    <td style={{ padding: "10px 14px", color: "#1e293b", lineHeight: "1.4" }}>
                      {notes || currentVoucher?.notes || "سداد وتصفية حساب طرف العميل"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Invoices Allocations Table (if any invoices were allocated) */}
            {(Object.keys(allocatedInvoices).length > 0 ||
              (currentVoucher?.allocations && currentVoucher.allocations.length > 0)) && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>
                  الفواتير المسددة والمخصصة بموجب هذا السند:
                </div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "11px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1px solid #cbd5e1" }}>
                      <th style={{ padding: "6px 10px", textAlign: "right" }}>رقم الفاتورة</th>
                      <th style={{ padding: "6px 10px", textAlign: "right" }}>تاريخ الفاتورة</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>قيمة الفاتورة</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>المسدد بهذا السند</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVoucher?.allocations && currentVoucher.allocations.length > 0
                      ? currentVoucher.allocations.map((a, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "6px 10px", fontFamily: "monospace", fontWeight: 700 }}>
                              {a.sales_invoice?.invoice_number || a.purchase_invoice?.invoice_number || `#${a.invoice_id}`}
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              {date}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "left" }}>
                              {money(Number(a.sales_invoice?.total_amount || a.purchase_invoice?.total_amount || a.allocated_amount))}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "left", fontWeight: 800, color: "#059669" }}>
                              {money(Number(a.allocated_amount))} {baseCurrency.symbol || baseCurrency.name}
                            </td>
                          </tr>
                        ))
                      : openInvoices
                          .filter((inv) => (allocatedInvoices[inv.invoice_id] || 0) > 0)
                          .map((inv) => (
                            <tr key={inv.invoice_id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "6px 10px", fontFamily: "monospace", fontWeight: 700 }}>
                                {inv.invoice_number}
                              </td>
                              <td style={{ padding: "6px 10px" }}>{inv.invoice_date}</td>
                              <td style={{ padding: "6px 10px", textAlign: "left" }}>{money(Number(inv.total_amount))}</td>
                              <td style={{ padding: "6px 10px", textAlign: "left", fontWeight: 800, color: "#059669" }}>
                                {money(Number(allocatedInvoices[inv.invoice_id]))} {baseCurrency.symbol || baseCurrency.name}
                              </td>
                            </tr>
                          ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial Balances Summary Bar */}
            {projectedBalance !== null && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  marginBottom: "16px",
                  fontSize: "11px",
                  textAlign: "center",
                }}
              >
                <div>
                  <span style={{ color: "#64748b" }}>الرصيد قبل السند: </span>
                  <strong>
                    {money(Number(partyType === "customer" ? selectedCustomer?.balance : selectedSupplier?.balance))}{" "}
                    {baseCurrency.symbol || baseCurrency.name}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>المسدد بهذا السند: </span>
                  <strong style={{ color: isReceipt ? "#059669" : "#dc2626" }}>
                    {money(Number(amount || currentVoucher?.amount || 0))} {baseCurrency.symbol || baseCurrency.name}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>الرصيد بعد السند: </span>
                  <strong style={{ color: projectedBalance < 0 ? "#059669" : "#0f172a" }}>
                    {money(Number(projectedBalance))} {baseCurrency.symbol || baseCurrency.name}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section: Signatures & Verification */}
          <div style={{ marginTop: "auto", paddingTop: "8px" }}>
            {/* 4 Official Signatures */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "12px",
                borderTop: "1.5px solid #0f172a",
                paddingTop: "10px",
                textAlign: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>المستلم</div>
                <div style={{ height: "38px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  الاسم والتوقيع
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>أمين الصندوق / البنك</div>
                <div style={{ height: "38px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  الاعتماد والتوقيع
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>المحاسب المالي</div>
                <div style={{ height: "38px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  المراجعة والقيد
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>المدير المالي / الاعتماد</div>
                <div style={{ height: "38px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  الاعتماد النهائي والختم
                </div>
              </div>
            </div>

            {/* System Print Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #e2e8f0",
                marginTop: "10px",
                paddingTop: "6px",
                fontSize: "9px",
                color: "#94a3b8",
              }}
            >
              <span>نظام ميزان ERP المالي والمحاسبي — سند إلكتروني معتمد رسمياً</span>
              <span>تاريخ ووقت الطباعة: {new Date().toLocaleString("ar-YE")}</span>
              <span>صفحة 1 من 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Centered Success Modal */}
      {successModal.isOpen && (
        <div
          className="no-print"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)",
              maxWidth: "500px",
              width: "100%",
              overflow: "hidden",
              textAlign: "center",
              padding: "2rem 1.75rem",
              position: "relative",
            }}
          >
            {/* Close Icon in corner */}
            <button
              onClick={() => setSuccessModal((p) => ({ ...p, isOpen: false }))}
              style={{
                position: "absolute",
                top: "1rem",
                left: "1rem",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748b",
              }}
              title="إغلاق"
            >
              <X size={18} />
            </button>

            {/* Icon */}
            <div
              style={{
                width: "72px",
                height: "72px",
                margin: "0 auto 1.25rem",
                borderRadius: "50%",
                backgroundColor: "#ecfdf5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#059669",
                boxShadow: "0 0 0 8px #f0fdf4",
              }}
            >
              <CheckCircle2 size={42} />
            </div>

            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
              {successModal.isPosted ? "تم ترحيل السند بنجاح!" : "تم حفظ مسودة السند بنجاح!"}
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0 0 1.5rem" }}>
              {successModal.isPosted
                ? "تم إثبات القيد المحاسبي وتحديث الأرصدة المالية بنجاح في النظام."
                : "تم حفظ بيانات السند كمسودة ويمكنك مراجعتها وترحيلها لاحقاً."}
            </p>

            {/* Voucher Details Summary Box */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                marginBottom: "1.75rem",
                textAlign: "right",
                fontSize: "0.875rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>رقم السند:</span>
                <span style={{ fontWeight: 800, fontFamily: "monospace", color: "#0f172a", fontSize: "1rem" }}>
                  {successModal.voucherNumber}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>نوع السند:</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: successModal.voucherType === "receipt" ? "#059669" : "#dc2626",
                  }}
                >
                  {successModal.voucherType === "receipt" ? "سند قبض نقدية / بنك" : "سند صرف نقدية / بنك"}
                </span>
              </div>
              {successModal.partyName && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>الطرف:</span>
                  <span style={{ fontWeight: 700, color: "#1e293b" }}>{successModal.partyName}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px dashed #cbd5e1",
                  paddingTop: "0.5rem",
                }}
              >
                <span style={{ color: "#64748b", fontWeight: 700 }}>المبلغ:</span>
                <span style={{ fontWeight: 900, color: "#059669", fontSize: "1.1rem" }}>
                  {money(Number(successModal.amount))} {baseCurrency.symbol || baseCurrency.name}
                </span>
              </div>
            </div>

            {/* Action Buttons in Center */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Print Voucher Button */}
              {/* Preview as Official Invoice */}
              <button
                type="button"
                onClick={() => {
                  setSuccessModal((p) => ({ ...p, isOpen: false }));
                  setShowPrintModal(true);
                }}
                className="btn"
                style={{
                  background: "#f0fdf4",
                  color: "#047857",
                  border: "1.5px solid #059669",
                  padding: "0.75rem 1.25rem",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.6rem",
                  cursor: "pointer",
                }}
              >
                <Eye size={18} />
                <span>👁️ معاينة السند كفاتورة رسمية للعميل</span>
              </button>

              {/* Direct Print Button */}
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="btn"
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  color: "#ffffff",
                  padding: "0.85rem 1.25rem",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.6rem",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(5, 150, 105, 0.3)",
                }}
              >
                <Printer size={20} />
                <span>🖨️ طباعة سند السداد الفورية (A4)</span>
              </button>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                {/* Exit Button */}
                <button
                  type="button"
                  onClick={onBack}
                  className="btn btn-outline"
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    color: "#475569",
                    borderColor: "#cbd5e1",
                    backgroundColor: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  <ArrowRight size={16} />
                  <span>الخروج للسندات</span>
                </button>

                {/* Create New Voucher Button */}
                <button
                  type="button"
                  onClick={handleNewVoucher}
                  className="btn btn-outline"
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    color: "#0f172a",
                    borderColor: "#cbd5e1",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={16} />
                  <span>سند جديد</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Voucher Preview Modal (Customer Invoice Style) */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title={`معاينة ${isReceipt ? "سند قبض مالي رسمي" : "سند صرف مالي رسمي"} — إيصال العميل`}
        subtitle="وثيقة رسمية معتمدة ومطابقة لكشف الحساب يمكن تسليمها للعميل كإيصال سداد وفاتورة استلام"
        maxWidth="920px"
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowPrintModal(false)}
              style={{ padding: "0.6rem 1.25rem", borderRadius: "8px" }}
            >
              إغلاق المعاينة
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                window.print();
              }}
              style={{
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                padding: "0.65rem 1.75rem",
                borderRadius: "8px",
                fontWeight: 800,
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(5, 150, 105, 0.3)",
              }}
            >
              <Printer size={18} />
              <span>🖨️ أمر الطباعة الفورية (A4)</span>
            </button>
          </div>
        }
      >
        <div style={{ padding: "10px 4px", maxHeight: "72vh", overflowY: "auto" }}>
          <div
            style={{
              border: "2px solid #0f172a",
              borderRadius: "8px",
              padding: "20px 24px",
              background: "#ffffff",
              color: "#0f172a",
              fontFamily: "'Cairo', sans-serif",
              boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1.2fr",
                alignItems: "center",
                borderBottom: "2px solid #0f172a",
                paddingBottom: "14px",
                marginBottom: "16px",
                gap: "10px",
              }}
            >
              <div style={{ textAlign: "right" }}>
                <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 900, color: "#0f172a" }}>
                  {companySettings.company_name}
                </h2>
                <div style={{ fontSize: "11px", color: "#334155", lineHeight: "1.6" }}>
                  <div>الرقم الضريبي: <strong>{companySettings.vat_number || "—"}</strong></div>
                  <div>السجل التجاري: <strong>{companySettings.commercial_register || "—"}</strong></div>
                  <div>العنوان: {companySettings.address || "اليمن - المركز الرئيسي"}</div>
                  {companySettings.phone && <div>الهاتف: {companySettings.phone}</div>}
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    border: `2px solid ${isReceipt ? "#059669" : "#dc2626"}`,
                    backgroundColor: isReceipt ? "#ecfdf5" : "#fef2f2",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    display: "inline-block",
                  }}
                >
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 900,
                      color: isReceipt ? "#065f46" : "#991b1b",
                      margin: 0,
                    }}
                  >
                    {isReceipt ? "سند قبض نقدية / بنك" : "سند صرف نقدية / بنك"}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748b",
                      letterSpacing: "1px",
                      marginTop: "2px",
                      textTransform: "uppercase",
                    }}
                  >
                    {isReceipt ? "RECEIPT VOUCHER" : "PAYMENT VOUCHER"}
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "#059669", fontWeight: 700, marginTop: "4px" }}>
                  ● إيصال سداد رسمي معتمد ومرحل
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-end" }}>
                {qrCodeUrl && (
                  <div style={{ textAlign: "center" }}>
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "4px",
                        border: "1px solid #cbd5e1",
                        display: "block",
                      }}
                    />
                    <div style={{ fontSize: "8.5px", color: "#64748b", marginTop: "2px", fontWeight: 700 }}>
                      تحقق إلكتروني
                    </div>
                  </div>
                )}
                <div
                  style={{
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "6px",
                    background: "#f8fafc",
                    padding: "8px 12px",
                    display: "inline-block",
                    minWidth: "175px",
                    textAlign: "right",
                    direction: "rtl",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>رقم السند:</span>
                    <strong style={{ fontFamily: "monospace", fontSize: "13px", color: "#0f172a" }}>
                      {currentVoucher?.voucher_number || "RV-2026-0004"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>التاريخ:</span>
                    <strong>{date}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>طريقة القبض:</span>
                    <strong>
                      {paymentMethod === "cash"
                        ? "نقداً (كاش)"
                        : paymentMethod === "bank_transfer"
                        ? "تحويل بنكي"
                        : paymentMethod === "cheque"
                        ? "شيك بنكي"
                        : "مدى / شبكة"}
                    </strong>
                  </div>
                  {referenceNumber && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#64748b" }}>رقم المرجع:</span>
                      <strong>{referenceNumber}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Amount Box */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "260px 1fr",
                border: "1.5px solid #0f172a",
                borderRadius: "8px",
                overflow: "hidden",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  background: isReceipt ? "#ecfdf5" : "#fef2f2",
                  borderLeft: "1.5px solid #0f172a",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>المبلغ المقبوض بالأرقام:</div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 900,
                    color: isReceipt ? "#065f46" : "#991b1b",
                    fontFamily: "sans-serif",
                    marginTop: "2px",
                  }}
                >
                  {money(Number(amount || currentVoucher?.amount || 0))} {baseCurrency.symbol || baseCurrency.name}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>المبلغ كتابة وتفقيطاً:</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                  {tafqeet(
                    Number(amount || currentVoucher?.amount || 0),
                    baseCurrency.name,
                    baseCurrency.code === "SAR" ? "هللة" : "فلس"
                  )}
                </div>
              </div>
            </div>

            {/* Legal Statement Table */}
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                overflow: "hidden",
                marginBottom: "16px",
                fontSize: "12px",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 700,
                        color: "#475569",
                        backgroundColor: "#f8fafc",
                        width: "190px",
                      }}
                    >
                      {isReceipt ? "استلمنا من المكرم / السيد:" : "صرفنا إلى المكرم / السيد:"}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>
                      <span>
                        {receivedFrom ||
                          paidTo ||
                          (partyType === "customer"
                            ? selectedCustomer?.name_ar || partyName
                            : partyType === "supplier"
                            ? selectedSupplier?.name_ar || partyName
                            : accounts.find((a) => a.id === counterAccountId)?.name_ar || partyName) ||
                          "عميل عام"}
                      </span>
                      {selectedCustomer?.tax_number && (
                        <span style={{ fontSize: "11px", color: "#64748b", marginRight: "1rem", fontWeight: 600 }}>
                          (الرقم الضريبي: {selectedCustomer.tax_number})
                        </span>
                      )}
                      {selectedCustomer?.code && (
                        <span style={{ fontSize: "11px", color: "#64748b", marginRight: "0.5rem", fontWeight: 600 }}>
                          [{selectedCustomer.code}]
                        </span>
                      )}
                    </td>
                  </tr>

                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 700,
                        color: "#475569",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      {isReceipt ? "أودع في حساب (الخزينة / البنك):" : "صرف خصماً من حساب:"}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>
                      {treasuryAccounts.find((a) => a.id === treasuryAccountId)?.code || "1111"} -{" "}
                      {treasuryAccounts.find((a) => a.id === treasuryAccountId)?.name_ar ||
                        currentVoucher?.treasury_account?.name_ar ||
                        "الصندوق الرئيسي"}
                    </td>
                  </tr>

                  <tr>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 700,
                        color: "#475569",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      وذلك عن (البيان والغرض):
                    </td>
                    <td style={{ padding: "10px 14px", color: "#1e293b", lineHeight: "1.4" }}>
                      {notes || currentVoucher?.notes || "سداد وتصفية حساب طرف العميل"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Invoices Allocations Table */}
            {(Object.keys(allocatedInvoices).length > 0 ||
              (currentVoucher?.allocations && currentVoucher.allocations.length > 0)) && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>
                  تفاصيل الفواتير المسددة والمخصصة بهذا السند (Settled Invoices):
                </div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "11px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1px solid #cbd5e1" }}>
                      <th style={{ padding: "6px 10px", textAlign: "right" }}>رقم الفاتورة</th>
                      <th style={{ padding: "6px 10px", textAlign: "right" }}>تاريخ الفاتورة</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>إجمالي الفاتورة</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>المسدد بهذا السند</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVoucher?.allocations && currentVoucher.allocations.length > 0
                      ? currentVoucher.allocations.map((a, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "6px 10px", fontFamily: "monospace", fontWeight: 700 }}>
                              {a.sales_invoice?.invoice_number || a.purchase_invoice?.invoice_number || `#${a.invoice_id}`}
                            </td>
                            <td style={{ padding: "6px 10px" }}>{date}</td>
                            <td style={{ padding: "6px 10px", textAlign: "left" }}>
                              {money(Number(a.sales_invoice?.total_amount || a.purchase_invoice?.total_amount || a.allocated_amount))}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "left", fontWeight: 800, color: "#059669" }}>
                              {money(Number(a.allocated_amount))} {baseCurrency.symbol || baseCurrency.name}
                            </td>
                          </tr>
                        ))
                      : openInvoices
                          .filter((inv) => (allocatedInvoices[inv.invoice_id] || 0) > 0)
                          .map((inv) => (
                            <tr key={inv.invoice_id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "6px 10px", fontFamily: "monospace", fontWeight: 700 }}>
                                {inv.invoice_number}
                              </td>
                              <td style={{ padding: "6px 10px" }}>{inv.invoice_date}</td>
                              <td style={{ padding: "6px 10px", textAlign: "left" }}>{money(Number(inv.total_amount))}</td>
                              <td style={{ padding: "6px 10px", textAlign: "left", fontWeight: 800, color: "#059669" }}>
                                {money(Number(allocatedInvoices[inv.invoice_id]))} {baseCurrency.symbol || baseCurrency.name}
                              </td>
                            </tr>
                          ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial Balances Summary */}
            {projectedBalance !== null && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  marginBottom: "16px",
                  fontSize: "11px",
                  textAlign: "center",
                }}
              >
                <div>
                  <span style={{ color: "#64748b" }}>الرصيد قبل السند: </span>
                  <strong>
                    {money(Number(partyType === "customer" ? selectedCustomer?.balance : selectedSupplier?.balance))}{" "}
                    {baseCurrency.symbol || baseCurrency.name}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>المسدد بهذا السند: </span>
                  <strong style={{ color: isReceipt ? "#059669" : "#dc2626" }}>
                    {money(Number(amount || currentVoucher?.amount || 0))} {baseCurrency.symbol || baseCurrency.name}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>الرصيد بعد السند: </span>
                  <strong style={{ color: projectedBalance < 0 ? "#059669" : "#0f172a" }}>
                    {money(Number(projectedBalance))} {baseCurrency.symbol || baseCurrency.name}
                  </strong>
                </div>
              </div>
            )}

            {/* Signatures */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "12px",
                borderTop: "1.5px solid #0f172a",
                paddingTop: "14px",
                textAlign: "center",
                marginTop: "16px",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>توقيع العميل / المستلم</div>
                <div style={{ height: "38px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  الاسم والتوقيع
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>أمين الصندوق / المحصل</div>
                <div style={{ height: "38px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  الاعتماد والتوقيع
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>المحاسب المالي</div>
                <div style={{ height: "38px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  المراجعة والقيد
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>المدير المالي / الختم</div>
                <div style={{ height: "38px" }}></div>
                <div style={{ borderTop: "1px dashed #94a3b8", fontSize: "10px", color: "#64748b", paddingTop: "3px" }}>
                  الاعتماد والختم الرسمي
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #e2e8f0",
                marginTop: "12px",
                paddingTop: "6px",
                fontSize: "9px",
                color: "#94a3b8",
              }}
            >
              <span>نظام ميزان ERP — يعتبر هذا السند إيصال سداد واستلام مالي رسمي</span>
              <span>تاريخ ووقت الإصدار: {new Date().toLocaleString("ar-YE")}</span>
              <span>صفحة 1 من 1</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
