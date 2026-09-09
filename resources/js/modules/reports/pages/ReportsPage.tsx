import React from "react";
import { ChevronLeft } from "lucide-react";
import { reportCards } from "@/data/accounting";
import type { PageId } from "@/types/navigation";

interface ReportsPageProps {
  onOpen: (page: PageId) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onOpen }) => {
  return (
    <div className="grid grid-3">
      {reportCards.map((r) => (
        <section className="panel" key={r.title}>
          <div
            className="panel-body"
            style={{
              minHeight: 170,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              className="pill pill-neutral"
              style={{ width: "fit-content", marginBottom: 12 }}
            >
              {r.tag}
            </span>
            <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>{r.title}</h3>
            <p
              style={{
                margin: 0,
                color: "var(--ink-soft)",
                fontSize: 13,
                lineHeight: 1.6,
                flex: 1,
              }}
            >
              {r.desc}
            </p>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 16, alignSelf: "flex-start" }}
              onClick={() => onOpen(r.page)}
            >
              فتح التقرير <ChevronLeft size={14} />
            </button>
          </div>
        </section>
      ))}
    </div>
  );
};
