/**
 * V4-INTELLIGENCE-003 (Phase 3) — Event Correlation. `analytics.highlights`
 * (already ranked and deduplicated by `buildAnalyticsHighlights()`) is the
 * spine: it's the one place Wallet Analytics already correlates
 * `biggestChange`/`recoveries`/`milestones`/`personalBests`/`stability`
 * into real, ranked, deduplicated facts — building correlated events from
 * anything upstream of Highlights (raw trends, raw recoveries) would just
 * re-derive what Highlights already did. This file does exactly one new
 * thing Highlights doesn't: attach `FeatureRefs` (Phase 6) to each one.
 */

import { extractHighlightTimestamp } from "@/components/wallet/walletHistoryFilters";
import { buildFeatureRefs, type RefsInput } from "@/lib/cross-feature/refs";
import type { CorrelatedEvent } from "@/lib/cross-feature/types";
import type { AnalyticsHighlight, HighlightType } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
import type { WalletEventTone } from "@/lib/wallet-automation/types";

/**
 * A real, deterministic tone per highlight TYPE (not a new judgment —
 * every one of these types already implies a real sentiment by its own
 * name/nature: a "recovery" is real good news, a "biggestDecline" is real
 * bad news). Mirrors the same tone-per-kind convention `lib/wallet-automation/summary.ts`
 * already uses for `WalletEventKind`.
 */
export const HIGHLIGHT_TONE: Record<HighlightType, WalletEventTone> = {
  biggestDecline: "attention",
  recovery: "positive",
  biggestImprovement: "positive",
  majorAllocationShift: "neutral",
  riskReduction: "positive",
  confidenceImprovement: "positive",
  newPersonalBest: "positive",
  stabilityChange: "neutral",
  milestone: "positive",
};

export function buildCorrelatedEvents(highlights: AnalyticsHighlight[], history: AnalyticsSnapshot[], refsInput: RefsInput): CorrelatedEvent[] {
  const latestSnapshotTimestamp = history[history.length - 1]?.timestamp ?? null;

  return highlights.map((highlight) => {
    // Real date when the highlight type carries one (recovery/newPersonalBest/milestone);
    // otherwise this highlight describes the CURRENT state, so the real
    // "as of" moment is the latest real snapshot — never a fabricated date.
    const timestamp = extractHighlightTimestamp(highlight) ?? latestSnapshotTimestamp ?? new Date(0).toISOString();

    return {
      id: `event:${highlight.dedupeKey}`,
      topic: highlight.topic,
      label: highlight.title,
      timestamp,
      tone: HIGHLIGHT_TONE[highlight.type],
      headline: highlight.reason,
      refs: buildFeatureRefs(highlight.topic, extractHighlightTimestamp(highlight), refsInput),
    };
  });
}
