"use client";

import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";

import { NarrativeBadge } from "@/components/alerts/NarrativeBadge";
import { PortfolioHealthBadge } from "@/components/portfolio/PortfolioHealthBadge";
import { PortfolioMetric } from "@/components/portfolio/PortfolioMetric";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePersonalizedDashboard } from "@/lib/hooks/usePersonalizedDashboard";

/**
 * The Dashboard's compact "Portfolio Intelligence" preview — headline,
 * health badge, summary, the three headline stats, and the single top
 * performer. Deliberately shallow: it renders only the top-level summary
 * `usePersonalizedDashboard()` already provides, never the Portfolio
 * page's full section list (Top Performers, Projects Needing Attention,
 * Security Risks, Governance Watch, Development Momentum, Dominant
 * Narratives, Recommendations) — that depth lives at `/dashboard/portfolio`
 * only, reached via the link below. PR22 Part 2: the headline stats
 * (Projects/Average Score/Average Confidence) stay read off the raw,
 * un-filtered scalar fields `usePortfolioIntelligence()` already computed
 * — recomputing an average for a filtered subset would mean re-deriving
 * engine logic, which this hook never does. Only "Top Performer" is scoped
 * to the active watchlist, since `topPerformers` is a list field.
 */
export function PortfolioWidget() {
  const { portfolio } = usePersonalizedDashboard();
  const topPerformer = portfolio?.topPerformers[0];

  return (
    <WidgetCard
      icon={<LayoutGrid className="size-5" aria-hidden="true" />}
      title="Portfolio Intelligence"
      subtitle="Your Watchlist, summarized"
      accent="purple"
      lastUpdated={portfolio?.generatedAt}
    >
      {!portfolio || portfolio.projectCount === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No Portfolio Intelligence available."
          description="Watch a project to start building a picture of your portfolio."
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{portfolio.headline}</p>
              <PortfolioHealthBadge health={portfolio.overallHealth} />
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
              {portfolio.summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <PortfolioMetric label="Projects" value={portfolio.projectCount} />
            <PortfolioMetric label="Average Score" value={portfolio.averageScore} />
            <PortfolioMetric label="Average Confidence" value={`${portfolio.averageConfidence}%`} />
          </div>

          {topPerformer && (
            <div className="flex flex-col gap-1 rounded-lg border border-radar-light-border bg-radar-light-surface p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
              <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
                Top Performer
              </span>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                  {topPerformer.projectName}
                </span>
                <NarrativeBadge narrative={topPerformer.narrative} />
              </div>
            </div>
          )}
        </div>
      )}

      <Link
        href="/dashboard/portfolio"
        className="flex items-center gap-1 self-start text-xs font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:text-radar-accent/80"
      >
        View full portfolio
        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
      </Link>
    </WidgetCard>
  );
}
