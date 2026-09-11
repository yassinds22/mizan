import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Barcode,
  Layers,
  Thermometer,
  Snowflake,
  Box,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  ArrowRightLeft,
  DollarSign,
  Tag,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  productsApi,
  Item,
  ItemCategory,
  UnitOfMeasure,
  CreateItemPayload,
} from "@/api/products";
import { money } from "@/utils/formatters";

interface InventoryPageProps {
  onOpenItem?: (itemId?: number) => void;
}

const STORAGE_BADGES: Record<
  string,
  { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
> = {
  ambient: {
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#d97706",
    border: "rgba(245, 158, 11, 0.3)",
    icon: <Box size={13} />,
    label: "جاف / عادي",
  },
  chilled: {
    bg: "rgba(14, 165, 233, 0.12)",
    text: "#0284c7",
    border: "rgba(14, 165, 233, 0.3)",
    icon: <Thermometer size={13} />,
    label: "مبرد (2-5°م)",
  },
  frozen: {
    bg: "rgba(99, 102, 241, 0.12)",
    text: "#6366f1",
    border: "rgba(99, 102, 241, 0.3)",
    icon: <Snowflake size={13} />,
    label: "مجمد (-18°م)",
  },
};

export const InventoryPage: React.FC<InventoryPageProps> = ({ onOpenItem }) => {
  // Master state
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStorage, setSelectedStorage] = useState<string>("all");
  const [perishableFilter, setPerishableFilter] = useState<string>("all");

  // Barcode Test Scanner tool
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanBarcode, setScanBarcode] = useState("");
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const [scanSearching, setScanSearching] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Modal State (Create / Edit Item)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formSku, setFormSku] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formNameAr, setFormNameAr] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formBaseUomId, setFormBaseUomId] = useState<string>("");
  const [formStorageCondition, setFormStorageCondition] = useState<"ambient" | "chilled" | "frozen">("ambient");
  const [formIsPerishable, setFormIsPerishable] = useState(true);
  const [formShelfLifeDays, setFormShelfLifeDays] = useState<number | "">("");
  const [formReorderLevel, setFormReorderLevel] = useState<number>(10);
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formStockQuantity, setFormStockQuantity] = useState<number>(0);

  // Packaging Units Form State
  const [formUnits, setFormUnits] = useState<
    {
      id?: number;
      uom_id: number;
      conversion_factor: number;
      barcode: string;
      is_base_unit: boolean;
      retail_price: number;
      wholesale_price: number;
    }[]
  >([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes, uomsRes] = await Promise.all([
        productsApi.getItems({ per_page: 100 }),
        productsApi.getCategories(),
        productsApi.getUnits(),
      ]);
      setItems(itemsRes.data);
      setCategories(catsRes);
      setUnits(uomsRes);
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered rows
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.sku.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        item.name_ar.toLowerCase().includes(q) ||
        (item.name_en && item.name_en.toLowerCase().includes(q)) ||
        item.units.some((u) => u.barcode && u.barcode.includes(q));

      const matchCat =
        selectedCategory === "all" || String(item.category_id) === selectedCategory;

      const matchStorage =
        selectedStorage === "all" || item.storage_condition.value === selectedStorage;

      const matchPerishable =
        perishableFilter === "all" ||
        (perishableFilter === "yes" && item.is_perishable) ||
        (perishableFilter === "no" && !item.is_perishable);

      return matchSearch && matchCat && matchStorage && matchPerishable;
    });
  }, [items, searchQuery, selectedCategory, selectedStorage, perishableFilter]);

  // KPIs
  const stats = useMemo(() => {
    const total = items.length;
    const chilledOrFrozen = items.filter(
      (i) => i.storage_condition.value === "chilled" || i.storage_condition.value === "frozen"
    ).length;
    const perishable = items.filter((i) => i.is_perishable).length;
    const totalUnitsCount = items.reduce((sum, i) => sum + (i.units?.length || 1), 0);
    return { total, chilledOrFrozen, perishable, totalUnitsCount };
  }, [items]);

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode("create");
    setEditingItemId(null);
    setFormError(null);
    setFormSku("");
    setFormBarcode("");
    setFormNameAr("");
    setFormNameEn("");
    setFormCategoryId(categories[0]?.id ? String(categories[0].id) : "");
    const baseUom = units.find((u) => u.code === "PCS") || units[0];
    setFormBaseUomId(baseUom?.id ? String(baseUom.id) : "");
    setFormStorageCondition("ambient");
    setFormIsPerishable(true);
    setFormShelfLifeDays(365);
    setFormReorderLevel(10);
    setFormCostPrice(0);
    setFormStockQuantity(0);

    // Initial Base Unit
    if (baseUom) {
      setFormUnits([
        {
          uom_id: baseUom.id,
          conversion_factor: 1,
          barcode: "",
          is_base_unit: true,
          retail_price: 0,
          wholesale_price: 0,
        },
      ]);
    } else {
      setFormUnits([]);
    }

    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: Item) => {
    setModalMode("edit");
    setEditingItemId(item.id);
    setFormError(null);
    setFormSku(item.sku);
    setFormBarcode(item.barcode || "");
    setFormNameAr(item.name_ar);
    setFormNameEn(item.name_en || "");
    setFormCategoryId(String(item.category_id));
    setFormBaseUomId(String(item.base_uom_id));
    setFormStorageCondition(item.storage_condition.value);
    setFormIsPerishable(item.is_perishable);
    setFormShelfLifeDays(item.shelf_life_days || "");
    setFormReorderLevel(item.reorder_level);
    setFormCostPrice(item.cost_price);
    setFormStockQuantity(Number(item.stock_quantity ?? 0));

    // Map existing units & prices
    const mappedUnits = (item.units || []).map((u) => {
      const retail = u.prices?.find((p) => {
        const val = typeof p.price_tier === "object" ? (p.price_tier as any)?.value : p.price_tier;
        return val === "retail";
      })?.price || 0;
      const wholesale = u.prices?.find((p) => {
        const val = typeof p.price_tier === "object" ? (p.price_tier as any)?.value : p.price_tier;
        return val === "wholesale";
      })?.price || 0;
      return {
        id: u.id,
        uom_id: u.uom_id,
        conversion_factor: u.conversion_factor,
        barcode: u.barcode || "",
        is_base_unit: u.is_base_unit,
        retail_price: retail,
        wholesale_price: wholesale,
      };
    });

    setFormUnits(mappedUnits);
    setModalOpen(true);
  };

  // Handle Unit Row Add
  const handleAddUnitRow = () => {
    const available = units.find((u) => !formUnits.some((fu) => fu.uom_id === u.id)) || units[0];
    if (!available) return;

    setFormUnits([
      ...formUnits,
      {
        uom_id: available.id,
        conversion_factor: 12,
        barcode: "",
        is_base_unit: false,
        retail_price: 0,
        wholesale_price: 0,
      },
    ]);
  };

  const handleRemoveUnitRow = (index: number) => {
    const row = formUnits[index];
    if (row.is_base_unit) {
      alert("لا يمكن حذف الوحدة الأساسية للصنف.");
      return;
    }
    setFormUnits(formUnits.filter((_, i) => i !== index));
  };

  // Submit Modal
  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku.trim() || !formNameAr.trim() || !formCategoryId || !formBaseUomId) {
      setFormError("يرجى تعبئة الحقول الإلزامية (الكود، الاسم العربي، التصنيف، الوحدة الأساسية)");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      // Build units and nested prices
      const formattedUnits = formUnits.map((u) => {
        const rowPrices: { id?: number; price_tier: string; price: number; min_quantity: number }[] = [];

        rowPrices.push({
          price_tier: "retail",
          price: Number(u.retail_price) > 0 ? Number(u.retail_price) : 0,
          min_quantity: 1,
        });

        rowPrices.push({
          price_tier: "wholesale",
          price: Number(u.wholesale_price) > 0 ? Number(u.wholesale_price) : 0,
          min_quantity: 1,
        });

        return {
          id: u.id,
          uom_id: u.uom_id,
          conversion_factor: Number(u.conversion_factor) || 1,
          barcode: u.barcode.trim() || undefined,
          is_base_unit: u.is_base_unit,
          prices: rowPrices,
        };
      });

      const payload: CreateItemPayload = {
        sku: formSku.trim().toUpperCase(),
        barcode: formBarcode.trim() || undefined,
        name_ar: formNameAr.trim(),
        name_en: formNameEn.trim() || undefined,
        category_id: Number(formCategoryId),
        base_uom_id: Number(formBaseUomId),
        storage_condition: formStorageCondition,
        is_perishable: formIsPerishable,
        shelf_life_days: formShelfLifeDays ? Number(formShelfLifeDays) : undefined,
        reorder_level: Number(formReorderLevel) || 0,
        cost_price: Number(formCostPrice) || 0,
        stock_quantity: Number(formStockQuantity) || 0,
        units: formattedUnits,
      };

      if (modalMode === "create") {
        await productsApi.createItem(payload);
        showToast("تم إضافة الصنف بنجاح!");
      } else if (editingItemId) {
        await productsApi.updateItem(editingItemId, payload);
        showToast("تم تحديث الصنف بنجاح!");
      }

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "فشل حفظ بيانات الصنف.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (item: Item) => {
    if (!confirm(`هل أنت متأكد من حذف الصنف [${item.sku} - ${item.name_ar}]؟`)) {
      return;
    }
    try {
      await productsApi.deleteItem(item.id);
      showToast("تم حذف الصنف بنجاح.");
      fetchData();
    } catch (err: any) {
      showToast(err.message || "فشل حذف الصنف.");
    }
  };

  // Barcode Lookup Test
  const handleBarcodeLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanBarcode.trim()) return;

    setScanSearching(true);
    setScanError(null);
    setScannedResult(null);

    try {
      const res = await productsApi.lookupBarcode(scanBarcode.trim());
      setScannedResult(res);
    } catch (err: any) {
      setScanError(err.message || "لم يتم العثور على أي صنف بهذا الباركود.");
    } finally {
      setScanSearching(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 1. Header & Quick Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Package className="text-emerald-500" size={24} />
            دليل الأصناف والمخزون الغذائي
          </h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: 13 }}>
            إدارة بطاقة الأصناف، التعبئة متعددة الوحدات (حبة / كرتون / شدة)، وشرائح الأسعار مع الربط المحاسبي الآلي
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`btn ${scannerOpen ? "btn-primary" : "btn-ghost"}`}
            onClick={() => {
              setScannerOpen(!scannerOpen);
              setScannedResult(null);
              setScanError(null);
            }}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Barcode size={16} />
            فاحص الباركود
          </button>

          <button
            className="btn btn-ghost"
            onClick={fetchData}
            title="تحديث البيانات"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            تحديث
          </button>

          <button
            className="btn btn-primary"
            onClick={openCreateModal}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={16} />
            صنف جديد
          </button>
        </div>
      </div>

      {/* 2. Interactive Barcode Quick Scanner Box (Simulates physical scanner) */}
      {scannerOpen && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Barcode className="text-emerald-600" size={20} />
              <strong style={{ fontSize: 15 }}>محاكي ماسح الباركود الفوري (Barcode Scanner)</strong>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                — يدعم قراءة باركود الصنف أو باركود الوحدة الفرعية (كالكرتون)
              </span>
            </div>
            <button
              onClick={() => setScannerOpen(false)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleBarcodeLookup} style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                placeholder="امسح أو اكتب الباركود واضغط Enter (مثال: 6281001001002)..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontFamily: "monospace",
                  fontSize: 14,
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={scanSearching}>
              {scanSearching ? "جارِ التحقق..." : "بحث بالباركود"}
            </button>
          </form>

          {scanError && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#dc2626",
                borderRadius: 6,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertCircle size={15} />
              {scanError}
            </div>
          )}

          {scannedResult && (
            <div
              style={{
                marginTop: 12,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: 14,
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      background: "#10b981",
                      color: "#fff",
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    تم التعرف على الصنف
                  </span>
                  <strong style={{ fontSize: 16 }}>{scannedResult.item?.name_ar}</strong>
                  <span style={{ color: "#64748b", fontSize: 13 }}>({scannedResult.item?.sku})</span>
                </div>
                <div style={{ fontSize: 13, color: "#475569", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>التصنيف: <strong>{scannedResult.item?.category?.name_ar}</strong></span>
                  <span>
                    الوحدة المطابقة للباركود:{" "}
                    <strong style={{ color: "#0284c7" }}>
                      {scannedResult.matched_unit?.uom?.name_ar || scannedResult.item?.base_uom?.name_ar}
                      {scannedResult.matched_unit && !scannedResult.matched_unit.is_base_unit && (
                        ` (معامل التحويل: ${scannedResult.matched_unit.conversion_factor})`
                      )}
                    </strong>
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {scannedResult.matched_unit?.prices?.map((p: any) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "6px 12px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#64748b" }}>{p.price_tier?.label}</div>
                    <strong style={{ fontSize: 15, color: "#0f172a" }}>{money(p.price)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. KPI Counters Banner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div className="panel" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: 13 }}>إجمالي بطاقات الأصناف</span>
            <Package size={18} className="text-emerald-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: "#0f172a" }}>{stats.total}</div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: 13 }}>أصناف مبردة ومجمدة (سلسلة تبريد)</span>
            <Snowflake size={18} className="text-sky-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: "#0284c7" }}>
            {stats.chilledOrFrozen}
          </div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: 13 }}>أصناف غذائية ذات صلاحية</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: "#d97706" }}>
            {stats.perishable}
          </div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: 13 }}>إجمالي وحدات التعبئة المسجلة</span>
            <Layers size={18} className="text-purple-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: "#7c3aed" }}>
            {stats.totalUnitsCount}
          </div>
        </div>
      </div>

      {/* 4. Toolbar: Search, Filters */}
      <div className="toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="field" style={{ minWidth: 260 }}>
          <Search size={15} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، SKU، أو الباركود..."
          />
        </div>

        <div className="field">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <select
            value={selectedStorage}
            onChange={(e) => setSelectedStorage(e.target.value)}
          >
            <option value="all">كل شروط التخزين</option>
            <option value="ambient">📦 جاف وعادي</option>
            <option value="chilled">🧊 مبرد (2-5°م)</option>
            <option value="frozen">❄️ مجمد (-18°م)</option>
          </select>
        </div>

        <div className="field">
          <select
            value={perishableFilter}
            onChange={(e) => setPerishableFilter(e.target.value)}
          >
            <option value="all">كل المواد (صلاحية / بدون)</option>
            <option value="yes">أغذية ذات صلاحية (FEFO)</option>
            <option value="no">بدون صلاحية محددة</option>
          </select>
        </div>
      </div>

      {/* 5. Products Table */}
      <section className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>بطاقات الأصناف والوحدات المتعددة</h3>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: 13 }}>
              {filteredItems.length} صنف مطابق لمعايير البحث والفلترة
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 140 }}>SKU / باركود</th>
                <th>اسم الصنف الغذائي</th>
                <th>التصنيف</th>
                <th>شرط التخزين</th>
                <th>رصيد المخزون المتوفر</th>
                <th>وحدات القياس والتعبئة (Multi-UOM)</th>
                <th>سعر التكلفة</th>
                <th>أسعار البيع</th>
                <th>حد الطلب</th>
                <th style={{ width: 90, textAlign: "center" }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 30 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#64748b" }}>
                      <RefreshCw size={18} className="spin" />
                      جارِ تحميل بطاقات الأصناف...
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-note" style={{ textAlign: "center", padding: 30 }}>
                    لا توجد أصناف مطابقة للبحث — يمكنك إضافة صنف جديد عبر الزر أعلاه
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const storageInfo = STORAGE_BADGES[item.storage_condition.value] || STORAGE_BADGES.ambient;

                  return (
                    <tr key={item.id}>
                      {/* SKU & Barcode */}
                      <td>
                        <strong className="amount" style={{ display: "block", color: "#0f172a" }}>
                          {item.sku}
                        </strong>
                        {item.barcode && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#64748b",
                              fontFamily: "monospace",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 2,
                            }}
                          >
                            <Barcode size={12} />
                            {item.barcode}
                          </div>
                        )}
                      </td>

                      {/* Product Name */}
                      <td>
                        <strong style={{ fontSize: 14, color: "#1e293b", display: "block" }}>
                          {item.name_ar}
                        </strong>
                        {item.name_en && (
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>{item.name_en}</span>
                        )}
                        {item.is_perishable && item.shelf_life_days && (
                          <div style={{ fontSize: 11, color: "#d97706", marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                            <Clock size={11} />
                            صلاحية: {item.shelf_life_days} يوم
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            background: "rgba(100, 116, 139, 0.08)",
                            borderRadius: 6,
                            fontSize: 12,
                            color: "#334155",
                            fontWeight: 600,
                          }}
                        >
                          {item.category?.name_ar || "—"}
                        </span>
                      </td>

                      {/* Storage Condition */}
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: storageInfo.bg,
                            color: storageInfo.text,
                            border: `1px solid ${storageInfo.border}`,
                          }}
                        >
                          {storageInfo.icon}
                          {storageInfo.label}
                        </span>
                      </td>

                      {/* Available Stock Quantity */}
                      <td>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background:
                              (item.stock_quantity ?? 0) > (item.reorder_level || 0)
                                ? "#f0fdf4"
                                : (item.stock_quantity ?? 0) > 0
                                ? "#fefce8"
                                : "#fef2f2",
                            border: `1px solid ${
                              (item.stock_quantity ?? 0) > (item.reorder_level || 0)
                                ? "#bbf7d0"
                                : (item.stock_quantity ?? 0) > 0
                                ? "#fef08a"
                                : "#fecaca"
                            }`,
                            color:
                              (item.stock_quantity ?? 0) > (item.reorder_level || 0)
                                ? "#166534"
                                : (item.stock_quantity ?? 0) > 0
                                ? "#854d0e"
                                : "#991b1b",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          <Box size={14} />
                          <span>{Number(item.stock_quantity ?? 0).toLocaleString()}</span>
                          <span style={{ fontSize: 10, fontWeight: 600 }}>{item.base_uom?.name_ar || "حبة"}</span>
                        </div>
                      </td>

                      {/* Multi-UOM Units */}
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {item.units?.map((u) => (
                            <span
                              key={u.id}
                              title={u.barcode ? `باركود: ${u.barcode}` : ""}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontSize: 11,
                                background: u.is_base_unit ? "rgba(16, 185, 129, 0.1)" : "rgba(241, 245, 249, 0.9)",
                                color: u.is_base_unit ? "#059669" : "#475569",
                                border: u.is_base_unit ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid #e2e8f0",
                              }}
                            >
                              <strong>{u.uom?.name_ar}</strong>
                              {!u.is_base_unit && <span style={{ color: "#94a3b8" }}>(×{u.conversion_factor})</span>}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Cost Price */}
                      <td className="amount" style={{ fontWeight: 600, color: "#334155" }}>
                        {money(item.cost_price)}
                      </td>

                      {/* Selling Prices (from Base Unit or First Unit) */}
                      <td>
                        {(() => {
                          const baseUnit = item.units?.find((u) => u.is_base_unit) || item.units?.[0];
                          const prices = baseUnit?.prices || [];
                          if (prices.length === 0) {
                            return <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>;
                          }
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {prices.map((p, pIdx) => {
                                const label = typeof p.price_tier === "object" ? (p.price_tier as any)?.label : p.price_tier;
                                return (
                                  <div key={p.id || pIdx} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", gap: 8 }}>
                                    <span style={{ color: "#64748b" }}>{label || "سعر"}:</span>
                                    <strong className="amount">{money(p.price)}</strong>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Reorder Level */}
                      <td>
                        <span className="amount">{item.reorder_level}</span>{" "}
                        <span style={{ fontSize: 11, color: "#64748b" }}>{item.base_uom?.name_ar}</span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "4px 8px" }}
                            onClick={() => openEditModal(item)}
                            title="تعديل بيانات الصنف"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "4px 8px", color: "#ef4444" }}
                            onClick={() => handleDeleteItem(item)}
                            title="حذف الصنف"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Product Master & Multi-UOM Modal (Create / Edit) */}
      {modalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="modal-container"
            style={{
              background: "#ffffff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 780,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                background: "#ffffff",
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(16, 185, 129, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669",
                  }}
                >
                  <Package size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                    {modalMode === "create" ? "إضافة صنف غذائي جديد" : "تعديل بيانات الصنف"}
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#64748b" }}>
                    تعريف بيانات الصنف الأساسية، شروط التخزين، ووحدات التعبئة المتعددة مع شرائح الأسعار
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitItem} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {formError && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#dc2626",
                    borderRadius: 8,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              {/* Section 1: Basic Information */}
              <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px 0", color: "#334155" }}>
                  1. البيانات الأساسية للصنف
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  <label className="label">
                    كود الصنف (SKU) *
                    <input
                      type="text"
                      required
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      placeholder="مثال: RICE-BAS-5K"
                      style={{ textTransform: "uppercase" }}
                    />
                  </label>

                  <label className="label">
                    الباركود الرئيسي (Barcode)
                    <input
                      type="text"
                      value={formBarcode}
                      onChange={(e) => setFormBarcode(e.target.value)}
                      placeholder="مثال: 6281001001001"
                    />
                  </label>

                  <label className="label">
                    اسم الصنف (بالعربية) *
                    <input
                      type="text"
                      required
                      value={formNameAr}
                      onChange={(e) => setFormNameAr(e.target.value)}
                      placeholder="مثال: أرز بسمتي هندي ممتاز 5 كغ"
                    />
                  </label>

                  <label className="label">
                    اسم الصنف (بالإنجليزية)
                    <input
                      type="text"
                      value={formNameEn}
                      onChange={(e) => setFormNameEn(e.target.value)}
                      placeholder="Example: Premium Basmati Rice 5kg"
                    />
                  </label>

                  <label className="label">
                    تصنيف الصنف الغذائي *
                    <select
                      required
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                    >
                      <option value="">اختر التصنيف...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name_ar} (حساب المخزون: {c.inventory_account?.code || "—"})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="label">
                    الوحدة الأساسية (Base Unit) *
                    <select
                      required
                      value={formBaseUomId}
                      onChange={(e) => {
                        const newId = Number(e.target.value);
                        setFormBaseUomId(e.target.value);
                        // Update base unit in packaging table
                        setFormUnits((prev) =>
                          prev.map((u) => (u.is_base_unit ? { ...u, uom_id: newId } : u))
                        );
                      }}
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name_ar} ({u.code})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Section 2: Storage, Cold Chain & Shelf Life */}
              <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px 0", color: "#334155" }}>
                  2. شروط التخزين، سلسلة التبريد، والصلاحية
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  <label className="label">
                    شرط التخزين الغذائي *
                    <select
                      value={formStorageCondition}
                      onChange={(e: any) => setFormStorageCondition(e.target.value)}
                    >
                      <option value="ambient">📦 جاف وعادي (حرارة الغرفة)</option>
                      <option value="chilled">🧊 مبرد (2 إلى 5 درجات مئوية)</option>
                      <option value="frozen">❄️ مجمد (-18 درجة مئوية)</option>
                    </select>
                  </label>

                  <label className="label">
                    صلاحية الصنف (بالأيام)
                    <input
                      type="number"
                      min={1}
                      value={formShelfLifeDays}
                      onChange={(e) => setFormShelfLifeDays(e.target.value ? Number(e.target.value) : "")}
                      placeholder="مثال: 365"
                    />
                  </label>

                  <label className="label">
                    حد إعادة الطلب (Reorder Level)
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={formReorderLevel}
                      onChange={(e) => setFormReorderLevel(Number(e.target.value))}
                    />
                  </label>

                  <label className="label">
                    سعر التكلفة التقديري
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(Number(e.target.value))}
                    />
                  </label>

                  <label className="label" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: 8 }}>
                    <span style={{ fontWeight: 800, color: "#166534" }}>الكمية الافتتاحية للمخزون (رصيد أول المدة) *</span>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={formStockQuantity}
                      onChange={(e) => setFormStockQuantity(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0.00"
                      style={{ fontWeight: 800, color: "#14532d", background: "#ffffff" }}
                    />
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
                    <input
                      type="checkbox"
                      id="isPerishableCheck"
                      checked={formIsPerishable}
                      onChange={(e) => setFormIsPerishable(e.target.checked)}
                      style={{ width: 18, height: 18 }}
                    />
                    <label htmlFor="isPerishableCheck" style={{ fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                      صنف غذائي ذو تاريخ انتهاء صلاحية (سياسة FEFO)
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 3: Multi-UOM Packaging & Price Tiers */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#334155" }}>
                      3. وحدات التعبئة المتعددة (Multi-UOM) وشرائح الأسعار
                    </h4>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      حدد معامل التحويل لكل وحدة إلى الوحدة الأساسية وسعر البيع
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleAddUnitRow}
                    style={{ fontSize: 12, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Plus size={14} /> إضافة وحدة تعبئة
                  </button>
                </div>

                <div className="table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <table className="data" style={{ margin: 0 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th>الوحدة</th>
                        <th>معامل التحويل (للوحدة الأساسية)</th>
                        <th>باركود الوحدة</th>
                        <th>سعر التجزئة</th>
                        <th>سعر الجملة</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formUnits.map((uRow, idx) => (
                        <tr key={idx}>
                          <td>
                            {uRow.is_base_unit ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <strong>
                                  {units.find((u) => u.id === uRow.uom_id)?.name_ar || "الوحدة الأساسية"}
                                </strong>
                                <span
                                  style={{
                                    fontSize: 10,
                                    background: "#10b981",
                                    color: "#fff",
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                  }}
                                >
                                  أساسية
                                </span>
                              </div>
                            ) : (
                              <select
                                value={uRow.uom_id}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setFormUnits(
                                    formUnits.map((item, i) => (i === idx ? { ...item, uom_id: val } : item))
                                  );
                                }}
                                style={{ padding: "4px 8px", fontSize: 13 }}
                              >
                                {units.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name_ar} ({u.code})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td>
                            {uRow.is_base_unit ? (
                              <span style={{ fontSize: 13, color: "#64748b" }}>1.0000 (أساس)</span>
                            ) : (
                              <input
                                type="number"
                                step="0.0001"
                                min={0.0001}
                                value={uRow.conversion_factor}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setFormUnits(
                                    formUnits.map((item, i) =>
                                      i === idx ? { ...item, conversion_factor: val } : item
                                    )
                                  );
                                }}
                                style={{ width: 100, padding: "4px 8px" }}
                              />
                            )}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={uRow.barcode}
                              placeholder="باركود الوحدة..."
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormUnits(
                                  formUnits.map((item, i) => (i === idx ? { ...item, barcode: val } : item))
                                );
                              }}
                              style={{ width: 140, padding: "4px 8px", fontSize: 12, fontFamily: "monospace" }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={uRow.retail_price}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setFormUnits(
                                  formUnits.map((item, i) =>
                                    i === idx ? { ...item, retail_price: val } : item
                                  )
                                );
                              }}
                              style={{ width: 90, padding: "4px 8px" }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={uRow.wholesale_price}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setFormUnits(
                                  formUnits.map((item, i) =>
                                    i === idx ? { ...item, wholesale_price: val } : item
                                  )
                                );
                              }}
                              style={{ width: 90, padding: "4px 8px" }}
                            />
                          </td>
                          <td>
                            {!uRow.is_base_unit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveUnitRow(idx)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                }}
                              >
                                <X size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 8,
                  paddingTop: 16,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "جارِ الحفظ..." : modalMode === "create" ? "إضافة الصنف" : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
