export interface ExpiryBatchItem {
  batch: string;
  item: string;
  warehouse: string;
  qty: number;
  expiry: string;
  days: number;
  risk: "عالي" | "متوسط" | "منخفض";
}

export interface FefoSuggestionItem {
  batch: string;
  item: string;
  warehouse: string;
  qty: number;
  days: number;
  value: number;
  action: string;
  priority: "عالي" | "متوسط" | "منخفض";
}

export interface WasteAlertItem {
  id: string;
  title: string;
  detail: string;
  tone: "danger" | "warn" | "info";
  actions: string[];
}

export const expiryBatches: ExpiryBatchItem[] = [
  {
    batch: "B-4491",
    item: "حليب كامل الدسم 1 لتر",
    warehouse: "الثلاجة 1",
    qty: 42,
    expiry: "2026-09-10",
    days: 6,
    risk: "عالي",
  },
  {
    batch: "B-4502",
    item: "طماطم معلبة 400 جم",
    warehouse: "المستودع الرئيسي",
    qty: 18,
    expiry: "2026-09-12",
    days: 8,
    risk: "عالي",
  },
  {
    batch: "B-4510",
    item: "زبادي طبيعي 170 جم",
    warehouse: "الثلاجة 2",
    qty: 96,
    expiry: "2026-09-16",
    days: 12,
    risk: "متوسط",
  },
  {
    batch: "B-4528",
    item: "دجاج مجمد 1 كجم",
    warehouse: "المجمدات",
    qty: 38,
    expiry: "2026-10-01",
    days: 27,
    risk: "منخفض",
  },
];

export const fefoSuggestions: FefoSuggestionItem[] = [
  {
    batch: "B-4491",
    item: "حليب كامل الدسم 1 لتر",
    warehouse: "الثلاجة 1",
    qty: 42,
    days: 6,
    value: 1764,
    action: "خصم ترويجي 15%",
    priority: "عالي",
  },
  {
    batch: "B-4502",
    item: "طماطم معلبة 400 جم",
    warehouse: "المستودع الرئيسي",
    qty: 18,
    days: 8,
    value: 558,
    action: "صرف للمبيعات أولاً",
    priority: "عالي",
  },
  {
    batch: "B-4510",
    item: "زبادي طبيعي 170 جم",
    warehouse: "الثلاجة 2",
    qty: 96,
    days: 12,
    value: 2880,
    action: "عرض جملة للمطاعم",
    priority: "متوسط",
  },
  {
    batch: "B-4528",
    item: "دجاج مجمد 1 كجم",
    warehouse: "المجمدات",
    qty: 38,
    days: 27,
    value: 3610,
    action: "إبقاء FEFO عادي",
    priority: "منخفض",
  },
];

export const wasteAlerts: WasteAlertItem[] = [
  {
    id: "W-01",
    title: "حليب ينتهي خلال 6 أيام",
    detail: "دفعة B-4491 · 42 كرتون · قيمة 1,764 ر.س",
    tone: "danger",
    actions: ["خصم ترويجي", "تحويل للمبيعات", "إهلاك"],
  },
  {
    id: "W-02",
    title: "طماطم معلبة تحت حد الطلب وقرب الصلاحية",
    detail: "رصيد 18 · ينتهي 2026-09-12 · حد الطلب 40",
    tone: "warn",
    actions: ["أمر شراء", "صرف FEFO", "خصم"],
  },
  {
    id: "W-03",
    title: "زبادي — اقتراح عرض جملة",
    detail: "96 وحدة تنتهي خلال 12 يومًا",
    tone: "warn",
    actions: ["إنشاء عرض سعر", "تحويل مستودع"],
  },
  {
    id: "W-04",
    title: "درجة حرارة المجمدات مرتفعة قليلاً",
    detail: "القراءة الحالية -15°م · المطلوب -18°م",
    tone: "info",
    actions: ["تسجيل ملاحظة", "فتح حركة فحص"],
  },
];
