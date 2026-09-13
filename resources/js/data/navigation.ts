import type { NavGroup, PageId, PageMetaItem } from "@/types/navigation";

export const navGroups: NavGroup[] = [
  {
    label: "التشغيل",
    items: [
      { id: "dashboard", label: "لوحة التحكم", icon: "LayoutDashboard" },
      { id: "inventory", label: "المخزون والأصناف", icon: "Package", permission: "inventory.view" },
      { id: "warehouses", label: "المستودعات", icon: "Warehouse", permission: "inventory.warehouses.manage" },
      { id: "stock-move", label: "حركة المخزون", icon: "ArrowLeftRight", permission: "inventory.movements.view" },
      { id: "stocktake", label: "الجرد المخزني الفعلي", icon: "ClipboardCheck", permission: "inventory.stocktake.manage" },
      { id: "inventory-valuation", label: "تقييم المخزون المالي", icon: "BarChart3", permission: "inventory.valuation.view" },
      { id: "purchases", label: "المشتريات والموردين", icon: "Truck", permission: "purchases.invoices.view" },
      { id: "sales", label: "المبيعات والعملاء", icon: "ShoppingCart", permission: "sales.invoices.view" },
      { id: "partners", label: "العملاء والموردون", icon: "Users", permission: "sales.customers.view" },
    ],
  },
  {
    label: "المالية والجودة",
    items: [
      { id: "vouchers", label: "سندات القبض والصرف", icon: "Receipt", permission: "treasury.vouchers.view" },
      { id: "party-statement", label: "كشف حساب مورد / عميل", icon: "FileText", permission: "accounting.statements.view" },
      { id: "accounting", label: "الحسابات العامة", icon: "BookOpen", permission: "accounting.chart.view" },
      { id: "currencies", label: "العملات وأسعار الصرف", icon: "Coins", permission: "settings.currencies.manage" },
      { id: "expiry", label: "الصلاحية والدفعات", icon: "CalendarClock", permission: "expiry.dashboard.view" },
      { id: "fefo", label: "إدارة FEFO", icon: "ListOrdered", permission: "expiry.fefo.view" },
      { id: "waste-alerts", label: "تنبيهات الهدر", icon: "Siren", permission: "inventory.waste.create" },
      { id: "reports", label: "التقارير", icon: "FileBarChart", permission: "reports.trial_balance.view" },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { id: "period-close", label: "إقفال الفترة", icon: "Lock", permission: "accounting.period.close" },
      { id: "users-roles", label: "المستخدمون والصلاحيات", icon: "Shield", permission: "users.view" },
      { id: "settings", label: "إعدادات الشركة", icon: "Settings", permission: "settings.view" },
      { id: "system-states", label: "حالات النظام", icon: "Layers", permission: "settings.view" },
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
  stocktake: {
    title: "الجرد المخزني الفعلي وتسوية الفروقات",
    subtitle: "جلسات الجرد الميداني، الفروقات الكمية والمالية، وترحيل قيود التسوية آلياً",
  },
  "inventory-valuation": {
    title: "تقييم المخزون المالي والرقابة التحليلية",
    subtitle: "تقييم رأس المال المخزني بالتكلفة وسعر البيع والمطابقة اللحظية مع الأستاذ العام",
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
  currencies: {
    title: "إدارة العملات وأسعار الصرف",
    subtitle: "العملة الأساسية للنظام، العملات الأجنبية، وسجل أسعار الصرف التاريخية",
  },
  "system-states": {
    title: "حالات النظام",
    subtitle: "تحميل، فراغ، خطأ، وبدون صلاحية",
  },
  vouchers: {
    title: "سندات القبض والصرف",
    subtitle: "إدارة الخزينة، تحصيل العملاء، سداد الموردين، والمصروفات المباشرة",
  },
  "voucher-doc": {
    title: "محرر السند المالي",
    subtitle: "إنشاء وترحيل سند قبض أو صرف مع تخصيص الفواتير والطباعة",
  },
  "party-statement": {
    title: "كشف حساب مورد / عميل",
    subtitle: "كشف الحساب المالي الموحد معتمد مباشرة من دفتر الأستاذ العام",
  },
  "account-ledger": {
    title: "دفتر الأستاذ العام",
    subtitle: "كشف حركات الحساب والرصيد التراكمي اللحظي",
  },
  "balance-sheet": {
    title: "الميزانية العمومية والمركز المالي",
    subtitle: "الأصول، الالتزامات، وحقوق الملكية مع التحقق من المعادلة المحاسبية",
  },
  "vat-position": {
    title: "الموقف الضريبي (VAT)",
    subtitle: "صافي ضريبة القيمة المضافة لهيئة الزكاة والضريبة والجمارك",
  },
};

