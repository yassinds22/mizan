import React, { type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

interface BackBarProps {
  onBack: () => void;
  label: string;
  actions?: ReactNode;
}

export const BackBar: React.FC<BackBarProps> = ({ onBack, label, actions }) => {
  return (
    <div className="toolbar detail-bar">
      <button className="btn btn-ghost" onClick={onBack}>
        <ArrowRight size={15} /> {label}
      </button>
      <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>{actions}</div>
    </div>
  );
};
