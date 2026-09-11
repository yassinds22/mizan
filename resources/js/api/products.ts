/**
 * Products, Multi-UOM & Price Tiers API Client (Phase 3)
 */

export interface UnitOfMeasure {
  id: number;
  code: string;
  name_ar: string;
  name_en?: string;
  symbol?: string;
  is_active: boolean;
}

export interface ItemCategory {
  id: number;
  code: string;
  name_ar: string;
  name_en?: string;
  parent_id?: number | null;
  parent_name?: string | null;
  inventory_account_id?: number | null;
  inventory_account?: { id: number; code: string; name_ar: string } | null;
  cogs_account_id?: number | null;
  cogs_account?: { id: number; code: string; name_ar: string } | null;
  revenue_account_id?: number | null;
  revenue_account?: { id: number; code: string; name_ar: string } | null;
  is_active: boolean;
  items_count?: number;
  children?: ItemCategory[];
}

export interface ItemPrice {
  id?: number;
  item_unit_id?: number;
  price_tier: {
    value: string;
    label: string;
  };
  price: number;
  min_quantity?: number;
}

export interface ItemUnit {
  id?: number;
  item_id?: number;
  uom_id: number;
  uom?: UnitOfMeasure;
  conversion_factor: number;
  barcode?: string;
  is_base_unit: boolean;
  is_sale_unit?: boolean;
  is_purchase_unit?: boolean;
  prices?: ItemPrice[];
}

export interface Item {
  id: number;
  sku: string;
  barcode?: string;
  name_ar: string;
  name_en?: string;
  category_id: number;
  category?: ItemCategory;
  tax_category_id?: number;
  base_uom_id: number;
  base_uom?: UnitOfMeasure;
  storage_condition: {
    value: 'ambient' | 'chilled' | 'frozen';
    label: string;
    requires_cooling: boolean;
  };
  is_perishable: boolean;
  shelf_life_days?: number;
  reorder_level: number;
  cost_price: number;
  stock_quantity?: number;
  is_active: boolean;
  units: ItemUnit[];
  created_at?: string;
}

export interface CreateItemPayload {
  sku: string;
  barcode?: string;
  name_ar: string;
  name_en?: string;
  category_id: number;
  tax_category_id?: number | null;
  base_uom_id: number;
  storage_condition: 'ambient' | 'chilled' | 'frozen';
  is_perishable?: boolean;
  shelf_life_days?: number;
  reorder_level?: number;
  cost_price?: number;
  stock_quantity?: number;
  is_active?: boolean;
  units?: {
    uom_id: number;
    conversion_factor: number;
    barcode?: string;
    is_base_unit?: boolean;
    prices?: {
      price_tier: string;
      price: number;
      min_quantity?: number;
    }[];
  }[];
}

const API_BASE = '/api/v1/products';

export const productsApi = {
  // 1. Units of Measure
  async getUnits(): Promise<UnitOfMeasure[]> {
    const res = await fetch(`${API_BASE}/units-of-measure`);
    if (!res.ok) throw new Error('فشل جلب وحدات القياس');
    const json = await res.json();
    return json.data || [];
  },

  // 2. Categories
  async getCategories(): Promise<ItemCategory[]> {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('فشل جلب تصنيفات الأصناف');
    const json = await res.json();
    return json.data || [];
  },

  async getCategoriesTree(): Promise<ItemCategory[]> {
    const res = await fetch(`${API_BASE}/categories/tree`);
    if (!res.ok) throw new Error('فشل جلب شجرة التصنيفات');
    const json = await res.json();
    return json.data || [];
  },

  // 3. Items
  async getItems(filters: {
    search?: string;
    category_id?: string | number;
    storage_condition?: string;
    is_active?: boolean;
    per_page?: number;
  } = {}): Promise<{ data: Item[]; total?: number }> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category_id && filters.category_id !== 'all') {
      params.append('category_id', String(filters.category_id));
    }
    if (filters.storage_condition && filters.storage_condition !== 'all') {
      params.append('storage_condition', filters.storage_condition);
    }
    if (filters.per_page) params.append('per_page', String(filters.per_page));

    const res = await fetch(`${API_BASE}/items?${params.toString()}`);
    if (!res.ok) throw new Error('فشل جلب بطاقات الأصناف');
    const json = await res.json();
    return { data: json.data || [], total: json.meta?.total || json.data?.length };
  },

  async getItem(id: number): Promise<Item> {
    const res = await fetch(`${API_BASE}/items/${id}`);
    if (!res.ok) throw new Error('فشل جلب تفاصيل الصنف');
    const json = await res.json();
    return json.data;
  },

  async createItem(payload: CreateItemPayload): Promise<Item> {
    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || Object.values(json.errors || {}).flat().join(', ') || 'فشل حفظ الصنف الجديد';
      throw new Error(msg);
    }
    return json.data;
  },

  async updateItem(id: number, payload: Partial<CreateItemPayload>): Promise<Item> {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || Object.values(json.errors || {}).flat().join(', ') || 'فشل تحديث الصنف';
      throw new Error(msg);
    }
    return json.data;
  },

  async deleteItem(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.message || 'فشل حذف الصنف');
    }
  },

  async lookupBarcode(barcode: string): Promise<{ item: Item; matched_unit?: ItemUnit }> {
    const res = await fetch(`${API_BASE}/items/barcode/${encodeURIComponent(barcode)}`);
    if (!res.ok) throw new Error('لم يتم العثور على الصنف');
    return res.json();
  },

  async convertQuantity(itemId: number, quantity: number, fromUomId: number, toUomId: number): Promise<number> {
    const res = await fetch(`${API_BASE}/items/${itemId}/convert-quantity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        quantity,
        from_uom_id: fromUomId,
        to_uom_id: toUomId,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل تحويل الكمية');
    return json.converted_quantity;
  },
};
