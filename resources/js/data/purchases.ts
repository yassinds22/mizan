export interface PurchaseOrderItem {
  no: string;
  supplier: string;
  date: string;
  items: number;
  total: number;
  status: string;
}

export const purchaseRows: PurchaseOrderItem[] = [
  {
    no: "PO-260904",
    supplier: "شركة النخيل للتجارة",
    date: "2026-09-04",
    items: 14,
    total: 48200,
    status: "قيد الاستلام",
  },
  {
    no: "PO-260901",
    supplier: "مصنع الألبان المتحدة",
    date: "2026-09-01",
    items: 6,
    total: 21450,
    status: "مكتمل",
  },
  {
    no: "PO-260828",
    supplier: "مجمدات الخليج",
    date: "2026-08-28",
    items: 9,
    total: 67300,
    status: "جزئي",
  },
  {
    no: "PO-260820",
    supplier: "مؤسسة الحبوب الذهبية",
    date: "2026-08-20",
    items: 11,
    total: 39120,
    status: "مسودة",
  },
];
