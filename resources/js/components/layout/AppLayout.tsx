import React, { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { QuickActions } from "./QuickActions";
import { QuickActionModals } from "./QuickActionModals";
import { Toast } from "@/components/ui/Toast";
import type { PageId } from "@/types/navigation";

interface AppLayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickModal, setQuickModal] = useState<"invoice" | "receive" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleQuickSubmit = () => {
    const isInv = quickModal === "invoice";
    setQuickModal(null);
    showToast(isInv ? "تم حفظ الفاتورة السريعة بنجاح" : "تم تسجيل الاستلام والدفعة بنجاح");
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="main">
        <Header
          currentPage={currentPage}
          onNavigate={onNavigate}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => {
            if (window.innerWidth <= 960) {
              setMobileOpen((v) => !v);
            } else {
              setSidebarCollapsed((v) => !v);
            }
          }}
        />

        <main className="content" key={currentPage}>
          {children}
        </main>
      </div>

      <QuickActions
        onOpenQuickInvoice={() => setQuickModal("invoice")}
        onOpenQuickReceive={() => setQuickModal("receive")}
      />

      <QuickActionModals
        modal={quickModal}
        onClose={() => setQuickModal(null)}
        onSubmit={handleQuickSubmit}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
};
