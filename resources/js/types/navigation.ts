export type PageId =
  | "dashboard"
  | "inventory"
  | "purchases"
  | "sales"
  | "accounting"
  | "expiry"
  | "reports"
  | "partners"
  | "item-detail"
  | "invoice"
  | "purchase-doc"
  | "journal-entry"
  | "warehouses"
  | "stock-move"
  | "stocktake"
  | "inventory-valuation"
  | "fefo"
  | "waste-alerts"
  | "trial-balance"
  | "profit-loss"
  | "aging"
  | "period-close"
  | "users-roles"
  | "settings"
  | "currencies"
  | "system-states"
  | "vouchers"
  | "voucher-doc"
  | "party-statement"
  | "account-ledger"
  | "balance-sheet"
  | "vat-position";

export type Navigate = (page: PageId) => void;

export interface NavItem {
  id: PageId;
  label: string;
  icon: string;
  permission?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface PageMetaItem {
  title: string;
  subtitle: string;
}

export interface SearchHit {
  id: string;
  type: string;
  title: string;
  meta: string;
  page: PageId;
}

export interface NotificationItem {
  id: string;
  title: string;
  time: string;
  tone: "danger" | "warn" | "info";
  page: PageId;
}
