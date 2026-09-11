import axios from "axios";

export interface ExchangeRateApi {
  id: number;
  currency_id?: number;
  rate: string;
  valid_from: string;
  created_at?: string;
}

export interface CurrencyApi {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_base_currency: boolean;
  is_active: boolean;
  latest_exchange_rate?: ExchangeRateApi | null;
  exchange_rates?: ExchangeRateApi[];
}

export interface BranchApi {
  id: number;
  code: string;
  name: string;
  city: string | null;
  address: string | null;
  is_active: boolean;
}

export interface FiscalPeriodApi {
  id: number;
  fiscal_year_id: number;
  period_number: number;
  name: string;
  start_date: string;
  end_date: string;
  status: "open" | "closed" | "locked";
  status_label?: string;
  is_open?: boolean;
  is_closed?: boolean;
  is_locked?: boolean;
  fiscal_year?: {
    id: number;
    name: string;
    is_closed?: boolean;
  };
}

export interface FiscalYearApi {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  periods?: FiscalPeriodApi[];
}

export interface TaxRateApi {
  id: number;
  tax_category_id: number;
  rate: string;
  rate_float: number;
  valid_from: string;
  is_active: boolean;
  created_at?: string;
}

export interface TaxCategoryApi {
  id: number;
  code: string;
  name: string;
  description: string | null;
  label?: string;
  current_rate?: TaxRateApi | null;
  rates?: TaxRateApi[];
}

export const coreApi = {
  getCurrencies: async (filters?: { search?: string; is_active?: boolean }): Promise<CurrencyApi[]> => {
    const res = await axios.get<any>("/api/v1/core/currencies", { params: filters });
    return Array.isArray(res.data) ? res.data : (res.data.data || []);
  },

  createCurrency: async (payload: {
    code: string;
    name: string;
    symbol: string;
    decimal_places?: number;
    is_base_currency?: boolean;
    initial_rate?: number;
  }): Promise<CurrencyApi> => {
    const res = await axios.post<any>("/api/v1/core/currencies", payload);
    return res.data.data || res.data;
  },

  updateCurrency: async (
    id: number,
    payload: Partial<{ code: string; name: string; symbol: string; decimal_places: number; is_base_currency: boolean; is_active: boolean }>
  ): Promise<CurrencyApi> => {
    const res = await axios.put<any>(`/api/v1/core/currencies/${id}`, payload);
    return res.data.data || res.data;
  },

  deleteCurrency: async (id: number): Promise<{ message: string }> => {
    const res = await axios.delete<{ message: string }>(`/api/v1/core/currencies/${id}`);
    return res.data;
  },

  addExchangeRate: async (
    currencyId: number,
    payload: { rate: number; valid_from?: string }
  ): Promise<ExchangeRateApi> => {
    const res = await axios.post<any>(
      `/api/v1/core/currencies/${currencyId}/rates`,
      payload
    );
    return res.data.data || res.data;
  },

  getExchangeRatesHistory: async (currencyId: number): Promise<ExchangeRateApi[]> => {
    const res = await axios.get<any>(`/api/v1/core/currencies/${currencyId}/rates`);
    return Array.isArray(res.data) ? res.data : (res.data.data || []);
  },

  toggleCurrency: async (currencyId: number): Promise<CurrencyApi> => {
    const res = await axios.patch<any>(
      `/api/v1/core/currencies/${currencyId}/toggle`
    );
    return res.data.data || res.data;
  },

  getBranches: async (filters?: { search?: string; is_active?: boolean }): Promise<BranchApi[]> => {
    const res = await axios.get<any>("/api/v1/core/branches", { params: filters });
    return Array.isArray(res.data) ? res.data : (res.data.data || []);
  },

  createBranch: async (payload: {
    code: string;
    name: string;
    city?: string;
    address?: string;
    is_active?: boolean;
  }): Promise<BranchApi> => {
    const res = await axios.post<any>("/api/v1/core/branches", payload);
    return res.data.data || res.data;
  },

  updateBranch: async (
    id: number,
    payload: Partial<{ code: string; name: string; city: string; address: string; is_active: boolean }>
  ): Promise<BranchApi> => {
    const res = await axios.put<any>(`/api/v1/core/branches/${id}`, payload);
    return res.data.data || res.data;
  },

  deleteBranch: async (id: number): Promise<{ message: string }> => {
    const res = await axios.delete<{ message: string }>(`/api/v1/core/branches/${id}`);
    return res.data;
  },

  toggleBranch: async (id: number): Promise<BranchApi> => {
    const res = await axios.patch<any>(`/api/v1/core/branches/${id}/toggle`);
    return res.data.data || res.data;
  },

  getFiscalYears: async (): Promise<FiscalYearApi[]> => {
    const res = await axios.get<any>("/api/v1/core/fiscal-years");
    return Array.isArray(res.data) ? res.data : (res.data.data || []);
  },

  createFiscalYear: async (payload: {
    name: string;
    year: number;
    start_date?: string;
    end_date?: string;
  }): Promise<FiscalYearApi> => {
    const res = await axios.post<any>("/api/v1/core/fiscal-years", payload);
    return res.data.data || res.data;
  },

  closeFiscalYear: async (id: number): Promise<FiscalYearApi> => {
    const res = await axios.patch<any>(`/api/v1/core/fiscal-years/${id}/close`);
    return res.data.data || res.data;
  },

  getFiscalPeriods: async (filters?: { fiscal_year_id?: number; status?: string }): Promise<FiscalPeriodApi[]> => {
    const res = await axios.get<any>("/api/v1/core/fiscal-periods", { params: filters });
    return Array.isArray(res.data) ? res.data : (res.data.data || []);
  },

  updateFiscalPeriodStatus: async (id: number, status: "open" | "closed" | "locked"): Promise<FiscalPeriodApi> => {
    const res = await axios.patch<any>(`/api/v1/core/fiscal-periods/${id}/status`, { status });
    return res.data.data || res.data;
  },

  closeFiscalPeriod: async (id: number): Promise<FiscalPeriodApi> => {
    const res = await axios.patch<any>(`/api/v1/core/fiscal-periods/${id}/close`);
    return res.data.data || res.data;
  },

  reopenFiscalPeriod: async (id: number): Promise<FiscalPeriodApi> => {
    const res = await axios.patch<any>(`/api/v1/core/fiscal-periods/${id}/reopen`);
    return res.data.data || res.data;
  },

  checkPostingDate: async (date: string): Promise<{ allowed: boolean; message: string; period?: FiscalPeriodApi }> => {
    const res = await axios.post<{ allowed: boolean; message: string; period?: FiscalPeriodApi }>(
      "/api/v1/core/fiscal-periods/check-date",
      { date }
    );
    return res.data;
  },

  getTaxCategories: async (): Promise<TaxCategoryApi[]> => {
    const res = await axios.get<any>("/api/v1/core/tax-categories");
    return Array.isArray(res.data) ? res.data : (res.data.data || []);
  },

  updateTaxCategory: async (
    id: number,
    payload: { name?: string; description?: string }
  ): Promise<TaxCategoryApi> => {
    const res = await axios.put<any>(`/api/v1/core/tax-categories/${id}`, payload);
    return res.data.data || res.data;
  },

  addTaxRate: async (
    categoryId: number,
    payload: { rate: number; valid_from: string; is_active?: boolean }
  ): Promise<TaxRateApi> => {
    const res = await axios.post<any>(
      `/api/v1/core/tax-categories/${categoryId}/rates`,
      payload
    );
    return res.data.data || res.data;
  },

  getTaxRatesHistory: async (categoryId: number): Promise<TaxRateApi[]> => {
    const res = await axios.get<any>(`/api/v1/core/tax-categories/${categoryId}/rates`);
    return Array.isArray(res.data) ? res.data : (res.data.data || []);
  },

  calculateTax: async (payload: {
    taxable_amount: number;
    category: string | number;
    date?: string;
  }): Promise<{ rate: number; tax_amount: number; total_with_tax: number; category_code: string }> => {
    const res = await axios.post<any>("/api/v1/core/tax-categories/calculate", payload);
    return res.data.data || res.data;
  },

  getSettings: async (): Promise<SystemSettingsApi> => {
    const res = await axios.get<any>("/api/v1/core/settings");
    return res.data.data || res.data;
  },

  updateSettings: async (payload: Partial<SystemSettingsApi>): Promise<{ message: string; data: SystemSettingsApi }> => {
    const res = await axios.post<any>("/api/v1/core/settings", payload);
    return res.data;
  },

  getSystemStatus: async (): Promise<{
    company_name: string;
    legal_name: string;
    vat_number: string;
    commercial_register: string;
    city: string;
    address: string;
    phone: string;
    setup_completed: boolean;
    setup_completed_at: string | null;
  }> => {
    const res = await axios.get<any>("/api/v1/core/settings/status");
    return res.data.data || res.data;
  },

  initClient: async (payload: {
    company_name: string;
    legal_name?: string;
    vat_number?: string;
    commercial_register?: string;
    city?: string;
    address?: string;
    phone?: string;
    branch_name?: string;
    base_currency?: string;
    vat_rate?: number;
  }): Promise<{ message: string; data: any; company: any; branch: any; accounting: any }> => {
    const res = await axios.post<any>("/api/v1/core/settings/init-client", payload);
    return res.data;
  },

  getResetPreview: async (): Promise<{
    company_name: string;
    counts: {
      sales_invoices: number;
      sales_invoice_items: number;
      journal_entries: number;
      journal_entry_lines: number;
      customers: number;
    };
    total_records_to_wipe: number;
    preserved_entities: string[];
  }> => {
    const res = await axios.get<any>("/api/v1/core/settings/reset-preview");
    return res.data.data || res.data;
  },

  resetData: async (payload: {
    confirmation_name: string;
  }): Promise<{
    success: boolean;
    message: string;
    backup: {
      filename: string;
      size_kb: number;
      driver: string;
    };
    deleted_records: any;
  }> => {
    const res = await axios.post<any>("/api/v1/core/settings/reset-data", payload);
    return res.data;
  },
};

export interface SystemSettingsApi {
  company_name?: string;
  tax_number?: string;
  cr_number?: string;
  city?: string;
  address?: string;
  logo_text?: string;
  footer_text?: string;
  legal_note?: string;
  paper_type?: "thermal" | "a4";
  show_qr?: string | boolean;
  vat_rate?: string;
  fiscal_start_date?: string;
  stock_policy?: string;
  base_currency_code?: string;
  selected_currency?: string;
  [key: string]: any;
}
