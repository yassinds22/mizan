import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { productsApi, Item, ItemCategory, UnitOfMeasure, CreateItemPayload } from "@/api/products";
import { Sparkles, RefreshCw, Package, Tag, Layers, DollarSign, Box } from "lucide-react";

interface QuickItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: Item) => void;
  initialName?: string;
}

export const QuickItemModal: React.FC<QuickItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialName = "",
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookups
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Form Fields
  const [nameAr, setNameAr] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [baseUomId, setBaseUomId] = useState<number | "">("");
  const [storageCondition, setStorageCondition] = useState<"ambient" | "chilled" | "frozen">("ambient");
  const [costPrice, setCostPrice] = useState<number | "">("");
  const [sellingPrice, setSellingPrice] = useState<number | "">("");

  // Helper to generate unique SKU
  const generateSku = () => {
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `ITM-${Date.now().toString().slice(-4)}${randomPart}`;
  };

  // Load lookups when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setNameAr(initialName.trim());
    setSku(generateSku());
    setBarcode("");
    setCostPrice("");
    setSellingPrice("");
    setStorageCondition("ambient");
    setError(null);

    setLoadingLookups(true);
    Promise.all([productsApi.getCategories(), productsApi.getUnits()])
      .then(([cats, uoms]) => {
        setCategories(cats);
        setUnits(uoms);
        if (cats.length > 0) {
          setCategoryId(cats[0].id);
        }
        if (uoms.length > 0) {
          setBaseUomId(uoms[0].id);
        }
      })
      .catch((err) => {
        console.error("Error loading item lookups:", err);
      })
      .finally(() => {
        setLoadingLookups(false);
      });
  }, [isOpen, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameAr.trim()) {
      setError("يرجى إدخال اسم الصنف بالعربية.");
      return;
    }
    if (!sku.trim()) {
      setError("يرجى إدخال كود الصنف (SKU).");
      return;
    }
    if (!categoryId) {
      setError("يرجى اختيار تصنيف الصنف.");
      return;
    }
    if (!baseUomId) {
      setError("يرجى اختيار الوحدة الأساسية.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: CreateItemPayload = {
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim() || undefined,
        name_ar: nameAr.trim(),
        category_id: Number(categoryId),
        base_uom_id: Number(baseUomId),
        storage_condition: storageCondition,
        cost_price: costPrice !== "" ? Number(costPrice) : 0,
        stock_quantity: 0,
        is_active: true,
        units: [
          {
            uom_id: Number(baseUomId),
            conversion_factor: 1,
            is_base_unit: true,
            is_sale_unit: true,
            is_purchase_unit: true,
            barcode: barcode.trim() || undefined,
            prices:
              sellingPrice !== "" && Number(sellingPrice) > 0
                ? [
                    {
                      price_tier: "retail",
                      price: Number(sellingPrice),
                    },
                  ]
                : [],
          },
        ],
      };

      const created = await productsApi.createItem(payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message || "فشل إنشاء الصنف الجديد.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إنشاء صنف جديد سريعاً (Quick Add Item)"
      subtitle="إدخال سريع لبيانات الصنف لإضافته مباشرة لسطور فاتورة الشراء"
      maxWidth="650px"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || loadingLookups}
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 800,
              padding: "0.6rem 1.5rem",
              border: "none",
              borderRadius: "8px",
            }}
          >
            <Sparkles size={16} />
            <span>{submitting ? "جاري الإنشاء..." : "حفظ وإضافة للفاتورة فوراً"}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", direction: "rtl" }}>
        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#b91c1c",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        {/* Name AR */}
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
            اسم الصنف الغذائي بالعربية *
          </label>
          <input
            type="text"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="مثال: شاي الكبوس 250 جم، أرز تايلندي 10 كجم..."
            required
            autoFocus
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "8px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.95rem",
              fontWeight: 600,
            }}
          />
        </div>

        {/* SKU & Barcode Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>كود الصنف (SKU) *</label>
              <button
                type="button"
                onClick={() => setSku(generateSku())}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#059669",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <RefreshCw size={12} /> توليد كود
              </button>
            </div>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="مثال: TEA-250G"
              required
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
              الباركود الدولي (اختياري)
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="امسح الباركود أو اكتبه هنا..."
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontFamily: "monospace",
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        {/* Category & Unit Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
              التصنيف الغذائي *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              disabled={loadingLookups}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
              الوحدة الأساسية *
            </label>
            <select
              value={baseUomId}
              onChange={(e) => setBaseUomId(Number(e.target.value))}
              disabled={loadingLookups}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
              }}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name_ar} {u.symbol ? `(${u.symbol})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Storage Condition & Initial Prices */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
              حالة التخزين
            </label>
            <select
              value={storageCondition}
              onChange={(e) => setStorageCondition(e.target.value as any)}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
              }}
            >
              <option value="ambient">جاف / عادي</option>
              <option value="chilled">مبرد (ثلاجة)</option>
              <option value="frozen">مجمد (فريزر)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
              سعر التكلفة التقديري
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
              سعر البيع (قطاعي)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: "0.6rem 0.85rem",
            backgroundColor: "#f8fafc",
            borderRadius: "6px",
            border: "1px dashed #cbd5e1",
            fontSize: "0.78rem",
            color: "#64748b",
          }}
        >
          💡 <strong>ملاحظة:</strong> بمجرد الحفظ، سيُنشأ الصنف ويُدرج تلقائياً في سطر الفاتورة الحالية لتحديد كميته وسعر شرائه النهائي. ويمكنك لاحقاً إدارة تعدد الوحدات والباركودات المتقدمة من شاشة المخزون والأصناف.
        </div>
      </form>
    </Modal>
  );
};
