/**
 * Warehouses & Locations API Client (Phase 4)
 */

const API_BASE = '/api/v1/warehouses';

export type WarehouseType = 'dry' | 'chilled' | 'frozen';

export interface WarehouseLocation {
  id: number;
  warehouse_id: number;
  code: string;
  aisle: string | null;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  full_code: string;
  is_active: boolean;
  notes: string | null;
  created_at?: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  type: WarehouseType;
  type_label?: string;
  target_temperature: string | null;
  temperature_range?: string;
  capacity_sqm: number;
  manager_name: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  notes: string | null;
  locations_count?: number;
  locations?: WarehouseLocation[];
}

export const warehousesApi = {
  async list(activeOnly = false): Promise<Warehouse[]> {
    const url = activeOnly ? `${API_BASE}?active_only=1` : API_BASE;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل جلب قائمة المستودعات');
    return json.data;
  },

  async get(id: number): Promise<Warehouse> {
    const res = await fetch(`${API_BASE}/${id}`, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل جلب بيانات المستودع');
    return json.data;
  },

  async create(payload: Partial<Warehouse>): Promise<Warehouse> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || Object.values(json.errors || {}).flat().join(', ') || 'فشل إنشاء المستودع';
      throw new Error(msg);
    }
    return json.data;
  },

  async update(id: number, payload: Partial<Warehouse>): Promise<Warehouse> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || Object.values(json.errors || {}).flat().join(', ') || 'فشل تحديث المستودع';
      throw new Error(msg);
    }
    return json.data;
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.message || 'فشل حذف المستودع');
    }
  },

  // Locations CRUD
  async listLocations(warehouseId: number): Promise<WarehouseLocation[]> {
    const res = await fetch(`${API_BASE}/${warehouseId}/locations`, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل جلب مواقع المستودع');
    return json.data;
  },

  async createLocation(warehouseId: number, payload: Partial<WarehouseLocation>): Promise<WarehouseLocation> {
    const res = await fetch(`${API_BASE}/${warehouseId}/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || Object.values(json.errors || {}).flat().join(', ') || 'فشل إضافة الموقع';
      throw new Error(msg);
    }
    return json.data;
  },

  async updateLocation(warehouseId: number, locationId: number, payload: Partial<WarehouseLocation>): Promise<WarehouseLocation> {
    const res = await fetch(`${API_BASE}/${warehouseId}/locations/${locationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || Object.values(json.errors || {}).flat().join(', ') || 'فشل تحديث الموقع';
      throw new Error(msg);
    }
    return json.data;
  },

  async deleteLocation(warehouseId: number, locationId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/${warehouseId}/locations/${locationId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.message || 'فشل حذف الموقع');
    }
  },
};
