import { NARRATIVE_SUMMARY_LABEL } from "@/components/alerts/meta";
import { useExecutiveSummary } from "@/lib/hooks/useExecutiveSummary";
import { NARRATIVE_TYPES } from "@/lib/alerts/intelligence/types";

/**
 * The Alerts page's top-level "Today's Intelligence" roll-up — every number
 * here comes straight from `useExecutiveSummary()`'s aggregation of
 * `getIntelligenceAlerts()` (`lib/alerts/service.ts`); this component only
 * formats those numbers into sentences, it never recomputes them. Renders
 * nothing when there's no intelligence yet — `IntelligenceList` owns the
 * "No meaningful intelligence detected" empty-state message, so this
 * doesn't duplicate it.
 */
export function ExecutiveSummary() {
  const summary = useExecutiveSummary();

  if (summary.totalCount === 0) return null;

  const narrativeLines = NARRATIVE_TYPES.filter((narrative) => summary.narrativeCounts[narrative] > 0).map(
    (narrative) => {
      const count = summary.narrativeCounts[narrative];
      const label = count === 1 ? NARRATIVE_SUMMARY_LABEL[narrative].singular : NARRATIVE_SUMMARY_LABEL[narrative].plural;
      return { narrative, text: `${count} ${label}` };
    }
  );

  return (
    <section
      aria-label="Today's Intelligence summary"
      className="flex flex-col gap-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Today&apos;s Intelligence</h3>
        <ul className="flex flex-col gap-0.5">
          {narrativeLines.map((line) => (
            <li key={line.narrative} className="text-xs text-radar-light-muted dark:text-radar-muted">
              {line.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex shrink-0 items-center gap-5">
        <div className="flex flex-col">
          <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
            Average Confidence
          </span>
          <span className="text-lg font-semibold text-radar-light-text dark:text-radar-white">
            {summary.averageConfidence}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
            Highest Score
          </span>
          <span className="text-lg font-semibold text-radar-light-text dark:text-radar-white">
            {summary.highestScore}
          </span>
        </div>
      </div>
    </section>
  );
}
