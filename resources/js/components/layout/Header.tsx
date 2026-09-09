import React from "react";
import { Menu, PanelRightOpen } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { Notifications } from "./Notifications";
import { pageMeta } from "@/data/navigation";
import type { PageId } from "@/types/navigation";

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  sidebarCollapsed,
  onToggleSidebar,
}) => {
  const meta = pageMeta[currentPage] || {
    title: "ميزان",
    subtitle: "نظام ERP ومحاسبة لمواد غذائية",
  };

  return (
    <header className="topbar">
      <button
        className="icon-btn sidebar-toggle"
        onClick={onToggleSidebar}
        title={sidebarCollapsed ? "توسيع القائمة (Ctrl+B)" : "طي القائمة (Ctrl+B)"}
        aria-label={sidebarCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
        aria-expanded={!sidebarCollapsed}
      >
        {sidebarCollapsed ? <PanelRightOpen size={18} /> : <Menu size={18} />}
      </button>

      <div className="page-title">
        <h2>{meta.title}</h2>
        <span>{meta.subtitle}</span>
      </div>

      <GlobalSearch onSelectHit={onNavigate} />

      <div className="top-actions">
        <Notifications onNavigate={onNavigate} />
        <div className="user-chip">
          <div className="avatar">ي</div>
          <div>
            <strong>ياسين المحاسبي</strong>
            <small>مدير مالي</small>
          </div>
        </div>
      </div>
    </header>
  );
};
