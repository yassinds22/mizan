import axios from "axios";

export type AccountTypeEnum = "asset" | "liability" | "equity" | "revenue" | "expense";
export type AccountNatureEnum = "debit" | "credit";
export type JournalStatusEnum = "draft" | "posted" | "reversed";
export type JournalSourceTypeEnum =
  | "manual"
  | "sales_invoice"
  | "sales_return"
  | "purchase_invoice"
  | "purchase_return"
  | "payment_voucher"
  | "receipt_voucher"
  | "inventory_adjustment"
  | "period_closing"
  | "opening_balance"
  | "pos_session";

export interface AccountApi {
  id: number;
  code: string;
  name_ar: string;
  name_en?: string | null;
  parent_id?: number | null;
  parent_code?: string | null;
  parent_name?: string | null;
  type: {
    value: AccountTypeEnum;
    label: string;
    is_balance_sheet: boolean;
    is_income_statement: boolean;
  };
  nature: {
    value: AccountNatureEnum;
    label: string;
  };
  level: number;
  is_leaf: boolean;
  is_active: boolean;
  can_post: boolean;
  description?: string | null;
  created_at?: string;
}

export interface AccountTreeApi {
  id: number;
  code: string;
  name_ar: string;
  name_en?: string | null;
  parent_id?: number | null;
  type: {
    value: AccountTypeEnum;
    label: string;
  };
  nature: {
    value: AccountNatureEnum;
    label: string;
  };
  level: number;
  is_leaf: boolean;
  is_active: boolean;
  can_post: boolean;
  children?: AccountTreeApi[];
}

export interface CostCenterApi {
  id: number;
  code: string;
  name_ar: string;
  name_en?: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  is_active: boolean;
  description?: string | null;
}

export interface JournalEntryLineApi {
  id?: number;
  journal_entry_id?: number;
  account_id: number;
  account_code?: string;
  account_name?: string;
  cost_center_id?: number | null;
  cost_center_name?: string | null;
  debit: number;
  credit: number;
  currency_id?: number | null;
  exchange_rate?: number;
  foreign_debit?: number | null;
  foreign_credit?: number | null;
  description?: string | null;
  line_order?: number;
}

export interface JournalEntryApi {
  id: number;
  entry_number: string;
  date: string;
  branch_id: number;
  branch_name?: string;
  fiscal_period_id: number;
  fiscal_period_name?: string;
  status: {
    value: JournalStatusEnum;
    label: string;
    is_draft: boolean;
    is_posted: boolean;
    is_reversed: boolean;
  };
  source_type: {
    value: JournalSourceTypeEnum;
    label: string;
  };
  source_id?: number | null;
  source_reference?: string | null;
  reversal_of_id?: number | null;
  reversed_by_id?: number | null;
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  description?: string | null;
  notes?: string | null;
  posted_at?: string | null;
  posted_by?: number | null;
  created_at?: string;
  lines?: JournalEntryLineApi[];
}

export interface CreateAccountPayload {
  code: string;
  name_ar: string;
  name_en?: string;
  parent_id?: number | null;
  type?: AccountTypeEnum;
  nature?: AccountNatureEnum;
  is_leaf?: boolean;
  is_active?: boolean;
  description?: string;
}

export interface CreateJournalEntryPayload {
  date?: string;
  branch_id: number;
  source_type?: JournalSourceTypeEnum;
  source_id?: number;
  source_reference?: string;
  description?: string;
  notes?: string;
  post_now?: boolean;
  lines: {
    account_id: number;
    cost_center_id?: number | null;
    debit?: number;
    credit?: number;
    currency_id?: number | null;
    exchange_rate?: number;
    description?: string;
  }[];
}

export const accountingApi = {
  // 1. دليل الحسابات
  getAccounts: async (params: Record<string, any> = {}): Promise<AccountApi[]> => {
    const res = await axios.get<any>("/api/v1/accounting/accounts", { params });
    return Array.isArray(res.data) ? res.data : (res.data.data || []);
  },

  getAccountTree: async (): Promise<AccountTreeApi[]> => {
    const res = await axios.get<any>("/api/v1/accounting/accounts/tree");
    return Array.isArray(res.data) ? res.data : (res.data.data || []);
  },

  getLeafAccounts: async (): Promise<AccountApi[]> => {
    const res = await axios.get<any>("/api/v1/accounting/accounts/leaf");
    return Array.isArray(res.data) ? res.data : (res.data.data || []);
  },

  getAccount: async (id: number): Promise<AccountApi> => {
    const res = await axios.get<any>(`/api/v1/accounting/accounts/${id}`);
    return res.data.data || res.data;
  },

  createAccount: async (payload: CreateAccountPayload): Promise<AccountApi> => {
    const res = await axios.post<any>("/api/v1/accounting/accounts", payload);
    return res.data.data || res.data;
  },

  updateAccount: async (id: number, payload: Partial<CreateAccountPayload>): Promise<AccountApi> => {
    const res = await axios.put<any>(`/api/v1/accounting/accounts/${id}`, payload);
    return res.data.data || res.data;
  },

  deleteAccount: async (id: number): Promise<{ message: string }> => {
    const res = await axios.delete<any>(`/api/v1/accounting/accounts/${id}`);
    return res.data;
  },

  // 2. قيود اليومية
  getJournalEntries: async (params: Record<string, any> = {}): Promise<{ data: JournalEntryApi[]; meta?: any }> => {
    const res = await axios.get<any>("/api/v1/accounting/journal-entries", { params });
    if (Array.isArray(res.data)) {
      return { data: res.data };
    }
    return {
      data: res.data.data || [],
      meta: res.data.meta,
    };
  },

  getJournalEntry: async (id: number): Promise<JournalEntryApi> => {
    const res = await axios.get<any>(`/api/v1/accounting/journal-entries/${id}`);
    return res.data.data || res.data;
  },

  createJournalEntry: async (payload: CreateJournalEntryPayload): Promise<JournalEntryApi> => {
    const res = await axios.post<any>("/api/v1/accounting/journal-entries", payload);
    return res.data.data || res.data;
  },

  updateJournalEntry: async (id: number, payload: Partial<CreateJournalEntryPayload>): Promise<JournalEntryApi> => {
    const res = await axios.put<any>(`/api/v1/accounting/journal-entries/${id}`, payload);
    return res.data.data || res.data;
  },

  deleteJournalEntry: async (id: number): Promise<{ message: string }> => {
    const res = await axios.delete<any>(`/api/v1/accounting/journal-entries/${id}`);
    return res.data;
  },

  postJournalEntry: async (id: number): Promise<JournalEntryApi> => {
    const res = await axios.post<any>(`/api/v1/accounting/journal-entries/${id}/post`);
    return res.data.data || res.data;
  },

  reverseJournalEntry: async (id: number, payload: { reason: string; reversal_date?: string }): Promise<JournalEntryApi> => {
    const res = await axios.post<any>(`/api/v1/accounting/journal-entries/${id}/reverse`, payload);
    return res.data.data || res.data;
  },

  // 3. مراكز التكلفة
  getCostCenters: async (params: Record<string, any> = {}): Promise<CostCenterApi[]> => {
    const res = await axios.get<any>("/api/v1/accounting/cost-centers", { params });
    return Array.isArray(res.data) ? res.data : (res.data.data || []);
  },

  createCostCenter: async (payload: {
    code: string;
    name_ar: string;
    name_en?: string;
    branch_id?: number | null;
    is_active?: boolean;
    description?: string;
  }): Promise<CostCenterApi> => {
    const res = await axios.post<any>("/api/v1/accounting/cost-centers", payload);
    return res.data.data || res.data;
  },
};
