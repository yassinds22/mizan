import type { SearchHit } from "@/types/navigation";
import { money } from "@/utils/formatters";
import { inventoryRows } from "./inventory";
import { salesRows } from "./sales";
import { purchaseRows } from "./purchases";
import { journalRows } from "./accounting";
import { expiryBatches } from "./expiry";

export function buildSearchIndex(): SearchHit[] {
  return [
    ...inventoryRows.map((r) => ({
      id: r.sku,
      type: "صنف",
      title: r.name,
      meta: `${r.sku} · ${r.category} · رصيد ${r.qty}`,
      page: "inventory" as const,
    })),
    ...salesRows.map((r) => ({
      id: r.no,
      type: "فاتورة",
      title: r.no,
      meta: `${r.customer} · ${money(r.total)} ر.س`,
      page: "sales" as const,
    })),
    ...purchaseRows.map((r) => ({
      id: r.no,
      type: "شراء",
      title: r.no,
      meta: `${r.supplier} · ${r.status}`,
      page: "purchases" as const,
    })),
    ...journalRows.map((r) => ({
      id: r.no,
      type: "قيد",
      title: r.no,
      meta: r.desc,
      page: "accounting" as const,
    })),
    ...expiryBatches.map((r) => ({
      id: r.batch,
      type: "دفعة",
      title: r.batch,
      meta: `${r.item} · ينتهي ${r.expiry}`,
      page: "expiry" as const,
    })),
  ];
}
