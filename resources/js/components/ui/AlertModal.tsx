import React, { useEffect } from "react";
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  X,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

export type AlertType = "error" | "warning" | "info" | "success";

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: AlertType;
  title: string;
  message: string;
  detail?: string;
  actionText?: string;
  onAction?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  type = "error",
  title,
  message,
  detail,
  actionText = "حسناً، فهمت",
  onAction,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Visual Theme configs based on alert type
  const typeConfig = {
    error: {
      bgIcon: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
      iconColor: "#dc2626",
      glowColor: "rgba(220, 38, 38, 0.25)",
      btnBg: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
      btnHover: "#991b1b",
      badgeText: "تنبيه نظام",
      badgeBg: "#fef2f2",
      badgeColor: "#991b1b",
      IconComponent: AlertOctagon,
    },
    warning: {
      bgIcon: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
      iconColor: "#d97706",
      glowColor: "rgba(217, 119, 6, 0.25)",
      btnBg: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
      btnHover: "#92400e",
      badgeText: "تحذير هام",
      badgeBg: "#fffbeb",
      badgeColor: "#92400e",
      IconComponent: AlertTriangle,
    },
    success: {
      bgIcon: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
      iconColor: "#16a34a",
      glowColor: "rgba(22, 163, 74, 0.25)",
      btnBg: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
      btnHover: "#166534",
      badgeText: "عملية ناجحة",
      badgeBg: "#f0fdf4",
      badgeColor: "#166534",
      IconComponent: CheckCircle2,
    },
    info: {
      bgIcon: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
      iconColor: "#0284c7",
      glowColor: "rgba(2, 132, 199, 0.25)",
      btnBg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
      btnHover: "#075985",
      badgeText: "معلومة هامة",
      badgeBg: "#f0f9ff",
      badgeColor: "#075985",
      IconComponent: Info,
    },
  }[type];

  const { IconComponent } = typeConfig;

  const handleConfirm = () => {
    if (onAction) {
      onAction();
    }
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "fadeIn 0.2s ease-out",
        direction: "rtl",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "460px",
          background: "#ffffff",
          borderRadius: "22px",
          padding: "32px 28px 24px 28px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          textAlign: "center",
          animation: "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Ambient Glow Bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: typeConfig.btnBg,
          }}
        />

        {/* Close (X) button */}
        <button
          onClick={onClose}
          type="button"
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(100, 116, 139, 0.08)",
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(100, 116, 139, 0.16)";
            e.currentTarget.style.color = "#1e293b";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(100, 116, 139, 0.08)";
            e.currentTarget.style.color = "#64748b";
          }}
        >
          <X size={16} />
        </button>

        {/* Animated Glowing Icon Container */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: typeConfig.bgIcon,
            margin: "0 auto 16px auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 0 8px ${typeConfig.glowColor}, 0 10px 20px -5px ${typeConfig.glowColor}`,
            position: "relative",
          }}
        >
          <IconComponent size={34} style={{ color: typeConfig.iconColor }} strokeWidth={2.4} />
        </div>

        {/* Badge Indicator */}
        <div style={{ marginBottom: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "11px",
              fontWeight: 800,
              padding: "3px 12px",
              borderRadius: "20px",
              background: typeConfig.badgeBg,
              color: typeConfig.badgeColor,
              letterSpacing: "0.3px",
            }}
          >
            <Sparkles size={11} /> {typeConfig.badgeText}
          </span>
        </div>

        {/* Modal Title */}
        <h3
          style={{
            margin: "0 0 10px 0",
            fontSize: "19px",
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.4,
          }}
        >
          {title}
        </h3>

        {/* Modal Message */}
        <p
          style={{
            margin: "0 0 16px 0",
            fontSize: "14px",
            color: "#475569",
            lineHeight: 1.65,
            fontWeight: 500,
          }}
        >
          {message}
        </p>

        {/* Optional Actionable Details / Helper Card */}
        {detail && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "12px 14px",
              marginBottom: "20px",
              textAlign: "right",
              fontSize: "12.5px",
              color: "#334155",
              lineHeight: 1.6,
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "14px", lineHeight: "1" }}>💡</span>
            <div>
              <strong style={{ display: "block", color: "#0f172a", marginBottom: "2px" }}>
                إرشاد تقني:
              </strong>
              {detail}
            </div>
          </div>
        )}

        {/* Main Action Button */}
        <button
          type="button"
          onClick={handleConfirm}
          style={{
            width: "100%",
            height: "46px",
            background: typeConfig.btnBg,
            border: "none",
            borderRadius: "12px",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: `0 8px 20px -4px ${typeConfig.glowColor}`,
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = `0 12px 24px -4px ${typeConfig.glowColor}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 8px 20px -4px ${typeConfig.glowColor}`;
          }}
        >
          <span>{actionText}</span>
          <ArrowLeft size={16} />
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
