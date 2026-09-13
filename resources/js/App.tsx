import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/modules/dashboard/DashboardPage";
import { InventoryPage } from "@/modules/inventory/pages/InventoryPage";
import { ItemDetailPage } from "@/modules/inventory/pages/ItemDetailPage";
import { WarehousesPage } from "@/modules/warehouses/pages/WarehousesPage";
import { StockMovePage } from "@/modules/warehouses/pages/StockMovePage";
import { PhysicalStocktakePage } from "@/modules/inventory/pages/PhysicalStocktakePage";
import { InventoryValuationPage } from "@/modules/inventory/pages/InventoryValuationPage";
import { SalesPage } from "@/modules/sales/pages/SalesPage";
import { InvoicePage } from "@/modules/sales/pages/InvoicePage";
import { PurchasesPage } from "@/modules/purchases/pages/PurchasesPage";
import { PurchaseDocPage } from "@/modules/purchases/pages/PurchaseDocPage";
import { PartnersPage } from "@/modules/partners/pages/PartnersPage";
import { AccountingPage } from "@/modules/accounting/pages/AccountingPage";
import { JournalEntryPage } from "@/modules/accounting/pages/JournalEntryPage";
import { TrialBalancePage } from "@/modules/accounting/pages/TrialBalancePage";
import { AccountLedgerPage } from "@/modules/accounting/pages/AccountLedgerPage";
import { ProfitLossPage } from "@/modules/accounting/pages/ProfitLossPage";
import { BalanceSheetPage } from "@/modules/accounting/pages/BalanceSheetPage";
import { VatPositionPage } from "@/modules/accounting/pages/VatPositionPage";
import { AgingPage } from "@/modules/accounting/pages/AgingPage";
import { PeriodClosePage } from "@/modules/accounting/pages/PeriodClosePage";
import { ExpiryPage } from "@/modules/expiry/pages/ExpiryPage";
import { FefoPage } from "@/modules/expiry/pages/FefoPage";
import { WasteAlertsPage } from "@/modules/expiry/pages/WasteAlertsPage";
import { ReportsPage } from "@/modules/reports/pages/ReportsPage";
import { SettingsPage } from "@/modules/settings/pages/SettingsPage";
import { CurrenciesPage } from "@/modules/accounting/pages/CurrenciesPage";
import { UsersRolesPage } from "@/modules/settings/pages/UsersRolesPage";
import { SystemStatesPage } from "@/modules/settings/pages/SystemStatesPage";
import { VouchersPage } from "@/modules/treasury/pages/VouchersPage";
import { VoucherDocPage } from "@/modules/treasury/pages/VoucherDocPage";
import { PartyStatementPage } from "@/modules/accounting/pages/PartyStatementPage";
import { ShieldAlert } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { LoginPage } from "@/modules/auth/LoginPage";
import type { PageId } from "@/types/navigation";

const PAGE_PERMISSIONS: Partial<Record<PageId, string>> = {
  inventory: "inventory.view",
  "item-detail": "products.view",
  warehouses: "inventory.warehouses.manage",
  "stock-move": "inventory.movements.view",
  stocktake: "inventory.stocktake.manage",
  "inventory-valuation": "inventory.valuation.view",
  purchases: "purchases.invoices.view",
  "purchase-doc": "purchases.invoices.view",
  sales: "sales.invoices.view",
  invoice: "sales.invoices.view",
  partners: "sales.customers.view",
  vouchers: "treasury.vouchers.view",
  "voucher-doc": "treasury.vouchers.view",
  "party-statement": "accounting.statements.view",
  accounting: "accounting.chart.view",
  "journal-entry": "accounting.journals.view",
  "account-ledger": "accounting.ledger.view",
  "trial-balance": "reports.trial_balance.view",
  "profit-loss": "reports.profit_loss.view",
  "balance-sheet": "reports.balance_sheet.view",
  "vat-position": "reports.vat.view",
  aging: "reports.aging.view",
  "period-close": "accounting.period.close",
  expiry: "expiry.dashboard.view",
  fefo: "expiry.fefo.view",
  "waste-alerts": "inventory.waste.create",
  reports: "reports.trial_balance.view",
  settings: "settings.view",
  currencies: "settings.currencies.manage",
  "users-roles": "users.view",
  "system-states": "settings.view",
};

const VALID_PAGES: Set<string> = new Set([
  "dashboard",
  "inventory",
  "purchases",
  "sales",
  "accounting",
  "expiry",
  "reports",
  "partners",
  "item-detail",
  "invoice",
  "purchase-doc",
  "journal-entry",
  "warehouses",
  "stock-move",
  "stocktake",
  "inventory-valuation",
  "fefo",
  "waste-alerts",
  "trial-balance",
  "profit-loss",
  "aging",
  "period-close",
  "users-roles",
  "settings",
  "currencies",
  "system-states",
  "vouchers",
  "voucher-doc",
  "party-statement",
  "account-ledger",
  "balance-sheet",
  "vat-position",
]);

const getInitialPage = (): PageId => {
  const path = window.location.pathname.replace(/^\/+/, "");
  if (VALID_PAGES.has(path)) {
    return path as PageId;
  }
  const saved = localStorage.getItem("mizan_current_page");
  if (saved && VALID_PAGES.has(saved)) {
    return saved as PageId;
  }
  return "dashboard";
};

export const App: React.FC = () => {
  const { can, isSuperAdmin, currentUser } = usePermissions();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem("mizan_auth_token");
  });
  const [currentPage, setCurrentPageState] = useState<PageId>(getInitialPage);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [voucherInitialType, setVoucherInitialType] = useState<"receipt" | "payment">("receipt");
  const [statementPartyType, setStatementPartyType] = useState<"supplier" | "customer">("supplier");
  const [statementPartyId, setStatementPartyId] = useState<number | undefined>(undefined);
  const [selectedAccountIdForLedger, setSelectedAccountIdForLedger] = useState<number | null>(null);

  React.useEffect(() => {
    const handleLogout = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener("mizan_auth_logout", handleLogout);
    return () => window.removeEventListener("mizan_auth_logout", handleLogout);
  }, []);

  const setCurrentPage = (page: PageId) => {
    setCurrentPageState(page);
    try {
      localStorage.setItem("mizan_current_page", page);
      const targetUrl = page === "dashboard" ? "/" : `/${page}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ page }, "", targetUrl);
      }
    } catch (e) {
      console.warn("Navigation state sync warning:", e);
    }
  };

  React.useEffect(() => {
    // تزامن عند تحميل الصفحة لأول مرة لتحديث الرابط في شريط المتصفح
    const currentUrl = currentPage === "dashboard" ? "/" : `/${currentPage}`;
    if (window.location.pathname !== currentUrl) {
      window.history.replaceState({ page: currentPage }, "", currentUrl);
    }

    // دعم أزرار الرجوع والتقدم في المتصفح (Browser Back/Forward)
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+/, "") || "dashboard";
      if (VALID_PAGES.has(path)) {
        setCurrentPageState(path as PageId);
        localStorage.setItem("mizan_current_page", path);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentPage]);

  const renderScreen = () => {
    // صمام أمان الصلاحيات: فحص ما إذا كانت الصفحة تتطلب تصريحاً خاصاً
    const requiredPermission = PAGE_PERMISSIONS[currentPage];
    if (requiredPermission && !isSuperAdmin && !can(requiredPermission)) {
      return (
        <div style={{ padding: "80px 20px", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              background: "var(--card-bg, #fff)",
              borderRadius: 24,
              padding: "44px 36px",
              maxWidth: 520,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
              border: "1px solid var(--border-color, #e2e8f0)",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#b91c1c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <ShieldAlert size={38} />
            </div>
            <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: "#1e293b" }}>
              غير مصرح بالوصول (403 Forbidden)
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--muted, #64748b)", lineHeight: 1.6 }}>
              حسابك الحالي <strong>({currentUser?.name || "المستخدم"})</strong> بدور{" "}
              <strong>[{currentUser?.primary_role || "مستخدم"}]</strong> لا يمتلك الصلاحية المطلوبة لعرض هذه الشاشة.
            </p>
            <div
              style={{
                background: "var(--panel-bg, #f8fafc)",
                padding: "10px 16px",
                borderRadius: 10,
                fontSize: 12,
                marginBottom: 24,
                display: "inline-block",
                border: "1px solid #e2e8f0",
              }}
            >
              كود الصلاحية المطلوب:{" "}
              <code style={{ color: "#b91c1c", fontWeight: 700 }}>{requiredPermission}</code>
            </div>
            <div>
              <button
                onClick={() => setCurrentPage("dashboard")}
                className="btn btn-primary"
                style={{ padding: "10px 28px", borderRadius: 10, fontWeight: 700, fontSize: 14 }}
              >
                العودة للوحة التحكم الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={setCurrentPage} />;
      case "inventory":
        return (
          <InventoryPage
            onOpenItem={(id) => {
              setSelectedItemId(id || null);
              setCurrentPage("item-detail");
            }}
          />
        );
      case "item-detail":
        return <ItemDetailPage itemId={selectedItemId} onBack={() => setCurrentPage("inventory")} />;
      case "warehouses":
        return <WarehousesPage />;
      case "stock-move":
        return <StockMovePage />;
      case "stocktake":
        return <PhysicalStocktakePage />;
      case "inventory-valuation":
        return (
          <InventoryValuationPage
            onOpenItemCard={(id) => {
              setSelectedItemId(id);
              setCurrentPage("item-detail");
            }}
          />
        );
      case "sales":
        return (
          <SalesPage
            onOpenInvoice={(id) => {
              setSelectedInvoiceId(id || null);
              setCurrentPage("invoice");
            }}
            onOpenPartners={() => setCurrentPage("partners")}
          />
        );
      case "invoice":
        return (
          <InvoicePage
            invoiceIdToView={selectedInvoiceId}
            onBack={() => {
              setSelectedInvoiceId(null);
              setCurrentPage("sales");
            }}
          />
        );
      case "purchases":
        return (
          <PurchasesPage
            onOpenDoc={(id) => {
              setSelectedPurchaseId(id || null);
              setCurrentPage("purchase-doc");
            }}
          />
        );
      case "purchase-doc":
        return (
          <PurchaseDocPage
            purchaseIdToView={selectedPurchaseId}
            onBack={() => {
              setSelectedPurchaseId(null);
              setCurrentPage("purchases");
            }}
          />
        );
      case "partners":
        return (
          <PartnersPage
            onOpenInvoice={() => setCurrentPage("invoice")}
            onOpenStatement={(type, id) => {
              setStatementPartyType(type);
              setStatementPartyId(id);
              setCurrentPage("party-statement");
            }}
          />
        );
      case "accounting":
        return (
          <AccountingPage
            onOpenJournal={() => setCurrentPage("journal-entry")}
          />
        );
      case "journal-entry":
        return <JournalEntryPage onBack={() => setCurrentPage("accounting")} />;
      case "trial-balance":
        return (
          <TrialBalancePage
            onNavigate={(page, params) => {
              if (params?.account_id) setSelectedAccountIdForLedger(params.account_id);
              setCurrentPage(page as PageId);
            }}
            onOpenLedger={(accId) => {
              setSelectedAccountIdForLedger(accId);
              setCurrentPage("account-ledger");
            }}
          />
        );
      case "account-ledger":
        return (
          <AccountLedgerPage
            initialAccountId={selectedAccountIdForLedger}
            onNavigate={(page) => setCurrentPage(page as PageId)}
          />
        );
      case "profit-loss":
        return (
          <ProfitLossPage
            onNavigate={(page, params) => {
              if (params?.account_id) setSelectedAccountIdForLedger(params.account_id);
              setCurrentPage(page as PageId);
            }}
            onOpenLedger={(accId) => {
              setSelectedAccountIdForLedger(accId);
              setCurrentPage("account-ledger");
            }}
          />
        );
      case "balance-sheet":
        return (
          <BalanceSheetPage
            onNavigate={(page, params) => {
              if (params?.account_id) setSelectedAccountIdForLedger(params.account_id);
              setCurrentPage(page as PageId);
            }}
            onOpenLedger={(accId) => {
              setSelectedAccountIdForLedger(accId);
              setCurrentPage("account-ledger");
            }}
          />
        );
      case "vat-position":
        return (
          <VatPositionPage
            onNavigate={(page) => setCurrentPage(page as PageId)}
          />
        );
      case "aging":
        return <AgingPage />;
      case "period-close":
        return <PeriodClosePage />;
      case "expiry":
        return (
          <ExpiryPage
            onOpenFefo={() => setCurrentPage("fefo")}
            onOpenWaste={() => setCurrentPage("waste-alerts")}
          />
        );
      case "fefo":
        return <FefoPage onOpenInvoice={() => setCurrentPage("invoice")} />;
      case "waste-alerts":
        return (
          <WasteAlertsPage
            onOpenFefo={() => setCurrentPage("fefo")}
            onOpenPurchase={() => setCurrentPage("purchase-doc")}
            onOpenMove={() => setCurrentPage("stock-move")}
          />
        );
      case "reports":
        return <ReportsPage onOpen={(page) => setCurrentPage(page)} />;
      case "settings":
        return <SettingsPage onNavigate={setCurrentPage} />;
      case "currencies":
        return <CurrenciesPage />;
      case "users-roles":
        return <UsersRolesPage />;
      case "system-states":
        return <SystemStatesPage />;
      case "vouchers":
        return (
          <VouchersPage
            onOpenDoc={(id, type) => {
              setSelectedVoucherId(id || null);
              if (type) setVoucherInitialType(type);
              setCurrentPage("voucher-doc");
            }}
          />
        );
      case "voucher-doc":
        return (
          <VoucherDocPage
            voucherIdToView={selectedVoucherId}
            initialType={voucherInitialType}
            onBack={() => {
              setSelectedVoucherId(null);
              setCurrentPage("vouchers");
            }}
          />
        );
      case "party-statement":
        return (
          <PartyStatementPage
            initialPartyType={statementPartyType}
            initialPartyId={statementPartyId}
            onNavigate={(page, params) => {
              if (params?.party_type) setStatementPartyType(params.party_type);
              if (params?.party_id) setStatementPartyId(params.party_id);
              setCurrentPage(page as PageId);
            }}
          />
        );
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(user, token) => {
          localStorage.setItem("mizan_auth_token", token);
          localStorage.setItem("mizan_active_user_id", String(user.id));
          setIsAuthenticated(true);
          window.dispatchEvent(new Event("mizan_user_switched"));
        }}
      />
    );
  }

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderScreen()}
    </AppLayout>
  );
};

export default App;
