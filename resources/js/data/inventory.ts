export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  unit: string;
  qty: number;
  reorder: number;
  cost: number;
  status: string;
  expiry: string;
}

export interface ItemBatch {
  batch: string;
  warehouse: string;
  qty: number;
  expiry: string;
  cost: number;
}

export const inventoryRows: InventoryItem[] = [
  {
    sku: "FD-10021",
    name: "أرز بسمتي 5 كجم",
    category: "حبوب",
    unit: "كيس",
    qty: 420,
    reorder: 150,
    cost: 28.5,
    status: "متوفر",
    expiry: "2027-03-12",
  },
  {
    sku: "FD-10088",
    name: "زيت ذرة 1.8 لتر",
    category: "زيوت",
    unit: "كرتون",
    qty: 64,
    reorder: 80,
    cost: 86,
    status: "منخفض",
    expiry: "2026-11-02",
  },
  {
    sku: "FD-10204",
    name: "حليب كامل الدسم 1 لتر",
    category: "ألبان",
    unit: "كرتون",
    qty: 112,
    reorder: 60,
    cost: 42,
    status: "متوفر",
    expiry: "2026-09-18",
  },
  {
    sku: "FD-10311",
    name: "دجاج مجمد 1 كجم",
    category: "مجمدات",
    unit: "كرتون",
    qty: 38,
    reorder: 50,
    cost: 95,
    status: "منخفض",
    expiry: "2026-10-01",
  },
  {
    sku: "FD-10450",
    name: "تمر سكري فاخر 3 كجم",
    category: "تمور",
    unit: "كرتون",
    qty: 210,
    reorder: 70,
    cost: 54,
    status: "متوفر",
    expiry: "2027-01-20",
  },
  {
    sku: "FD-10502",
    name: "طماطم معلبة 400 جم",
    category: "معلبات",
    unit: "كرتون",
    qty: 18,
    reorder: 40,
    cost: 31,
    status: "حرج",
    expiry: "2026-09-10",
  },
];

export const itemBatches: ItemBatch[] = [
  { batch: "B-4491", warehouse: "الثلاجة 1", qty: 42, expiry: "2026-09-10", cost: 42 },
  { batch: "B-4518", warehouse: "الثلاجة 2", qty: 70, expiry: "2026-10-02", cost: 41.5 },
  { batch: "B-4522", warehouse: "المستودع الرئيسي", qty: 0, expiry: "2026-08-20", cost: 40 },
];

export const inventoryFilterPresets = [
  { id: "all", label: "الكل", category: "all", status: "all" },
  { id: "low", label: "منخفض / حرج", category: "all", status: "low" },
  { id: "dairy", label: "الألبان فقط", category: "ألبان", status: "all" },
  { id: "frozen", label: "المجمدات", category: "مجمدات", status: "all" },
  { id: "expiring", label: "قرب انتهاء الصلاحية", category: "all", status: "expiring" },
] as const;
