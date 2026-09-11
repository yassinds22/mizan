import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Printer,
  Save,
  Trash2,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  CreditCard,
  Calendar,
  FileText,
  Send,
  Plus,
  Minus,
  Store,
  Tag,
  UserPlus,
  Boxes,
  ArrowRight,
  ShieldCheck,
  Coins,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import QRCode from "qrcode";
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

interface InvoiceDraft {
  branchId: number;
  selectedCustomerId: number | "cash";
  paymentMethod: "cash" | "credit" | "bank_transfer";
  invoiceDate: string;
  dueDate: string;
  notes: string;
  lines: InvoiceLineState[];
}

const DRAFT_STORAGE_KEY = "mizan_active_sales_invoice_draft";

const getSavedDraft = (): InvoiceDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
      return parsed;
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const InvoicePage: React.FC<InvoicePageProps> = ({ onBack, invoiceIdToView }) => {
  // Initial draft from localStorage (if creating a new invoice)
  const initialDraft = useMemo(() => {
    return invoiceIdToView ? null : getSavedDraft();
  }, [invoiceIdToView]);

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

  // Invoice Form State with Draft Restoration
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    initialDraft?.invoiceDate || new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    initialDraft?.dueDate || new Date().toISOString().split("T")[0]
  );
  const [branchId, setBranchId] = useState<number>(initialDraft?.branchId || 1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "cash">(
    initialDraft?.selectedCustomerId || "cash"
  );
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit" | "bank_transfer">(
    initialDraft?.paymentMethod || "cash"
  );
  const [notes, setNotes] = useState(initialDraft?.notes || "");
  const [lines, setLines] = useState<InvoiceLineState[]>(initialDraft?.lines || []);
  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(
    Boolean(!invoiceIdToView && initialDraft?.lines && initialDraft.lines.length > 0)
  );

  // Barcode quick scan & Autocomplete
  const [scanInput, setScanInput] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Cashier POS change calculator
  const [cashTendered, setCashTendered] = useState<number | "">("");

  // Modals
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productPickerSearch, setProductPickerSearch] = useState("");
  const [productPickerCategory, setProductPickerCategory] = useState<string>("all");

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name_ar: "",
    phone: "",
    tax_number: "",
    city: "الرياض",
    credit_limit: 10000,
  });

  // Print Preview & QR
  const [showPrint, setShowPrint] = useState(false);
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">("a4");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [currentSavedInvoice, setCurrentSavedInvoice] = useState<SalesInvoice | null>(null);

  // UI status
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "info" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-Save Draft to LocalStorage whenever the user changes items or inputs
  useEffect(() => {
    if (!invoiceIdToView && !currentSavedInvoice) {
      if (lines.length > 0 || notes || selectedCustomerId !== "cash") {
        const draft: InvoiceDraft = {
          branchId,
          selectedCustomerId,
          paymentMethod,
          invoiceDate,
          dueDate,
          notes,
          lines,
        };
        try {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch (e) {
          console.warn("Could not save invoice draft to localStorage:", e);
        }
      }
    }
  }, [lines, selectedCustomerId, paymentMethod, branchId, invoiceDate, dueDate, notes, invoiceIdToView, currentSavedInvoice]);

  // Keyboard Shortcuts (F9 to post, F2 for catalog, Ctrl+S for draft, Ctrl+P for print)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F9") {
        e.preventDefault();
        if (currentSavedInvoice?.status.value !== "posted" && !submitting) {
          handleSaveInvoice(true);
        }
      } else if (e.key === "F2") {
        e.preventDefault();
        setShowProductPicker((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (currentSavedInvoice?.status.value !== "posted" && !submitting) {
          handleSaveInvoice(false);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        openPrintPreview();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSavedInvoice, submitting, lines]);

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
            if (bJson.data?.length && !initialDraft?.branchId) {
              setBranchId(bJson.data[0].id);
            }
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

        // If viewing an existing invoice from server
        if (invoiceIdToView) {
          const inv = await salesApi.getInvoice(invoiceIdToView);
          populateInvoice(inv);
        } else {
          // If no draft in localStorage and lines is empty, initialize with first item
          const draft = getSavedDraft();
          if ((!draft || !draft.lines || draft.lines.length === 0) && itemsRes.data?.length > 0 && lines.length === 0) {
            const firstItem = itemsRes.data[0];
            addNewLineWithItem(firstItem);
          }
        }
      } catch (err: any) {
        showToast(err.message || "فشل تحميل البيانات الأساسية", "error");
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

  const addNewLineWithItem = (item: Item, targetUnit?: ItemUnit) => {
    const baseUomName = item.base_uom?.name_ar || "حبة";
    const availableUnits = item.units || [];
    const chosenUnit = targetUnit || availableUnits.find((u) => u.is_base_unit) || availableUnits[0];

    const uName = chosenUnit?.uom?.name_ar || (chosenUnit?.is_base_unit ? baseUomName : "وحدة");
    const factor = chosenUnit?.conversion_factor || 1.0;
    const retailPrice =
      chosenUnit?.prices?.find((p) => p.price_tier.value === "retail")?.price ||
      item.cost_price * 1.25 ||
      10;

    const newLine: InvoiceLineState = {
      id: String(Date.now() + Math.random()),
      item_id: item.id,
      item_name_ar: item.name_ar,
      item_sku: item.sku,
      item_unit_id: chosenUnit?.id || null,
      unit_name: uName,
      conversion_factor: factor,
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
    const baseUnitObj = availableUnits.find((u) => u.is_base_unit) || availableUnits[0];
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
              unit_name: baseUnitObj?.uom?.name_ar || baseUomName,
              conversion_factor: baseUnitObj?.conversion_factor || 1.0,
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

  const updateQuantity = (lineId: string, delta: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const newQty = Math.max(0.1, Number((l.quantity + delta).toFixed(2)));
        return { ...l, quantity: newQty };
      })
    );
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) {
      showToast("يجب أن تحتوي الفاتورة على سطر واحد على الأقل", "info");
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  // Clear current draft and start fresh
  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
    setLines([]);
    setSelectedCustomerId("cash");
    setPaymentMethod("cash");
    setNotes("");
    setCashTendered("");
    setIsDraftRestored(false);
    if (items.length > 0) {
      addNewLineWithItem(items[0]);
    }
    showToast("تم تفريغ الفاتورة وبدء مسودة فارغة", "info");
  };

  // Barcode & Quick Search
  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setScanLoading(true);
    setShowSearchDropdown(false);
    try {
      const res = await productsApi.lookupBarcode(scanInput.trim());
      if (res && res.item) {
        const item = res.item;
        const matchedUnit = res.matched_unit;
        addNewLineWithItem(item, matchedUnit);
        setScanInput("");
        showToast(`تم مسح وإضافة الصنف: ${item.name_ar}`);
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
      }
    } catch (err: any) {
      // Fallback: search locally by name or SKU
      const matched = items.find(
        (it) =>
          it.sku.toLowerCase() === scanInput.trim().toLowerCase() ||
          it.name_ar.toLowerCase().includes(scanInput.trim().toLowerCase())
      );
      if (matched) {
        addNewLineWithItem(matched);
        setScanInput("");
        showToast(`تمت إضافة: ${matched.name_ar}`);
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
      } else {
        showToast(err.message || "لم يتم العثور على صنف مطابق لهذا الباركود أو الرمز", "error");
      }
    } finally {
      setScanLoading(false);
    }
  };

  // Live autocomplete suggestions
  const liveItemSuggestions = useMemo(() => {
    if (!scanInput.trim() || scanInput.trim().length < 2) return [];
    const query = scanInput.trim().toLowerCase();
    return items
      .filter(
        (it) =>
          it.name_ar.toLowerCase().includes(query) ||
          it.sku.toLowerCase().includes(query) ||
          (it.barcode && it.barcode.includes(query))
      )
      .slice(0, 6);
  }, [items, scanInput]);

  // Quick Customer Creation
  const handleCreateQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerData.name_ar.trim()) {
      showToast("يرجى إدخال اسم العميل التجاري", "error");
      return;
    }

    try {
      const created = await salesApi.createCustomer({
        name_ar: newCustomerData.name_ar.trim(),
        phone: newCustomerData.phone.trim() || undefined,
        tax_number: newCustomerData.tax_number.trim() || undefined,
        city: newCustomerData.city || "الرياض",
        credit_limit: Number(newCustomerData.credit_limit) || 0,
        is_active: true,
      });

      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomerId(created.id);
      setShowAddCustomerModal(false);
      showToast(`تمت إضافة واختيار العميل: ${created.name_ar}`);
    } catch (err: any) {
      showToast(err.message || "فشل إضافة العميل الجديد", "error");
    }
  };

  // Financial Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let totalItemsCount = lines.length;
    let totalQuantity = 0;

    const lineCalculations = lines.map((l) => {
      const lineSubtotal = l.quantity * l.unit_price;
      const lineDiscount = lineSubtotal * (l.discount_rate / 100);
      const taxable = Math.max(0, lineSubtotal - lineDiscount);
      const lineTax = taxable * (l.tax_rate / 100);
      const lineTotal = taxable + lineTax;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
      totalQuantity += Number(l.quantity) || 0;

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
      totalItemsCount,
      totalQuantity,
    };
  }, [lines]);

  // POS Cashier Change Calculation
  const changeDue = useMemo(() => {
    if (paymentMethod !== "cash" || typeof cashTendered !== "number") return 0;
    return Math.max(0, cashTendered - calculations.netTotal);
  }, [paymentMethod, cashTendered, calculations.netTotal]);

  // Selected customer info
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === "cash") return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  // Generate QR code for print preview
  const openPrintPreview = async () => {
    try {
      let qrPayload = currentSavedInvoice?.zatca_qr_payload;

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
      showToast("يرجى إضافة صنف واحد على الأقل في الفاتورة", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        invoice_number: invoiceNumber || undefined,
        invoice_date: invoiceDate,
        due_date: paymentMethod === "credit" ? dueDate : invoiceDate,
        branch_id: branchId,
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        customer_name: selectedCustomer ? selectedCustomer.name_ar : "عميل نقدي عام",
        customer_tax_number: selectedCustomer?.tax_number || undefined,
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

      // Successfully saved/posted -> clear localStorage draft
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {}
      setIsDraftRestored(false);

      if (postImmediately) {
        showToast(`🎉 تم حفظ وترحيل الفاتورة بنجاح: ${saved.invoice_number}`);
      } else {
        showToast(`✅ تم حفظ الفاتورة كمسودة برقم: ${saved.invoice_number}`);
      }

      setTimeout(() => {
        openPrintPreview();
      }, 350);
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء حفظ الفاتورة", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter items for product picker modal
  const filteredPickerItems = useMemo(() => {
    return items.filter((it) => {
      const matchesSearch =
        !productPickerSearch ||
        it.name_ar.toLowerCase().includes(productPickerSearch.toLowerCase()) ||
        it.sku.toLowerCase().includes(productPickerSearch.toLowerCase());

      const matchesCat =
        productPickerCategory === "all" ||
        String(it.category_id) === productPickerCategory;

      return matchesSearch && matchesCat;
    });
  }, [items, productPickerSearch, productPickerCategory]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: "100%", margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      {/* 1. Top Header Bar: Breadcrumb, Status Badge, and Primary Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
          background: "var(--surface, #ffffff)",
          padding: "12px 20px",
          borderRadius: "var(--radius, 14px)",
          border: "1px solid var(--line, #d5e0d8)",
          boxShadow: "0 2px 8px rgba(20, 35, 28, 0.04)",
        }}
      >
        {/* Right side in RTL: Navigation and Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={onBack}
            className="btn btn-ghost"
            style={{
              height: 38,
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ink-soft, #4a5c52)",
            }}
          >
            <ArrowRight size={16} /> قائمة المبيعات
          </button>

          <div style={{ height: 26, width: 1, background: "var(--line, #d5e0d8)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--brand-soft, #dceee6)",
                color: "var(--brand, #1a5c45)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--ink, #14231c)" }}>
                  {currentSavedInvoice ? `فاتورة ضريبية #${currentSavedInvoice.invoice_number}` : "إصدار فاتورة بيع جديدة"}
                </h2>
                {currentSavedInvoice ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "2px 10px",
                      borderRadius: 20,
                      background: currentSavedInvoice.status.value === "posted" ? "#ecfdf5" : "#fef3c7",
                      color: currentSavedInvoice.status.value === "posted" ? "#059669" : "#d97706",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={12} /> {currentSavedInvoice.status.label}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 9px",
                      borderRadius: 20,
                      background: "var(--surface-2, #f7faf6)",
                      color: "var(--muted, #7a8b82)",
                      border: "1px solid var(--line, #d5e0d8)",
                    }}
                  >
                    مسودة جديدة
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted, #7a8b82)", marginTop: 2 }}>
                متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA e-Invoice)
              </div>
            </div>
          </div>
        </div>

        {/* Left side in RTL: Quick Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Clear / New Empty Draft Button */}
          {!currentSavedInvoice && lines.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClearDraft}
              title="تفريغ الفاتورة وبدء مسودة فارغة جديدة"
              style={{
                height: 40,
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--danger, #b93a3a)",
                borderColor: "rgba(185, 58, 58, 0.25)",
              }}
            >
              <RotateCcw size={14} /> تفريغ الفاتورة
            </button>
          )}

          <button
            type="button"
            className="btn btn-ghost"
            onClick={openPrintPreview}
            title="معاينة نموذج الطباعة الحراري أو A4 (Ctrl+P)"
            style={{
              height: 40,
              padding: "0 14px",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <Printer size={15} /> معاينة وطباعة
          </button>

          {currentSavedInvoice?.status.value !== "posted" && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => handleSaveInvoice(false)}
              disabled={submitting}
              title="حفظ الفاتورة كمسودة في النظام (Ctrl+S)"
              style={{
                height: 40,
                padding: "0 14px",
                fontSize: 13,
                fontWeight: 700,
                background: "var(--surface-2, #f7faf6)",
              }}
            >
              <Save size={15} /> {submitting ? "حفظ..." : "حفظ كمسودة"}
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSaveInvoice(true)}
            disabled={submitting || currentSavedInvoice?.status.value === "posted"}
            style={{
              height: 40,
              padding: "0 18px",
              background:
                currentSavedInvoice?.status.value === "posted"
                  ? "var(--muted, #7a8b82)"
                  : "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))",
              fontSize: 13,
              fontWeight: 800,
              boxShadow: "0 4px 14px rgba(26, 92, 69, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Send size={15} />
            <span>
              {currentSavedInvoice?.status.value === "posted"
                ? "مرحّلة ومعتمدة"
                : submitting
                ? "جارِ الترحيل..."
                : "حفظ وترحيل فوري"}
            </span>
            {currentSavedInvoice?.status.value !== "posted" && (
              <span
                style={{
                  background: "rgba(255,255,255,0.2)",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              >
                F9
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Persistent Auto-Saved Draft Notification Bar */}
      {isDraftRestored && lines.length > 0 && !currentSavedInvoice && (
        <div
          style={{
            background: "var(--brand-soft, #dceee6)",
            border: "1px solid rgba(26, 92, 69, 0.25)",
            borderRadius: "var(--radius-sm, 10px)",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--brand-deep, #0f3d2e)",
            fontWeight: 700,
            animation: "fadeUp 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} style={{ color: "var(--brand, #1a5c45)" }} />
            <span>
              تم استرجاع مسودة الفاتورة المحفوظة تلقائياً ({lines.length} صنف). لن تفقد بياناتك عند التنقل بين الشاشات!
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleClearDraft}
              style={{
                background: "transparent",
                border: "1px solid rgba(26, 92, 69, 0.3)",
                borderRadius: 6,
                padding: "3px 10px",
                color: "var(--brand-deep, #0f3d2e)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              تفريغ والبدء من جديد
            </button>
            <button
              type="button"
              onClick={() => setIsDraftRestored(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted, #7a8b82)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              إغلاق ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Invoice Meta Details: Customer, Payment Method, Branch & Dates */}
      <div
        style={{
          background: "var(--surface, #ffffff)",
          borderRadius: "var(--radius, 14px)",
          border: "1px solid var(--line, #d5e0d8)",
          padding: "16px 20px",
          boxShadow: "0 2px 8px rgba(20, 35, 28, 0.03)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          {/* Customer Selection & Quick Profile */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #14231c)", display: "flex", alignItems: "center", gap: 6 }}>
                <User size={15} style={{ color: "var(--brand, #1a5c45)" }} /> العميل
              </label>
              {currentSavedInvoice?.status.value !== "posted" && (
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--brand, #1a5c45)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "2px 6px",
                    borderRadius: 6,
                  }}
                >
                  <UserPlus size={13} /> + عميل جديد
                </button>
              )}
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCustomerId(val === "cash" ? "cash" : Number(val));
              }}
              disabled={currentSavedInvoice?.status.value === "posted"}
              style={{
                width: "100%",
                height: 42,
                borderRadius: "var(--radius-sm, 10px)",
                border: "1px solid var(--line, #d5e0d8)",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 600,
                background: "var(--surface-2, #f7faf6)",
                color: "var(--ink, #14231c)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="cash">🛍️ عميل نقدي عام (Walk-in Customer)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.name_ar} ({c.code})
                </option>
              ))}
            </select>

            {/* If a registered corporate customer is selected, show details pill */}
            {selectedCustomer && (
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--brand-soft, #dceee6)",
                  border: "1px solid rgba(26, 92, 69, 0.15)",
                  fontSize: 11,
                  color: "var(--brand-deep, #0f3d2e)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>الرقم الضريبي: <strong>{selectedCustomer.tax_number || "غير مسجل"}</strong></span>
                <span>الرصيد: <strong>{money(selectedCustomer.balance)}</strong></span>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #14231c)", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <CreditCard size={15} style={{ color: "var(--brand, #1a5c45)" }} /> طريقة السداد
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 4,
                background: "var(--surface-2, #f7faf6)",
                padding: 4,
                borderRadius: "var(--radius-sm, 10px)",
                border: "1px solid var(--line, #d5e0d8)",
              }}
            >
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                disabled={currentSavedInvoice?.status.value === "posted"}
                style={{
                  height: 34,
                  border: "none",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: paymentMethod === "cash" ? "var(--surface, #ffffff)" : "transparent",
                  color: paymentMethod === "cash" ? "var(--brand, #1a5c45)" : "var(--muted, #7a8b82)",
                  boxShadow: paymentMethod === "cash" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                💵 نقدي
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("bank_transfer")}
                disabled={currentSavedInvoice?.status.value === "posted"}
                style={{
                  height: 34,
                  border: "none",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: paymentMethod === "bank_transfer" ? "var(--surface, #ffffff)" : "transparent",
                  color: paymentMethod === "bank_transfer" ? "var(--brand, #1a5c45)" : "var(--muted, #7a8b82)",
                  boxShadow: paymentMethod === "bank_transfer" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                💳 مدى/شبكة
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("credit")}
                disabled={currentSavedInvoice?.status.value === "posted"}
                style={{
                  height: 34,
                  border: "none",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: paymentMethod === "credit" ? "var(--surface, #ffffff)" : "transparent",
                  color: paymentMethod === "credit" ? "var(--warn, #c4781a)" : "var(--muted, #7a8b82)",
                  boxShadow: paymentMethod === "credit" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                📑 آجل ذمم
              </button>
            </div>
          </div>

          {/* Branch / Warehouse */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #14231c)", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Store size={15} style={{ color: "var(--brand, #1a5c45)" }} /> الفرع / المستودع
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(Number(e.target.value))}
              disabled={currentSavedInvoice?.status.value === "posted"}
              style={{
                width: "100%",
                height: 42,
                borderRadius: "var(--radius-sm, 10px)",
                border: "1px solid var(--line, #d5e0d8)",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 600,
                background: "var(--surface-2, #f7faf6)",
                color: "var(--ink, #14231c)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_ar}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Date & Due Date */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #14231c)", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Calendar size={15} style={{ color: "var(--brand, #1a5c45)" }} />
              {paymentMethod === "credit" ? "تاريخ الفاتورة والاستحقاق" : "تاريخ الفاتورة"}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                disabled={currentSavedInvoice?.status.value === "posted"}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: "var(--radius-sm, 10px)",
                  border: "1px solid var(--line, #d5e0d8)",
                  padding: "0 10px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "var(--surface-2, #f7faf6)",
                  color: "var(--ink, #14231c)",
                  outline: "none",
                }}
              />
              {paymentMethod === "credit" && (
                <input
                  type="date"
                  value={dueDate}
                  title="تاريخ الاستحقاق للعميل الآجل"
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={currentSavedInvoice?.status.value === "posted"}
                  style={{
                    width: "100%",
                    height: 42,
                    borderRadius: "var(--radius-sm, 10px)",
                    border: "1px solid var(--warn, #c4781a)",
                    padding: "0 10px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "var(--warn-soft, #fef3e2)",
                    color: "var(--warn, #c4781a)",
                    outline: "none",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Fast Command Bar: Integrated Barcode Scanner with Live Autocomplete Suggestions */}
      <div
        style={{
          background: "var(--surface, #ffffff)",
          borderRadius: "var(--radius, 14px)",
          border: "1px solid var(--line, #d5e0d8)",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          boxShadow: "0 2px 8px rgba(20, 35, 28, 0.03)",
        }}
      >
        {/* Barcode & Autocomplete search input */}
        <div ref={searchContainerRef} style={{ position: "relative", flex: 1, minWidth: 320, maxWidth: 520 }}>
          <form onSubmit={handleBarcodeScan} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative", width: "100%" }}>
              <Barcode
                size={18}
                style={{ position: "absolute", right: 12, top: 12, color: "var(--brand, #1a5c45)" }}
              />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="امسح الباركود، أو اكتب اسم الصنف للإضافة الفورية..."
                value={scanInput}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setScanInput(e.target.value);
                  setShowSearchDropdown(true);
                }}
                disabled={scanLoading || currentSavedInvoice?.status.value === "posted"}
                style={{
                  width: "100%",
                  height: 42,
                  paddingRight: 38,
                  paddingLeft: 12,
                  borderRadius: "var(--radius-sm, 10px)",
                  border: "2px solid var(--brand-soft, #dceee6)",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "var(--surface-2, #f7faf6)",
                  color: "var(--ink, #14231c)",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-ghost"
              disabled={scanLoading || currentSavedInvoice?.status.value === "posted"}
              style={{
                height: 42,
                padding: "0 16px",
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {scanLoading ? "جارِ المسح..." : "إضافة بالباركود"}
            </button>
          </form>

          {/* Autocomplete Dropdown popup */}
          {showSearchDropdown && liveItemSuggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: 48,
                right: 0,
                left: 0,
                background: "var(--surface, #ffffff)",
                borderRadius: "var(--radius-sm, 10px)",
                border: "1px solid var(--line, #d5e0d8)",
                boxShadow: "0 10px 25px rgba(20, 35, 28, 0.12)",
                zIndex: 50,
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              {liveItemSuggestions.map((it) => (
                <div
                  key={it.id}
                  onClick={() => {
                    addNewLineWithItem(it);
                    setScanInput("");
                    setShowSearchDropdown(false);
                    showToast(`تمت إضافة الصنف: ${it.name_ar}`);
                  }}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--line, #d5e0d8)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2, #f7faf6)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #14231c)" }}>{it.name_ar}</div>
                    <div style={{ fontSize: 11, color: "var(--muted, #7a8b82)" }}>
                      رمز: {it.sku} · الوحدة الأساسية: {it.base_uom?.name_ar || "حبة"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--brand, #1a5c45)" }}>
                      {money(it.cost_price * 1.25)}
                    </span>
                    <button
                      type="button"
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: "none",
                        background: "var(--brand-soft, #dceee6)",
                        color: "var(--brand, #1a5c45)",
                        cursor: "pointer",
                      }}
                    >
                      + إضافة
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catalog & Manual Add Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowProductPicker(true)}
            disabled={currentSavedInvoice?.status.value === "posted"}
            style={{
              height: 42,
              padding: "0 16px",
              fontSize: 13,
              fontWeight: 700,
              background: "var(--surface-2, #f7faf6)",
              color: "var(--ink-soft, #4a5c52)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Boxes size={16} style={{ color: "var(--brand, #1a5c45)" }} />
            <span>كتالوج الأصناف</span>
            <span
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 999,
                background: "var(--brand-soft, #dceee6)",
                color: "var(--brand, #1a5c45)",
                fontWeight: 800,
              }}
            >
              F2
            </span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (items.length > 0) addNewLineWithItem(items[0]);
            }}
            disabled={currentSavedInvoice?.status.value === "posted"}
            style={{
              height: 42,
              padding: "0 18px",
              background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))",
              fontSize: 13,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={16} /> إضافة سطر جديد
          </button>
        </div>
      </div>

      {/* 4. Invoice Lines Table: Clean, Ergonomic, and Highly Readable */}
      <div
        style={{
          background: "var(--surface, #ffffff)",
          borderRadius: "var(--radius, 14px)",
          border: "1px solid var(--line, #d5e0d8)",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(20, 35, 28, 0.03)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            className="data"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "right",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--surface-2, #f7faf6)",
                  borderBottom: "2px solid var(--line, #d5e0d8)",
                  color: "var(--ink-soft, #4a5c52)",
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                <th style={{ padding: "12px 14px", width: 44, textAlign: "center" }}>#</th>
                <th style={{ padding: "12px 14px", minWidth: 260 }}>الصنف الغذائي</th>
                <th style={{ padding: "12px 14px", width: 170 }}>الوحدة المباعة</th>
                <th style={{ padding: "12px 14px", width: 140, textAlign: "center" }}>الكمية</th>
                <th style={{ padding: "12px 14px", width: 130, textAlign: "center" }}>سعر الوحدة</th>
                <th style={{ padding: "12px 14px", width: 100, textAlign: "center" }}>خصم %</th>
                <th style={{ padding: "12px 14px", width: 120, textAlign: "center" }}>الضريبة 15%</th>
                <th style={{ padding: "12px 14px", width: 130, textAlign: "left" }}>الإجمالي</th>
                <th style={{ padding: "12px 14px", width: 48, textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {calculations.lineCalculations.map((line, idx) => (
                <tr
                  key={line.id}
                  style={{
                    borderBottom: "1px solid var(--line, #d5e0d8)",
                    background: idx % 2 === 0 ? "var(--surface, #ffffff)" : "var(--surface-2, #f7faf6)",
                    transition: "background 0.15s ease",
                  }}
                >
                  {/* Row Number */}
                  <td style={{ padding: "10px 14px", textAlign: "center", color: "var(--muted, #7a8b82)", fontWeight: 700 }}>
                    {idx + 1}
                  </td>

                  {/* Food Item Selection */}
                  <td style={{ padding: "10px 14px" }}>
                    <select
                      value={line.item_id}
                      onChange={(e) => handleItemChange(line.id, Number(e.target.value))}
                      disabled={currentSavedInvoice?.status.value === "posted"}
                      style={{
                        width: "100%",
                        height: 38,
                        padding: "0 10px",
                        borderRadius: 8,
                        border: "1px solid var(--line, #d5e0d8)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--ink, #14231c)",
                        background: "var(--surface, #ffffff)",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name_ar} ({it.sku})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Unit Selection */}
                  <td style={{ padding: "10px 14px" }}>
                    {line.available_units.length > 1 ? (
                      <select
                        value={line.item_unit_id || ""}
                        onChange={(e) => handleUnitChange(line.id, Number(e.target.value))}
                        disabled={currentSavedInvoice?.status.value === "posted"}
                        style={{
                          width: "100%",
                          height: 38,
                          padding: "0 10px",
                          borderRadius: 8,
                          border: "1px solid var(--line, #d5e0d8)",
                          fontSize: 12,
                          fontWeight: 600,
                          background: "var(--surface, #ffffff)",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        {line.available_units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.uom?.name_ar || "وحدة"} (معامل: {u.conversion_factor})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "var(--surface-2, #f7faf6)",
                          fontWeight: 700,
                          fontSize: 12,
                          color: "var(--ink-soft, #4a5c52)",
                          border: "1px solid var(--line, #d5e0d8)",
                        }}
                      >
                        <Tag size={12} style={{ color: "var(--brand, #1a5c45)" }} /> {line.unit_name}
                      </div>
                    )}
                  </td>

                  {/* Quantity Stepper */}
                  <td style={{ padding: "10px 14px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid var(--line, #d5e0d8)",
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "var(--surface, #ffffff)",
                      }}
                    >
                      {currentSavedInvoice?.status.value !== "posted" && (
                        <button
                          type="button"
                          onClick={() => updateQuantity(line.id, -1)}
                          style={{
                            width: 30,
                            height: 36,
                            border: "none",
                            background: "var(--surface-2, #f7faf6)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--ink-soft, #4a5c52)",
                          }}
                        >
                          <Minus size={13} />
                        </button>
                      )}

                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        value={line.quantity}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = Math.max(0.0001, Number(e.target.value) || 0);
                          setLines((prev) =>
                            prev.map((l) => (l.id === line.id ? { ...l, quantity: val } : l))
                          );
                        }}
                        disabled={currentSavedInvoice?.status.value === "posted"}
                        style={{
                          width: "100%",
                          height: 36,
                          border: "none",
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 800,
                          padding: "0 4px",
                          outline: "none",
                        }}
                      />

                      {currentSavedInvoice?.status.value !== "posted" && (
                        <button
                          type="button"
                          onClick={() => updateQuantity(line.id, 1)}
                          style={{
                            width: 30,
                            height: 36,
                            border: "none",
                            background: "var(--surface-2, #f7faf6)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--ink-soft, #4a5c52)",
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Unit Price */}
                  <td style={{ padding: "10px 14px" }}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_price}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setLines((prev) =>
                          prev.map((l) => (l.id === line.id ? { ...l, unit_price: val } : l))
                        );
                      }}
                      disabled={currentSavedInvoice?.status.value === "posted"}
                      style={{
                        width: "100%",
                        height: 38,
                        borderRadius: 8,
                        border: "1px solid var(--line, #d5e0d8)",
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        outline: "none",
                      }}
                    />
                  </td>

                  {/* Discount Rate */}
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        value={line.discount_rate}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                          setLines((prev) =>
                            prev.map((l) => (l.id === line.id ? { ...l, discount_rate: val } : l))
                          );
                        }}
                        disabled={currentSavedInvoice?.status.value === "posted"}
                        style={{
                          width: "100%",
                          height: 38,
                          borderRadius: 8,
                          border: "1px solid var(--line, #d5e0d8)",
                          textAlign: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          paddingLeft: 18,
                          outline: "none",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          left: 6,
                          top: 10,
                          fontSize: 11,
                          color: "var(--muted, #7a8b82)",
                          fontWeight: 700,
                        }}
                      >
                        %
                      </span>
                    </div>
                  </td>

                  {/* Tax */}
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <span style={{ fontWeight: 700, color: "var(--info, #2a6a8a)", fontFamily: "monospace" }}>
                      {money(line.lineTax)}
                    </span>
                  </td>

                  {/* Line Total */}
                  <td style={{ padding: "10px 14px", textAlign: "left" }}>
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: 14,
                        color: "var(--ink, #14231c)",
                        fontFamily: "monospace",
                      }}
                    >
                      {money(line.lineTotal)}
                    </span>
                  </td>

                  {/* Delete Button */}
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    {currentSavedInvoice?.status.value !== "posted" && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        title="حذف هذا السطر"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: "none",
                          background: "var(--danger-soft, #fdeeee)",
                          color: "var(--danger, #b93a3a)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "transform 0.15s ease",
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Meta Bar: Counts & Add line shortcut */}
        <div
          style={{
            padding: "10px 18px",
            background: "var(--surface-2, #f7faf6)",
            borderTop: "1px solid var(--line, #d5e0d8)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "var(--ink-soft, #4a5c52)",
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span>عدد الأصناف: <strong>{calculations.totalItemsCount}</strong></span>
            <span>إجمالي الكمية: <strong>{calculations.totalQuantity}</strong> قطعة / وحدة</span>
          </div>

          {currentSavedInvoice?.status.value !== "posted" && (
            <button
              type="button"
              onClick={() => {
                if (items.length > 0) addNewLineWithItem(items[0]);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--brand, #1a5c45)",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Plus size={14} /> إضافة صنف إضافي
            </button>
          )}
        </div>
      </div>

      {/* 5. Executive Financial Master Card & Notes Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 400px",
          gap: 18,
          alignItems: "flex-start",
        }}
      >
        {/* Left Side: Notes, Pre-made templates, ZATCA Compliance Info, and Shortcuts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Notes & Terms */}
          <div
            style={{
              background: "var(--surface, #ffffff)",
              padding: "18px 20px",
              borderRadius: "var(--radius, 14px)",
              border: "1px solid var(--line, #d5e0d8)",
              boxShadow: "0 2px 8px rgba(20, 35, 28, 0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--ink, #14231c)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FileText size={15} style={{ color: "var(--brand, #1a5c45)" }} /> ملاحظات وشروط الفاتورة
              </label>

              {/* Quick Template Chips */}
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  "البضاعة المباعة لا ترد بعد 3 أيام",
                  "الدفع نقداً عند الاستلام",
                  "الأسعار شاملة الضريبة 15%",
                ].map((txt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNotes((prev) => (prev ? `${prev} - ${txt}` : txt))}
                    disabled={currentSavedInvoice?.status.value === "posted"}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--line, #d5e0d8)",
                      background: "var(--surface-2, #f7faf6)",
                      color: "var(--ink-soft, #4a5c52)",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    + {txt}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              value={notes}
              placeholder="اكتب أي شروط سداد، تفاصيل تسليم، أو تعليمات خاصة تظهر أسفل الفاتورة المطبوعة..."
              onChange={(e) => setNotes(e.target.value)}
              disabled={currentSavedInvoice?.status.value === "posted"}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm, 10px)",
                border: "1px solid var(--line, #d5e0d8)",
                fontSize: 13,
                background: "var(--surface, #ffffff)",
                color: "var(--ink, #14231c)",
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>

          {/* ZATCA Phase 2 Compliance Badge & Hotkey Helper */}
          <div
            style={{
              background: "var(--surface, #ffffff)",
              padding: "14px 18px",
              borderRadius: "var(--radius, 14px)",
              border: "1px solid var(--line, #d5e0d8)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "var(--ok-soft, #e6f5ec)",
                  color: "var(--ok, #2d7a4f)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink, #14231c)" }}>
                  اعتماد هيئة الزكاة والضريبة والجمارك (ZATCA)
                </div>
                <div style={{ fontSize: 11, color: "var(--muted, #7a8b82)" }}>
                  توليد التوقيع الرقمي، الرمز المشفر QR، وحفظ السجلات تلقائياً.
                </div>
              </div>
            </div>

            {/* Keyboard shortcuts badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted, #7a8b82)" }}>
              <span>اختصارات:</span>
              <span style={{ padding: "2px 6px", background: "var(--surface-2, #f7faf6)", border: "1px solid var(--line, #d5e0d8)", borderRadius: 4, fontFamily: "monospace" }}>F9: ترحيل</span>
              <span style={{ padding: "2px 6px", background: "var(--surface-2, #f7faf6)", border: "1px solid var(--line, #d5e0d8)", borderRadius: 4, fontFamily: "monospace" }}>F2: الكتالوج</span>
              <span style={{ padding: "2px 6px", background: "var(--surface-2, #f7faf6)", border: "1px solid var(--line, #d5e0d8)", borderRadius: 4, fontFamily: "monospace" }}>Ctrl+P: طباعة</span>
            </div>
          </div>
        </div>

        {/* Right Side: Financial Master Totals & Cashier Cash Calculator */}
        <div
          style={{
            background: "var(--surface, #ffffff)",
            padding: "20px 22px",
            borderRadius: "var(--radius, 14px)",
            border: "1px solid var(--line, #d5e0d8)",
            boxShadow: "0 4px 16px rgba(20, 35, 28, 0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink, #14231c)", borderBottom: "1px solid var(--line, #d5e0d8)", paddingBottom: 8 }}>
            الملخص المالي للفاتورة
          </div>

          {/* Subtotal */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--ink-soft, #4a5c52)", fontWeight: 600 }}>
              المجموع قبل الضريبة (Subtotal)
            </span>
            <strong style={{ fontSize: 14, fontFamily: "monospace", color: "var(--ink, #14231c)" }}>
              {money(calculations.subtotal)}
            </strong>
          </div>

          {/* Total Discounts */}
          {calculations.discountTotal > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "var(--danger, #b93a3a)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>إجمالي الخصم</span>
              <strong style={{ fontSize: 14, fontFamily: "monospace" }}>
                - {money(calculations.discountTotal)}
              </strong>
            </div>
          )}

          {/* VAT 15% */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--info, #2a6a8a)", fontWeight: 700 }}>
              ضريبة القيمة المضافة (15% VAT)
            </span>
            <strong style={{ fontSize: 14, fontFamily: "monospace", color: "var(--info, #2a6a8a)" }}>
              + {money(calculations.taxTotal)}
            </strong>
          </div>

          {/* Net Grand Total */}
          <div
            style={{
              marginTop: 4,
              padding: "12px 14px",
              borderRadius: "var(--radius-sm, 10px)",
              background: "var(--brand-soft, #dceee6)",
              border: "1px solid rgba(26, 92, 69, 0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "var(--brand-deep, #0f3d2e)" }}>
                الإجمالي المستحق
              </div>
              <div style={{ fontSize: 11, color: "var(--brand, #1a5c45)", fontWeight: 700 }}>
                شامل ضريبة القيمة المضافة
              </div>
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "var(--brand-deep, #0f3d2e)",
                fontFamily: "monospace",
              }}
            >
              {money(calculations.netTotal)}
            </div>
          </div>

          {/* POS Cashier Change Calculator (only if payment is Cash) */}
          {paymentMethod === "cash" && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-2, #f7faf6)",
                border: "1px solid var(--line, #d5e0d8)",
                marginTop: 2,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft, #4a5c52)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Coins size={14} style={{ color: "var(--brand, #1a5c45)" }} /> المبلغ المستلم من العميل:
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{
                    width: 90,
                    height: 30,
                    padding: "0 6px",
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: "1px solid var(--line, #d5e0d8)",
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
              </div>

              {typeof cashTendered === "number" && cashTendered > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, borderTop: "1px dashed var(--line, #d5e0d8)" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--brand, #1a5c45)" }}>
                    المتبقي للعميل (الباقي):
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: changeDue >= 0 ? "var(--brand, #1a5c45)" : "var(--danger, #b93a3a)", fontFamily: "monospace" }}>
                    {money(changeDue)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Primary Action Button inside Totals Box */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSaveInvoice(true)}
            disabled={submitting || currentSavedInvoice?.status.value === "posted"}
            style={{
              marginTop: 6,
              height: 44,
              width: "100%",
              background:
                currentSavedInvoice?.status.value === "posted"
                  ? "var(--muted, #7a8b82)"
                  : "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))",
              fontSize: 14,
              fontWeight: 800,
              boxShadow: "0 6px 18px rgba(26, 92, 69, 0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Send size={16} />
            {currentSavedInvoice?.status.value === "posted"
              ? "الفاتورة مرحّلة ومؤكدة"
              : submitting
              ? "جارِ الحفظ والترحيل..."
              : `حفظ وترحيل (${money(calculations.netTotal)})`}
          </button>
        </div>
      </div>

      {/* 6. Product Picker Modal (Ergonomic Catalog Drawer) */}
      <Modal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        title="استعراض كتالوج الأصناف الغذائية"
        subtitle="اختر أي صنف لإضافته مباشرة إلى الفاتورة بالوحدة المحددة"
        footer={
          <button className="btn btn-ghost" onClick={() => setShowProductPicker(false)}>
            إغلاق
          </button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Search bar inside modal */}
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", right: 12, top: 12, color: "var(--muted, #7a8b82)" }} />
            <input
              type="text"
              placeholder="ابحث بالاسم، SKU، أو الباركود..."
              value={productPickerSearch}
              onChange={(e) => setProductPickerSearch(e.target.value)}
              style={{
                width: "100%",
                height: 40,
                paddingRight: 36,
                paddingLeft: 12,
                borderRadius: 8,
                border: "1px solid var(--line, #d5e0d8)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          {/* List of items */}
          <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredPickerItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  addNewLineWithItem(item);
                  setShowProductPicker(false);
                  showToast(`تمت إضافة: ${item.name_ar}`);
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm, 10px)",
                  border: "1px solid var(--line, #d5e0d8)",
                  background: "var(--surface, #ffffff)",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  gap: 14,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface-2, #f7faf6)";
                  e.currentTarget.style.borderColor = "var(--brand, #1a5c45)";
                  e.currentTarget.style.boxShadow = "0 3px 10px rgba(26, 92, 69, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--surface, #ffffff)";
                  e.currentTarget.style.borderColor = "var(--line, #d5e0d8)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Item Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink, #14231c)", marginBottom: 4 }}>
                    {item.name_ar}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11, color: "var(--muted, #7a8b82)" }}>
                    <span style={{ padding: "2px 6px", background: "var(--surface-2, #f7faf6)", borderRadius: 4, border: "1px solid var(--line, #d5e0d8)", fontFamily: "monospace" }}>
                      SKU: {item.sku}
                    </span>
                    <span>•</span>
                    <span>الوحدة: <strong>{item.base_uom?.name_ar || "حبة"}</strong></span>
                  </div>
                </div>

                {/* Price & Redesigned Add Button */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  <div style={{ textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "var(--brand-deep, #0f3d2e)", fontFamily: "monospace" }}>
                      {money(item.cost_price * 1.25)}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--muted, #7a8b82)" }}>سعر التجزئة</span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      addNewLineWithItem(item);
                      setShowProductPicker(false);
                      showToast(`تمت إضافة: ${item.name_ar}`);
                    }}
                    style={{
                      height: 36,
                      padding: "0 16px",
                      fontSize: 13,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      borderRadius: 8,
                      background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))",
                      boxShadow: "0 2px 6px rgba(26, 92, 69, 0.25)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Plus size={15} /> إضافة
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* 7. Quick Add Customer Modal */}
      <Modal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        title="إضافة عميل جديد سريع"
        subtitle="تسجيل بيانات العميل لإصدار الفاتورة باسمه فوراً"
        footer={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setShowAddCustomerModal(false)}>
              إلغاء
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateQuickCustomer}
              style={{ background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))" }}
            >
              حفظ واختيار العميل
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateQuickCustomer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label className="label">
            <span>اسم العميل التجاري / المنشأة *</span>
            <input
              type="text"
              required
              placeholder="مثال: أسواق النور المركزية"
              value={newCustomerData.name_ar}
              onChange={(e) => setNewCustomerData({ ...newCustomerData, name_ar: e.target.value })}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="label">
              <span>رقم الجوال / الهاتف</span>
              <input
                type="text"
                placeholder="05xxxxxxxx"
                value={newCustomerData.phone}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
              />
            </label>

            <label className="label">
              <span>الرقم الضريبي (15 رقم)</span>
              <input
                type="text"
                placeholder="300000000000003"
                value={newCustomerData.tax_number}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, tax_number: e.target.value })}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="label">
              <span>المدينة</span>
              <input
                type="text"
                value={newCustomerData.city}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
              />
            </label>

            <label className="label">
              <span>الحد الائتماني (ر.س)</span>
              <input
                type="number"
                value={newCustomerData.credit_limit}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, credit_limit: Number(e.target.value) || 0 })}
              />
            </label>
          </div>
        </form>
      </Modal>

      {/* 8. Print Preview & ZATCA Compliant Invoice Modal */}
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
            <button
              className="btn btn-primary"
              onClick={() => window.print()}
              style={{ background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))" }}
            >
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
              marginBottom: 18,
              paddingBottom: 12,
              borderBottom: "1px solid var(--line, #d5e0d8)",
            }}
          >
            <button
              type="button"
              className={`btn ${printFormat === "a4" ? "btn-primary" : "btn-ghost"}`}
              style={{
                fontSize: 12,
                padding: "6px 14px",
                background: printFormat === "a4" ? "var(--brand, #1a5c45)" : "transparent",
              }}
              onClick={() => setPrintFormat("a4")}
            >
              ورق مكتبي رسمي (A4)
            </button>
            <button
              type="button"
              className={`btn ${printFormat === "thermal" ? "btn-primary" : "btn-ghost"}`}
              style={{
                fontSize: 12,
                padding: "6px 14px",
                background: printFormat === "thermal" ? "var(--brand, #1a5c45)" : "transparent",
              }}
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
                <strong>العميل:</strong> {selectedCustomer ? selectedCustomer.name_ar : "عميل نقدي عام"}
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
                  style={{
                    width: printFormat === "thermal" ? 110 : 130,
                    height: printFormat === "thermal" ? 110 : 130,
                    margin: "0 auto",
                  }}
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

      {/* Floating Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
            background:
              toast.type === "error"
                ? "var(--danger, #b93a3a)"
                : toast.type === "info"
                ? "var(--info, #2a6a8a)"
                : "var(--brand-deep, #0f3d2e)",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.35)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "fadeUp 0.2s ease",
          }}
        >
          <Sparkles size={16} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
