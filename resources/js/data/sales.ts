export interface SalesInvoiceItem {
  no: string;
  customer: string;
  date: string;
  total: number;
  due: number;
  status: string;
}

export const salesRows: SalesInvoiceItem[] = [
  {
    no: "INV-88421",
    customer: "سوبرماركت الواحة",
    date: "2026-09-04",
    total: 12840,
    due: 0,
    status: "مدفوعة",
  },
  {
    no: "INV-88418",
    customer: "تموينات الرائد",
    date: "2026-09-03",
    total: 9650,
    due: 9650,
    status: "آجلة",
  },
  {
    no: "INV-88410",
    customer: "مطاعم البحر الأحمر",
    date: "2026-09-02",
    total: 21400,
    due: 7400,
    status: "جزئي",
  },
  {
    no: "INV-88392",
    customer: "هايبر المدينة",
    date: "2026-08-30",
    total: 45200,
    due: 0,
    status: "مدفوعة",
  },
];
