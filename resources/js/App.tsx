import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/modules/dashboard/DashboardPage";
import { InventoryPage } from "@/modules/inventory/pages/InventoryPage";
import { ItemDetailPage } from "@/modules/inventory/pages/ItemDetailPage";
import { WarehousesPage } from "@/modules/warehouses/pages/WarehousesPage";
import { StockMovePage } from "@/modules/warehouses/pages/StockMovePage";
import { SalesPage } from "@/modules/sales/pages/SalesPage";
import { InvoicePage } from "@/modules/sales/pages/InvoicePage";
import { PurchasesPage } from "@/modules/purchases/pages/PurchasesPage";
import { PurchaseDocPage } from "@/modules/purchases/pages/PurchaseDocPage";
import { PartnersPage } from "@/modules/partners/pages/PartnersPage";
import { AccountingPage } from "@/modules/accounting/pages/AccountingPage";
import { JournalEntryPage } from "@/modules/accounting/pages/JournalEntryPage";
import { TrialBalancePage } from "@/modules/accounting/pages/TrialBalancePage";
import { ProfitLossPage } from "@/modules/accounting/pages/ProfitLossPage";
import { AgingPage } from "@/modules/accounting/pages/AgingPage";
import { PeriodClosePage } from "@/modules/accounting/pages/PeriodClosePage";
import { ExpiryPage } from "@/modules/expiry/pages/ExpiryPage";
import { FefoPage } from "@/modules/expiry/pages/FefoPage";
import { WasteAlertsPage } from "@/modules/expiry/pages/WasteAlertsPage";
import { ReportsPage } from "@/modules/reports/pages/ReportsPage";
import { SettingsPage } from "@/modules/settings/pages/SettingsPage";
import { UsersRolesPage } from "@/modules/settings/pages/UsersRolesPage";
import { SystemStatesPage } from "@/modules/settings/pages/SystemStatesPage";
import type { PageId } from "@/types/navigation";

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");

  const renderScreen = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={setCurrentPage} />;
      case "inventory":
        return <InventoryPage onOpenItem={() => setCurrentPage("item-detail")} />;
      case "item-detail":
        return <ItemDetailPage onBack={() => setCurrentPage("inventory")} />;
      case "warehouses":
        return <WarehousesPage />;
      case "stock-move":
        return <StockMovePage />;
      case "sales":
        return (
          <SalesPage
            onOpenInvoice={() => setCurrentPage("invoice")}
            onOpenPartners={() => setCurrentPage("partners")}
          />
        );
      case "invoice":
        return <InvoicePage onBack={() => setCurrentPage("sales")} />;
      case "purchases":
        return (
          <PurchasesPage onOpenDoc={() => setCurrentPage("purchase-doc")} />
        );
      case "purchase-doc":
        return <PurchaseDocPage onBack={() => setCurrentPage("purchases")} />;
      case "partners":
        return (
          <PartnersPage
            onOpenInvoice={() => setCurrentPage("invoice")}
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
        return <TrialBalancePage />;
      case "profit-loss":
        return <ProfitLossPage />;
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
        return <SettingsPage />;
      case "users-roles":
        return <UsersRolesPage />;
      case "system-states":
        return <SystemStatesPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderScreen()}
    </AppLayout>
  );
};

export default App;
