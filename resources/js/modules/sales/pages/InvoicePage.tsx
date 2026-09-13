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
import { AlertModal, AlertType } from "@/components/ui/AlertModal";
import { money } from "@/utils/formatters";
import { productsApi, Item, ItemUnit } from "@/api/products";
import { salesApi, Customer, SalesInvoice, SalesReturn } from "@/api/sales";
import { SalesReturnModal } from "../components/SalesReturnModal";

interface InvoiceLineState {
  id: string;
  item_id: number;
  item_name_ar: string;
  item_sku: string;
  item_unit_id: number | null;
  unit_name: string;
  conversion_factor: number;
  quantity: number | "";
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

export const createEmptyLine = (): InvoiceLineState => ({
  id: "line_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
  item_id: 0,
  item_name_ar: "",
  item_sku: "",
  item_unit_id: null,
  unit_name: "",
  conversion_factor: 1,
  quantity: 1,
  unit_price: 0,
  cost_price: 0,
  discount_rate: 0,
  tax_rate: 15,
  available_units: [],
});

const getSavedDraft = (): InvoiceDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
      // Deduplicate by item_id strictly
      const seen = new Set<number>();
      const deduped: InvoiceLineState[] = [];
      for (const line of parsed.lines) {
        if (line.item_id && line.item_id > 0) {
          if (!seen.has(line.item_id)) {
            seen.add(line.item_id);
            deduped.push(line);
          }
        }
      }
      if (deduped.length > 0) {
        return {
          ...parsed,
          lines: deduped,
        };
      }
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
  const [lines, setLines] = useState<InvoiceLineState[]>(() => {
    return [createEmptyLine()];
  });
  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(false);

  // Row Search & Auto-Navigation States
  const [activeSearchLineId, setActiveSearchLineId] = useState<string | null>(null);
  const [lineSearchText, setLineSearchText] = useState<Record<string, string>>({});
  const [highlightedSuggestIdx, setHighlightedSuggestIdx] = useState<number>(0);

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

  // Sales Return / Credit Note States
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [activeSalesReturn, setActiveSalesReturn] = useState<SalesReturn | null>(null);
  const [showReturnPrintModal, setShowReturnPrintModal] = useState(false);
  const [returnQrCodeUrl, setReturnQrCodeUrl] = useState<string>("");

  // UI status
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "info" | "error" } | null>(null);
  const [highlightedLineId, setHighlightedLineId] = useState<string | null>(null);

  // Center Screen Luxury Alert Modal State
  const [centerAlert, setCenterAlert] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    detail?: string;
  }>({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
  });

  const showCenterAlert = (
    message: string,
    type: AlertType = "error",
    customTitle?: string,
    customDetail?: string
  ) => {
    let title = customTitle;
    let detail = customDetail;
    let displayMessage = message;

    const lower = (message || "").toLowerCase();

    if (
      lower.includes("branch id is invalid") ||
      message.includes("الفرع المحدد") ||
      lower.includes("branch_id")
    ) {
      title = title || "تنبيه في اختيار الفرع / المستودع";
      displayMessage = "الفرع المحدد في الفاتورة غير مسجل أو لم يعد نشطاً في قاعدة البيانات.";
      detail =
        detail ||
        "تم تصحيح وتحديث اختيار الفرع تلقائياً إلى الفرع المتاح لمنشأتك، يمكنك الآن إعادة المحاولة وحفظ الفاتورة مباشرة.";
      if (branches.length > 0) {
        setBranchId(branches[0].id);
      }
    } else if (
      lower.includes("quantity") ||
      message.includes("الكمية") ||
      message.includes("كمية")
    ) {
      title = title || "تنبيه في كمية الصنف";
      displayMessage =
        message.includes("يجب أن تكون") || message.includes("أكبر من الصفر")
          ? message
          : "الكمية المطلوبة غير صحيحة أو تتجاوز الرصيد المخزني المتاح.";
      detail =
        detail ||
        "يرجى التحقق من الكمية المدخلة في جدول الفاتورة والتأكد من أنها أكبر من الصفر ومتوفرة في المخزن.";
    } else if (
      lower.includes("period") ||
      message.includes("فترة") ||
      message.includes("الفترة المالية")
    ) {
      title = title || "الفترة المالية مغلقة";
      displayMessage = "تاريخ الفاتورة يقع خارج الفترات المالية المفتوحة لعام المنشأة.";
      detail =
        detail || "يرجى تعديل تاريخ الفاتورة أو فتح الفترة المالية من شاشة الإعدادات العامة.";
    } else if (!title) {
      title = type === "error" ? "تعذر حفظ الفاتورة" : "تنبيه من النظام";
    }

    setCenterAlert({
      isOpen: true,
      type,
      title: title || "تنبيه",
      message: displayMessage,
      detail,
    });
  };

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    if (type === "error") {
      showCenterAlert(message, "error");
      return;
    }
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".item-suggestions-menu") && !target?.closest("input[id^='item-input-']")) {
        setActiveSearchLineId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus the first row's item input on initial screen render
  useEffect(() => {
    if (!invoiceIdToView && lines.length > 0) {
      const timer = setTimeout(() => {
        const firstInput = document.getElementById(`item-input-${lines[0].id}`);
        firstInput?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-Save Draft to LocalStorage only if user has entered real items
  useEffect(() => {
    if (!invoiceIdToView && !currentSavedInvoice) {
      const hasRealItems = lines.some((l) => l.item_id > 0);
      if (hasRealItems) {
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
      } else if (e.key === "F4") {
        e.preventDefault();
        handleStartNewInvoice();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSavedInvoice, submitting, lines, items]);

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
            const rawBranches = bJson.data || [];
            const mappedBranches = rawBranches.map((b: any) => ({
              id: b.id,
              name: b.name || b.name_ar || `فرع #${b.id}`,
              name_ar: b.name || b.name_ar || `فرع #${b.id}`,
            }));
            setBranches(mappedBranches);

            if (mappedBranches.length > 0) {
              setBranchId((currentId) => {
                const exists = mappedBranches.some((b: any) => b.id === currentId);
                return exists ? currentId : mappedBranches[0].id;
              });
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
          // Fresh invoice: start with ONE empty row ready for input
          if (lines.length === 0) {
            setLines([createEmptyLine()]);
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

  const addNewLineWithItem = (
    item: Item,
    targetUnit?: ItemUnit,
    addedQuantity: number = 1
  ) => {
    // 1. Strict duplicate check across all invoice rows
    const isDuplicate = lines.some((l) => l.item_id === item.id);
    if (isDuplicate) {
      showToast("هذا الصنف مضاف بالفعل إلى الفاتورة.", "error");
      return;
    }

    const baseUomName = item.base_uom?.name_ar || "حبة";
    const availableUnits = item.units || [];
    const chosenUnit = targetUnit || availableUnits.find((u) => u.is_base_unit) || availableUnits[0];

    const uName = chosenUnit?.uom?.name_ar || (chosenUnit?.is_base_unit ? baseUomName : "وحدة");
    const factor = chosenUnit?.conversion_factor || 1.0;
    const retailPrice =
      chosenUnit?.prices?.find((p) => p.price_tier.value === "retail")?.price ||
      item.cost_price * 1.25 ||
      10;

    const chosenUnitId = chosenUnit?.id || null;

    // 2. If there is already an empty row in the table, populate it instead of appending
    const emptyRowIndex = lines.findIndex((l) => !l.item_id || l.item_id === 0);
    if (emptyRowIndex !== -1) {
      const targetId = lines[emptyRowIndex].id;
      setLines((prev) =>
        prev.map((l) =>
          l.id === targetId
            ? {
                ...l,
                item_id: item.id,
                item_name_ar: item.name_ar,
                item_sku: item.sku,
                item_unit_id: chosenUnitId,
                unit_name: uName,
                conversion_factor: factor,
                quantity: addedQuantity,
                unit_price: retailPrice,
                cost_price: item.cost_price || 0,
                discount_rate: 0,
                tax_rate: 15,
                available_units: availableUnits,
              }
            : l
        )
      );
      setHighlightedLineId(targetId);
      setTimeout(() => setHighlightedLineId(null), 1400);
      setTimeout(() => {
        document.getElementById(`unit-input-${targetId}`)?.focus();
      }, 50);
      return;
    }

    // 3. Otherwise append a new row
    const newLine: InvoiceLineState = {
      id: String(Date.now() + Math.random()),
      item_id: item.id,
      item_name_ar: item.name_ar,
      item_sku: item.sku,
      item_unit_id: chosenUnitId,
      unit_name: uName,
      conversion_factor: factor,
      quantity: addedQuantity,
      unit_price: retailPrice,
      cost_price: item.cost_price || 0,
      discount_rate: 0,
      tax_rate: 15,
      available_units: availableUnits,
    };

    setLines((prev) => [...prev, newLine]);
    setHighlightedLineId(newLine.id);
    setTimeout(() => setHighlightedLineId(null), 1400);
    setTimeout(() => {
      document.getElementById(`unit-input-${newLine.id}`)?.focus();
    }, 50);
  };

  const selectItemForLine = (lineId: string, item: Item): boolean => {
    // 1. Strict duplicate check across all lines in invoice except current line
    const isDuplicate = lines.some((l) => l.id !== lineId && l.item_id === item.id);
    if (isDuplicate) {
      showToast("هذا الصنف مضاف بالفعل إلى الفاتورة.", "error");
      setTimeout(() => {
        const inputEl = document.getElementById(`item-input-${lineId}`) as HTMLInputElement | null;
        if (inputEl) {
          inputEl.focus();
          inputEl.select();
        }
      }, 50);
      return false;
    }

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
              quantity: l.quantity && Number(l.quantity) > 0 ? l.quantity : 1,
              unit_price: retailPrice,
              cost_price: item.cost_price || 0,
              available_units: availableUnits,
            }
          : l
      )
    );

    // Clear search text for this row & close dropdown
    setLineSearchText((prev) => {
      const copy = { ...prev };
      delete copy[lineId];
      return copy;
    });
    setActiveSearchLineId(null);

    // Focus Sold Unit in the same line
    setTimeout(() => {
      const unitEl = document.getElementById(`unit-input-${lineId}`);
      if (unitEl) {
        unitEl.focus();
      } else {
        document.getElementById(`qty-input-${lineId}`)?.focus();
      }
    }, 60);

    return true;
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

  const handleDiscountEnter = (lineId: string) => {
    const currentLine = lines.find((l) => l.id === lineId);
    if (!currentLine || !currentLine.item_id || currentLine.item_id === 0) {
      return;
    }

    const currentIndex = lines.findIndex((l) => l.id === lineId);
    if (currentIndex < lines.length - 1) {
      // There is an existing row below, move focus to its item input
      const nextLine = lines[currentIndex + 1];
      setTimeout(() => {
        document.getElementById(`item-input-${nextLine.id}`)?.focus();
      }, 50);
    } else {
      // Current row is the last row: create a new empty row below
      const newLine = createEmptyLine();
      setLines((prev) => [...prev, newLine]);
      setTimeout(() => {
        const nextItemInput = document.getElementById(`item-input-${newLine.id}`);
        nextItemInput?.focus();
      }, 60);
    }
  };

  const updateQuantity = (lineId: string, delta: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const current = Number(l.quantity) || 1;
        const newQty = Math.max(1, Math.round((current + delta) * 100) / 100);
        return { ...l, quantity: newQty };
      })
    );
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) {
      const freshLine = createEmptyLine();
      setLines([freshLine]);
      showToast("تم تفريغ السطر", "info");
      setTimeout(() => {
        document.getElementById(`item-input-${freshLine.id}`)?.focus();
      }, 50);
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  // Clear current draft and start fresh
  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
    const freshLine = createEmptyLine();
    setLines([freshLine]);
    setSelectedCustomerId("cash");
    setPaymentMethod("cash");
    setNotes("");
    setCashTendered("");
    setIsDraftRestored(false);
    showToast("تم تفريغ الفاتورة وبدء مسودة فارغة", "info");
    setTimeout(() => {
      document.getElementById(`item-input-${freshLine.id}`)?.focus();
    }, 100);
  };

  // Start New Invoice for Next Customer
  const handleStartNewInvoice = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
    setCurrentSavedInvoice(null);
    setInvoiceNumber("");
    const freshLine = createEmptyLine();
    setLines([freshLine]);
    setSelectedCustomerId("cash");
    setPaymentMethod("cash");
    setNotes("");
    setCashTendered("");
    setIsDraftRestored(false);
    showToast("جاهز لإنشاء فاتورة جديدة للعميل التالي ✨", "info");
    setTimeout(() => {
      document.getElementById(`item-input-${freshLine.id}`)?.focus();
    }, 100);
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
    let totalItemsCount = 0;
    let totalQuantity = 0;

    const lineCalculations = lines.map((l) => {
      // If empty row (no item selected yet), calculation totals are 0
      if (!l.item_id || l.item_id === 0) {
        return {
          ...l,
          lineSubtotal: 0,
          lineDiscount: 0,
          lineTax: 0,
          lineTotal: 0,
        };
      }

      const qtyNum = Number(l.quantity) || 0;
      const lineSubtotal = qtyNum * (Number(l.unit_price) || 0);
      const lineDiscount = lineSubtotal * ((Number(l.discount_rate) || 0) / 100);
      const taxable = Math.max(0, lineSubtotal - lineDiscount);
      const lineTax = taxable * ((Number(l.tax_rate) || 0) / 100);
      const lineTotal = taxable + lineTax;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
      totalItemsCount += 1;
      totalQuantity += qtyNum;

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
    const validLines = lines.filter((l) => l.item_id && l.item_id > 0);
    if (validLines.length === 0) {
      showCenterAlert("يرجى إضافة واختيار صنف غذائي واحد على الأقل للمتابعة.", "warning", "الفاتورة فارغة");
      return;
    }

    const invalidQty = validLines.find((l) => !l.quantity || Number(l.quantity) <= 0);
    if (invalidQty) {
      showCenterAlert(
        `الكمية المحددة للصنف [${invalidQty.item_name_ar || "صنف"}] غير صالحة. يجب أن تكون الكمية أكبر من الصفر.`,
        "warning",
        "تنبيه في كمية الصنف",
        "يرجى تصحيح الكمية في جدول الفاتورة قبل محاولة الحفظ أو الترحيل."
      );
      return;
    }

    // Frontend Stock Availability Validation
    for (const l of validLines) {
      const matchedItem = items.find((it) => it.id === l.item_id);
      if (matchedItem) {
        const availableStock = Number(matchedItem.stock_quantity ?? 0);
        const reqBaseQty = Number(l.quantity || 0) * Number(l.conversion_factor || 1);
        if (reqBaseQty > availableStock) {
          showCenterAlert(
            `الكمية المطلوبة للصنف [${matchedItem.name_ar}] (${l.quantity} ${l.unit_name}) تتجاوز رصيد المخزون المتوفر (${availableStock} في الوحدة الأساسية).`,
            "error",
            "رصيد المخزون غير كافٍ ⚠️",
            `الرصيد المتاح حالياً في المستودع لهذا الصنف هو (${availableStock}) فقط. يرجى تخفيض الكمية المطلوبة لتتناسب مع الرصيد المتاح.`
          );
          return;
        }
      }
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
        lines: validLines.map((l) => ({
          item_id: l.item_id,
          item_unit_id: l.item_unit_id || undefined,
          unit_name: l.unit_name,
          conversion_factor: l.conversion_factor,
          quantity: Number(l.quantity) || 1,
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
        showCenterAlert(
          `تم حفظ واعتماد وترحيل فاتورة المبيعات بنجاح برقم [${saved.invoice_number}]، وتم توليد القيد المحاسبي المتوازن وتشفير رمز ZATCA.`,
          "success",
          "تم حفظ وترحيل الفاتورة بنجاح 🎉",
          `إجمالي المبلغ المطلوب: ${money(saved.total_amount)} شامل ضريبة القيمة المضافة`
        );
      } else {
        showCenterAlert(
          `تم حفظ الفاتورة بنجاح كمسودة برقم [${saved.invoice_number}].`,
          "info",
          "تم حفظ المسودة بنجاح ✅"
        );
      }

      setTimeout(() => {
        openPrintPreview();
      }, 500);
    } catch (err: any) {
      const errMsg = err.message || "حدث خطأ أثناء حفظ الفاتورة";
      showCenterAlert(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle successful Sales Return / Credit Note creation
  const handleReturnSuccess = async (ret: SalesReturn) => {
    setShowReturnModal(false);
    setActiveSalesReturn(ret);

    // Generate ZATCA QR for the Credit Note
    if (ret.zatca_qr_payload) {
      try {
        const qrUrl = await QRCode.toDataURL(ret.zatca_qr_payload, {
          width: 180,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setReturnQrCodeUrl(qrUrl);
      } catch (e) {
        console.warn("Could not generate QR for return:", e);
      }
    }

    showCenterAlert(
      `تم تسجيل وترحيل إشعار دائن برقم [${ret.return_number}] للمبيعات بنجاح. تم عكس الإيرادات وضريبة المخرجات وتحديث المخزون وتكلفة المبيعات بالقيد المحاسبي رقم #${ret.journal_entry_id || ""}.`,
      "success",
      "تم إرجاع الفاتورة واعتماد الإشعار الدائن بنجاح 🎉",
      `المبلغ المسترد: ${money(ret.total_amount)} شامل ضريبة القيمة المضافة`
    );

    setShowReturnPrintModal(true);

    // Refresh stock quantities in master items
    try {
      const itemsRes = await productsApi.getItems({ per_page: 200, is_active: true });
      setItems(itemsRes.data || []);
    } catch (e) {
      console.warn("Could not reload items stock:", e);
    }

    // Refresh current invoice data
    if (currentSavedInvoice?.id) {
      try {
        const refreshed = await salesApi.getInvoice(currentSavedInvoice.id);
        populateInvoice(refreshed);
      } catch (e) {
        console.warn("Could not reload invoice:", e);
      }
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

          {currentSavedInvoice && (
            <button
              type="button"
              className="btn"
              onClick={handleStartNewInvoice}
              title="بدء فاتورة بيع جديدة للعميل التالي (F4)"
              style={{
                height: 40,
                padding: "0 18px",
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 800,
                borderRadius: 8,
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)",
                cursor: "pointer",
              }}
            >
              <Plus size={16} strokeWidth={2.8} />
              <span>فاتورة جديدة</span>
              <span
                style={{
                  background: "rgba(255,255,255,0.25)",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              >
                F4
              </span>
            </button>
          )}

          {currentSavedInvoice?.status.value === "posted" && (
            <button
              type="button"
              className="btn"
              onClick={() => setShowReturnModal(true)}
              title="إنشاء إشعار دائن وإرجاع أصناف الفاتورة للمخزون"
              style={{
                height: 40,
                padding: "0 14px",
                background: "#fffbeb",
                color: "#b45309",
                border: "1px solid #fde68a",
                fontSize: 13,
                fontWeight: 800,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={15} />
              <span>إرجاع الفاتورة (إشعار دائن)</span>
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
                  ? "var(--muted, #6B7280)"
                  : "linear-gradient(145deg, #16A34A, #15803D)",
              fontSize: 13,
              fontWeight: 800,
              boxShadow: "0 4px 14px rgba(21, 128, 61, 0.28)",
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
                  {b.name_ar || (b as any).name || `فرع #${b.id}`}
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
              const emptyLine = lines.find((l) => !l.item_id || l.item_id === 0);
              if (emptyLine) {
                document.getElementById(`item-input-${emptyLine.id}`)?.focus();
              } else {
                const newLine = createEmptyLine();
                setLines((prev) => [...prev, newLine]);
                setTimeout(() => {
                  document.getElementById(`item-input-${newLine.id}`)?.focus();
                }, 50);
              }
            }}
            disabled={currentSavedInvoice?.status.value === "posted"}
            style={{
              height: 42,
              padding: "0 18px",
              background: "linear-gradient(145deg, #C5A46D, #B08D57)",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 800,
              boxShadow: "0 4px 12px rgba(176, 141, 87, 0.25)",
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
          boxShadow: "0 2px 8px rgba(20, 35, 28, 0.03)",
          overflow: "visible",
        }}
      >
        <div
          style={{
            minHeight: "340px",
            maxHeight: "440px",
            overflowY: "auto",
            overflowX: "visible",
            position: "relative",
          }}
        >
          <table
            className="data"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "right",
              fontSize: 13,
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                background: "var(--surface-2, #f7faf6)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <tr
                style={{
                  borderBottom: "2px solid var(--line, #d5e0d8)",
                  color: "var(--ink-soft, #4a5c52)",
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                <th style={{ padding: "8px 10px", width: 42, textAlign: "center" }}>#</th>
                <th style={{ padding: "8px 10px", minWidth: 260 }}>الصنف الغذائي</th>
                <th style={{ padding: "8px 10px", width: 160 }}>الوحدة المباعة</th>
                <th style={{ padding: "8px 10px", width: 130, textAlign: "center" }}>الكمية</th>
                <th style={{ padding: "8px 10px", width: 125, textAlign: "center" }}>السعر (قبل الضريبة)</th>
                <th style={{ padding: "8px 10px", width: 85, textAlign: "center" }}>خصم %</th>
                <th style={{ padding: "8px 10px", width: 105, textAlign: "center" }}>الضريبة 15%</th>
                <th style={{ padding: "8px 10px", width: 135, textAlign: "left" }}>الإجمالي (بعد الضريبة)</th>
                <th style={{ padding: "8px 10px", width: 44, textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {calculations.lineCalculations.map((line, idx) => {
                const isHighlighted = line.id === highlightedLineId;
                const queryText = (lineSearchText[line.id] !== undefined ? lineSearchText[line.id] : "").trim().toLowerCase();
                const matchingSuggestions = items.filter((it) => {
                  if (!queryText) return true;
                  return (
                    it.name_ar.toLowerCase().includes(queryText) ||
                    it.sku.toLowerCase().includes(queryText) ||
                    (it.barcode && it.barcode.toLowerCase().includes(queryText))
                  );
                }).slice(0, 8);

                return (
                  <tr
                    key={line.id}
                    style={{
                      borderBottom: "1px solid var(--line, #d5e0d8)",
                      background: isHighlighted
                        ? "rgba(34, 197, 94, 0.16)"
                        : idx % 2 === 0
                        ? "var(--surface, #ffffff)"
                        : "var(--surface-2, #f7faf6)",
                      transition: "background 0.2s ease, box-shadow 0.2s ease",
                      boxShadow: isHighlighted ? "inset 0 0 0 2px var(--brand, #1a5c45)" : "none",
                    }}
                  >
                    {/* Row Number */}
                    <td style={{ padding: "6px 10px", textAlign: "center", color: "var(--muted, #7a8b82)", fontWeight: 700 }}>
                      {idx + 1}
                    </td>

                    {/* Food Item Search & Combobox */}
                    <td style={{ padding: "6px 10px", position: "relative" }}>
                      <div style={{ position: "relative" }}>
                        <input
                          id={`item-input-${line.id}`}
                          type="text"
                          autoComplete="off"
                          value={
                            lineSearchText[line.id] !== undefined
                              ? lineSearchText[line.id]
                              : line.item_id > 0
                              ? `${line.item_name_ar}${line.item_sku ? ` (${line.item_sku})` : ""}`
                              : ""
                          }
                          placeholder="ابحث بالاسم، SKU، أو الباركود..."
                          disabled={currentSavedInvoice?.status.value === "posted"}
                          onFocus={(e) => {
                            setActiveSearchLineId(line.id);
                            setHighlightedSuggestIdx(0);
                            e.target.select();
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLineSearchText((prev) => ({ ...prev, [line.id]: val }));
                            setActiveSearchLineId(line.id);
                            setHighlightedSuggestIdx(0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              if (matchingSuggestions.length > 0) {
                                setHighlightedSuggestIdx((prev) => (prev + 1) % matchingSuggestions.length);
                              }
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              if (matchingSuggestions.length > 0) {
                                setHighlightedSuggestIdx((prev) => (prev - 1 + matchingSuggestions.length) % matchingSuggestions.length);
                              }
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              let candidate: Item | undefined;

                              if (activeSearchLineId === line.id && matchingSuggestions.length > 0 && matchingSuggestions[highlightedSuggestIdx]) {
                                candidate = matchingSuggestions[highlightedSuggestIdx];
                              } else if (queryText) {
                                candidate =
                                  items.find((it) => it.barcode && it.barcode.toLowerCase() === queryText) ||
                                  items.find((it) => it.sku.toLowerCase() === queryText) ||
                                  items.find((it) => it.name_ar.toLowerCase().includes(queryText)) ||
                                  matchingSuggestions[0];
                              }

                              if (candidate) {
                                selectItemForLine(line.id, candidate);
                              } else if (line.item_id > 0) {
                                // Already has valid item, move forward to Sold Unit
                                setActiveSearchLineId(null);
                                document.getElementById(`unit-input-${line.id}`)?.focus();
                              } else {
                                showToast("لم يتم العثور على صنف مطابق لهذا البحث", "error");
                              }
                            } else if (e.key === "Escape") {
                              setActiveSearchLineId(null);
                            }
                          }}
                          style={{
                            width: "100%",
                            height: 32,
                            padding: "0 10px",
                            borderRadius: 6,
                            border: line.item_id > 0 ? "1px solid var(--line, #d5e0d8)" : "1.5px solid var(--brand, #1a5c45)",
                            fontSize: 12.5,
                            fontWeight: line.item_id > 0 ? 700 : 500,
                            color: "var(--ink, #14231c)",
                            background: line.item_id > 0 ? "var(--surface, #ffffff)" : "rgba(26, 92, 69, 0.03)",
                            outline: "none",
                            boxShadow: activeSearchLineId === line.id ? "0 0 0 2px rgba(26, 92, 69, 0.2)" : "none",
                          }}
                        />

                        {/* Autocomplete Suggestions Menu */}
                        {activeSearchLineId === line.id && currentSavedInvoice?.status.value !== "posted" && (
                          <div
                            className="item-suggestions-menu"
                            style={{
                              position: "absolute",
                              top: "100%",
                              right: 0,
                              left: 0,
                              zIndex: 9999,
                              background: "var(--surface, #ffffff)",
                              borderRadius: 8,
                              border: "1px solid var(--line, #d5e0d8)",
                              boxShadow: "0 12px 28px rgba(0, 0, 0, 0.16)",
                              maxHeight: 250,
                              overflowY: "auto",
                              marginTop: 4,
                            }}
                          >
                            {matchingSuggestions.length === 0 ? (
                              <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted, #64748b)", textAlign: "center" }}>
                                لا يوجد صنف مطابق للبحث
                              </div>
                            ) : (
                              matchingSuggestions.map((it, sIdx) => {
                                const isFocused = sIdx === highlightedSuggestIdx;
                                const isAlreadyInInvoice = lines.some((l) => l.id !== line.id && l.item_id === it.id);
                                const stockQty = Number(it.stock_quantity ?? 0);

                                return (
                                  <div
                                    key={it.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selectItemForLine(line.id, it);
                                    }}
                                    onMouseEnter={() => setHighlightedSuggestIdx(sIdx)}
                                    style={{
                                      padding: "8px 12px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      cursor: "pointer",
                                      background: isFocused ? "rgba(26, 92, 69, 0.08)" : "transparent",
                                      borderBottom: "1px solid var(--line-light, #f1f5f9)",
                                      transition: "background 0.1s ease",
                                    }}
                                  >
                                    <div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontWeight: 800, fontSize: 12.5, color: "var(--ink, #0f172a)" }}>
                                          {it.name_ar}
                                        </span>
                                        <span style={{ fontSize: 10.5, color: "var(--muted, #64748b)", background: "var(--surface-2, #f1f5f9)", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace" }}>
                                          {it.sku}
                                        </span>
                                        {isAlreadyInInvoice && (
                                          <span style={{ fontSize: 9.5, color: "#dc2626", background: "#fef2f2", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                                            مضاف بالفعل
                                          </span>
                                        )}
                                      </div>
                                      {it.barcode && (
                                        <div style={{ fontSize: 10, color: "var(--muted, #94a3b8)", marginTop: 2 }}>
                                          باركود: {it.barcode}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ textAlign: "left" }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: stockQty > 0 ? "var(--brand, #166534)" : "var(--danger, #dc2626)" }}>
                                        المخزون: {stockQty.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stock & Alert Info for selected item */}
                      {line.item_id > 0 && (() => {
                        const matchedItem = items.find((it) => it.id === line.item_id);
                        const availableStock = matchedItem ? Number(matchedItem.stock_quantity ?? 0) : 0;
                        const baseQty = Number(line.quantity || 0) * Number(line.conversion_factor || 1);
                        const isOverStock = baseQty > availableStock;

                        return (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 800,
                                color: isOverStock ? "var(--danger, #dc2626)" : availableStock > 0 ? "var(--brand, #166534)" : "var(--muted, #64748b)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <Boxes size={11} />
                              المخزون: <strong>{availableStock.toLocaleString()}</strong>
                            </span>
                            {isOverStock && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  color: "#b91c1c",
                                  background: "#fee2e2",
                                  padding: "0 4px",
                                  borderRadius: 3,
                                }}
                              >
                                ⚠️ يتجاوز الرصيد!
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Unit Selection */}
                    <td style={{ padding: "6px 10px" }}>
                      <select
                        id={`unit-input-${line.id}`}
                        value={line.item_unit_id || ""}
                        onChange={(e) => handleUnitChange(line.id, Number(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            document.getElementById(`qty-input-${line.id}`)?.focus();
                          }
                        }}
                        disabled={currentSavedInvoice?.status.value === "posted" || !line.item_id || line.item_id === 0}
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "0 8px",
                          borderRadius: 6,
                          border: "1px solid var(--line, #d5e0d8)",
                          fontSize: 12,
                          fontWeight: 600,
                          background: !line.item_id || line.item_id === 0 ? "var(--surface-2, #f7faf6)" : "var(--surface, #ffffff)",
                          outline: "none",
                          cursor: !line.item_id || line.item_id === 0 ? "default" : "pointer",
                        }}
                      >
                        {!line.item_id || line.item_id === 0 ? (
                          <option value="">-</option>
                        ) : line.available_units.length > 0 ? (
                          line.available_units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.uom?.name_ar || "وحدة"} (معامل: {u.conversion_factor})
                            </option>
                          ))
                        ) : (
                          <option value="">{line.unit_name || "حبة"}</option>
                        )}
                      </select>
                    </td>

                    {/* Quantity Stepper */}
                    <td style={{ padding: "6px 10px" }}>
                      {(() => {
                        const matchedItem = items.find((it) => it.id === line.item_id);
                        const availableStock = matchedItem ? Number(matchedItem.stock_quantity ?? 0) : 0;
                        const baseQty = Number(line.quantity || 0) * Number(line.conversion_factor || 1);
                        const isOverStock = line.item_id > 0 && baseQty > availableStock;

                        return (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              border: isOverStock ? "2px solid #ef4444" : "1px solid var(--line, #d5e0d8)",
                              borderRadius: 6,
                              overflow: "hidden",
                              background: isOverStock ? "#fef2f2" : !line.item_id || line.item_id === 0 ? "var(--surface-2, #f7faf6)" : "var(--surface, #ffffff)",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {currentSavedInvoice?.status.value !== "posted" && line.item_id > 0 && (
                              <button
                                type="button"
                                onClick={() => updateQuantity(line.id, -1)}
                                style={{
                                  width: 26,
                                  height: 30,
                                  border: "none",
                                  background: "var(--surface-2, #f7faf6)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--ink-soft, #4a5c52)",
                                }}
                              >
                                <Minus size={12} />
                              </button>
                            )}

                            <input
                              id={`qty-input-${line.id}`}
                              type="number"
                              min={1}
                              step="any"
                              value={line.item_id === 0 ? "" : (line.quantity === 0 ? "" : line.quantity)}
                              placeholder="1"
                              disabled={currentSavedInvoice?.status.value === "posted" || !line.item_id || line.item_id === 0}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  document.getElementById(`disc-input-${line.id}`)?.focus();
                                }
                              }}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") {
                                  setLines((prev) =>
                                    prev.map((l) => (l.id === line.id ? { ...l, quantity: "" } : l))
                                  );
                                  return;
                                }
                                const val = parseFloat(raw);
                                setLines((prev) =>
                                  prev.map((l) =>
                                    l.id === line.id
                                      ? { ...l, quantity: isNaN(val) ? "" : val }
                                      : l
                                  )
                                );
                              }}
                              onBlur={() => {
                                setLines((prev) =>
                                  prev.map((l) => {
                                    if (l.id !== line.id) return l;
                                    const num = Number(l.quantity);
                                    return {
                                      ...l,
                                      quantity: !l.quantity || isNaN(num) || num <= 0 ? 1 : num,
                                    };
                                  })
                                );
                              }}
                              style={{
                                width: "100%",
                                height: 30,
                                border: "none",
                                textAlign: "center",
                                fontSize: 13,
                                fontWeight: 800,
                                padding: "0 2px",
                                outline: "none",
                                color: isOverStock ? "#b91c1c" : "inherit",
                                background: "transparent",
                              }}
                            />

                            {currentSavedInvoice?.status.value !== "posted" && line.item_id > 0 && (
                              <button
                                type="button"
                                onClick={() => updateQuantity(line.id, 1)}
                                style={{
                                  width: 26,
                                  height: 30,
                                  border: "none",
                                  background: "var(--surface-2, #f7faf6)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--ink-soft, #4a5c52)",
                                }}
                              >
                                <Plus size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Unit Price */}
                    <td style={{ padding: "6px 10px" }}>
                      <input
                        id={`price-input-${line.id}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.item_id === 0 ? "" : line.unit_price}
                        disabled={currentSavedInvoice?.status.value === "posted" || !line.item_id || line.item_id === 0}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            document.getElementById(`disc-input-${line.id}`)?.focus();
                          }
                        }}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setLines((prev) =>
                            prev.map((l) => (l.id === line.id ? { ...l, unit_price: val } : l))
                          );
                        }}
                        style={{
                          width: "100%",
                          height: 30,
                          borderRadius: 6,
                          border: "1px solid var(--line, #d5e0d8)",
                          textAlign: "center",
                          fontSize: 12.5,
                          fontWeight: 700,
                          fontFamily: "monospace",
                          outline: "none",
                          background: !line.item_id || line.item_id === 0 ? "var(--surface-2, #f7faf6)" : "var(--surface, #ffffff)",
                        }}
                      />
                    </td>

                    {/* Discount Rate */}
                    <td style={{ padding: "6px 10px" }}>
                      <div style={{ position: "relative" }}>
                        <input
                          id={`disc-input-${line.id}`}
                          type="number"
                          min={0}
                          max={100}
                          step="1"
                          value={line.item_id === 0 ? "" : line.discount_rate}
                          disabled={currentSavedInvoice?.status.value === "posted" || !line.item_id || line.item_id === 0}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleDiscountEnter(line.id);
                            }
                          }}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                            setLines((prev) =>
                              prev.map((l) => (l.id === line.id ? { ...l, discount_rate: val } : l))
                            );
                          }}
                          style={{
                            width: "100%",
                            height: 30,
                            borderRadius: 6,
                            border: "1px solid var(--line, #d5e0d8)",
                            textAlign: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            paddingLeft: 14,
                            outline: "none",
                            background: !line.item_id || line.item_id === 0 ? "var(--surface-2, #f7faf6)" : "var(--surface, #ffffff)",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            left: 4,
                            top: 6,
                            fontSize: 10,
                            color: "var(--muted, #7a8b82)",
                            fontWeight: 700,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>

                    {/* Tax */}
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: "var(--info, #2a6a8a)", fontFamily: "monospace" }}>
                        {money(line.lineTax)}
                      </span>
                    </td>

                    {/* Line Total */}
                    <td style={{ padding: "6px 10px", textAlign: "left" }}>
                      <span
                        style={{
                          fontWeight: 900,
                          fontSize: 13,
                          color: "var(--ink, #14231c)",
                          fontFamily: "monospace",
                        }}
                      >
                        {money(line.lineTotal)}
                      </span>
                    </td>

                    {/* Delete Button */}
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      {currentSavedInvoice?.status.value !== "posted" && (
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          title="حذف هذا السطر"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
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
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
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
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span>عدد الأصناف: <strong>{calculations.totalItemsCount}</strong></span>
            <span>إجمالي الكمية: <strong>{calculations.totalQuantity}</strong> قطعة / وحدة</span>
            <span style={{ color: "var(--line, #d5e0d8)" }}>|</span>
            <span>قبل الضريبة: <strong style={{ fontFamily: "monospace" }}>{money(calculations.subtotal - calculations.discountTotal)}</strong></span>
            <span>الضريبة: <strong style={{ fontFamily: "monospace", color: "var(--info, #2a6a8a)" }}>{money(calculations.taxTotal)}</strong></span>
            <span>بعد الضريبة: <strong style={{ fontFamily: "monospace", color: "var(--brand, #1a5c45)" }}>{money(calculations.netTotal)}</strong></span>
          </div>

          {currentSavedInvoice?.status.value !== "posted" && (
            <button
              type="button"
              onClick={() => {
                const emptyLine = lines.find((l) => !l.item_id || l.item_id === 0);
                if (emptyLine) {
                  document.getElementById(`item-input-${emptyLine.id}`)?.focus();
                } else {
                  const newLine = createEmptyLine();
                  setLines((prev) => [...prev, newLine]);
                  setTimeout(() => {
                    document.getElementById(`item-input-${newLine.id}`)?.focus();
                  }, 50);
                }
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
              <Plus size={14} /> إضافة سطر جديد
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
                الإجمالي المستحق (بعد الضريبة)
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
          {currentSavedInvoice?.status.value === "posted" ? (
            <>
              <button
                type="button"
                className="btn"
                onClick={handleStartNewInvoice}
                style={{
                  marginTop: 6,
                  height: 48,
                  width: "100%",
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 900,
                  borderRadius: "var(--radius-sm, 10px)",
                  border: "none",
                  boxShadow: "0 8px 22px rgba(5, 150, 105, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Plus size={18} strokeWidth={3} />
                <span>بدء فاتورة جديدة للعميل التالي</span>
                <span
                  style={{
                    background: "rgba(255,255,255,0.25)",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                >
                  F4
                </span>
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => setShowReturnModal(true)}
                title="إرجاع أصناف الفاتورة وإصدار إشعار دائن رسمي"
                style={{
                  marginTop: 8,
                  height: 42,
                  width: "100%",
                  background: "#fffbeb",
                  color: "#b45309",
                  border: "1px solid #fde68a",
                  fontSize: 13,
                  fontWeight: 800,
                  borderRadius: "var(--radius-sm, 10px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <RotateCcw size={16} />
                <span>إرجاع الفاتورة (إشعار دائن)</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSaveInvoice(true)}
              disabled={submitting}
              style={{
                marginTop: 6,
                height: 44,
                width: "100%",
                background: "linear-gradient(145deg, #16A34A, #15803D)",
                fontSize: 14,
                fontWeight: 800,
                boxShadow: "0 6px 18px rgba(21, 128, 61, 0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Send size={16} />
              {submitting
                ? "جارِ الحفظ والترحيل..."
                : `حفظ وترحيل (${money(calculations.netTotal)})`}
            </button>
          )}
        </div>
      </div>

      {/* Sticky Bottom Quick Action Strip for Ergonomic Cashier Flow */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 40,
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(12px)",
          borderTop: "2px solid var(--brand, #1a5c45)",
          borderRadius: "14px 14px 0 0",
          boxShadow: "0 -6px 24px rgba(20, 35, 28, 0.12)",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 18,
        }}
      >
        {/* Left: Quick Counts & Breakdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft, #4a5c52)" }}>
            <span>عدد الأصناف:</span>
            <span style={{ fontWeight: 800, color: "var(--ink, #14231c)", background: "var(--surface-2, #f7faf6)", padding: "2px 8px", borderRadius: 6, border: "1px solid var(--line, #d5e0d8)" }}>
              {calculations.totalItemsCount}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft, #4a5c52)" }}>
            <span>إجمالي القطع:</span>
            <span style={{ fontWeight: 800, color: "var(--ink, #14231c)", background: "var(--surface-2, #f7faf6)", padding: "2px 8px", borderRadius: 6, border: "1px solid var(--line, #d5e0d8)" }}>
              {calculations.totalQuantity}
            </span>
          </div>

          {/* Price Before Tax */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft, #4a5c52)", background: "var(--surface-2, #f7faf6)", padding: "3px 10px", borderRadius: 6, border: "1px solid var(--line, #d5e0d8)" }}>
            <span>قبل الضريبة:</span>
            <strong style={{ fontFamily: "monospace", color: "var(--ink, #14231c)", fontSize: 14 }}>
              {money(calculations.subtotal - calculations.discountTotal)}
            </strong>
          </div>

          {/* VAT 15% */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--info, #2a6a8a)", background: "rgba(42, 106, 138, 0.08)", padding: "3px 10px", borderRadius: 6, border: "1px solid rgba(42, 106, 138, 0.2)" }}>
            <span>الضريبة (15%):</span>
            <strong style={{ fontFamily: "monospace", fontSize: 14 }}>
              + {money(calculations.taxTotal)}
            </strong>
          </div>

          {/* Price After Tax */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "var(--brand-soft, #dceee6)", borderRadius: 8, border: "1px solid rgba(26, 92, 69, 0.25)" }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: "var(--brand-deep, #0f3d2e)" }}>
              بعد الضريبة:
            </span>
            <span style={{ fontSize: 19, fontWeight: 900, color: "var(--brand-deep, #0f3d2e)", fontFamily: "monospace" }}>
              {money(calculations.netTotal)}
            </span>
          </div>
        </div>

        {/* Right: Primary Action & Quick Shortcuts */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {currentSavedInvoice?.status.value === "posted" ? (
            <button
              type="button"
              className="btn"
              onClick={handleStartNewInvoice}
              style={{
                height: 40,
                padding: "0 18px",
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 800,
                borderRadius: 8,
                border: "none",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <Plus size={15} strokeWidth={3} />
              <span>فاتورة جديدة للعميل التالي (F4)</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSaveInvoice(true)}
              disabled={submitting}
              style={{
                height: 40,
                padding: "0 22px",
                background: "linear-gradient(145deg, #16A34A, #15803D)",
                fontSize: 13,
                fontWeight: 800,
                boxShadow: "0 4px 14px rgba(21, 128, 61, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Send size={15} />
              {submitting ? "جارِ الحفظ والترحيل..." : `حفظ وترحيل فوري (F9)`}
            </button>
          )}

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowPrint(true)}
            style={{
              height: 40,
              padding: "0 14px",
              fontSize: 12,
              fontWeight: 700,
              background: "var(--surface-2, #f7faf6)",
              border: "1px solid var(--line, #d5e0d8)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Printer size={15} />
            <span>طباعة (Ctrl+P)</span>
          </button>
        </div>
      </div>

      {/* 6. Product Picker Modal (Ergonomic Catalog Drawer) */}
      <Modal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        title="استعراض واختيار الأصناف الغذائية"
        subtitle="يمكنك إضافة عدة أصناف متتالية بضغطة زر واحدة دون إغلاق النافذة"
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div style={{ fontSize: 13, color: "var(--ink-soft, #4a5c52)", fontWeight: 700 }}>
              الأصناف بالفاتورة: <strong style={{ color: "var(--brand, #1a5c45)" }}>{calculations.totalItemsCount}</strong> صنف (إجمالي: <strong style={{ color: "var(--brand-deep, #0f3d2e)" }}>{money(calculations.netTotal)}</strong>)
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowProductPicker(false)}
              style={{
                height: 38,
                padding: "0 20px",
                fontSize: 13,
                fontWeight: 800,
                background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))",
              }}
            >
              تم / العودة للفاتورة
            </button>
          </div>
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
          <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredPickerItems.map((item) => {
              const qtyInInvoice = lines
                .filter((l) => l.item_id === item.id)
                .reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm, 10px)",
                    border: qtyInInvoice > 0 ? "1.5px solid var(--brand, #1a5c45)" : "1px solid var(--line, #d5e0d8)",
                    background: qtyInInvoice > 0 ? "var(--surface-2, #f7faf6)" : "var(--surface, #ffffff)",
                    transition: "all 0.18s ease",
                    gap: 12,
                  }}
                >
                  {/* Item Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 800, fontSize: 13.5, color: "var(--ink, #14231c)" }}>
                        {item.name_ar}
                      </span>
                      {qtyInInvoice > 0 && (
                        <span
                          style={{
                            background: "var(--brand-soft, #dceee6)",
                            color: "var(--brand-deep, #0f3d2e)",
                            padding: "1px 7px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          ✓ مضاف ({qtyInInvoice})
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11, color: "var(--muted, #7a8b82)" }}>
                      <span style={{ padding: "1px 5px", background: "var(--surface-2, #f7faf6)", borderRadius: 4, border: "1px solid var(--line, #d5e0d8)", fontFamily: "monospace" }}>
                        SKU: {item.sku}
                      </span>
                      <span>•</span>
                      <span>الوحدة: <strong>{item.base_uom?.name_ar || "حبة"}</strong></span>
                      <span>•</span>
                      <span>المخزون: <strong>{Number(item.stock_quantity ?? 0).toLocaleString()}</strong></span>
                    </div>
                  </div>

                  {/* Price & Action Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <div style={{ textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 900, color: "var(--brand-deep, #0f3d2e)", fontFamily: "monospace" }}>
                        {money(item.cost_price * 1.25)}
                      </span>
                      <span style={{ fontSize: 9.5, color: "var(--muted, #7a8b82)" }}>سعر التجزئة</span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        addNewLineWithItem(item);
                      }}
                      style={{
                        height: 32,
                        padding: "0 12px",
                        fontSize: 12,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        borderRadius: 6,
                        background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Plus size={13} /> إضافة
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        addNewLineWithItem(item);
                        setShowProductPicker(false);
                      }}
                      title="إضافة وإغلاق النافذة فوراً"
                      style={{
                        height: 32,
                        padding: "0 8px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        borderRadius: 6,
                        background: "var(--surface-2, #f7faf6)",
                        border: "1px solid var(--line, #d5e0d8)",
                        color: "var(--ink-soft, #4a5c52)",
                      }}
                    >
                      إضافة وإغلاق
                    </button>
                  </div>
                </div>
              );
            })}
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
          {/* Scoped Print Styles */}
          <style>{`
            @media print {
              @page {
                size: ${printFormat === "thermal" ? "80mm auto" : "A4 portrait"};
                margin: ${printFormat === "thermal" ? "2mm" : "8mm 10mm"};
              }
              html, body {
                background: #ffffff !important;
                color: #0f172a !important;
                font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
                overflow: visible !important;
              }
              body * {
                visibility: hidden;
              }
              .modal-backdrop, .modal, .modal-body {
                position: static !important;
                display: block !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                width: 100% !important;
                max-width: 100% !important;
                overflow: visible !important;
              }
              .modal-head, .modal-foot, .no-print, .screen-only, header, nav, aside {
                display: none !important;
              }
              #official-print-sales-invoice, #official-print-sales-invoice * {
                visibility: visible !important;
              }
              #official-print-sales-invoice {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: ${printFormat === "thermal" ? "76mm" : "100%"} !important;
                max-width: ${printFormat === "thermal" ? "76mm" : "100%"} !important;
                margin: 0 auto !important;
                padding: ${printFormat === "thermal" ? "6px" : "20px"} !important;
                border: ${printFormat === "thermal" ? "none" : "1px solid #cbd5e1"} !important;
                box-shadow: none !important;
                box-sizing: border-box !important;
                background: #ffffff !important;
              }
            }
          `}</style>

          {/* Format Switcher */}
          <div
            className="no-print"
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
            id="official-print-sales-invoice"
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

      {/* 9. Sales Return / Credit Note Modal */}
      {currentSavedInvoice && (
        <SalesReturnModal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          invoiceId={currentSavedInvoice.id}
          onSuccess={handleReturnSuccess}
        />
      )}

      {/* 10. Credit Note Print Preview Modal */}
      <Modal
        isOpen={showReturnPrintModal}
        onClose={() => setShowReturnPrintModal(false)}
        title={`معاينة طباعة — إشعار دائن ضريبي ${activeSalesReturn?.return_number || ""}`}
        subtitle="مستند مردودات مبيعات — إشعار دائن ضريبي (Credit Note)"
        footer={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setShowReturnPrintModal(false)}>
              إغلاق
            </button>
            <button
              className="btn btn-primary"
              onClick={() => window.print()}
              style={{ background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))" }}
            >
              <Printer size={15} /> طباعة الإشعار الآن
            </button>
          </div>
        }
      >
        {activeSalesReturn && (
          <div>
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
                    height: auto !important;
                    overflow: visible !important;
                  }
                  body * {
                    visibility: hidden;
                  }
                  .modal-backdrop, .modal, .modal-body {
                    position: static !important;
                    display: block !important;
                    background: transparent !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow: visible !important;
                  }
                  .modal-head, .modal-foot, .no-print, .screen-only, header, nav, aside {
                    display: none !important;
                  }
                  #official-print-credit-note, #official-print-credit-note * {
                    visibility: visible !important;
                  }
                  #official-print-credit-note {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 16px !important;
                    border: 1px solid #cbd5e1 !important;
                    box-shadow: none !important;
                    box-sizing: border-box !important;
                    background: #ffffff !important;
                  }
                }
              `}</style>

            <div
              id="official-print-credit-note"
              className="print-container"
              style={{
                maxWidth: "100%",
                margin: "0 auto",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                padding: "24px",
                borderRadius: 8,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                color: "#0f172a",
              }}
            >
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 19, fontWeight: 900, margin: 0 }}>
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
                    background: "#fffbeb",
                    color: "#b45309",
                    padding: "4px 10px",
                    borderRadius: 4,
                    display: "inline-block",
                    border: "1px solid #fde68a",
                  }}
                >
                  إشعار دائن ضريبي (Tax Credit Note)
                </div>
              </div>

              {/* Meta Info Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  fontSize: 12,
                  marginBottom: 16,
                  padding: "10px 12px",
                  background: "#f8fafc",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <strong>رقم الإشعار: </strong>
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    {activeSalesReturn.return_number}
                  </span>
                </div>
                <div>
                  <strong>تاريخ الإرجاع: </strong>
                  <span>{activeSalesReturn.return_date}</span>
                </div>
                <div>
                  <strong>مرجع الفاتورة الأصلية: </strong>
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    #{activeSalesReturn.original_invoice_number || currentSavedInvoice?.invoice_number || ""}
                  </span>
                </div>
                <div>
                  <strong>طريقة الاسترداد: </strong>
                  <span>{activeSalesReturn.refund_method?.label || "نقداً"}</span>
                </div>
                <div>
                  <strong>العميل: </strong>
                  <span>{activeSalesReturn.customer_name || currentSavedInvoice?.customer_name || "عميل عام"}</span>
                </div>
                {activeSalesReturn.reason && (
                  <div>
                    <strong>سبب الإرجاع: </strong>
                    <span>{activeSalesReturn.reason}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  marginBottom: 16,
                }}
              >
                <thead>
                  <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>الصنف</th>
                    <th style={{ padding: "6px 8px", textAlign: "center" }}>الكمية المرتجعة</th>
                    <th style={{ padding: "6px 8px", textAlign: "left" }}>سعر الوحدة</th>
                    <th style={{ padding: "6px 8px", textAlign: "left" }}>الضريبة 15%</th>
                    <th style={{ padding: "6px 8px", textAlign: "left" }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSalesReturn.lines?.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "6px 8px" }}>
                        <div style={{ fontWeight: 700 }}>{line.item_name_ar || `صنف #${line.item_id}`}</div>
                        {line.item_sku && (
                          <span style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>
                            {line.item_sku}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 800 }}>
                        {line.quantity} {line.unit_name}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "left", fontFamily: "monospace" }}>
                        {money(line.unit_price)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "left", fontFamily: "monospace", color: "#0284c7" }}>
                        {money(line.tax_amount)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "left", fontFamily: "monospace", fontWeight: 700 }}>
                        {money(line.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  borderTop: "1px dashed #cbd5e1",
                  paddingTop: 10,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>المجموع قبل الضريبة:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    {money(activeSalesReturn.subtotal)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>ضريبة القيمة المضافة (15%):</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0284c7" }}>
                    {money(activeSalesReturn.tax_amount)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 15,
                    fontWeight: 900,
                    color: "#b45309",
                    background: "#fffbeb",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #fde68a",
                  }}
                >
                  <span>إجمالي المبلغ المسترد:</span>
                  <span style={{ fontFamily: "monospace" }}>{money(activeSalesReturn.total_amount)}</span>
                </div>
              </div>

              {/* ZATCA QR Code */}
              <div style={{ textAlign: "center", marginTop: 10 }}>
                {returnQrCodeUrl ? (
                  <img
                    src={returnQrCodeUrl}
                    alt="ZATCA QR Code"
                    style={{
                      width: 120,
                      height: 120,
                      margin: "0 auto",
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 11, color: "#64748b" }}>رمز ZATCA الإلكتروني</div>
                )}
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                  إشعار دائن صادر عن نظام ميزان المحاسبي
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Center Screen Luxury Alert Modal */}
      <AlertModal
        isOpen={centerAlert.isOpen}
        onClose={() => setCenterAlert((prev) => ({ ...prev, isOpen: false }))}
        type={centerAlert.type}
        title={centerAlert.title}
        message={centerAlert.message}
        detail={centerAlert.detail}
        actionText="حسناً، فهمت"
      />

      {/* Centered Floating Notification Pill */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 28,
            left: "50%",
            transform: "translateX(-50%)",
            background:
              toast.type === "error"
                ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                : toast.type === "info"
                ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
                : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            color: "#ffffff",
            padding: "14px 28px",
            borderRadius: "50px",
            fontSize: 14,
            fontWeight: 800,
            boxShadow: "0 20px 40px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "centerDrop 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            direction: "rtl",
            maxWidth: "90%",
          }}
        >
          <Sparkles size={18} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
