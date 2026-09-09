export interface WarehouseItem {
  id: string;
  name: string;
  type: string;
  temp: string;
  capacity: number;
  used: number;
  skus: number;
  status: string;
}

export interface StockMoveItem {
  no: string;
  type: string;
  item: string;
  from: string;
  to: string;
  qty: number;
  batch: string;
  date: string;
  status: string;
}

export const warehouses: WarehouseItem[] = [
  {
    id: "WH-01",
    name: "المستودع الرئيسي",
    type: "جاف",
    temp: "18–22°م",
    capacity: 1000,
    used: 720,
    skus: 186,
    status: "طبيعي",
  },
  {
    id: "WH-02",
    name: "الثلاجة 1",
    type: "مبرد",
    temp: "2–6°م",
    capacity: 200,
    used: 168,
    skus: 42,
    status: "قرب الامتلاء",
  },
  {
    id: "WH-03",
    name: "الثلاجة 2",
    type: "مبرد",
    temp: "2–6°م",
    capacity: 180,
    used: 95,
    skus: 28,
    status: "طبيعي",
  },
  {
    id: "WH-04",
    name: "المجمدات",
    type: "مجمّد",
    temp: "-18°م",
    capacity: 250,
    used: 210,
    skus: 35,
    status: "مراقبة حرارة",
  },
];

export const stockMoves: StockMoveItem[] = [
  {
    no: "MV-4410",
    type: "تحويل",
    item: "حليب كامل الدسم 1 لتر",
    from: "الثلاجة 1",
    to: "الثلاجة 2",
    qty: 20,
    batch: "B-4491",
    date: "2026-09-04",
    status: "مكتمل",
  },
  {
    no: "MV-4408",
    type: "تسوية",
    item: "زبادي طبيعي 170 جم",
    from: "الثلاجة 2",
    to: "—",
    qty: -8,
    batch: "B-4510",
    date: "2026-09-04",
    status: "مكتمل",
  },
  {
    no: "MV-4402",
    type: "صرف",
    item: "زيت ذرة 1.8 لتر",
    from: "المستودع الرئيسي",
    to: "مبيعات",
    qty: -24,
    batch: "B-4488",
    date: "2026-09-03",
    status: "مكتمل",
  },
  {
    no: "MV-4395",
    type: "تحويل",
    item: "دجاج مجمد 1 كجم",
    from: "المجمدات",
    to: "المستودع الرئيسي",
    qty: 10,
    batch: "B-4528",
    date: "2026-09-02",
    status: "مسودة",
  },
];
