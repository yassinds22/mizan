import axios from "axios";

export type PartyType = "supplier" | "customer";

export type StatementDocumentType =
  | "purchase_invoice"
  | "sales_invoice"
  | "payment_voucher"
  | "receipt_voucher"
  | "sales_return"
  | "purchase_return"
  | "reversal";

export interface PartyStatementParty {
  id: number;
  type: PartyType;
  code: string;
  name: string;
  name_en?: string | null;
  tax_number?: string | null;
  commercial_register?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  operational_balance: number;
}

export interface PartyStatementTransaction {
  id: string;
  date: string;
  journal_entry_id: number;
  journal_entry_number: string;
  document_type: StatementDocumentType;
  document_type_label: string;
  document_id: number;
  document_number: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface PartyStatementReconciliation {
  statement_closing_balance: number;
  gl_all_time_balance: number;
  party_operational_balance: number;
  is_reconciled: boolean;
}

export interface PartyStatementData {
  party: PartyStatementParty;
  filters: {
    party_type: PartyType;
    party_id: number;
    date_from?: string | null;
    date_to?: string | null;
    branch_id?: number | null;
  };
  opening_balance: number;
  transactions: PartyStatementTransaction[];
  total_debit: number;
  total_credit: number;
  net_change: number;
  closing_balance: number;
  currency: string;
  reconciliation: PartyStatementReconciliation;
}

export interface PartyStatementFilters {
  party_type: PartyType;
  party_id: number;
  date_from?: string;
  date_to?: string;
  branch_id?: number;
}

export interface PartyStatementApiResponse {
  success: boolean;
  message: string;
  data: PartyStatementData;
}

export const fetchPartyStatement = async (
  filters: PartyStatementFilters
): Promise<PartyStatementData> => {
  const response = await axios.get<PartyStatementApiResponse>(
    "/api/v1/accounting/statements/party",
    { params: filters }
  );
  return response.data.data;
};
