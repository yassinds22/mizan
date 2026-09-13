import React, { useState } from "react";
import { Menu, PanelRightOpen, ChevronDown, Shield, UserCheck, UserX, LogOut } from "lucide-react";
import axios from "axios";
import { GlobalSearch } from "./GlobalSearch";
import { Notifications } from "./Notifications";
import { pageMeta } from "@/data/navigation";
import type { PageId } from "@/types/navigation";
import { usePermissions } from "@/hooks/usePermissions";

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
  const { currentUser } = usePermissions();
  const [showSwitchDropdown, setShowSwitchDropdown] = React.useState(false);

  const handleLogout = async () => {
    try {
      await axios.post("/api/v1/core/auth/logout");
    } catch (e) {
      console.warn("Logout request failed:", e);
    } finally {
      localStorage.removeItem("mizan_auth_token");
      window.dispatchEvent(new Event("mizan_auth_logout"));
    }
  };

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

        {/* Dynamic User Chip & Profile Menu */}
        <div style={{ position: "relative" }}>
          <div
            className="user-chip"
            onClick={() => setShowSwitchDropdown(!showSwitchDropdown)}
            title="ملف المستخدم والخيارات"
            style={{
              cursor: "pointer",
              border: currentUser?.is_active ? "1px solid var(--border-color, #e2e8f0)" : "1px solid #fecaca",
              background: currentUser?.is_active ? "var(--card-bg, #fff)" : "#fff1f2",
            }}
          >
            <div
              className="avatar"
              style={{
                background: currentUser?.is_super_admin
                  ? "linear-gradient(135deg, #f59e0b, #d97706)"
                  : currentUser?.is_active
                  ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                  : "#94a3b8",
                color: "#fff",
              }}
            >
              {currentUser ? currentUser.name.charAt(0) : "م"}
            </div>
            <div>
              <strong style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {currentUser?.name || "المستخدم"}
                {currentUser?.is_super_admin && (
                  <span style={{ color: "#d97706", fontSize: 10 }}>★</span>
                )}
              </strong>
              <small style={{ color: currentUser?.is_active ? "var(--muted, #64748b)" : "#b91c1c" }}>
                {currentUser?.is_active ? currentUser?.primary_role || "مستخدم" : "حساب معطّل"}
              </small>
            </div>
            <ChevronDown size={14} style={{ color: "var(--muted, #94a3b8)", marginRight: 4 }} />
          </div>

          {/* Profile Dropdown */}
          {showSwitchDropdown && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 8,
                background: "#fff",
                borderRadius: 16,
                boxShadow: "0 12px 36px rgba(0,0,0,0.15)",
                border: "1px solid var(--border-color, #e2e8f0)",
                minWidth: 280,
                zIndex: 9999,
                overflow: "hidden",
              }}
            >
              {/* User details header */}
              <div
                style={{
                  padding: "16px",
                  background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: currentUser?.is_super_admin
                        ? "linear-gradient(135deg, #f59e0b, #d97706)"
                        : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 800,
                    }}
                  >
                    {currentUser ? currentUser.name.charAt(0) : "م"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#1e293b" }}>
                      {currentUser?.name}
                      {currentUser?.is_super_admin && (
                        <span style={{ color: "#d97706", marginRight: 4 }}>★</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {currentUser?.email}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "#e0e7ff",
                      color: "#3730a3",
                      fontWeight: 700,
                    }}
                  >
                    {currentUser?.primary_role || "مستخدم"}
                  </span>
                  {currentUser?.branch_name && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "#f1f5f9",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      📍 {currentUser.branch_name}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: currentUser?.is_active ? "#dcfce7" : "#fee2e2",
                      color: currentUser?.is_active ? "#15803d" : "#b91c1c",
                      fontWeight: 700,
                    }}
                  >
                    {currentUser?.is_active ? "🟢 مفعّل" : "🔴 معطّل"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: "8px" }}>
                {currentUser?.is_super_admin && (
                  <button
                    onClick={() => {
                      setShowSwitchDropdown(false);
                      onNavigate("users-roles");
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 12px",
                      border: "none",
                      background: "transparent",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#334155",
                      cursor: "pointer",
                      textAlign: "right",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Shield size={16} color="#3b82f6" />
                    <span>إدارة المستخدمين والصلاحيات</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowSwitchDropdown(false);
                    handleLogout();
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 12px",
                    border: "none",
                    background: "transparent",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#dc2626",
                    cursor: "pointer",
                    textAlign: "right",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={16} />
                  <span>تسجيل الخروج من النظام</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Direct Logout Button */}
        <button
          className="icon-btn"
          onClick={handleLogout}
          title="تسجيل الخروج"
          style={{ color: "#ef4444" }}
          aria-label="تسجيل الخروج"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
