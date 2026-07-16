import type { GlowBadgeColor } from "@/components/ui/GlowBadge";
import type { RiskLevel } from "@/lib/intelligence-engine";

/** Shared by `QuickViewSummary` and `ProfileHeader` — one mapping so a risk badge always reads the same color regardless of which surface shows it. */
export const RISK_COLOR: Record<RiskLevel, GlowBadgeColor> = {
  low: "success",
  moderate: "warning",
  elevated: "warning",
  high: "danger",
};
