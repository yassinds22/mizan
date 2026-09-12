/**
 * Purchases & Suppliers API Client
 */

export interface Supplier {
  id: number;
  code: string;
  name_ar: string;
  name_en?: string;
  tax_number?: string;
  commercial_register?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  payment_terms_days: number;
  credit_limit: number;
  balance: number;
  is_active: boolean;
  created_at?: string;
}

export interface PurchaseInvoiceLine {
  id?: number;
  purchase_invoice_id?: number;
  item_id: number;
  item_name_ar?: string;
  item_sku?: string;
  item_unit_id?: number | null;
  unit_name: string;
  conversion_factor: number;
  quantity: number;
  base_quantity?: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount?: number;
  subtotal?: number;
  total?: number;
}

export interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier_invoice_number?: string;
  invoice_date: string;
  due_date?: string;
  branch_id: number;
  branch_name?: string;
  supplier_id?: number | null;
  supplier_name?: string;
  supplier_tax_number?: string;
  supplier?: Supplier;
  payment_method: {
    value: 'cash' | 'credit' | 'bank_transfer';
    label: string;
  };
  status: {
    value: 'draft' | 'posted' | 'cancelled';
    label: string;
  };
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  journal_entry_id?: number | null;
  posted_at?: string;
  cancelled_at?: string;
  created_at?: string;
  lines?: PurchaseInvoiceLine[];
}

export interface CreatePurchaseInvoicePayload {
  invoice_number?: string;
  supplier_invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  branch_id?: number;
  supplier_id?: number | null;
  supplier_name?: string;
  supplier_tax_number?: string;
  payment_method: 'cash' | 'credit' | 'bank_transfer';
  notes?: string;
  post_immediately?: boolean;
  lines: {
    item_id: number;
    item_unit_id?: number | null;
    unit_name: string;
    conversion_factor?: number;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    tax_rate?: number;
  }[];
}

const API_BASE = '/api/v1/purchases';

export const purchasesApi = {
  // 1. Suppliers
  async getSuppliers(filters: { search?: string; per_page?: number; is_active?: boolean | string } = {}): Promise<{ data: Supplier[]; total?: number }> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.per_page) params.append('per_page', String(filters.per_page));
    if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));

    const res = await fetch(`${API_BASE}/suppliers?${params.toString()}`);
    if (!res.ok) throw new Error('فشل جلب قائمة الموردين');
    const json = await res.json();
    return { data: json.data || [], total: json.meta?.total || json.data?.length };
  },

  async getAllActiveSuppliers(): Promise<Supplier[]> {
    const res = await fetch(`${API_BASE}/suppliers/all-active`);
    if (!res.ok) throw new Error('فشل جلب الموردين النشطين');
    const json = await res.json();
    return json.data || [];
  },

  async createSupplier(payload: Partial<Supplier>): Promise<Supplier> {
    const res = await fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل حفظ بيانات المورد');
    return json.data;
  },

  async updateSupplier(id: number, payload: Partial<Supplier>): Promise<Supplier> {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل تحديث بيانات المورد');
    return json.data;
  },

  // 2. Purchase Invoices
  async getInvoices(filters: {
    search?: string;
    status?: string;
    payment_method?: string;
    supplier_id?: number | string;
    per_page?: number;
  } = {}): Promise<{ data: PurchaseInvoice[]; total?: number }> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.payment_method && filters.payment_method !== 'all') params.append('payment_method', filters.payment_method);
    if (filters.supplier_id && filters.supplier_id !== 'all') params.append('supplier_id', String(filters.supplier_id));
    if (filters.per_page) params.append('per_page', String(filters.per_page));

    const res = await fetch(`${API_BASE}/invoices?${params.toString()}`);
    if (!res.ok) throw new Error('فشل جلب فواتير المشتريات');
    const json = await res.json();
    return { data: json.data || [], total: json.meta?.total || json.data?.length };
  },

  async getInvoice(id: number): Promise<PurchaseInvoice> {
    const res = await fetch(`${API_BASE}/invoices/${id}`);
    if (!res.ok) throw new Error('فشل جلب تفاصيل فاتورة المشتريات');
    const json = await res.json();
    return json.data;
  },

  async createInvoice(payload: CreatePurchaseInvoicePayload): Promise<PurchaseInvoice> {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل حفظ فاتورة المشتريات');
    return json.data;
  },

  async postInvoice(id: number): Promise<PurchaseInvoice> {
    const res = await fetch(`${API_BASE}/invoices/${id}/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل ترحيل فاتورة المشتريات');
    return json.data;
  },

  async cancelInvoice(id: number, reason?: string): Promise<PurchaseInvoice> {
    const res = await fetch(`${API_BASE}/invoices/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل إلغاء فاتورة المشتريات');
    return json.data;
  },

  // 3. Purchase Returns & Debit Notes
  async getReturnableLines(invoiceId: number): Promise<ReturnablePurchaseInvoiceData> {
    const res = await fetch(`${API_BASE}/invoices/${invoiceId}/returnable-lines`);
    if (!res.ok) throw new Error('فشل جلب أسطر الفاتورة القابلة للإرجاع');
    const json = await res.json();
    return json.data;
  },

  async createPurchaseReturn(payload: CreatePurchaseReturnPayload): Promise<PurchaseReturn> {
    const res = await fetch(`${API_BASE}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل ترحيل مردود المشتريات');
    return json.data;
  },

  async getReturns(filters: {
    search?: string;
    status?: string;
    supplier_id?: number | string;
    branch_id?: number | string;
    per_page?: number;
  } = {}): Promise<{ data: PurchaseReturn[]; total?: number }> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.supplier_id && filters.supplier_id !== 'all') params.append('supplier_id', String(filters.supplier_id));
    if (filters.branch_id && filters.branch_id !== 'all') params.append('branch_id', String(filters.branch_id));
    if (filters.per_page) params.append('per_page', String(filters.per_page));

    const res = await fetch(`${API_BASE}/returns?${params.toString()}`);
    if (!res.ok) throw new Error('فشل جلب مردودات المشتريات');
    const json = await res.json();
    return { data: json.data || [], total: json.meta?.total || json.data?.length };
  },

  async getReturn(id: number): Promise<PurchaseReturn> {
    const res = await fetch(`${API_BASE}/returns/${id}`);
    if (!res.ok) throw new Error('فشل جلب تفاصيل مردود المشتريات');
    const json = await res.json();
    return json.data;
  },

  async cancelReturn(id: number, reason?: string): Promise<PurchaseReturn> {
    const res = await fetch(`${API_BASE}/returns/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل إلغاء مردود المشتريات');
    return json.data;
  },
};

export interface PurchaseReturnLine {
  id?: number;
  purchase_invoice_line_id: number;
  item_id: number;
  item_name_ar?: string;
  item_sku?: string;
  unit_name: string;
  conversion_factor: number;
  quantity: number;
  base_quantity?: number;
  unit_price: number;
  tax_rate: number;
  tax_amount?: number;
  subtotal?: number;
  total?: number;
}

export interface PurchaseReturn {
  id: number;
  return_number: string;
  debit_note_number?: string;
  purchase_invoice_id: number;
  original_invoice_number?: string;
  supplier_invoice_number?: string;
  return_date: string;
  branch_id: number;
  branch_name?: string;
  supplier_id: number;
  supplier_name?: string;
  refund_method: 'credit' | 'cash' | 'bank_transfer';
  status: 'posted' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  reason?: string;
  notes?: string;
  journal_entry_id?: number | null;
  journal_entry_number?: string;
  posted_at?: string;
  cancelled_at?: string;
  created_at?: string;
  lines: PurchaseReturnLine[];
}

export interface ReturnablePurchaseInvoiceData {
  invoice_id: number;
  invoice_number: string;
  supplier_invoice_number?: string;
  invoice_date: string;
  supplier_id: number;
  supplier_name?: string;
  payment_method: string;
  lines: {
    purchase_invoice_line_id: number;
    item_id: number;
    item_name_ar: string;
    item_sku: string;
    unit_name: string;
    conversion_factor: number;
    original_quantity: number;
    already_returned_quantity: number;
    remaining_quantity: number;
    unit_price: number;
    tax_rate: number;
  }[];
}

export interface CreatePurchaseReturnPayload {
  purchase_invoice_id: number;
  return_date?: string;
  refund_method: 'credit' | 'cash' | 'bank_transfer';
  reason?: string;
  notes?: string;
  lines: {
    purchase_invoice_line_id: number;
    quantity: number;
  }[];
}

