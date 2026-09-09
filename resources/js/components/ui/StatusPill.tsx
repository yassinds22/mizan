import React from "react";
import { getStatusPillClass } from "@/utils/status";

interface StatusPillProps {
  status: string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = "" }) => {
  return (
    <span className={`pill ${getStatusPillClass(status)} ${className}`.trim()}>
      {status}
    </span>
  );
};
