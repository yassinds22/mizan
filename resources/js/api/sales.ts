/**
 * Sales & Invoices API Client
 */

export interface Customer {
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
  credit_limit: number;
  balance: number;
  is_active: boolean;
}

export interface SalesInvoiceLine {
  id?: number;
  item_id: number;
  item_name_ar?: string;
  item_sku?: string;
  item_unit_id?: number | null;
  unit_name: string;
  conversion_factor: number;
  quantity: number;
  base_quantity?: number;
  unit_price: number;
  cost_price?: number;
  discount_rate: number;
  discount_amount?: number;
  tax_rate: number;
  tax_amount?: number;
  subtotal?: number;
  total?: number;
}

export interface SalesInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  branch_id: number;
  branch_name?: string;
  customer_id?: number | null;
  customer_name: string;
  customer_tax_number?: string;
  customer?: Customer;
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
  paid_amount: number;
  remaining_amount: number;
  notes?: string;
  journal_entry_id?: number | null;
  journal_entry_number?: string;
  zatca_qr_payload?: string;
  posted_at?: string;
  created_at?: string;
  lines?: SalesInvoiceLine[];
}

export interface CreateInvoicePayload {
  invoice_number?: string;
  invoice_date: string;
  due_date?: string;
  branch_id?: number;
  customer_id?: number | null;
  customer_name?: string;
  customer_tax_number?: string;
  payment_method: 'cash' | 'credit' | 'bank_transfer';
  notes?: string;
  post_immediately?: boolean;
  lines: {
    item_id: number;
    item_unit_id?: number | null;
    unit_name?: string;
    conversion_factor?: number;
    quantity: number;
    unit_price: number;
    cost_price?: number;
    discount_rate?: number;
    tax_rate?: number;
  }[];
}

const API_BASE = '/api/v1/sales';

export const salesApi = {
  // 1. Customers
  async getCustomers(filters: { search?: string; per_page?: number } = {}): Promise<{ data: Customer[]; total?: number }> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.per_page) params.append('per_page', String(filters.per_page));

    const res = await fetch(`${API_BASE}/customers?${params.toString()}`);
    if (!res.ok) throw new Error('فشل جلب قائمة العملاء');
    const json = await res.json();
    return { data: json.data || [], total: json.meta?.total || json.data?.length };
  },

  async getAllActiveCustomers(): Promise<Customer[]> {
    const res = await fetch(`${API_BASE}/customers/all-active`);
    if (!res.ok) throw new Error('فشل جلب العملاء النشطين');
    const json = await res.json();
    return json.data || [];
  },

  async createCustomer(payload: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل حفظ العميل');
    return json.data;
  },

  async updateCustomer(id: number, payload: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل تحديث بيانات العميل');
    return json.data;
  },

  // 2. Sales Invoices
  async getInvoices(filters: {
    search?: string;
    status?: string;
    payment_method?: string;
    customer_id?: number | string;
    per_page?: number;
  } = {}): Promise<{ data: SalesInvoice[]; total?: number }> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.payment_method && filters.payment_method !== 'all') params.append('payment_method', filters.payment_method);
    if (filters.customer_id && filters.customer_id !== 'all') params.append('customer_id', String(filters.customer_id));
    if (filters.per_page) params.append('per_page', String(filters.per_page));

    const res = await fetch(`${API_BASE}/invoices?${params.toString()}`);
    if (!res.ok) throw new Error('فشل جلب فواتير المبيعات');
    const json = await res.json();
    return { data: json.data || [], total: json.meta?.total || json.data?.length };
  },

  async getInvoice(id: number): Promise<SalesInvoice> {
    const res = await fetch(`${API_BASE}/invoices/${id}`);
    if (!res.ok) throw new Error('فشل جلب تفاصيل الفاتورة');
    const json = await res.json();
    return json.data;
  },

  async createInvoice(payload: CreateInvoicePayload): Promise<SalesInvoice> {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      let msg = json.message || Object.values(json.errors || {}).flat().join(', ') || 'فشل حفظ الفاتورة';
      if (msg.toLowerCase().includes('the selected branch id is invalid')) {
        msg = 'الفرع المحدد في الفاتورة غير مسجل أو لم يعد نشطاً في قاعدة البيانات.';
      } else if (msg.toLowerCase().includes('the selected customer id is invalid')) {
        msg = 'العميل المحدد غير موجود في سجلات العملاء النشطين.';
      } else if (msg.toLowerCase().includes('the lines field is required')) {
        msg = 'يجب إضافة صنف واحد على الأقل في فاتورة المبيعات.';
      }
      throw new Error(msg);
    }
    return json.data;
  },

  async postInvoice(id: number): Promise<SalesInvoice> {
    const res = await fetch(`${API_BASE}/invoices/${id}/post`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل ترحيل الفاتورة');
    return json.data;
  },

  async cancelInvoice(id: number, reason?: string): Promise<SalesInvoice> {
    const res = await fetch(`${API_BASE}/invoices/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل إلغاء الفاتورة');
    return json.data;
  },
};
