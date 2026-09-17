import { BriefMetric } from "@/components/brief/BriefMetric";
import { RelativeTime } from "@/components/shared/RelativeTime";
import {
  EXECUTIVE_SUMMARY_CARD_CLASS,
  EXECUTIVE_SUMMARY_HEADER_GROUP_CLASS,
  EXECUTIVE_SUMMARY_METRICS_ROW_CLASS,
  EXECUTIVE_SUMMARY_SUBTITLE_CLASS,
  EXECUTIVE_SUMMARY_TIMESTAMP_CLASS,
  EXECUTIVE_SUMMARY_TITLE_CLASS,
} from "@/components/shared/executiveSummaryCardStyles";
import type { DailyBrief } from "@/lib/brief/types";

type BriefCardProps = {
  brief: DailyBrief;
};

/**
 * The compact, top-of-page executive summary card — headline, one-line
 * summary, and the four headline stats (`averageConfidence`/`highestScore`/
 * `projectCount`/narrative count). Every value is read directly off
 * `DailyBrief`; "Narrative count" is `brief.emergingNarratives.length` —
 * the number of DISTINCT narrative types actually detected today, not a
 * sum of alert counts.
 */
export function BriefCard({ brief }: BriefCardProps) {
  return (
    <div className={EXECUTIVE_SUMMARY_CARD_CLASS}>
      <div className={EXECUTIVE_SUMMARY_HEADER_GROUP_CLASS}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className={EXECUTIVE_SUMMARY_TITLE_CLASS}>{brief.headline}</h1>
          <span className={EXECUTIVE_SUMMARY_TIMESTAMP_CLASS}>
            Generated <RelativeTime iso={brief.generatedAt} />
          </span>
        </div>
        <p className={EXECUTIVE_SUMMARY_SUBTITLE_CLASS}>{brief.summary}</p>
      </div>

      <div className={EXECUTIVE_SUMMARY_METRICS_ROW_CLASS}>
        <BriefMetric label="Average Confidence" value={`${brief.averageConfidence}%`} />
        <BriefMetric label="Highest Score" value={brief.highestScore} />
        <BriefMetric label="Projects" value={brief.projectCount} />
        <BriefMetric label="Narratives" value={brief.emergingNarratives.length} />
      </div>
    </div>
  );
}
