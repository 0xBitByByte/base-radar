import { PortfolioHealthBadge } from "@/components/portfolio/PortfolioHealthBadge";
import { PortfolioMetric } from "@/components/portfolio/PortfolioMetric";
import { RelativeTime } from "@/components/shared/RelativeTime";
import {
  EXECUTIVE_SUMMARY_CARD_CLASS,
  EXECUTIVE_SUMMARY_HEADER_GROUP_CLASS,
  EXECUTIVE_SUMMARY_METRICS_ROW_CLASS,
  EXECUTIVE_SUMMARY_SUBTITLE_CLASS,
  EXECUTIVE_SUMMARY_TIMESTAMP_CLASS,
  EXECUTIVE_SUMMARY_TITLE_CLASS,
} from "@/components/shared/executiveSummaryCardStyles";
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
    <div className={EXECUTIVE_SUMMARY_CARD_CLASS}>
      <div className={EXECUTIVE_SUMMARY_HEADER_GROUP_CLASS}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={EXECUTIVE_SUMMARY_TITLE_CLASS}>{portfolio.headline}</h1>
            <PortfolioHealthBadge health={portfolio.overallHealth} />
          </div>
          <span className={EXECUTIVE_SUMMARY_TIMESTAMP_CLASS}>
            Generated <RelativeTime iso={portfolio.generatedAt} />
          </span>
        </div>
        <p className={EXECUTIVE_SUMMARY_SUBTITLE_CLASS}>{portfolio.summary}</p>
      </div>

      <div className={EXECUTIVE_SUMMARY_METRICS_ROW_CLASS}>
        <PortfolioMetric label="Projects" value={portfolio.projectCount} />
        <PortfolioMetric label="Average Score" value={portfolio.averageScore} />
        <PortfolioMetric label="Average Confidence" value={`${portfolio.averageConfidence}%`} />
        <PortfolioMetric label="Dominant Narratives" value={portfolio.dominantNarratives.length} />
      </div>
    </div>
  );
}
