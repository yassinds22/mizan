import axios from "axios";

// 1. ميزان المراجعة (Trial Balance)
export interface TrialBalanceAccountItem {
  id: number;
  code: string;
  name_ar: string;
  name_en: string | null;
  type: string;
  type_label: string;
  nature: string;
  level: number;
  parent_id: number | null;
  is_leaf: boolean;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

export interface TrialBalanceTotals {
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
  difference: number;
}

export interface TrialBalanceData {
  filters: {
    date_from: string;
    date_to: string;
    branch_id: number | null;
    cost_center_id: number | null;
    level: number | null;
  };
  accounts: TrialBalanceAccountItem[];
  totals: TrialBalanceTotals;
  is_balanced: boolean;
}

// 2. كشف دفتر الأستاذ العام (Account Ledger)
export interface AccountLedgerTransaction {
  line_id: number;
  account_id: number;
  journal_entry_id: number;
  entry_number: string;
  date: string;
  reference: string;
  description: string;
  source_type: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface AccountLedgerData {
  account: {
    id: number;
    code: string;
    name_ar: string;
    name_en: string | null;
    type: string;
    type_label: string;
    nature: string;
    level: number;
    is_leaf: boolean;
    parent?: {
      id: number;
      code: string;
      name_ar: string;
    } | null;
  };
  filters: {
    date_from: string | null;
    date_to: string;
    branch_id: number | null;
    cost_center_id: number | null;
  };
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  transactions: AccountLedgerTransaction[];
}

// 3. قائمة الدخل والأرباح والخسائر (Income Statement)
export interface IncomeStatementLineItem {
  account_id: number;
  code: string;
  name_ar: string;
  amount: number;
}

export interface IncomeStatementData {
  filters: {
    date_from: string;
    date_to: string;
    branch_id: number | null;
  };
  revenues: {
    items: IncomeStatementLineItem[];
    total: number;
  };
  cogs: {
    items: IncomeStatementLineItem[];
    total: number;
  };
  gross_profit: number;
  gross_margin_percent: number;
  operating_expenses: {
    items: IncomeStatementLineItem[];
    total: number;
  };
  net_profit: number;
  net_margin_percent: number;
}

// 4. الميزانية العمومية وقائمة المركز المالي (Balance Sheet)
export interface BalanceSheetAccountItem {
  account_id: number;
  code: string;
  name_ar: string;
  balance: number;
}

export interface BalanceSheetData {
  as_of_date: string;
  branch_id: number | null;
  assets: {
    items: BalanceSheetAccountItem[];
    total: number;
  };
  liabilities: {
    items: BalanceSheetAccountItem[];
    total: number;
  };
  equity: {
    items: BalanceSheetAccountItem[];
    current_period_net_profit: number;
    total_equity: number;
  };
  total_liabilities_and_equity: number;
  difference: number;
  is_balanced: boolean;
}

// 5. تقرير الموقف الضريبي (VAT Position Report)
export interface VatComponentData {
  account_name: string;
  gross_tax: number;
  adjustments_returns: number;
  net_tax: number;
  estimated_sales_base?: number;
  estimated_purchases_base?: number;
}

export interface VatPositionData {
  filters: {
    date_from: string;
    date_to: string;
    branch_id: number | null;
  };
  output_vat: VatComponentData;
  input_vat: VatComponentData;
  net_vat_position: {
    amount: number;
    status: "payable" | "refundable";
    status_label: string;
  };
}

// Generic API response
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// API functions
export const fetchTrialBalance = async (filters: {
  date_from?: string;
  date_to?: string;
  branch_id?: string | number;
  cost_center_id?: string | number;
  level?: number;
}): Promise<TrialBalanceData> => {
  const res = await axios.get<ApiResponse<TrialBalanceData>>(
    "/api/v1/accounting/reports/trial-balance",
    { params: filters }
  );
  return res.data.data;
};

export const fetchAccountLedger = async (
  accountId: number,
  filters: {
    date_from?: string;
    date_to?: string;
    branch_id?: string | number;
    cost_center_id?: string | number;
  }
): Promise<AccountLedgerData> => {
  const res = await axios.get<ApiResponse<AccountLedgerData>>(
    `/api/v1/accounting/reports/account-ledger/${accountId}`,
    { params: filters }
  );
  return res.data.data;
};

export const fetchIncomeStatement = async (filters: {
  date_from?: string;
  date_to?: string;
  branch_id?: string | number;
}): Promise<IncomeStatementData> => {
  const res = await axios.get<ApiResponse<IncomeStatementData>>(
    "/api/v1/accounting/reports/income-statement",
    { params: filters }
  );
  return res.data.data;
};

export const fetchBalanceSheet = async (filters: {
  as_of_date?: string;
  branch_id?: string | number;
}): Promise<BalanceSheetData> => {
  const res = await axios.get<ApiResponse<BalanceSheetData>>(
    "/api/v1/accounting/reports/balance-sheet",
    { params: filters }
  );
  return res.data.data;
};

export const fetchVatPosition = async (filters: {
  date_from?: string;
  date_to?: string;
  branch_id?: string | number;
}): Promise<VatPositionData> => {
  const res = await axios.get<ApiResponse<VatPositionData>>(
    "/api/v1/accounting/reports/vat-position",
    { params: filters }
  );
  return res.data.data;
};
