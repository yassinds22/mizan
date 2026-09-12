import axios from "axios";

export interface VoucherAllocationItem {
  id?: number;
  voucher_id?: number;
  invoice_type: "sales_invoice" | "purchase_invoice";
  invoice_id: number;
  allocated_amount: number;
  sales_invoice?: {
    id: number;
    invoice_number: string;
    total_amount: number;
    remaining_amount: number;
  };
  purchase_invoice?: {
    id: number;
    invoice_number: string;
    total_amount: number;
  };
}

export interface VoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: "receipt" | "payment";
  date: string;
  branch_id: number;
  fiscal_period_id: number;
  party_type: "customer" | "supplier" | "account";
  party_id: number | null;
  party_name: string;
  treasury_account_id: number;
  counter_account_id: number;
  payment_method: "cash" | "bank_transfer" | "cheque" | "pos";
  reference_number: string | null;
  amount: number | string;
  cost_center_id: number | null;
  notes: string | null;
  received_from: string | null;
  paid_to: string | null;
  status: "draft" | "posted" | "cancelled";
  journal_entry_id: number | null;
  posted_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  treasury_account?: {
    id: number;
    code: string;
    name_ar: string;
  };
  counter_account?: {
    id: number;
    code: string;
    name_ar: string;
  };
  customer?: {
    id: number;
    name_ar: string;
    code: string;
    balance: number;
    phone: string;
  };
  supplier?: {
    id: number;
    name_ar: string;
    code: string;
    balance: number;
    phone: string;
  };
  branch?: {
    id: number;
    name: string;
  };
  allocations?: VoucherAllocationItem[];
  journal_entry?: {
    id: number;
    entry_number: string;
    status: string;
    lines?: Array<{
      id: number;
      account_id: number;
      debit: number;
      credit: number;
      description: string;
      account?: {
        id: number;
        code: string;
        name_ar: string;
      };
    }>;
  };
}

export interface OpenInvoiceItem {
  invoice_id: number;
  invoice_number: string;
  supplier_invoice_number?: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  invoice_type: "sales_invoice" | "purchase_invoice";
}

export interface VoucherFilters {
  voucher_type?: string;
  status?: string;
  party_type?: string;
  party_id?: number;
  treasury_account_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  per_page?: number;
  page?: number;
}

export const treasuryApi = {
  getVouchers: async (filters: VoucherFilters = {}) => {
    const res = await axios.get("/api/v1/treasury/vouchers", { params: filters });
    return res.data;
  },

  getVoucher: async (id: number): Promise<VoucherRecord> => {
    const res = await axios.get(`/api/v1/treasury/vouchers/${id}`);
    return res.data.data;
  },

  createVoucher: async (payload: Record<string, any>): Promise<VoucherRecord> => {
    const res = await axios.post("/api/v1/treasury/vouchers", payload);
    return res.data.data;
  },

  updateVoucher: async (id: number, payload: Record<string, any>): Promise<VoucherRecord> => {
    const res = await axios.put(`/api/v1/treasury/vouchers/${id}`, payload);
    return res.data.data;
  },

  deleteVoucher: async (id: number) => {
    const res = await axios.delete(`/api/v1/treasury/vouchers/${id}`);
    return res.data;
  },

  postVoucher: async (id: number): Promise<VoucherRecord> => {
    const res = await axios.post(`/api/v1/treasury/vouchers/${id}/post`);
    return res.data.data;
  },

  cancelVoucher: async (id: number, reason: string): Promise<VoucherRecord> => {
    const res = await axios.post(`/api/v1/treasury/vouchers/${id}/cancel`, { reason });
    return res.data.data;
  },

  getOpenInvoices: async (partyType: "customer" | "supplier", partyId: number): Promise<OpenInvoiceItem[]> => {
    const res = await axios.get("/api/v1/treasury/open-invoices", {
      params: { party_type: partyType, party_id: partyId },
    });
    return res.data.data;
  },
};
