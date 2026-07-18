"use client";

import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";

import { NarrativeBadge } from "@/components/alerts/NarrativeBadge";
import { BriefMetric } from "@/components/brief/BriefMetric";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDailyBrief } from "@/lib/hooks/useDailyBrief";

/**
 * The Dashboard's compact "Today's Brief" preview — headline, summary, the
 * three headline stats, and the single top opportunity. Deliberately
 * shallow: it renders only the top-level summary `useDailyBrief()` already
 * provides, never the Brief page's full section list (Security/Governance/
 * Development/TVL Highlights, Emerging Narratives, Recommendations) — that
 * depth lives at `/dashboard/brief` only, reached via the link below.
 */
export function BriefWidget() {
  const brief = useDailyBrief();
  const topOpportunity = brief?.topOpportunities[0];

  return (
    <WidgetCard
      icon={<Newspaper className="size-5" aria-hidden="true" />}
      title="Today's Brief"
      subtitle="AI-generated executive summary"
      accent="purple"
      lastUpdated={brief?.generatedAt}
    >
      {!brief || brief.projectCount === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No Daily Brief available."
          description="A brief will generate once your watched projects have scoreable signals."
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{brief.headline}</p>
            <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
              {brief.summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <BriefMetric label="Average Confidence" value={`${brief.averageConfidence}%`} />
            <BriefMetric label="Highest Score" value={brief.highestScore} />
            <BriefMetric label="Projects" value={brief.projectCount} />
          </div>

          {topOpportunity && (
            <div className="flex flex-col gap-1 rounded-lg border border-radar-light-border bg-radar-light-surface p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
              <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
                Top Opportunity
              </span>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                  {topOpportunity.projectName}
                </span>
                <NarrativeBadge narrative={topOpportunity.narrative} />
              </div>
            </div>
          )}
        </div>
      )}

      <Link
        href="/dashboard/brief"
        className="flex items-center gap-1 self-start text-xs font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:text-radar-accent/80"
      >
        View full brief
        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
      </Link>
    </WidgetCard>
  );
}
