import { PortfolioHealthBadge } from "@/components/portfolio/PortfolioHealthBadge";
import { PortfolioMetric } from "@/components/portfolio/PortfolioMetric";
import { formatRelativeTime } from "@/lib/data/format";
import type { PortfolioIntelligence } from "@/lib/portfolio/types";

type PortfolioCardProps = {
  portfolio: PortfolioIntelligence;
};

/**
 * The compact, top-of-page executive summary card — headline, health
 * badge, one-line summary, and the four headline stats
 * (`projectCount`/`averageScore`/`averageConfidence`/dominant narrative
 * count). Every value is read directly off `PortfolioIntelligence`, never
 * recomputed.
 */
export function PortfolioCard({ portfolio }: PortfolioCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-radar-light-card p-5 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-radar-light-text dark:text-radar-white">{portfolio.headline}</h1>
            <PortfolioHealthBadge health={portfolio.overallHealth} />
          </div>
          <span className="text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted">
            Generated {formatRelativeTime(portfolio.generatedAt)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">{portfolio.summary}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-radar-light-border pt-4 dark:border-white/10">
        <PortfolioMetric label="Projects" value={portfolio.projectCount} />
        <PortfolioMetric label="Average Score" value={portfolio.averageScore} />
        <PortfolioMetric label="Average Confidence" value={`${portfolio.averageConfidence}%`} />
        <PortfolioMetric label="Dominant Narratives" value={portfolio.dominantNarratives.length} />
      </div>
    </div>
  );
}
