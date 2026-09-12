/**
 * Inventory, Batches, Balances & Stock Movements API Client (Phase 4)
 */

const API_BASE = '/api/v1/inventory';

export interface ItemBatch {
  id: number;
  item_id: number;
  batch_number: string;
  production_date: string | null;
  expiry_date: string;
  unit_cost: number;
  status: 'active' | 'quarantine' | 'expired' | 'depleted';
  notes: string | null;
  is_expired?: boolean;
  days_until_expiry?: number;
  is_near_expiry?: boolean;
  item?: {
    id: number;
    sku: string;
    name_ar: string;
  };
}

export interface StockBalance {
  id: number;
  item_id: number;
  warehouse_id: number;
  location_id: number | null;
  batch_id: number | null;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit_cost: number;
  total_value: number;
  item?: {
    id: number;
    sku: string;
    name_ar: string;
    base_uom?: { id: number; name_ar: string; code: string };
  };
  warehouse?: {
    id: number;
    name: string;
    code: string;
    type: string;
  };
  location?: {
    id: number;
    code: string;
  } | null;
  batch?: ItemBatch | null;
}

export type MovementType = 'transfer' | 'issue' | 'waste' | 'adjustment' | 'receipt';
export type MovementStatus = 'draft' | 'posted' | 'cancelled';

export interface StockMovementLine {
  id?: number;
  stock_movement_id?: number;
  item_id: number;
  from_location_id?: number | null;
  to_location_id?: number | null;
  batch_id?: number | null;
  quantity: number;
  uom_id?: number | null;
  unit_cost: number;
  total_cost?: number;
  notes?: string | null;
  item?: {
    id: number;
    sku: string;
    name_ar: string;
  };
  batch?: ItemBatch | null;
  from_location?: { id: number; code: string } | null;
  to_location?: { id: number; code: string } | null;
}

export interface StockMovement {
  id: number;
  movement_number: string;
  type: MovementType;
  type_label?: string;
  status: MovementStatus;
  status_label?: string;
  from_warehouse_id: number | null;
  to_warehouse_id: number | null;
  movement_date: string;
  reason: string | null;
  notes: string | null;
  total_amount: number;
  journal_entry_id: number | null;
  from_warehouse?: { id: number; name: string; code: string } | null;
  to_warehouse?: { id: number; name: string; code: string } | null;
  lines?: StockMovementLine[];
  journal_entry?: {
    id: number;
    entry_number: string;
    entry_date: string;
    total_debit: number;
  } | null;
}

export interface FefoAllocationItem {
  stock_balance_id: number;
  batch_id: number | null;
  batch_number: string | null;
  expiry_date: string | null;
  days_until_expiry?: number | null;
  is_near_expiry?: boolean;
  warehouse_id: number;
  warehouse_name: string | null;
  location_id: number | null;
  location_code: string | null;
  available_quantity: number;
  allocated_quantity: number;
  unit_cost: number;
  line_total_cost: number;
}

export interface FefoAllocationResult {
  item_id: number;
  warehouse_id: number | null;
  required_quantity: number;
  total_allocated: number;
  is_fully_allocated: boolean;
  shortage: number;
  allocations: FefoAllocationItem[];
}

export interface CreateMovementPayload {
  type: MovementType;
  movement_date: string;
  from_warehouse_id?: number | null;
  to_warehouse_id?: number | null;
  reason?: string | null;
  notes?: string | null;
  auto_post?: boolean;
  lines: Array<{
    item_id: number;
    from_location_id?: number | null;
    to_location_id?: number | null;
    batch_id?: number | null;
    quantity: number;
    uom_id?: number | null;
    unit_cost?: number;
    notes?: string | null;
  }>;
}

export const inventoryApi = {
  // 1. Balances & Summary
  async listBalances(filters: Record<string, any> = {}): Promise<StockBalance[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, String(v));
      }
    });
    const url = params.toString() ? `${API_BASE}/balances?${params}` : `${API_BASE}/balances`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل استعلام أرصدة المخزون');
    return json.data;
  },

  async getItemSummary(itemId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/balances/item/${itemId}/summary`, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل جلب ملخص رصيد الصنف');
    return json.data;
  },

  // 2. FEFO Allocation Engine
  async allocateFefo(itemId: number, quantity: number, warehouseId?: number | null): Promise<FefoAllocationResult> {
    const params = new URLSearchParams({
      item_id: String(itemId),
      quantity: String(quantity),
    });
    if (warehouseId) {
      params.append('warehouse_id', String(warehouseId));
    }
    const res = await fetch(`${API_BASE}/balances/allocate-fefo?${params}`, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || Object.values(json.errors || {}).flat().join(', ') || 'فشل تخصيص دفعات FEFO';
      throw new Error(msg);
    }
    return json.data;
  },

  // 3. Batches
  async listBatches(params: { item_id?: number; fefo?: boolean; near_expiry?: number; status?: string } = {}): Promise<ItemBatch[]> {
    const q = new URLSearchParams();
    if (params.item_id) q.append('item_id', String(params.item_id));
    if (params.fefo) q.append('fefo', '1');
    if (params.near_expiry) q.append('near_expiry', String(params.near_expiry));
    if (params.status) q.append('status', params.status);

    const url = q.toString() ? `${API_BASE}/batches?${q}` : `${API_BASE}/batches`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل جلب قائمة الدفعات');
    return json.data;
  },

  async createBatch(payload: Partial<ItemBatch>): Promise<ItemBatch> {
    const res = await fetch(`${API_BASE}/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || Object.values(json.errors || {}).flat().join(', ') || 'فشل إضافة الدفعة';
      throw new Error(msg);
    }
    return json.data;
  },

  // 4. Movements (Headers & Multi-line Documents)
  async listMovements(filters: Record<string, any> = {}): Promise<StockMovement[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, String(v));
      }
    });
    const url = params.toString() ? `${API_BASE}/movements?${params}` : `${API_BASE}/movements`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل استعلام حركات المخزون');
    return json.data;
  },

  async getMovement(id: number): Promise<StockMovement> {
    const res = await fetch(`${API_BASE}/movements/${id}`, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل جلب وثيقة حركة المخزون');
    return json.data;
  },

  async createMovement(payload: CreateMovementPayload): Promise<StockMovement> {
    const res = await fetch(`${API_BASE}/movements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || Object.values(json.errors || {}).flat().join(', ') || 'فشل تسجيل حركة المخزون';
      throw new Error(msg);
    }
    return json.data;
  },

  async postMovement(id: number): Promise<StockMovement> {
    const res = await fetch(`${API_BASE}/movements/${id}/post`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل ترحيل وثيقة الحركة');
    return json.data;
  },

  async cancelMovement(id: number, reason?: string): Promise<StockMovement> {
    const res = await fetch(`${API_BASE}/movements/${id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل إلغاء وثيقة الحركة');
    return json.data;
  },

  // 5. Stock Ledger
  async listLedger(filters: Record<string, any> = {}): Promise<any[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, String(v));
      }
    });
    const url = params.toString() ? `${API_BASE}/ledger?${params}` : `${API_BASE}/ledger`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل استعلام دفتر أستاذ المخزون');
    return json.data;
  },
};
