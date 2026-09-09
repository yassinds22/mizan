import React from "react";
import * as LucideIcons from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string;
  hint: string;
  delta: string;
  deltaDown?: boolean;
  tone?: "info" | "warm" | "danger" | "";
  icon: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  hint,
  delta,
  deltaDown,
  tone = "",
  icon,
}) => {
  const IconComponent = (LucideIcons as Record<string, any>)[icon] || LucideIcons.Activity;

  return (
    <div className={`kpi ${tone}`.trim()}>
      <div className="kpi-head">
        <div className="kpi-icon">
          <IconComponent size={18} />
        </div>
        <span className={`delta ${deltaDown ? "down" : ""}`}>{delta}</span>
      </div>
      <h3>{title}</h3>
      <div className="value">{value}</div>
      <div className="hint">{hint}</div>
    </div>
  );
};
