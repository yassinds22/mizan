export interface PartnerItem {
  id: string;
  kind: "عميل" | "مورد";
  name: string;
  phone: string;
  city: string;
  balance: number;
  creditLimit: number;
  status: string;
}

export const partners: PartnerItem[] = [
  {
    id: "C-101",
    kind: "عميل",
    name: "سوبرماركت الواحة",
    phone: "0501234567",
    city: "الرياض",
    balance: 0,
    creditLimit: 50000,
    status: "نشط",
  },
  {
    id: "C-108",
    kind: "عميل",
    name: "تموينات الرائد",
    phone: "0559876543",
    city: "جدة",
    balance: 9650,
    creditLimit: 30000,
    status: "نشط",
  },
  {
    id: "C-112",
    kind: "عميل",
    name: "مطاعم البحر الأحمر",
    phone: "0531122334",
    city: "الدمام",
    balance: 7400,
    creditLimit: 40000,
    status: "مراقبة",
  },
  {
    id: "S-201",
    kind: "مورد",
    name: "شركة النخيل للتجارة",
    phone: "0112345678",
    city: "الرياض",
    balance: 48200,
    creditLimit: 200000,
    status: "نشط",
  },
  {
    id: "S-205",
    kind: "مورد",
    name: "مصنع الألبان المتحدة",
    phone: "0123456789",
    city: "الخرج",
    balance: 0,
    creditLimit: 150000,
    status: "نشط",
  },
  {
    id: "S-210",
    kind: "مورد",
    name: "مجمدات الخليج",
    phone: "0135566778",
    city: "الدمام",
    balance: 22100,
    creditLimit: 180000,
    status: "نشط",
  },
];
