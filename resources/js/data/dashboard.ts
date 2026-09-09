import type { NotificationItem } from "@/types/navigation";

export interface KPIItem {
  title: string;
  value: string;
  hint: string;
  delta: string;
  deltaDown?: boolean;
  tone: "info" | "warm" | "danger" | "";
  icon: string;
}

export const kpis: KPIItem[] = [
  {
    title: "قيمة المخزون",
    value: "1.84 م",
    hint: "ريال — متوسط التكلفة المرجح",
    delta: "+4.2%",
    tone: "info",
    icon: "Warehouse",
  },
  {
    title: "مبيعات اليوم",
    value: "62,450",
    hint: "48 فاتورة · متوسط السلة 1,301",
    delta: "+12%",
    tone: "",
    icon: "TrendingUp",
  },
  {
    title: "أصناف قاربت النفاد",
    value: "23",
    hint: "أقل من حد إعادة الطلب",
    delta: "عاجل",
    deltaDown: true,
    tone: "warm",
    icon: "AlertTriangle",
  },
  {
    title: "دفعات تنتهي خلال 14 يوم",
    value: "11",
    hint: "قيمة معرضة للهدر: 18,920",
    delta: "مراقبة",
    deltaDown: true,
    tone: "danger",
    icon: "Timer",
  },
];

export const notifications: NotificationItem[] = [
  {
    id: "n1",
    title: "دفعة حليب تنتهي خلال 6 أيام — الثلاجة 1",
    time: "منذ 12 دقيقة",
    tone: "danger",
    page: "expiry",
  },
  {
    id: "n2",
    title: "أرز بسمتي وصل حد إعادة الطلب",
    time: "منذ 34 دقيقة",
    tone: "warn",
    page: "inventory",
  },
  {
    id: "n3",
    title: "فاتورة INV-88420 بحاجة لمطابقة الدفع",
    time: "منذ ساعة",
    tone: "info",
    page: "sales",
  },
];
