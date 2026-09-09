import React from "react";
import * as LucideIcons from "lucide-react";
import { PanelRightClose } from "lucide-react";
import { navGroups } from "@/data/navigation";
import type { PageId } from "@/types/navigation";

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}) => {
  const isNavActive = (id: PageId) => {
    if (currentPage === id) return true;
    if (currentPage === "item-detail" && id === "inventory") return true;
    if (currentPage === "invoice" && id === "sales") return true;
    if (currentPage === "purchase-doc" && id === "purchases") return true;
    if (
      ["journal-entry", "trial-balance", "profit-loss", "aging"].includes(currentPage) &&
      id === "accounting"
    )
      return true;
    return false;
  };

  return (
    <>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="إغلاق القائمة"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`} aria-label="القائمة الرئيسية">
        <div className="brand">
          <div className="brand-mark" title="ميزان">
            م
          </div>
          <div className="brand-text">
            <h1>ميزان</h1>
            <p>ERP محاسبي للمواد الغذائية</p>
          </div>
          <button
            className="sidebar-collapse-btn desktop-only"
            onClick={onToggleCollapse}
            title="طي القائمة (Ctrl+B)"
            aria-label="طي القائمة الجانبية"
          >
            <PanelRightClose size={16} />
          </button>
        </div>

        {navGroups.map((group) => (
          <div className="nav-section" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => {
              const IconComponent =
                (LucideIcons as Record<string, any>)[item.icon] || LucideIcons.Circle;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isNavActive(item.id) ? "active" : ""}`}
                  title={item.label}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                >
                  <IconComponent size={17} />
                  <span className="nav-text">{item.label}</span>
                  {item.id === "expiry" ? <span className="badge">11</span> : null}
                </button>
              );
            })}
          </div>
        ))}

        <div className="sidebar-foot">
          <strong>فرع الرياض — المستودع الرئيسي</strong>
          <span>السنة المالية 2026 · فترة مفتوحة</span>
        </div>
      </aside>
    </>
  );
};
