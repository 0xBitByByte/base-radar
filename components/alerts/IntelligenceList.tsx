import { IntelligenceCard } from "@/components/alerts/IntelligenceCard";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";

type IntelligenceListProps = {
  alerts: IntelligenceAlert[];
  /**
   * Overrides the default "No meaningful intelligence detected." message —
   * `AlertsPageClient` passes a search- or filter-specific message when
   * `alerts` is empty because the active search/filters matched nothing,
   * as distinct from there being no intelligence at all (PR15.3 Part 3).
   */
  emptyMessage?: string;
  /**
   * Skips the critical-first partition below — set by `AlertsPageClient`
   * when `alerts` already reflects an explicit user sort order (Newest/
   * Confidence/Score/Severity), so that choice isn't silently overridden.
   */
  preserveOrder?: boolean;
};

const DEFAULT_EMPTY_MESSAGE = "No meaningful intelligence detected.";

/**
 * Pure list renderer for `IntelligenceAlert[]` — mirrors `AlertFeed.tsx`'s
 * contract exactly (no filtering/fetching of its own). The one piece of
 * ordering logic it owns is a stable partition, critical severity first: a
 * cheap `Array.prototype.filter` over an already-computed, already-scored
 * array, not a re-grouping or re-scoring, so this satisfies the "Critical
 * Intelligence -> Intelligence Alerts" priority order the PR brief asks for
 * without recomputing anything `lib/alerts/intelligence/engine.ts` already
 * produced. Skipped when `preserveOrder` is set, so an explicit user sort
 * choice (PR15.3 Part 3) always wins.
 */
export function IntelligenceList({ alerts, emptyMessage, preserveOrder }: IntelligenceListProps) {
  if (alerts.length === 0) {
    return (
      <p className="py-2 text-xs text-radar-light-muted dark:text-radar-muted">
        {emptyMessage ?? DEFAULT_EMPTY_MESSAGE}
      </p>
    );
  }

  const ordered = preserveOrder
    ? alerts
    : [...alerts.filter((alert) => alert.severity === "critical"), ...alerts.filter((alert) => alert.severity !== "critical")];

  return (
    <ul className="flex flex-col gap-2">
      {ordered.map((alert) => (
        <IntelligenceCard key={alert.id} alert={alert} />
      ))}
    </ul>
  );
}
