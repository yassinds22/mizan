import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Download,
  Plus,
  Printer,
  Save,
  Trash2,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building,
  User,
  CreditCard,
  Calendar,
  FileText,
  ChevronDown,
  X,
  Send,
  Eye,
} from "lucide-react";
import QRCode from "qrcode";
import { BackBar } from "@/components/ui/BackBar";
import { Modal } from "@/components/ui/Modal";
import { money } from "@/utils/formatters";
import { productsApi, Item, ItemUnit } from "@/api/products";
import { salesApi, Customer, SalesInvoice } from "@/api/sales";

interface InvoiceLineState {
  id: string;
  item_id: number;
  item_name_ar: string;
  item_sku: string;
  item_unit_id: number | null;
  unit_name: string;
  conversion_factor: number;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount_rate: number;
  tax_rate: number;
  available_units: ItemUnit[];
}

interface InvoicePageProps {
  onBack: () => void;
  invoiceIdToView?: number | null;
}

export const InvoicePage: React.FC<InvoicePageProps> = ({ onBack, invoiceIdToView }) => {
  // Master data
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<{ id: number; name_ar: string }[]>([]);
  const [companySettings, setCompanySettings] = useState<{
    company_name: string;
    vat_number: string;
    commercial_register: string;
    address: string;
    phone: string;
  }>({
    company_name: "ميزان لتجارة وتوزيع المواد الغذائية",
    vat_number: "300000000000003",
    commercial_register: "1010123456",
    address: "المملكة العربية السعودية - الرياض",
    phone: "0112345678",
  });

  // Invoice Form State
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [branchId, setBranchId] = useState<number>(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "cash">("cash");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit" | "bank_transfer">("cash");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLineState[]>([]);

  // Barcode quick scan
  const [scanInput, setScanInput] = useState("");
  const [scanLoading, setScanLoading] = useState(false);

  // Print Preview & QR
  const [showPrint, setShowPrint] = useState(false);
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">("a4");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [currentSavedInvoice, setCurrentSavedInvoice] = useState<SalesInvoice | null>(null);

  // UI status
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Load master data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [itemsRes, custRes] = await Promise.all([
          productsApi.getItems({ per_page: 200, is_active: true }),
          salesApi.getAllActiveCustomers(),
        ]);
        setItems(itemsRes.data || []);
        setCustomers(custRes || []);

        // Load branches & settings
        try {
          const bRes = await fetch("/api/v1/core/branches");
          if (bRes.ok) {
            const bJson = await bRes.json();
            setBranches(bJson.data || []);
            if (bJson.data?.length) setBranchId(bJson.data[0].id);
          }

          const sRes = await fetch("/api/v1/core/settings");
          if (sRes.ok) {
            const sJson = await sRes.json();
            const setObj = sJson.data || {};
            setCompanySettings({
              company_name: setObj.company_name || "ميزان لتجارة وتوزيع المواد الغذائية",
              vat_number: setObj.vat_number || "300000000000003",
              commercial_register: setObj.commercial_register || "1010123456",
              address: setObj.address || "الرياض - المملكة العربية السعودية",
              phone: setObj.phone || "0112345678",
            });
          }
        } catch (e) {
          console.warn("Could not load core settings:", e);
        }

        // If viewing an existing invoice
        if (invoiceIdToView) {
          const inv = await salesApi.getInvoice(invoiceIdToView);
          populateInvoice(inv);
        } else if (itemsRes.data?.length > 0 && lines.length === 0) {
          // Initialize with 1 empty line
          const firstItem = itemsRes.data[0];
          addNewLineWithItem(firstItem);
        }
      } catch (err: any) {
        showToast(err.message || "فشل تحميل البيانات الأساسية");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [invoiceIdToView]);

  const populateInvoice = (inv: SalesInvoice) => {
    setCurrentSavedInvoice(inv);
    setInvoiceNumber(inv.invoice_number);
    setInvoiceDate(inv.invoice_date);
    if (inv.due_date) setDueDate(inv.due_date);
    setBranchId(inv.branch_id);
    setSelectedCustomerId(inv.customer_id || "cash");
    setPaymentMethod(inv.payment_method.value);
    setNotes(inv.notes || "");

    if (inv.lines) {
      setLines(
        inv.lines.map((l) => ({
          id: String(l.id || Math.random()),
          item_id: l.item_id,
          item_name_ar: l.item_name_ar || "",
          item_sku: l.item_sku || "",
          item_unit_id: l.item_unit_id || null,
          unit_name: l.unit_name,
          conversion_factor: l.conversion_factor,
          quantity: l.quantity,
          unit_price: l.unit_price,
          cost_price: l.cost_price || 0,
          discount_rate: l.discount_rate,
          tax_rate: l.tax_rate,
          available_units: [],
        }))
      );
    }
  };

  const addNewLineWithItem = (item: Item) => {
    const baseUomName = item.base_uom?.name_ar || "حبة";
    const availableUnits = item.units || [];
    const baseUnitObj = availableUnits.find((u) => u.is_base_unit);
    const retailPrice =
      baseUnitObj?.prices?.find((p) => p.price_tier.value === "retail")?.price ||
      item.cost_price * 1.25 ||
      10;

    const newLine: InvoiceLineState = {
      id: String(Date.now() + Math.random()),
      item_id: item.id,
      item_name_ar: item.name_ar,
      item_sku: item.sku,
      item_unit_id: baseUnitObj?.id || null,
      unit_name: baseUomName,
      conversion_factor: 1.0,
      quantity: 1,
      unit_price: retailPrice,
      cost_price: item.cost_price || 0,
      discount_rate: 0,
      tax_rate: 15,
      available_units: availableUnits,
    };

    setLines((prev) => [...prev, newLine]);
  };

  const handleItemChange = (lineId: string, itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const baseUomName = item.base_uom?.name_ar || "حبة";
    const availableUnits = item.units || [];
    const baseUnitObj = availableUnits.find((u) => u.is_base_unit);
    const retailPrice =
      baseUnitObj?.prices?.find((p) => p.price_tier.value === "retail")?.price ||
      item.cost_price * 1.25 ||
      10;

    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              item_id: item.id,
              item_name_ar: item.name_ar,
              item_sku: item.sku,
              item_unit_id: baseUnitObj?.id || null,
              unit_name: baseUomName,
              conversion_factor: 1.0,
              unit_price: retailPrice,
              cost_price: item.cost_price || 0,
              available_units: availableUnits,
            }
          : l
      )
    );
  };

  const handleUnitChange = (lineId: string, unitId: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const targetUnit = l.available_units.find((u) => u.id === unitId);
        if (!targetUnit) return l;

        const uName = targetUnit.uom?.name_ar || (targetUnit.is_base_unit ? "حبة" : "وحدة");
        const factor = targetUnit.conversion_factor || 1.0;
        const price =
          targetUnit.prices?.find((p) => p.price_tier.value === "retail")?.price ||
          l.unit_price * factor;

        return {
          ...l,
          item_unit_id: targetUnit.id || null,
          unit_name: uName,
          conversion_factor: factor,
          unit_price: price,
        };
      })
    );
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) {
      showToast("يجب أن تحتوي الفاتورة على سطر واحد على الأقل");
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  // Barcode fast scanner
  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setScanLoading(true);
    try {
      const res = await productsApi.lookupBarcode(scanInput.trim());
      if (res && res.item) {
        const item = res.item;
        const matchedUnit = res.matched_unit;

        const uName = matchedUnit?.uom?.name_ar || item.base_uom?.name_ar || "حبة";
        const factor = matchedUnit?.conversion_factor || 1.0;
        const price =
          matchedUnit?.prices?.find((p) => p.price_tier.value === "retail")?.price ||
          item.cost_price * 1.25 ||
          10;

        const newLine: InvoiceLineState = {
          id: String(Date.now() + Math.random()),
          item_id: item.id,
          item_name_ar: item.name_ar,
          item_sku: item.sku,
          item_unit_id: matchedUnit?.id || null,
          unit_name: uName,
          conversion_factor: factor,
          quantity: 1,
          unit_price: price,
          cost_price: item.cost_price || 0,
          discount_rate: 0,
          tax_rate: 15,
          available_units: item.units || [],
        };

        setLines((prev) => [...prev, newLine]);
        setScanInput("");
        showToast(`تمت إضافة الصنف: ${item.name_ar} (${uName})`);
      }
    } catch (err: any) {
      showToast(err.message || "لم يتم العثور على صنف مطابق لهذا الباركود");
    } finally {
      setScanLoading(false);
    }
  };

  // Financial Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const lineCalculations = lines.map((l) => {
      const lineSubtotal = l.quantity * l.unit_price;
      const lineDiscount = lineSubtotal * (l.discount_rate / 100);
      const taxable = Math.max(0, lineSubtotal - lineDiscount);
      const lineTax = taxable * (l.tax_rate / 100);
      const lineTotal = taxable + lineTax;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;

      return {
        ...l,
        lineSubtotal,
        lineDiscount,
        lineTax,
        lineTotal,
      };
    });

    const netTotal = subtotal - discountTotal + taxTotal;

    return {
      lineCalculations,
      subtotal,
      discountTotal,
      taxTotal,
      netTotal,
    };
  }, [lines]);

  // Generate QR code whenever print preview opens
  const openPrintPreview = async () => {
    try {
      let qrPayload = currentSavedInvoice?.zatca_qr_payload;

      // If not yet saved or payload missing, generate a compliant demo payload
      if (!qrPayload) {
        const dummyTlv = [
          String.fromCharCode(1) + String.fromCharCode(companySettings.company_name.length) + companySettings.company_name,
          String.fromCharCode(2) + String.fromCharCode(companySettings.vat_number.length) + companySettings.vat_number,
          String.fromCharCode(3) + String.fromCharCode(invoiceDate.length) + invoiceDate,
          String.fromCharCode(4) + String.fromCharCode(calculations.netTotal.toFixed(2).length) + calculations.netTotal.toFixed(2),
          String.fromCharCode(5) + String.fromCharCode(calculations.taxTotal.toFixed(2).length) + calculations.taxTotal.toFixed(2),
        ].join("");
        qrPayload = btoa(unescape(encodeURIComponent(dummyTlv)));
      }

      const qrUrl = await QRCode.toDataURL(qrPayload, {
        width: 180,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrCodeDataUrl(qrUrl);
      setShowPrint(true);
    } catch (e) {
      console.error("QR Code error:", e);
      setShowPrint(true);
    }
  };

  // Save Invoice (Draft or Posted)
  const handleSaveInvoice = async (postImmediately: boolean) => {
    if (lines.length === 0) {
      showToast("يرجى إضافة صنف واحد على الأقل في الفاتورة");
      return;
    }

    setSubmitting(true);
    try {
      const selectedCustomerObj =
        selectedCustomerId !== "cash"
          ? customers.find((c) => c.id === selectedCustomerId)
          : null;

      const payload = {
        invoice_number: invoiceNumber || undefined,
        invoice_date: invoiceDate,
        due_date: paymentMethod === "credit" ? dueDate : invoiceDate,
        branch_id: branchId,
        customer_id: selectedCustomerObj ? selectedCustomerObj.id : null,
        customer_name: selectedCustomerObj ? selectedCustomerObj.name_ar : "عميل نقدي عام",
        customer_tax_number: selectedCustomerObj?.tax_number || undefined,
        payment_method: paymentMethod,
        notes: notes || undefined,
        post_immediately: postImmediately,
        lines: lines.map((l) => ({
          item_id: l.item_id,
          item_unit_id: l.item_unit_id || undefined,
          unit_name: l.unit_name,
          conversion_factor: l.conversion_factor,
          quantity: l.quantity,
          unit_price: l.unit_price,
          cost_price: l.cost_price,
          discount_rate: l.discount_rate,
          tax_rate: l.tax_rate,
        })),
      };

      const saved = await salesApi.createInvoice(payload);
      setCurrentSavedInvoice(saved);
      setInvoiceNumber(saved.invoice_number);

      if (postImmediately) {
        showToast(`🎉 تم حفظ وترحيل الفاتورة بنجاح برقم: ${saved.invoice_number}`);
      } else {
        showToast(`✅ تم حفظ الفاتورة كمسودة برقم: ${saved.invoice_number}`);
      }

      // Automatically open print dialog preview
      setTimeout(() => {
        openPrintPreview();
      }, 500);
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء حفظ الفاتورة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid" style={{ gap: 20 }}>
      {/* Top Navigation Bar */}
      <BackBar
        onBack={onBack}
        label="العودة لقائمة المبيعات"
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={openPrintPreview}
              title="معاينة طباعة الفاتورة وقالب ZATCA"
            >
              <Printer size={15} /> معاينة وطباعة
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => handleSaveInvoice(false)}
              disabled={submitting || currentSavedInvoice?.status.value === "posted"}
              style={{ background: "#f1f5f9" }}
            >
              <Save size={15} /> {submitting ? "جارِ الحفظ..." : "حفظ كمسودة"}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleSaveInvoice(true)}
              disabled={submitting || currentSavedInvoice?.status.value === "posted"}
              style={{ background: "#059669" }}
            >
              <Send size={15} />{" "}
              {currentSavedInvoice?.status.value === "posted"
                ? "مرحّلة ومؤكدة"
                : submitting
                ? "جارِ الترحيل..."
                : "حفظ وترحيل فوري"}
            </button>
          </div>
        }
      />

      {/* Invoice Header Details */}
      <section className="panel">
        <div className="panel-body">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  background: "#ecfdf5",
                  color: "#059669",
                  padding: 8,
                  borderRadius: 10,
                }}
              >
                <FileText size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                  {currentSavedInvoice
                    ? `فاتورة مبيعات: ${currentSavedInvoice.invoice_number}`
                    : "إصدار فاتورة مبيعات جديدة (ZATCA e-Invoice)"}
                </h2>
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  فاتورة ضريبية متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك
                </span>
              </div>
            </div>

            {currentSavedInvoice && (
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background:
                    currentSavedInvoice.status.value === "posted"
                      ? "#ecfdf5"
                      : "#fef3c7",
                  color:
                    currentSavedInvoice.status.value === "posted"
                      ? "#059669"
                      : "#d97706",
                }}
              >
                {currentSavedInvoice.status.label}
              </span>
            )}
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label className="label">
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Building size={14} /> الفرع / المستودع
              </span>
              <select
                value={branchId}
                onChange={(e) => setBranchId(Number(e.target.value))}
                disabled={currentSavedInvoice?.status.value === "posted"}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_ar}
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <User size={14} /> العميل
              </span>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCustomerId(val === "cash" ? "cash" : Number(val));
                }}
                disabled={currentSavedInvoice?.status.value === "posted"}
              >
                <option value="cash">عميل نقدي عام (Walk-in)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar} ({c.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <CreditCard size={14} /> طريقة الدفع
              </span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                disabled={currentSavedInvoice?.status.value === "posted"}
              >
                <option value="cash">نقدي (Cash)</option>
                <option value="bank_transfer">شبكة / تحويل بنكي (Card/Bank)</option>
                <option value="credit">آجل (ذمم مدينة - Credit)</option>
              </select>
            </label>

            <label className="label">
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Calendar size={14} /> تاريخ الفاتورة
              </span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                disabled={currentSavedInvoice?.status.value === "posted"}
              />
            </label>

            {paymentMethod === "credit" && (
              <label className="label">
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={14} /> تاريخ الاستحقاق
                </span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={currentSavedInvoice?.status.value === "posted"}
                />
              </label>
            )}
          </div>
        </div>
      </section>

      {/* Barcode Fast Scanner & Line Insertion */}
      <section
        style={{
          background: "#ffffff",
          padding: "12px 18px",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <form
          onSubmit={handleBarcodeScan}
          style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 280 }}
        >
          <div style={{ position: "relative", width: "100%", maxWidth: 360 }}>
            <Barcode
              size={18}
              style={{ position: "absolute", right: 10, top: 10, color: "#64748b" }}
            />
            <input
              type="text"
              placeholder="امسح باركود الصنف أو الوحدة..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              disabled={scanLoading || currentSavedInvoice?.status.value === "posted"}
              style={{
                width: "100%",
                paddingRight: 34,
                paddingLeft: 12,
                height: 38,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                fontFamily: "monospace",
              }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-ghost"
            style={{ height: 38, border: "1px solid #cbd5e1" }}
            disabled={scanLoading || currentSavedInvoice?.status.value === "posted"}
          >
            {scanLoading ? "جارِ الفحص..." : "إضافة بالباركود"}
          </button>
        </form>

        <button
          className="btn btn-primary"
          onClick={() => {
            if (items.length > 0) addNewLineWithItem(items[0]);
          }}
          disabled={currentSavedInvoice?.status.value === "posted"}
        >
          <Plus size={15} /> إضافة بند جديد
        </button>
      </section>

      {/* Invoice Lines Table */}
      <section className="panel">
        <div className="table-wrap">
          <table className="data" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ width: "30%" }}>الصنف الغذائي</th>
                <th style={{ width: "16%" }}>الوحدة المباعة</th>
                <th style={{ width: "10%" }}>الكمية</th>
                <th style={{ width: "12%" }}>سعر الوحدة</th>
                <th style={{ width: "8%" }}>خصم %</th>
                <th style={{ width: "10%" }}>الضريبة</th>
                <th style={{ width: "14%" }}>الإجمالي</th>
                <th style={{ width: "4%" }}></th>
              </tr>
            </thead>
            <tbody>
              {calculations.lineCalculations.map((line, idx) => (
                <tr key={line.id}>
                  {/* Item Selector */}
                  <td>
                    <select
                      value={line.item_id}
                      onChange={(e) => handleItemChange(line.id, Number(e.target.value))}
                      disabled={currentSavedInvoice?.status.value === "posted"}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name_ar} ({it.sku})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Unit Selector */}
                  <td>
                    {line.available_units.length > 1 ? (
                      <select
                        value={line.item_unit_id || ""}
                        onChange={(e) => handleUnitChange(line.id, Number(e.target.value))}
                        disabled={currentSavedInvoice?.status.value === "posted"}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          fontSize: 12,
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                        }}
                      >
                        {line.available_units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.uom?.name_ar || "وحدة"} (×{u.conversion_factor})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>
                        {line.unit_name}
                      </span>
                    )}
                  </td>

                  {/* Quantity */}
                  <td>
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={line.quantity}
                      onChange={(e) => {
                        const val = Math.max(0.0001, Number(e.target.value) || 0);
                        setLines((prev) =>
                          prev.map((l) => (l.id === line.id ? { ...l, quantity: val } : l))
                        );
                      }}
                      disabled={currentSavedInvoice?.status.value === "posted"}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        textAlign: "center",
                        fontSize: 13,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  </td>

                  {/* Unit Price */}
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setLines((prev) =>
                          prev.map((l) => (l.id === line.id ? { ...l, unit_price: val } : l))
                        );
                      }}
                      disabled={currentSavedInvoice?.status.value === "posted"}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        textAlign: "center",
                        fontSize: 13,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  </td>

                  {/* Discount % */}
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="1"
                      value={line.discount_rate}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                        setLines((prev) =>
                          prev.map((l) => (l.id === line.id ? { ...l, discount_rate: val } : l))
                        );
                      }}
                      disabled={currentSavedInvoice?.status.value === "posted"}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        textAlign: "center",
                        fontSize: 13,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  </td>

                  {/* Tax */}
                  <td style={{ fontSize: 13, color: "#64748b", textAlign: "center" }}>
                    {money(line.lineTax)}
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>({line.tax_rate}%)</div>
                  </td>

                  {/* Line Total */}
                  <td className="amount" style={{ fontWeight: 700, fontSize: 14 }}>
                    {money(line.lineTotal)}
                  </td>

                  {/* Remove Action */}
                  <td style={{ textAlign: "center" }}>
                    {currentSavedInvoice?.status.value !== "posted" && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: 4,
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Notes Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 20,
            padding: "20px 24px",
            borderTop: "1px solid #e2e8f0",
            background: "#fafafa",
          }}
        >
          {/* Notes */}
          <div>
            <label className="label">
              <span>ملاحظات وشروط الفاتورة:</span>
              <textarea
                rows={3}
                value={notes}
                placeholder="مثال: البضاعة المباعة لا تُرد بعد 3 أيام من الاستلام..."
                onChange={(e) => setNotes(e.target.value)}
                disabled={currentSavedInvoice?.status.value === "posted"}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </label>
          </div>

          {/* Totals Calculation Card */}
          <div
            style={{
              background: "#ffffff",
              padding: 16,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: "#64748b" }}>المجموع قبل الضريبة</span>
              <strong style={{ fontFamily: "monospace" }}>{money(calculations.subtotal)}</strong>
            </div>

            {calculations.discountTotal > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "#dc2626" }}>
                <span>إجمالي الخصم</span>
                <strong style={{ fontFamily: "monospace" }}>- {money(calculations.discountTotal)}</strong>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: "#64748b" }}>ضريبة القيمة المضافة (15%)</span>
              <strong style={{ fontFamily: "monospace", color: "#0284c7" }}>
                + {money(calculations.taxTotal)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: 10,
                marginTop: 8,
                borderTop: "2px dashed #e2e8f0",
                fontSize: 16,
                fontWeight: 800,
                color: "#059669",
              }}
            >
              <span>الإجمالي الصافي</span>
              <span style={{ fontFamily: "monospace" }}>{money(calculations.netTotal)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Print Preview & ZATCA Compliant Invoice Modal */}
      <Modal
        isOpen={showPrint}
        onClose={() => setShowPrint(false)}
        title={`معاينة طباعة — ${invoiceNumber || "فاتورة جديدة"}`}
        subtitle="فاتورة ضريبية مبسطة معتمدة من هيئة الزكاة والضريبة والجمارك (ZATCA)"
        footer={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setShowPrint(false)}>
              إغلاق
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={15} /> طباعة الآن
            </button>
          </div>
        }
      >
        <div>
          {/* Format Switcher */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <button
              type="button"
              className={`btn ${printFormat === "a4" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: 12, padding: "6px 14px" }}
              onClick={() => setPrintFormat("a4")}
            >
              ورق مكتبي رسمي (A4)
            </button>
            <button
              type="button"
              className={`btn ${printFormat === "thermal" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: 12, padding: "6px 14px" }}
              onClick={() => setPrintFormat("thermal")}
            >
              إيصال كاشير حراري (80mm)
            </button>
          </div>

          {/* Printable Invoice Container */}
          <div
            className="print-container"
            style={{
              maxWidth: printFormat === "thermal" ? "320px" : "100%",
              margin: "0 auto",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              padding: printFormat === "thermal" ? "16px" : "28px",
              borderRadius: 8,
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              color: "#0f172a",
              fontFamily: "inherit",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: printFormat === "thermal" ? 16 : 20, fontWeight: 900, margin: 0 }}>
                {companySettings.company_name}
              </h2>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {companySettings.address} · هاتف: {companySettings.phone}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 6,
                  background: "#f1f5f9",
                  padding: "4px 8px",
                  borderRadius: 4,
                  display: "inline-block",
                }}
              >
                الرقم الضريبي: {companySettings.vat_number}
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid #0f172a",
                borderBottom: "1px solid #0f172a",
                padding: "8px 0",
                marginBottom: 12,
                fontSize: 12,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <div>
                <strong>رقم الفاتورة:</strong> {invoiceNumber || "DRAFT-001"}
              </div>
              <div>
                <strong>التاريخ:</strong> {invoiceDate}
              </div>
              <div>
                <strong>العميل:</strong>{" "}
                {selectedCustomerId !== "cash"
                  ? customers.find((c) => c.id === selectedCustomerId)?.name_ar
                  : "عميل نقدي عام"}
              </div>
              <div>
                <strong>الدفع:</strong>{" "}
                {paymentMethod === "cash"
                  ? "نقدي"
                  : paymentMethod === "credit"
                  ? "آجل"
                  : "شبكة/تحويل"}
              </div>
            </div>

            {/* Lines List */}
            <table
              style={{
                width: "100%",
                fontSize: printFormat === "thermal" ? 11 : 12,
                borderCollapse: "collapse",
                marginBottom: 14,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>
                  <th style={{ padding: "4px 0" }}>الصنف</th>
                  <th style={{ padding: "4px 0", textAlign: "center" }}>الكمية</th>
                  <th style={{ padding: "4px 0", textAlign: "center" }}>السعر</th>
                  <th style={{ padding: "4px 0", textAlign: "left" }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {calculations.lineCalculations.map((l, i) => (
                  <tr key={i} style={{ borderBottom: "1px dashed #e2e8f0" }}>
                    <td style={{ padding: "6px 0" }}>
                      <strong>{l.item_name_ar}</strong>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{l.unit_name}</div>
                    </td>
                    <td style={{ padding: "6px 0", textAlign: "center" }}>{l.quantity}</td>
                    <td style={{ padding: "6px 0", textAlign: "center" }}>{money(l.unit_price)}</td>
                    <td style={{ padding: "6px 0", textAlign: "left", fontWeight: 700 }}>
                      {money(l.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div
              style={{
                borderTop: "1px solid #0f172a",
                paddingTop: 8,
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>المجموع غير شامل الضريبة:</span>
                <strong>{money(calculations.subtotal - calculations.discountTotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>ضريبة القيمة المضافة (15%):</span>
                <strong>{money(calculations.taxTotal)}</strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: printFormat === "thermal" ? 14 : 16,
                  fontWeight: 900,
                  marginTop: 6,
                  paddingTop: 6,
                  borderTop: "1px dashed #0f172a",
                }}
              >
                <span>الإجمالي شامل الضريبة:</span>
                <span>{money(calculations.netTotal)}</span>
              </div>
            </div>

            {/* ZATCA QR Code Stamp */}
            <div style={{ textAlign: "center", marginTop: 10 }}>
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="ZATCA QR Code"
                  style={{ width: printFormat === "thermal" ? 110 : 130, height: printFormat === "thermal" ? 110 : 130, margin: "0 auto" }}
                />
              ) : (
                <div style={{ fontSize: 11, color: "#64748b" }}>جارِ توليد الرمز المشفر...</div>
              )}
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                فاتورة ضريبية مبسطة صادرة طبقاً لاشتراطات هيئة الزكاة والضريبة والجمارك
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <div
          className="toast"
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
            background: "#0f172a",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};
