import React, { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";
import { PanelRightClose } from "lucide-react";
import { navGroups } from "@/data/navigation";
import { coreApi } from "@/api/core";
import type { PageId } from "@/types/navigation";

import { usePermissions } from "@/hooks/usePermissions";

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
  const { can, isSuperAdmin } = usePermissions();
  const [branchName, setBranchName] = useState<string>("الفرع الرئيسي");
  const [companyName, setCompanyName] = useState<string>("ميزان");

  const loadInfo = () => {
    coreApi
      .getSettings()
      .then((s) => {
        if (s.company_name) setCompanyName(s.company_name);
      })
      .catch(() => {});

    coreApi
      .getBranches({ is_active: true })
      .then((branches) => {
        if (branches && branches.length > 0) {
          const main = branches.find((b) => b.code === "BR-001") || branches[0];
          setBranchName(main.name);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadInfo();
    window.addEventListener("mizan_settings_updated", loadInfo);
    return () => {
      window.removeEventListener("mizan_settings_updated", loadInfo);
    };
  }, []);
  const isNavActive = (id: PageId) => {
    if (currentPage === id) return true;
    if (currentPage === "item-detail" && id === "inventory") return true;
    if (currentPage === "invoice" && id === "sales") return true;
    if (currentPage === "purchase-doc" && id === "purchases") return true;
    if (currentPage === "voucher-doc" && id === "vouchers") return true;
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
          <div className="brand-mark" title={companyName || "ميزان"}>
            {companyName ? companyName.trim().charAt(0) : "م"}
          </div>
          <div className="brand-text" style={{ minWidth: 0 }}>
            <h1
              title={companyName || "ميزان"}
              style={{
                margin: 0,
                fontSize: companyName && companyName.length > 15 ? 14 : 17,
                fontWeight: 800,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {companyName || "ميزان"}
            </h1>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 11,
                opacity: 0.75,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              ERP محاسبي للمواد الغذائية
            </p>
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

        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.permission || isSuperAdmin || can(item.permission)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div className="nav-section" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {visibleItems.map((item) => {
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
          );
        })}

        <div className="sidebar-foot">
          <strong>{branchName}</strong>
          <span>السنة المالية 2026 · فترة مفتوحة</span>
        </div>
      </aside>
    </>
  );
};
