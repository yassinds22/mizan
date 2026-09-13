import axios from "axios";

export interface ItemCardTransaction {
  id: number;
  entry_number: string;
  entry_date: string;
  created_at: string | null;
  voucher_type: string;
  voucher_type_label: string;
  voucher_id: number;
  voucher_number: string;
  party_name: string | null;
  warehouse_id: number;
  warehouse_name: string;
  location_name: string;
  batch_id: number | null;
  batch_number: string;
  expiry_date: string;
  quantity_in: number;
  quantity_out: number;
  quantity_delta: number;
  unit_cost: number;
  total_value_delta: number;
  running_balance: number;
  running_value: number;
  notes: string | null;
}

export interface ItemCardData {
  item: {
    id: number;
    sku: string;
    barcode: string;
    name_ar: string;
    name_en: string | null;
    category_name: string;
    base_uom: string;
    reorder_level: number;
    standard_cost: number;
    current_stock_quantity: number;
  };
  filters: {
    date_from: string;
    date_to: string;
    warehouse_id: number | null;
    batch_id: number | null;
  };
  summary: {
    opening_quantity: number;
    opening_value: number;
    total_in_quantity: number;
    total_in_value: number;
    total_out_quantity: number;
    total_out_value: number;
    net_quantity_delta: number;
    net_value_delta: number;
    closing_quantity: number;
    closing_value: number;
    average_unit_cost: number;
  };
  transactions: ItemCardTransaction[];
}

export interface ValuationItemRow {
  item_id: number;
  sku: string;
  barcode: string;
  name_ar: string;
  name_en: string | null;
  category_id: number;
  category_name: string;
  base_uom: string;
  quantity_on_hand: number;
  quantity_available: number;
  quantity_reserved: number;
  unit_cost: number;
  total_cost_value: number;
  selling_price: number;
  total_retail_value: number;
  expected_margin: number;
  margin_percent: number;
  reorder_level: number;
  is_low_stock: boolean;
}

export interface CategoryBreakdownRow {
  category_id: number;
  category_name: string;
  items_count: number;
  total_quantity: number;
  total_cost_value: number;
  total_retail_value: number;
}

export interface WarehouseBreakdownRow {
  warehouse_id: number;
  warehouse_name: string;
  items_count: number;
  total_quantity: number;
  total_cost_value: number;
}

export interface InventoryValuationData {
  filters: {
    warehouse_id: number | null;
    category_id: number | null;
    price_tier: string;
    search: string | null;
  };
  summary: {
    total_skus: number;
    total_quantity: number;
    total_cost_value: number;
    total_retail_value: number;
    total_expected_margin: number;
    overall_margin_percent: number;
  };
  items: ValuationItemRow[];
  category_breakdown: CategoryBreakdownRow[];
  warehouse_breakdown: WarehouseBreakdownRow[];
}

export interface ReconciliationAccountRow {
  account_id: number;
  account_code: string;
  account_name: string;
  linked_categories: string;
  inventory_quantity: number;
  inventory_valuation: number;
  gl_debit: number;
  gl_credit: number;
  gl_balance: number;
  difference: number;
  status: "MATCHED" | "DIFFERENCE";
  status_label: string;
}

export interface InventoryReconciliationData {
  status: "MATCHED" | "DIFFERENCE";
  status_label: string;
  summary: {
    total_inventory_valuation: number;
    total_gl_inventory_balance: number;
    net_difference: number;
    is_balanced: boolean;
    accounts_count: number;
  };
  accounts: ReconciliationAccountRow[];
}

export interface ReorderAlertRow {
  item_id: number;
  sku: string;
  barcode: string;
  name_ar: string;
  category_name: string;
  uom_name: string;
  current_quantity: number;
  available_quantity: number;
  reorder_level: number;
  shortage_quantity: number;
  suggested_order_qty: number;
  unit_cost: number;
  estimated_order_cost: number;
  urgency: "CRITICAL" | "WARNING";
  urgency_label: string;
}

export interface SlowMovingItemRow {
  item_id: number;
  sku: string;
  name_ar: string;
  category_name: string;
  uom_name: string;
  current_quantity: number;
  unit_cost: number;
  frozen_capital: number;
  last_out_date: string;
  days_inactive: string;
  classification: "SLOW" | "VERY_SLOW" | "DEAD";
  classification_label: string;
  tone: "info" | "warn" | "danger";
}

export interface InventoryAnalyticsData {
  filters: {
    warehouse_id: number | null;
    days_threshold: number;
  };
  summary: {
    low_stock_items_count: number;
    total_reorder_estimated_cost: number;
    slow_moving_items_count: number;
    total_frozen_capital: number;
  };
  reorder_alerts: ReorderAlertRow[];
  slow_moving_stock: SlowMovingItemRow[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const inventoryReportsApi = {
  fetchItemCard: async (
    itemId: number,
    params: {
      date_from?: string;
      date_to?: string;
      warehouse_id?: number | string;
      batch_id?: number | string;
    } = {}
  ): Promise<ItemCardData> => {
    const res = await axios.get<ApiResponse<ItemCardData>>(
      `/api/v1/inventory/reports/item-card/${itemId}`,
      { params }
    );
    return res.data.data;
  },

  fetchValuation: async (
    params: {
      warehouse_id?: number | string;
      category_id?: number | string;
      price_tier?: string;
      search?: string;
    } = {}
  ): Promise<InventoryValuationData> => {
    const res = await axios.get<ApiResponse<InventoryValuationData>>(
      "/api/v1/inventory/reports/valuation",
      { params }
    );
    return res.data.data;
  },

  fetchReconciliation: async (): Promise<InventoryReconciliationData> => {
    const res = await axios.get<ApiResponse<InventoryReconciliationData>>(
      "/api/v1/inventory/reports/reconciliation"
    );
    return res.data.data;
  },

  fetchAnalytics: async (
    params: {
      warehouse_id?: number | string;
      days_threshold?: number | string;
    } = {}
  ): Promise<InventoryAnalyticsData> => {
    const res = await axios.get<ApiResponse<InventoryAnalyticsData>>(
      "/api/v1/inventory/reports/analytics",
      { params }
    );
    return res.data.data;
  },
};
