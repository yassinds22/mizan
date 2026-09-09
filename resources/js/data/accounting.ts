import type { PageId } from "@/types/navigation";

export interface AccountItem {
  code: string;
  name: string;
  level: number;
}

export interface JournalRowItem {
  no: string;
  date: string;
  desc: string;
  debit: number;
  credit: number;
  status: string;
}

export interface ReportCardItem {
  title: string;
  desc: string;
  tag: string;
  page: PageId;
}

export interface TrialBalanceRowItem {
  code: string;
  name: string;
  debit: number;
  credit: number;
}

export interface ProfitLossRowItem {
  group: string;
  name: string;
  amount: number;
}

export interface AgingCustomerItem {
  name: string;
  current: number;
  d30: number;
  d60: number;
  d90: number;
  older: number;
}

export interface AgingSupplierItem {
  name: string;
  current: number;
  d30: number;
  d60: number;
  d90: number;
  older: number;
}

export interface CloseChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export const accounts: AccountItem[] = [
  { code: "1000", name: "الأصول", level: 0 },
  { code: "1100", name: "النقدية والبنوك", level: 1 },
  { code: "1200", name: "المخزون — مواد غذائية", level: 1 },
  { code: "1210", name: "مخزون مجمدات", level: 2 },
  { code: "1220", name: "مخزون ألبان", level: 2 },
  { code: "2000", name: "الخصوم", level: 0 },
  { code: "2100", name: "الموردون", level: 1 },
  { code: "4000", name: "الإيرادات", level: 0 },
  { code: "4100", name: "مبيعات التجزئة", level: 1 },
  { code: "5000", name: "المصروفات", level: 0 },
  { code: "5100", name: "تكلفة البضاعة المباعة", level: 1 },
  { code: "5200", name: "هدر وانتهاء صلاحية", level: 1 },
];

export const journalRows: JournalRowItem[] = [
  {
    no: "JV-9021",
    date: "2026-09-04",
    desc: "استلام فاتورة مورد — زيت وذرة",
    debit: 21450,
    credit: 21450,
    status: "مرحّل",
  },
  {
    no: "JV-9018",
    date: "2026-09-03",
    desc: "مبيعات آجلة — تموينات الرائد",
    debit: 9650,
    credit: 9650,
    status: "مرحّل",
  },
  {
    no: "JV-9012",
    date: "2026-09-02",
    desc: "إهلاك دفعة منتهية — زبادي",
    debit: 1280,
    credit: 1280,
    status: "مسودة",
  },
];

export const reportCards: ReportCardItem[] = [
  {
    title: "ميزان المراجعة",
    desc: "أرصدة الحسابات حتى تاريخ اليوم مع فلتر فرع ومستودع",
    tag: "محاسبي",
    page: "trial-balance",
  },
  {
    title: "حركة المخزون",
    desc: "دخول / خروج / تسوية حسب الصنف والدفعات",
    tag: "تشغيلي",
    page: "stock-move",
  },
  {
    title: "أرباح وخسائر الفترة",
    desc: "هامش الربح بعد تكلفة البضاعة وهدر الصلاحية",
    tag: "محاسبي",
    page: "profit-loss",
  },
  {
    title: "تقرير FEFO",
    desc: "أول ما ينتهي يُصرف أولاً — دفعات مقترحة للبيع",
    tag: "جودة",
    page: "fefo",
  },
  {
    title: "أعمار الذمم",
    desc: "مستحقات العملاء والموردين حسب الشرائح الزمنية",
    tag: "تحصيل",
    page: "aging",
  },
  {
    title: "أصناف بطيئة الحركة",
    desc: "أصناف لم تتحرك خلال 45 يوماً مع اقتراح ترويج",
    tag: "تشغيلي",
    page: "inventory",
  },
];

export const trialBalanceRows: TrialBalanceRowItem[] = [
  { code: "1100", name: "النقدية والبنوك", debit: 214800, credit: 0 },
  { code: "1200", name: "المخزون — مواد غذائية", debit: 1708200, credit: 0 },
  { code: "1210", name: "مخزون مجمدات", debit: 286400, credit: 0 },
  { code: "1220", name: "مخزون ألبان", debit: 142000, credit: 0 },
  { code: "1300", name: "العملاء", debit: 17050, credit: 0 },
  { code: "2100", name: "الموردون", debit: 0, credit: 70300 },
  { code: "2200", name: "ضريبة القيمة المضافة", debit: 0, credit: 18640 },
  { code: "3100", name: "رأس المال", debit: 0, credit: 1800000 },
  { code: "3200", name: "أرباح محتجزة", debit: 0, credit: 309600 },
  { code: "4100", name: "مبيعات التجزئة", debit: 0, credit: 842150 },
  { code: "5100", name: "تكلفة البضاعة المباعة", debit: 611200, credit: 0 },
  { code: "5200", name: "هدر وانتهاء صلاحية", debit: 18920, credit: 0 },
  { code: "5300", name: "مصروفات تشغيل", debit: 42120, credit: 0 },
];

export const profitLossRows: ProfitLossRowItem[] = [
  { group: "إيرادات", name: "مبيعات التجزئة", amount: 842150 },
  { group: "إيرادات", name: "خصومات قرب الصلاحية", amount: -21400 },
  { group: "تكلفة", name: "تكلفة البضاعة المباعة", amount: -611200 },
  { group: "تكلفة", name: "هدر وانتهاء صلاحية", amount: -18920 },
  { group: "تشغيل", name: "نقل وتبريد", amount: -18600 },
  { group: "تشغيل", name: "رواتب المستودع", amount: -23520 },
];

export const agingCustomers: AgingCustomerItem[] = [
  { name: "تموينات الرائد", current: 0, d30: 9650, d60: 0, d90: 0, older: 0 },
  { name: "مطاعم البحر الأحمر", current: 7400, d30: 0, d60: 0, d90: 0, older: 0 },
  { name: "هايبر المدينة", current: 0, d30: 0, d60: 12800, d90: 0, older: 0 },
  { name: "سوبرماركت الواحة", current: 0, d30: 0, d60: 0, d90: 0, older: 0 },
];

export const agingSuppliers: AgingSupplierItem[] = [
  { name: "شركة النخيل للتجارة", current: 48200, d30: 0, d60: 0, d90: 0, older: 0 },
  { name: "مجمدات الخليج", current: 0, d30: 22100, d60: 0, d90: 0, older: 0 },
  { name: "مصنع الألبان المتحدة", current: 0, d30: 0, d60: 0, d90: 0, older: 0 },
];

export const closeChecklist: CloseChecklistItem[] = [
  { id: "c1", label: "ترحيل كل قيود المبيعات والمشتريات", done: true },
  { id: "c2", label: "مطابقة أرصدة المخزون مع الجرد", done: true },
  { id: "c3", label: "إهلاك الدفعات المنتهية (حساب 5200)", done: false },
  { id: "c4", label: "مراجعة أعمار الذمم فوق 60 يومًا", done: false },
  { id: "c5", label: "مراجعة ميزان المراجعة — متوازن", done: true },
  { id: "c6", label: "اعتماد المدير المالي للإقفال", done: false },
];
