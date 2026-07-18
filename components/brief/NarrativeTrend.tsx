import { NarrativeBadge } from "@/components/alerts/NarrativeBadge";
import type { BriefNarrativeTrend } from "@/lib/brief/types";

type NarrativeTrendProps = {
  trend: BriefNarrativeTrend;
  /** `brief.projectCount` — the denominator for this trend's share of today's total. */
  totalProjectCount: number;
};

/** One real narrative pattern detected today — badge (reused from the Alert Engine's own `NarrativeBadge`, so a narrative reads identically here and on an Intelligence Card), a real count, and that count's share of `totalProjectCount`. Never rendered for a narrative with zero real occurrences — `DailyBrief.tsx` only maps over `brief.emergingNarratives`, which already excludes those. */
export function NarrativeTrend({ trend, totalProjectCount }: NarrativeTrendProps) {
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
