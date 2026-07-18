import { NarrativeBadge } from "@/components/alerts/NarrativeBadge";
import type { BriefNarrativeTrend } from "@/lib/brief/types";

type NarrativeDistributionProps = {
  trend: BriefNarrativeTrend;
  /** `portfolio.projectCount` — the true Watchlist size, the denominator for this narrative's share. */
  totalProjectCount: number;
};

/** One dominant narrative — badge (reused from the Alert Engine's own `NarrativeBadge`), a real count, and that count's share of the Watchlist. Never rendered for a narrative with zero real occurrences — `PortfolioOverview.tsx` only maps over `portfolio.dominantNarratives`, which already excludes those. */
export function NarrativeDistribution({ trend, totalProjectCount }: NarrativeDistributionProps) {
  const percentage = totalProjectCount === 0 ? 0 : Math.round((trend.count / totalProjectCount) * 100);

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-radar-light-border bg-radar-light-card px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
      <NarrativeBadge narrative={trend.narrative} />
      <span className="text-xs text-radar-light-muted dark:text-radar-muted">
        {trend.count} project{trend.count === 1 ? "" : "s"} · {percentage}%
      </span>
    </li>
  );
}
