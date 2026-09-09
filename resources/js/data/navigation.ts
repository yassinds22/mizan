import type { NavGroup, PageId, PageMetaItem } from "@/types/navigation";

export const navGroups: NavGroup[] = [
  {
    label: "التشغيل",
    items: [
      { id: "dashboard", label: "لوحة التحكم", icon: "LayoutDashboard" },
      { id: "inventory", label: "المخزون والأصناف", icon: "Package" },
      { id: "warehouses", label: "المستودعات", icon: "Warehouse" },
      { id: "stock-move", label: "حركة المخزون", icon: "ArrowLeftRight" },
      { id: "purchases", label: "المشتريات والموردين", icon: "Truck" },
      { id: "sales", label: "المبيعات والعملاء", icon: "ShoppingCart" },
      { id: "partners", label: "العملاء والموردون", icon: "Users" },
    ],
  },
  {
    label: "المالية والجودة",
    items: [
      { id: "accounting", label: "الحسابات العامة", icon: "BookOpen" },
      { id: "expiry", label: "الصلاحية والدفعات", icon: "CalendarClock" },
      { id: "fefo", label: "إدارة FEFO", icon: "ListOrdered" },
      { id: "waste-alerts", label: "تنبيهات الهدر", icon: "Siren" },
      { id: "reports", label: "التقارير", icon: "FileBarChart" },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { id: "period-close", label: "إقفال الفترة", icon: "Lock" },
      { id: "users-roles", label: "المستخدمون والصلاحيات", icon: "Shield" },
      { id: "settings", label: "إعدادات الشركة", icon: "Settings" },
      { id: "system-states", label: "حالات النظام", icon: "Layers" },
    ],
  },
];

export const pageMeta: Record<PageId, PageMetaItem> = {
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
