import { AlertTriangle, Minus, TrendingUp, type LucideIcon } from "lucide-react";

import type { PortfolioHealth } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";

/**
 * Display metadata for `PortfolioHealth` — colors reuse the same 3-tier
 * semantic palette `components/alerts/meta.ts`'s `SEVERITY_BADGE_CLASS`
 * already uses (success/neutral/danger), no new tokens introduced.
 * `PORTFOLIO_HEALTH_DESCRIPTION` is static, per-tier prose (not a
 * per-instance recomputation) — used by `PortfolioOverview.tsx`'s
 * "Portfolio Health" section to explain the badge, never to relabel or
 * recompute the health value itself.
 */
export const PORTFOLIO_HEALTH_ICON: Record<PortfolioHealth, LucideIcon> = {
  strong: TrendingUp,
  stable: Minus,
  "needs-attention": AlertTriangle,
};

export const PORTFOLIO_HEALTH_LABEL: Record<PortfolioHealth, string> = {
  strong: "Strong",
  stable: "Stable",
  "needs-attention": "Needs Attention",
};

export const PORTFOLIO_HEALTH_BADGE_CLASS: Record<PortfolioHealth, string> = {
  strong: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  stable:
    "border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-muted",
  "needs-attention": "border-radar-danger/30 bg-radar-danger/10 text-radar-danger",
};

export const PORTFOLIO_HEALTH_DESCRIPTION: Record<PortfolioHealth, string> = {
  strong: "Average score and confidence are both high, with no active security risks.",
  stable: "No major risks detected, but signal strength isn't high enough yet to call this strong.",
  "needs-attention": "Real security or decline signals are present — review before taking further action.",
};

type PortfolioHealthBadgeProps = {
  health: PortfolioHealth;
  className?: string;
};

/** Reuses `SeverityBadge`/`NarrativeBadge`'s exact chip shape — icon + label + a semantic color, never color alone. */
export function PortfolioHealthBadge({ health, className }: PortfolioHealthBadgeProps) {
  const Icon = PORTFOLIO_HEALTH_ICON[health];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
        PORTFOLIO_HEALTH_BADGE_CLASS[health],
        className
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {PORTFOLIO_HEALTH_LABEL[health]}
    </span>
  );
}
