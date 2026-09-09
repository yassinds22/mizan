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
  | "fefo"
  | "waste-alerts"
  | "trial-balance"
  | "profit-loss"
  | "aging"
  | "period-close"
  | "users-roles"
  | "settings"
  | "system-states";

export const navGroups = [
  {
    label: "التشغيل",
    items: [
      { id: "dashboard" as const, label: "لوحة التحكم", icon: "LayoutDashboard" },
      { id: "inventory" as const, label: "المخزون والأصناف", icon: "Package" },
      { id: "warehouses" as const, label: "المستودعات", icon: "Warehouse" },
      { id: "stock-move" as const, label: "حركة المخزون", icon: "ArrowLeftRight" },
      { id: "purchases" as const, label: "المشتريات والموردين", icon: "Truck" },
      { id: "sales" as const, label: "المبيعات والعملاء", icon: "ShoppingCart" },
      { id: "partners" as const, label: "العملاء والموردون", icon: "Users" },
    ],
  },
  {
    label: "المالية والجودة",
    items: [
      { id: "accounting" as const, label: "الحسابات العامة", icon: "BookOpen" },
      { id: "expiry" as const, label: "الصلاحية والدفعات", icon: "CalendarClock" },
      { id: "fefo" as const, label: "إدارة FEFO", icon: "ListOrdered" },
      { id: "waste-alerts" as const, label: "تنبيهات الهدر", icon: "Siren" },
      { id: "reports" as const, label: "التقارير", icon: "FileBarChart" },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { id: "period-close" as const, label: "إقفال الفترة", icon: "Lock" },
      { id: "users-roles" as const, label: "المستخدمون والصلاحيات", icon: "Shield" },
      { id: "settings" as const, label: "إعدادات الشركة", icon: "Settings" },
      { id: "system-states" as const, label: "حالات النظام", icon: "Layers" },
    ],
  },
];

export const pageMeta: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: {
    title: "لوحة التحكم",
    subtitle: "نظرة يومية على المخزون، الصلاحية، والتدفق النقدي",
  },
  inventory: {
    title: "المخزون والأصناف",
    subtitle: "أصناف غذائية بوحدات، دفعات، ومستويات إعادة الطلب",
  },
  purchases: {
    title: "المشتريات والموردين",
    subtitle: "أوامر الشراء، فواتير الموردين، واستلام المستودعات",
  },
  sales: {
    title: "المبيعات والعملاء",
    subtitle: "فواتير البيع، التسعير، وحدود الائتمان",
  },
  accounting: {
    title: "الحسابات العامة",
    subtitle: "دليل الحسابات، القيود اليومية، والأرصدة",
  },
  expiry: {
    title: "الصلاحية والدفعات",
    subtitle: "تنبيهات انتهاء الصلاحية وسياسة FEFO",
  },
  reports: {
    title: "التقارير",
    subtitle: "تقارير مالية وتشغيلية جاهزة للطباعة",
  },
  partners: {
    title: "العملاء والموردون",
    subtitle: "البطاقات، الأرصدة، وحدود الائتمان",
  },
  "item-detail": {
    title: "بطاقة الصنف",
    subtitle: "الوحدات، التكلفة، حدود الطلب، والدفعات",
  },
  invoice: {
    title: "فاتورة بيع",
    subtitle: "بنود، خصم، ضريبة، ومعاينة الطباعة",
  },
  "purchase-doc": {
    title: "أمر شراء واستلام",
    subtitle: "بنود الطلب، الاستلام، والدفعات مع الصلاحية",
  },
  "journal-entry": {
    title: "قيد يومية",
    subtitle: "مدين ودائن مع معاينة الترحيل",
  },
  warehouses: {
    title: "المستودعات والمواقع",
    subtitle: "رئيسي، ثلاجة، مجمدات — الطاقة والحرارة",
  },
  "stock-move": {
    title: "حركة المخزون",
    subtitle: "تحويل بين مستودعات، صرف، وتسوية",
  },
  fefo: {
    title: "إدارة FEFO",
    subtitle: "أول ما ينتهي يُصرف أولاً — اقتراحات البيع والخصم",
  },
  "waste-alerts": {
    title: "تنبيهات الهدر",
    subtitle: "إجراءات مباشرة قبل انتهاء الصلاحية",
  },
  "trial-balance": {
    title: "ميزان المراجعة",
    subtitle: "أرصدة الحسابات حتى تاريخ محدد",
  },
  "profit-loss": {
    title: "الأرباح والخسائر",
    subtitle: "هامش الربح بعد التكلفة وهدر الصلاحية",
  },
  aging: {
    title: "أعمار الذمم",
    subtitle: "مستحقات العملاء والموردين حسب الشرائح الزمنية",
  },
  "period-close": {
    title: "إقفال الفترة",
    subtitle: "قفل الترحيل بعد مراجعة الإقفال",
  },
  "users-roles": {
    title: "المستخدمون والصلاحيات",
    subtitle: "أدوار: محاسب · أمين مستودع · مدير",
  },
  settings: {
    title: "إعدادات الشركة",
    subtitle: "البيانات الضريبية، السنة المالية، والطباعة",
  },
  "system-states": {
    title: "حالات النظام",
    subtitle: "تحميل، فراغ، خطأ، وبدون صلاحية",
  },
};

export const kpis = [
  {
    title: "قيمة المخزون",
    value: "1.84 م",
    hint: "ريال — متوسط التكلفة المرجح",
    delta: "+4.2%",
    tone: "info" as const,
    icon: "Warehouse",
  },
  {
    title: "مبيعات اليوم",
    value: "62,450",
    hint: "48 فاتورة · متوسط السلة 1,301",
    delta: "+12%",
    tone: "" as const,
    icon: "TrendingUp",
  },
  {
    title: "أصناف قاربت النفاد",
    value: "23",
    hint: "أقل من حد إعادة الطلب",
    delta: "عاجل",
    deltaDown: true,
    tone: "warm" as const,
    icon: "AlertTriangle",
  },
  {
    title: "دفعات تنتهي خلال 14 يوم",
    value: "11",
    hint: "قيمة معرضة للهدر: 18,920",
    delta: "مراقبة",
    deltaDown: true,
    tone: "danger" as const,
    icon: "Timer",
  },
];

export const inventoryRows = [
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

export const purchaseRows = [
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

export const salesRows = [
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

export const expiryBatches = [
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

export const accounts = [
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

export const journalRows = [
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

export const reportCards = [
  {
    title: "ميزان المراجعة",
    desc: "أرصدة الحسابات حتى تاريخ اليوم مع فلتر فرع ومستودع",
    tag: "محاسبي",
    page: "trial-balance" as PageId,
  },
  {
    title: "حركة المخزون",
    desc: "دخول / خروج / تسوية حسب الصنف والدفعات",
    tag: "تشغيلي",
    page: "stock-move" as PageId,
  },
  {
    title: "أرباح وخسائر الفترة",
    desc: "هامش الربح بعد تكلفة البضاعة وهدر الصلاحية",
    tag: "محاسبي",
    page: "profit-loss" as PageId,
  },
  {
    title: "تقرير FEFO",
    desc: "أول ما ينتهي يُصرف أولاً — دفعات مقترحة للبيع",
    tag: "جودة",
    page: "fefo" as PageId,
  },
  {
    title: "أعمار الذمم",
    desc: "مستحقات العملاء والموردين حسب الشرائح الزمنية",
    tag: "تحصيل",
    page: "aging" as PageId,
  },
  {
    title: "أصناف بطيئة الحركة",
    desc: "أصناف لم تتحرك خلال 45 يوماً مع اقتراح ترويج",
    tag: "تشغيلي",
    page: "inventory" as PageId,
  },
];

export function money(n: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(n);
}

export type SearchHit = {
  id: string;
  type: "صنف" | "فاتورة" | "شراء" | "قيد" | "دفعة";
  title: string;
  meta: string;
  page: PageId;
};

export const notifications = [
  {
    id: "n1",
    tone: "danger" as const,
    title: "دفعة حليب تنتهي خلال 6 أيام",
    time: "منذ 12 دقيقة",
    page: "expiry" as PageId,
  },
  {
    id: "n2",
    tone: "warn" as const,
    title: "طماطم معلبة تحت حد إعادة الطلب",
    time: "منذ ساعة",
    page: "inventory" as PageId,
  },
  {
    id: "n3",
    tone: "info" as const,
    title: "استلام جزئي لأمر PO-260828",
    time: "اليوم 08:40",
    page: "purchases" as PageId,
  },
  {
    id: "n4",
    tone: "ok" as const,
    title: "تم ترحيل قيد JV-9021 بنجاح",
    time: "اليوم 08:15",
    page: "accounting" as PageId,
  },
];

export function buildSearchIndex(): SearchHit[] {
  return [
    ...inventoryRows.map((r) => ({
      id: r.sku,
      type: "صنف" as const,
      title: r.name,
      meta: `${r.sku} · ${r.category} · رصيد ${r.qty}`,
      page: "inventory" as PageId,
    })),
    ...salesRows.map((r) => ({
      id: r.no,
      type: "فاتورة" as const,
      title: r.no,
      meta: `${r.customer} · ${money(r.total)} ر.س`,
      page: "sales" as PageId,
    })),
    ...purchaseRows.map((r) => ({
      id: r.no,
      type: "شراء" as const,
      title: r.no,
      meta: `${r.supplier} · ${r.status}`,
      page: "purchases" as PageId,
    })),
    ...journalRows.map((r) => ({
      id: r.no,
      type: "قيد" as const,
      title: r.no,
      meta: r.desc,
      page: "accounting" as PageId,
    })),
    ...expiryBatches.map((r) => ({
      id: r.batch,
      type: "دفعة" as const,
      title: r.batch,
      meta: `${r.item} · ينتهي ${r.expiry}`,
      page: "expiry" as PageId,
    })),
  ];
}

export const inventoryFilterPresets = [
  { id: "all", label: "الكل", category: "all", status: "all" },
  { id: "low", label: "منخفض / حرج", category: "all", status: "low" },
  { id: "dairy", label: "الألبان فقط", category: "ألبان", status: "all" },
  { id: "frozen", label: "المجمدات", category: "مجمدات", status: "all" },
  { id: "expiring", label: "قرب انتهاء الصلاحية", category: "all", status: "expiring" },
] as const;

export const partners = [
  {
    id: "C-101",
    kind: "عميل" as const,
    name: "سوبرماركت الواحة",
    phone: "0501234567",
    city: "الرياض",
    balance: 0,
    creditLimit: 50000,
    status: "نشط",
  },
  {
    id: "C-108",
    kind: "عميل" as const,
    name: "تموينات الرائد",
    phone: "0559876543",
    city: "جدة",
    balance: 9650,
    creditLimit: 30000,
    status: "نشط",
  },
  {
    id: "C-112",
    kind: "عميل" as const,
    name: "مطاعم البحر الأحمر",
    phone: "0531122334",
    city: "الدمام",
    balance: 7400,
    creditLimit: 40000,
    status: "مراقبة",
  },
  {
    id: "S-201",
    kind: "مورد" as const,
    name: "شركة النخيل للتجارة",
    phone: "0112345678",
    city: "الرياض",
    balance: 48200,
    creditLimit: 200000,
    status: "نشط",
  },
  {
    id: "S-205",
    kind: "مورد" as const,
    name: "مصنع الألبان المتحدة",
    phone: "0123456789",
    city: "الخرج",
    balance: 0,
    creditLimit: 150000,
    status: "نشط",
  },
  {
    id: "S-210",
    kind: "مورد" as const,
    name: "مجمدات الخليج",
    phone: "0135566778",
    city: "الدمام",
    balance: 22100,
    creditLimit: 180000,
    status: "نشط",
  },
];

export const itemBatches = [
  { batch: "B-4491", warehouse: "الثلاجة 1", qty: 42, expiry: "2026-09-10", cost: 42 },
  { batch: "B-4518", warehouse: "الثلاجة 2", qty: 70, expiry: "2026-10-02", cost: 41.5 },
  { batch: "B-4522", warehouse: "المستودع الرئيسي", qty: 0, expiry: "2026-08-20", cost: 40 },
];

export const warehouses = [
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

export const stockMoves = [
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

export const fefoSuggestions = [
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

export const wasteAlerts = [
  {
    id: "W-01",
    title: "حليب ينتهي خلال 6 أيام",
    detail: "دفعة B-4491 · 42 كرتون · قيمة 1,764 ر.س",
    tone: "danger" as const,
    actions: ["خصم ترويجي", "تحويل للمبيعات", "إهلاك"],
  },
  {
    id: "W-02",
    title: "طماطم معلبة تحت حد الطلب وقرب الصلاحية",
    detail: "رصيد 18 · ينتهي 2026-09-12 · حد الطلب 40",
    tone: "warn" as const,
    actions: ["أمر شراء", "صرف FEFO", "خصم"],
  },
  {
    id: "W-03",
    title: "زبادي — اقتراح عرض جملة",
    detail: "96 وحدة تنتهي خلال 12 يومًا",
    tone: "warn" as const,
    actions: ["إنشاء عرض سعر", "تحويل مستودع"],
  },
  {
    id: "W-04",
    title: "درجة حرارة المجمدات مرتفعة قليلاً",
    detail: "القراءة الحالية -15°م · المطلوب -18°م",
    tone: "info" as const,
    actions: ["تسجيل ملاحظة", "فتح حركة فحص"],
  },
];

export const trialBalanceRows = [
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

export const profitLossRows = [
  { group: "إيرادات", name: "مبيعات التجزئة", amount: 842150 },
  { group: "إيرادات", name: "خصومات قرب الصلاحية", amount: -21400 },
  { group: "تكلفة", name: "تكلفة البضاعة المباعة", amount: -611200 },
  { group: "تكلفة", name: "هدر وانتهاء صلاحية", amount: -18920 },
  { group: "تشغيل", name: "نقل وتبريد", amount: -18600 },
  { group: "تشغيل", name: "رواتب المستودع", amount: -23520 },
];

export const agingCustomers = [
  { name: "تموينات الرائد", current: 0, d30: 9650, d60: 0, d90: 0, older: 0 },
  { name: "مطاعم البحر الأحمر", current: 7400, d30: 0, d60: 0, d90: 0, older: 0 },
  { name: "هايبر المدينة", current: 0, d30: 0, d60: 12800, d90: 0, older: 0 },
  { name: "سوبرماركت الواحة", current: 0, d30: 0, d60: 0, d90: 0, older: 0 },
];

export const agingSuppliers = [
  { name: "شركة النخيل للتجارة", current: 48200, d30: 0, d60: 0, d90: 0, older: 0 },
  { name: "مجمدات الخليج", current: 0, d30: 22100, d60: 0, d90: 0, older: 0 },
  { name: "مصنع الألبان المتحدة", current: 0, d30: 0, d60: 0, d90: 0, older: 0 },
];

export const closeChecklist = [
  { id: "c1", label: "ترحيل كل قيود المبيعات والمشتريات", done: true },
  { id: "c2", label: "مطابقة أرصدة المخزون مع الجرد", done: true },
  { id: "c3", label: "إهلاك الدفعات المنتهية (حساب 5200)", done: false },
  { id: "c4", label: "مراجعة أعمار الذمم فوق 60 يومًا", done: false },
  { id: "c5", label: "مراجعة ميزان المراجعة — متوازن", done: true },
  { id: "c6", label: "اعتماد المدير المالي للإقفال", done: false },
];

export const appUsers = [
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

export const roleMatrix = [
  { perm: "عرض لوحة التحكم", manager: true, accountant: true, warehouse: true, sales: true },
  { perm: "ترحيل القيود", manager: true, accountant: true, warehouse: false, sales: false },
  { perm: "إقفال الفترة", manager: true, accountant: false, warehouse: false, sales: false },
  { perm: "حركة المخزون والاستلام", manager: true, accountant: false, warehouse: true, sales: false },
  { perm: "فواتير البيع", manager: true, accountant: true, warehouse: false, sales: true },
  { perm: "تعديل التكلفة والأسعار", manager: true, accountant: true, warehouse: false, sales: false },
  { perm: "إهلاك الهدر", manager: true, accountant: true, warehouse: true, sales: false },
];


