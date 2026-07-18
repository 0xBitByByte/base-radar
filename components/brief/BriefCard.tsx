import { BriefMetric } from "@/components/brief/BriefMetric";
import { formatRelativeTime } from "@/lib/data/format";
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
    <div className="flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-radar-light-card p-5 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold text-radar-light-text dark:text-radar-white">{brief.headline}</h1>
          <span className="text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted">
            Generated {formatRelativeTime(brief.generatedAt)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">{brief.summary}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-radar-light-border pt-4 dark:border-white/10">
        <BriefMetric label="Average Confidence" value={`${brief.averageConfidence}%`} />
        <BriefMetric label="Highest Score" value={brief.highestScore} />
        <BriefMetric label="Projects" value={brief.projectCount} />
        <BriefMetric label="Narratives" value={brief.emergingNarratives.length} />
      </div>
    </div>
  );
}
