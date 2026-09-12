import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Send,
  Printer,
  XCircle,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Building,
  User,
  Calendar,
  FileText,
  Boxes,
  Sparkles,
} from "lucide-react";
import { AlertModal, AlertType } from "@/components/ui/AlertModal";
import { Modal } from "@/components/ui/Modal";
import { money } from "@/utils/formatters";
import { productsApi, Item, ItemUnit } from "@/api/products";
import { purchasesApi, Supplier, PurchaseInvoice } from "@/api/purchases";
import { SupplierModal } from "../components/SupplierModal";

interface PurchaseLineState {
  id: string;
  item_id: number;
  item_name_ar: string;
  item_sku: string;
  item_unit_id: number | null;
  unit_name: string;
  conversion_factor: number;
  quantity: number | "";
  unit_price: number | "";
  discount_amount: number;
  tax_rate: number;
  available_units: ItemUnit[];
}

interface PurchaseDocPageProps {
  onBack: () => void;
  purchaseIdToView?: number | null;
}

export const PurchaseDocPage: React.FC<PurchaseDocPageProps> = ({
  onBack,
  purchaseIdToView,
}) => {
  // Master data
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<{ id: number; name_ar: string }[]>([]);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [branchId, setBranchId] = useState<number>(1);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | "cash">("cash");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit" | "bank_transfer">("cash");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLineState[]>([]);

  // Modals & UI states
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productPickerSearch, setProductPickerSearch] = useState("");
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [currentSavedPurchase, setCurrentSavedPurchase] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "info" | "error" } | null>(null);

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

  const showCenterAlert = (message: string, type: AlertType = "error", customTitle?: string, customDetail?: string) => {
    setCenterAlert({
      isOpen: true,
      type,
      title: customTitle || (type === "error" ? "تنبيه في فاتورة المشتريات" : "إشعار من النظام"),
      message,
      detail: customDetail,
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

  // Load master data
  useEffect(() => {
    const loadMaster = async () => {
      setLoading(true);
      try {
        const [itemsRes, supRes] = await Promise.all([
          productsApi.getItems({ per_page: 200, is_active: true }),
          purchasesApi.getAllActiveSuppliers(),
        ]);
        setItems(itemsRes.data || []);
        setSuppliers(supRes || []);

        try {
          const bRes = await fetch("/api/v1/core/branches");
          if (bRes.ok) {
            const bJson = await bRes.json();
            const bList = (bJson.data || []).map((b: any) => ({
              id: b.id,
              name_ar: b.name || b.name_ar || `فرع #${b.id}`,
            }));
            setBranches(bList);
            if (bList.length > 0) setBranchId(bList[0].id);
          }
        } catch (e) {}

        if (purchaseIdToView) {
          const inv = await purchasesApi.getInvoice(purchaseIdToView);
          populateInvoice(inv);
        } else {
          // Initialize with first item if empty
          if (itemsRes.data && itemsRes.data.length > 0 && lines.length === 0) {
            addNewLineWithItem(itemsRes.data[0]);
          }
        }
      } catch (err: any) {
        showToast(err.message || "فشل تحميل البيانات الأساسية", "error");
      } finally {
        setLoading(false);
      }
    };

    loadMaster();
  }, [purchaseIdToView]);

  const populateInvoice = (inv: PurchaseInvoice) => {
    setCurrentSavedPurchase(inv);
    setInvoiceNumber(inv.invoice_number);
    setSupplierInvoiceNumber(inv.supplier_invoice_number || "");
    setInvoiceDate(inv.invoice_date);
    if (inv.due_date) setDueDate(inv.due_date);
    setBranchId(inv.branch_id);
    setSelectedSupplierId(inv.supplier_id || "cash");
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
          discount_amount: l.discount_amount,
          tax_rate: l.tax_rate,
          available_units: [],
        }))
      );
    }
  };

  const addNewLineWithItem = (item: Item, targetUnit?: ItemUnit) => {
    const baseUomName = item.base_uom?.name_ar || "حبة";
    const availableUnits: ItemUnit[] = [
      {
        id: -1,
        item_id: item.id,
        uom_id: item.base_uom_id,
        uom: item.base_uom,
        conversion_factor: 1,
        is_base_unit: true,
        prices: [],
      },
      ...(item.units || []).filter((u) => !u.is_base_unit),
    ];

    const chosenUnit = targetUnit || availableUnits[0];
    const unitName = chosenUnit.uom?.name_ar || (chosenUnit.is_base_unit ? baseUomName : "وحدة");
    const factor = Number(chosenUnit.conversion_factor) || 1;
    const initialPrice = Number(item.cost_price || 0) * factor;

    const newLine: PurchaseLineState = {
      id: String(Date.now() + Math.random()),
      item_id: item.id,
      item_name_ar: item.name_ar,
      item_sku: item.sku,
      item_unit_id: chosenUnit.id && chosenUnit.id > 0 ? chosenUnit.id : null,
      unit_name: unitName,
      conversion_factor: factor,
      quantity: 1,
      unit_price: initialPrice,
      discount_amount: 0,
      tax_rate: 15.0,
      available_units: availableUnits,
    };

    setLines((prev) => [...prev, newLine]);
  };

  const handleUnitChange = (lineId: string, unitIdStr: string) => {
    const uId = Number(unitIdStr);
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const selected = l.available_units.find((u) => u.id === uId);
        if (!selected) return l;

        const factor = Number(selected.conversion_factor) || 1;
        const basePrice = Number(l.unit_price || 0) / (l.conversion_factor || 1);
        const newUnitPrice = round(basePrice * factor, 4);

        return {
          ...l,
          item_unit_id: selected.id && selected.id > 0 ? selected.id : null,
          unit_name: selected.uom?.name_ar || "وحدة",
          conversion_factor: factor,
          unit_price: newUnitPrice,
        };
      })
    );
  };

  const round = (val: number, decimals: number = 2) => {
    return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  // Calculations
  const calculations = useMemo(() => {
    let grossSubtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    lines.forEach((l) => {
      const q = Number(l.quantity) || 0;
      const p = Number(l.unit_price) || 0;
      const d = Number(l.discount_amount) || 0;
      const r = Number(l.tax_rate) || 0;

      const lineGross = q * p;
      const lineNet = Math.max(0, lineGross - d);
      const lineTax = lineNet * (r / 100);

      grossSubtotal += lineGross;
      totalDiscount += d;
      totalTax += lineTax;
    });

    const netSubtotal = Math.max(0, grossSubtotal - totalDiscount);
    const netTotal = netSubtotal + totalTax;

    return {
      grossSubtotal,
      totalDiscount,
      netSubtotal,
      totalTax,
      netTotal,
    };
  }, [lines]);

  const selectedSupplier = useMemo(() => {
    if (selectedSupplierId === "cash") return null;
    return suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [selectedSupplierId, suppliers]);

  // Save / Post handler
  const handleSaveInvoice = async (postImmediately: boolean) => {
    if (lines.length === 0) {
      showCenterAlert("يرجى إضافة صنف واحد على الأقل في فاتورة الشراء.", "warning", "الفاتورة فارغة");
      return;
    }

    const invalidQty = lines.find((l) => !l.quantity || Number(l.quantity) <= 0);
    if (invalidQty) {
      showCenterAlert(
        `الكمية المحددة للصنف [${invalidQty.item_name_ar}] غير صالحة. يجب أن تكون أكبر من الصفر.`,
        "warning"
      );
      return;
    }

    if (paymentMethod === "credit" && selectedSupplierId === "cash") {
      showCenterAlert("في الشراء الآجل، يجب اختيار المورد من الدليل لضبط رصيده وحساباته.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        invoice_number: invoiceNumber || undefined,
        supplier_invoice_number: supplierInvoiceNumber || undefined,
        invoice_date: invoiceDate,
        due_date: paymentMethod === "credit" ? dueDate : invoiceDate,
        branch_id: branchId,
        supplier_id: selectedSupplier ? selectedSupplier.id : null,
        supplier_name: selectedSupplier ? selectedSupplier.name_ar : "مشتريات نقدية عامة",
        supplier_tax_number: selectedSupplier?.tax_number || undefined,
        payment_method: paymentMethod,
        notes: notes || undefined,
        post_immediately: postImmediately,
        lines: lines.map((l) => ({
          item_id: l.item_id,
          item_unit_id: l.item_unit_id || undefined,
          unit_name: l.unit_name,
          conversion_factor: l.conversion_factor,
          quantity: Number(l.quantity) || 1,
          unit_price: Number(l.unit_price) || 0,
          discount_amount: Number(l.discount_amount) || 0,
          tax_rate: Number(l.tax_rate) || 15.0,
        })),
      };

      const saved = await purchasesApi.createInvoice(payload);
      setCurrentSavedPurchase(saved);
      setInvoiceNumber(saved.invoice_number);

      if (postImmediately) {
        showCenterAlert(
          `تم حفظ واعتماد وترحيل فاتورة المشتريات رقم [${saved.invoice_number}] بنجاح! زاد رصيد المخزون للأصناف وتولد القيد المحاسبي وتم تحديث آخر تكلفة شراء.`,
          "success",
          "تم ترحيل فاتورة المشتريات بنجاح 🎉",
          `الإجمالي المطلوب: ${money(saved.total_amount)} شامل ضريبة المدخلات 15%`
        );
      } else {
        showCenterAlert(
          `تم حفظ فاتورة المشتريات كمسودة برقم [${saved.invoice_number}]. يمكنك مراجعتها وترحيلها لاحقاً.`,
          "info",
          "تم حفظ المسودة بنجاح ✅"
        );
      }
    } catch (err: any) {
      showCenterAlert(err.message || "فشل حفظ فاتورة المشتريات", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Handler
  const handleCancelInvoice = async () => {
    if (!currentSavedPurchase) return;
    if (!confirm(`هل أنت متأكد من رغبتك في إلغاء فاتورة المشتريات رقم [${currentSavedPurchase.invoice_number}]؟ سيتم خصم الكميات المستلمة من المخزون وعكس القيد المحاسبي.`)) {
      return;
    }

    setSubmitting(true);
    try {
      const cancelled = await purchasesApi.cancelInvoice(currentSavedPurchase.id, "إلغاء من قبل المستخدم");
      setCurrentSavedPurchase(cancelled);
      showCenterAlert(
        `تم إلغاء فاتورة المشتريات رقم [${cancelled.invoice_number}] بنجاح، وخُصمت الكميات المستلمة من المخزون وتولد القيد العكسي.`,
        "info",
        "تم إلغاء الفاتورة"
      );
    } catch (err: any) {
      showCenterAlert(err.message || "تعذر إلغاء فاتورة المشتريات", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNew = () => {
    setCurrentSavedPurchase(null);
    setInvoiceNumber("");
    setSupplierInvoiceNumber("");
    setNotes("");
    if (items.length > 0) {
      setLines([]);
      addNewLineWithItem(items[0]);
    }
  };

  const isReadOnly = currentSavedPurchase?.status.value === "posted" || currentSavedPurchase?.status.value === "cancelled";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: "100%", margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      {/* 1. Header Action Bar */}
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
            }}
          >
            <ArrowRight size={16} /> قائمة المشتريات
          </button>

          <div style={{ height: 26, width: 1, background: "var(--line, #d5e0d8)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "#eff6ff",
                color: "#2563eb",
                display: "grid",
                placeItems: "center",
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--ink, #14231c)" }}>
                  {currentSavedPurchase
                    ? `فاتورة مشتريات #${currentSavedPurchase.invoice_number}`
                    : "إصدار فاتورة مشتريات واستلام بضاعة"}
                </h2>
                {currentSavedPurchase && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "2px 10px",
                      borderRadius: 20,
                      background:
                        currentSavedPurchase.status.value === "posted"
                          ? "#ecfdf5"
                          : currentSavedPurchase.status.value === "draft"
                          ? "#fef3c7"
                          : "#fef2f2",
                      color:
                        currentSavedPurchase.status.value === "posted"
                          ? "#059669"
                          : currentSavedPurchase.status.value === "draft"
                          ? "#d97706"
                          : "#dc2626",
                    }}
                  >
                    {currentSavedPurchase.status.label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted, #7a8b82)", marginTop: 2 }}>
                تغذية المخزون وتوليد القيد المحاسبي وحساب ضريبة المدخلات 15%
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowPrint(true)}
            style={{ height: 40, padding: "0 14px", fontSize: 13, fontWeight: 700 }}
          >
            <Printer size={15} /> معاينة وطباعة
          </button>

          {currentSavedPurchase && (
            <button
              type="button"
              className="btn"
              onClick={handleStartNew}
              style={{
                height: 40,
                padding: "0 16px",
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 800,
                borderRadius: 8,
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <Plus size={16} /> فاتورة جديدة
            </button>
          )}

          {!isReadOnly && (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handleSaveInvoice(false)}
                disabled={submitting}
                style={{ height: 40, padding: "0 14px", fontSize: 13, fontWeight: 700, background: "#f8fafc" }}
              >
                <Save size={15} /> {submitting ? "حفظ..." : "حفظ كمسودة"}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveInvoice(true)}
                disabled={submitting}
                style={{
                  height: 40,
                  padding: "0 18px",
                  background: "linear-gradient(145deg, var(--brand-mid, #2f8f6d), var(--brand, #1a5c45))",
                  fontSize: 13,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Send size={15} /> {submitting ? "جارِ الترحيل..." : "حفظ وترحيل فوري"}
              </button>
            </>
          )}

          {currentSavedPurchase?.status.value === "posted" && (
            <button
              type="button"
              className="btn"
              onClick={handleCancelInvoice}
              disabled={submitting}
              style={{
                height: 40,
                padding: "0 14px",
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
                fontSize: 13,
                fontWeight: 800,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
              title="إلغاء الفاتورة وخصم الكميات من المخزون وعكس القيد"
            >
              <XCircle size={15} /> إلغاء الفاتورة
            </button>
          )}
        </div>
      </div>

      {/* 2. Form Meta Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          background: "#ffffff",
          padding: "16px 20px",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <label className="label">
          <span>المورد *</span>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value === "cash" ? "cash" : Number(e.target.value))}
              disabled={isReadOnly}
              style={{ flex: 1 }}
            >
              <option value="cash">مشتريات نقدية عامة (بدون مورد)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_ar} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
            {!isReadOnly && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowAddSupplierModal(true)}
                title="إضافة مورد جديد فوري"
                style={{ padding: "0 10px", height: 38 }}
              >
                <Plus size={15} />
              </button>
            )}
          </div>
        </label>

        <label className="label">
          <span>رقم فاتورة المورد الورقية</span>
          <input
            type="text"
            placeholder="مثال: INV-99214"
            value={supplierInvoiceNumber}
            onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
            disabled={isReadOnly}
          />
        </label>

        <label className="label">
          <span>طريقة السداد *</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            disabled={isReadOnly}
          >
            <option value="cash">نقدي (الصندوق)</option>
            <option value="credit">آجل (ذمم الموردين)</option>
            <option value="bank_transfer">شبكة / تحويل بنكي</option>
          </select>
        </label>

        <label className="label">
          <span>تاريخ الفاتورة *</span>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            disabled={isReadOnly}
          />
        </label>

        {paymentMethod === "credit" && (
          <label className="label">
            <span>تاريخ الاستحقاق</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isReadOnly}
            />
          </label>
        )}

        <label className="label">
          <span>الفرع / المستودع المستلم</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(Number(e.target.value))}
            disabled={isReadOnly}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_ar}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 3. Items Lines Table */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Boxes size={18} color="#059669" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>أصناف وبضائع الشراء</h3>
            <span style={{ fontSize: 12, color: "#64748b" }}>({lines.length} صنف)</span>
          </div>

          {!isReadOnly && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowProductPicker(true)}
              style={{ height: 34, padding: "0 12px", fontSize: 12, fontWeight: 700 }}
            >
              <Plus size={14} /> إضافة صنف من الكتالوج
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table className="data" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>الصنف الغذائي</th>
                <th style={{ width: 140 }}>الوحدة المستلمة</th>
                <th style={{ width: 100 }}>الكمية</th>
                <th style={{ width: 120 }}>سعر شراء الوحدة</th>
                <th style={{ width: 100 }}>الخصم (ر.س)</th>
                <th style={{ width: 80 }}>الضريبة %</th>
                <th className="amount" style={{ width: 110 }}>الصافي قبل الضريبة</th>
                <th className="amount" style={{ width: 100 }}>مبلغ الضريبة</th>
                <th className="amount" style={{ width: 120 }}>الإجمالي</th>
                {!isReadOnly && <th style={{ width: 50 }}></th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, index) => {
                const q = Number(l.quantity) || 0;
                const p = Number(l.unit_price) || 0;
                const d = Number(l.discount_amount) || 0;
                const gross = q * p;
                const net = Math.max(0, gross - d);
                const tax = net * (Number(l.tax_rate) / 100);
                const tot = net + tax;

                return (
                  <tr key={l.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>{l.item_name_ar}</div>
                      {l.item_sku && (
                        <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                          SKU: {l.item_sku}
                        </div>
                      )}
                    </td>
                    <td>
                      {l.available_units.length > 1 && !isReadOnly ? (
                        <select
                          value={l.item_unit_id || -1}
                          onChange={(e) => handleUnitChange(l.id, e.target.value)}
                          style={{ height: 32, padding: "0 6px", fontSize: 12 }}
                        >
                          {l.available_units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.uom?.name_ar || (u.is_base_unit ? "الوحدة الأساسية" : "وحدة")} (×{u.conversion_factor})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700 }}>
                          {l.unit_name} {l.conversion_factor > 1 ? `(×${l.conversion_factor})` : ""}
                        </span>
                      )}
                    </td>
                    <td>
                      {isReadOnly ? (
                        <span style={{ fontWeight: 800 }}>{l.quantity}</span>
                      ) : (
                        <input
                          type="number"
                          min={0.01}
                          step="any"
                          value={l.quantity}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((item) =>
                                item.id === l.id
                                  ? { ...item, quantity: e.target.value === "" ? "" : Number(e.target.value) }
                                  : item
                              )
                            )
                          }
                          style={{ width: 80, height: 32, textAlign: "center", fontWeight: 700 }}
                        />
                      )}
                    </td>
                    <td>
                      {isReadOnly ? (
                        <span style={{ fontFamily: "monospace" }}>{money(Number(l.unit_price))}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={l.unit_price}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((item) =>
                                item.id === l.id
                                  ? { ...item, unit_price: e.target.value === "" ? "" : Number(e.target.value) }
                                  : item
                              )
                            )
                          }
                          style={{ width: 95, height: 32, textAlign: "left", fontFamily: "monospace" }}
                        />
                      )}
                    </td>
                    <td>
                      {isReadOnly ? (
                        <span style={{ fontFamily: "monospace" }}>{money(l.discount_amount)}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={l.discount_amount}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((item) =>
                                item.id === l.id
                                  ? { ...item, discount_amount: Number(e.target.value) || 0 }
                                  : item
                              )
                            )
                          }
                          style={{ width: 80, height: 32, textAlign: "left", fontFamily: "monospace" }}
                        />
                      )}
                    </td>
                    <td>
                      {isReadOnly ? (
                        <span>{l.tax_rate}%</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={l.tax_rate}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((item) =>
                                item.id === l.id
                                  ? { ...item, tax_rate: Number(e.target.value) || 0 }
                                  : item
                              )
                            )
                          }
                          style={{ width: 65, height: 32, textAlign: "center" }}
                        />
                      )}
                    </td>
                    <td className="amount" style={{ fontFamily: "monospace" }}>
                      {money(net)}
                    </td>
                    <td className="amount" style={{ fontFamily: "monospace", color: "#2563eb" }}>
                      {money(tax)}
                    </td>
                    <td className="amount" style={{ fontFamily: "monospace", fontWeight: 800, color: "#059669" }}>
                      {money(tot)}
                    </td>
                    {!isReadOnly && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setLines((prev) => prev.filter((item) => item.id !== l.id))}
                          style={{ color: "#dc2626", height: 30, width: 30, padding: 0 }}
                          title="حذف السطر"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Bottom Totals and Notes */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <label className="label">
            <span>ملاحظات وبيانات الاستلام</span>
            <textarea
              rows={4}
              placeholder="سجل أي ملاحظات خاصة بالاستلام أو فحص الجودة أو سند التوصيل..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isReadOnly}
            />
          </label>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "18px 22px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748b" }}>
            <span>إجمالي البضاعة قبل الخصم:</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{money(calculations.grossSubtotal)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#b45309" }}>
            <span>إجمالي الخصم التجاري:</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>- {money(calculations.totalDiscount)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#0f172a" }}>
            <span>الصافي الخاضع للضريبة:</span>
            <span style={{ fontFamily: "monospace", fontWeight: 800 }}>{money(calculations.netSubtotal)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#2563eb" }}>
            <span>ضريبة القيمة المضافة المدخلات (15%):</span>
            <span style={{ fontFamily: "monospace", fontWeight: 800 }}>+ {money(calculations.totalTax)}</span>
          </div>

          <div
            style={{
              marginTop: 6,
              paddingTop: 12,
              borderTop: "2px dashed #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>الإجمالي النهائي المطلوب:</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#059669", fontFamily: "monospace" }}>
              {money(calculations.netTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Product Picker Modal */}
      <Modal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        title="اختيار صنف غذائي من الكتالوج"
        subtitle="ابحث باسم الصنف أو الباركود لإضافته لفاتورة الشراء"
        maxWidth="680px"
      >
        <div style={{ direction: "rtl", display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="text"
            placeholder="بحث باسم الصنف أو SKU..."
            value={productPickerSearch}
            onChange={(e) => setProductPickerSearch(e.target.value)}
            autoFocus
          />

          <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {items
              .filter(
                (it) =>
                  !productPickerSearch ||
                  it.name_ar.toLowerCase().includes(productPickerSearch.toLowerCase()) ||
                  it.sku.toLowerCase().includes(productPickerSearch.toLowerCase())
              )
              .map((it) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>{it.name_ar}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      SKU: {it.sku} · المخزون الحالي: {it.stock_quantity ?? 0}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ height: 32, padding: "0 12px", fontSize: 12, background: "#059669" }}
                    onClick={() => {
                      addNewLineWithItem(it);
                      setShowProductPicker(false);
                      showToast(`تمت إضافة: ${it.name_ar}`);
                    }}
                  >
                    <Plus size={13} /> إضافة
                  </button>
                </div>
              ))}
          </div>
        </div>
      </Modal>

      {/* Quick Add Supplier Modal */}
      <SupplierModal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        onSuccess={(newSup) => {
          setSuppliers((prev) => [newSup, ...prev]);
          setSelectedSupplierId(newSup.id);
          showToast(`تم تسجيل المورد [${newSup.name_ar}] واختياره فوراً!`);
        }}
      />

      {/* Print Preview Modal */}
      <Modal
        isOpen={showPrint}
        onClose={() => setShowPrint(false)}
        title={`معاينة طباعة — فاتورة مشتريات واستلام #${invoiceNumber || "مسودة"}`}
        subtitle="مستند رسمي لاستلام بضاعة وفاتورة شراء ومطابقة المورد"
        footer={
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowPrint(false)}>
              إغلاق
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.print()}
              style={{ background: "#059669" }}
            >
              <Printer size={15} /> طباعة الآن
            </button>
          </div>
        }
      >
        <div style={{ padding: "16px 20px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>ميزان لتجارة وتوزيع المواد الغذائية</h2>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>سند استلام بضاعة ومشتريات (Goods Receiving Note)</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, marginBottom: 16, padding: "8px 12px", background: "#f8fafc", borderRadius: 6 }}>
            <div><strong>رقم الفاتورة: </strong> {invoiceNumber || "—"}</div>
            <div><strong>فاتورة المورد: </strong> {supplierInvoiceNumber || "—"}</div>
            <div><strong>المورد: </strong> {selectedSupplier ? selectedSupplier.name_ar : "مشتريات نقدية عامة"}</div>
            <div><strong>تاريخ الاستلام: </strong> {invoiceDate}</div>
            <div><strong>طريقة السداد: </strong> {paymentMethod === "credit" ? "آجل" : paymentMethod === "cash" ? "نقدي" : "تحويل بنكي"}</div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 14 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>الصنف</th>
                <th style={{ padding: "6px 8px", textAlign: "center" }}>الكمية</th>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>سعر الوحدة</th>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>الخصم</th>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>الصافي</th>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const q = Number(l.quantity) || 0;
                const p = Number(l.unit_price) || 0;
                const d = Number(l.discount_amount) || 0;
                const net = Math.max(0, q * p - d);
                const tot = net * 1.15;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "6px 8px" }}>{l.item_name_ar}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>{l.quantity} {l.unit_name}</td>
                    <td style={{ padding: "6px 8px", textAlign: "left" }}>{money(p)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "left" }}>{money(d)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "left" }}>{money(net)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>{money(tot)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 900, borderTop: "2px dashed #cbd5e1", paddingTop: 10 }}>
            <span>الإجمالي النهائي شامل الضريبة:</span>
            <span style={{ color: "#059669" }}>{money(calculations.netTotal)}</span>
          </div>
        </div>
      </Modal>

      {/* Luxury Alert Modal */}
      <AlertModal
        isOpen={centerAlert.isOpen}
        onClose={() => setCenterAlert((prev) => ({ ...prev, isOpen: false }))}
        type={centerAlert.type}
        title={centerAlert.title}
        message={centerAlert.message}
        detail={centerAlert.detail}
        actionText="حسناً، فهمت"
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 28,
            left: "50%",
            transform: "translateX(-50%)",
            background:
              toast.type === "error"
                ? "#dc2626"
                : toast.type === "info"
                ? "#2563eb"
                : "#059669",
            color: "#ffffff",
            padding: "12px 26px",
            borderRadius: "50px",
            fontSize: 14,
            fontWeight: 800,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            direction: "rtl",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}
        >
          <Sparkles size={16} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
