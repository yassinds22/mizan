export interface AppUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  status: string;
}

export interface RoleMatrixItem {
  perm: string;
  manager: boolean;
  accountant: boolean;
  warehouse: boolean;
  sales: boolean;
}

export const appUsers: AppUserItem[] = [
  {
    id: "U-01",
    name: "ياسين المحاسبي",
    email: "yassin@moona.sa",
    role: "مدير مالي",
    branch: "الرياض",
    status: "نشط",
  },
  {
    id: "U-02",
    name: "نورة أمين المستودع",
    email: "nora@moona.sa",
    role: "أمين مستودع",
    branch: "الرياض",
    status: "نشط",
  },
  {
    id: "U-03",
    name: "خالد المحاسب",
    email: "khaled@moona.sa",
    role: "محاسب",
    branch: "الرياض",
    status: "نشط",
  },
  {
    id: "U-04",
    name: "سارة المبيعات",
    email: "sara@moona.sa",
    role: "مبيعات",
    branch: "جدة",
    status: "موقوف",
  },
];

export const roleMatrix: RoleMatrixItem[] = [
  { perm: "عرض لوحة التحكم", manager: true, accountant: true, warehouse: true, sales: true },
  { perm: "ترحيل القيود", manager: true, accountant: true, warehouse: false, sales: false },
  { perm: "إقفال الفترة", manager: true, accountant: false, warehouse: false, sales: false },
  { perm: "حركة المخزون والاستلام", manager: true, accountant: false, warehouse: true, sales: false },
  { perm: "فواتير البيع", manager: true, accountant: true, warehouse: false, sales: true },
  { perm: "تعديل التكلفة والأسعار", manager: true, accountant: true, warehouse: false, sales: false },
  { perm: "إهلاك الهدر", manager: true, accountant: true, warehouse: true, sales: false },
];
