/**
 * V4-HISTORY-002 — the History Browser's search/filter/group layer. Every
 * function here is pure and operates only on an already-real
 * `AnalyticsSnapshot[]`/`AnalyticsHighlight[]` — none of them call
 * `lib/wallet-history` or `lib/wallet-analytics` themselves, so this is
 * presentation-layer query logic, not a second retrieval/analytics engine.
 * Colocated here (not under `lib/wallet-history/`) for the same reason
 * `components/automation/filters.ts` is colocated with its own feature.
 */

import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
import type { AnalyticsHighlight, HighlightType } from "@/lib/wallet-analytics/types";

export type HistoryGroupKey = "today" | "yesterday" | "thisWeek" | "earlier";

export const HISTORY_GROUP_ORDER: HistoryGroupKey[] = ["today", "yesterday", "thisWeek", "earlier"];

export const HISTORY_GROUP_LABEL: Record<HistoryGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This Week",
  earlier: "Earlier",
};

function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

/** Real calendar-day comparisons against `now` — never a rolling "last 24h" window, so "Today"/"Yesterday" match what a person actually means by those words. */
function groupKeyFor(timestamp: string, now: Date): HistoryGroupKey {
  const startOfToday = startOfDay(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const ts = new Date(timestamp).getTime();

  if (ts >= startOfToday) return "today";
  if (ts >= startOfToday - dayMs) return "yesterday";
  if (ts >= startOfToday - 7 * dayMs) return "thisWeek";
  return "earlier";
}

/**
 * Buckets already-real snapshots into the 4 real calendar groups,
 * PRESERVING whatever order `snapshots` is already in — this function only
 * classifies, it never sorts. Ordering is `filterAndSortSnapshots`'s job
 * alone (single responsibility): callers sort first, then group, so a
 * chosen "newest"/"oldest" order survives grouping intact instead of being
 * silently re-reversed here. Never fabricates a group for an empty bucket —
 * callers should skip empty groups when rendering.
 */
export function groupSnapshotsByRecency(snapshots: AnalyticsSnapshot[], now: Date): Record<HistoryGroupKey, AnalyticsSnapshot[]> {
  const groups: Record<HistoryGroupKey, AnalyticsSnapshot[]> = { today: [], yesterday: [], thisWeek: [], earlier: [] };
  for (const snapshot of snapshots) {
    groups[groupKeyFor(snapshot.timestamp, now)].push(snapshot);
  }
  return groups;
}

export type SnapshotSortOrder = "newest" | "oldest";

export type SnapshotFilterState = {
  fingerprint: string | null;
  confidenceMin: number | null;
  confidenceMax: number | null;
  healthMin: number | null;
  healthMax: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  sortOrder: SnapshotSortOrder;
};

export const DEFAULT_SNAPSHOT_FILTERS: SnapshotFilterState = {
  fingerprint: null,
  confidenceMin: null,
  confidenceMax: null,
  healthMin: null,
  healthMax: null,
  dateFrom: null,
  dateTo: null,
  sortOrder: "newest",
};

/** The real, distinct fingerprints already present in this history — never a fixed/invented list, so the filter only ever offers options that genuinely exist. */
export function getDistinctFingerprints(snapshots: AnalyticsSnapshot[]): string[] {
  return [...new Set(snapshots.map((s) => s.fingerprint))].sort((a, b) => a.localeCompare(b));
}

/** No full-text search per the brief — every filter here is a structured, real-field match (date range, exact fingerprint, numeric range) or a sort order, never a query string. */
export function filterAndSortSnapshots(snapshots: AnalyticsSnapshot[], filters: SnapshotFilterState): AnalyticsSnapshot[] {
  let result = snapshots;

  if (filters.fingerprint !== null) {
    result = result.filter((s) => s.fingerprint === filters.fingerprint);
  }
  if (filters.confidenceMin !== null) {
    result = result.filter((s) => s.confidenceScore >= filters.confidenceMin!);
  }
  if (filters.confidenceMax !== null) {
    result = result.filter((s) => s.confidenceScore <= filters.confidenceMax!);
  }
  if (filters.healthMin !== null) {
    result = result.filter((s) => s.healthScore >= filters.healthMin!);
  }
  if (filters.healthMax !== null) {
    result = result.filter((s) => s.healthScore <= filters.healthMax!);
  }
  if (filters.dateFrom !== null) {
    const fromMs = new Date(filters.dateFrom).getTime();
    result = result.filter((s) => new Date(s.timestamp).getTime() >= fromMs);
  }
  if (filters.dateTo !== null) {
    const endOfDayMs = new Date(filters.dateTo).getTime() + 24 * 60 * 60 * 1000;
    result = result.filter((s) => new Date(s.timestamp).getTime() < endOfDayMs);
  }

  return [...result].sort((a, b) => (filters.sortOrder === "newest" ? b.timestamp.localeCompare(a.timestamp) : a.timestamp.localeCompare(b.timestamp)));
}

/**
 * V4-HISTORY-002 (Phase 6) — Highlight Integration: cross-references
 * already-computed `analytics.highlights` against real snapshot timestamps,
 * NEVER recomputing a highlight. Only `"recovery"`/`"newPersonalBest"`/
 * `"milestone"` genuinely carry a real per-snapshot date in their
 * `dedupeKey` (`highlights.ts`'s own `${type}:${topic}:${dedupeSuffix}`
 * shape) — every other type's suffix is a category/topic string, not a
 * date, so attributing THOSE to one specific snapshot would be a guess this
 * function refuses to make.
 */
const TIMESTAMPED_HIGHLIGHT_TYPES = new Set<HighlightType>(["recovery", "newPersonalBest", "milestone"]);

/** V4-INTELLIGENCE-003 — exported so `lib/cross-feature/` can correlate a highlight to its real underlying History snapshot without re-parsing `dedupeKey` a second time. */
export function extractHighlightTimestamp(highlight: AnalyticsHighlight): string | null {
  if (!TIMESTAMPED_HIGHLIGHT_TYPES.has(highlight.type)) return null;
  const firstColon = highlight.dedupeKey.indexOf(":");
  const secondColon = highlight.dedupeKey.indexOf(":", firstColon + 1);
  if (firstColon === -1 || secondColon === -1) return null;
  const candidate = highlight.dedupeKey.slice(secondColon + 1);
  return Number.isNaN(Date.parse(candidate)) ? null : candidate;
}

export function buildHighlightsBySnapshotTimestamp(highlights: AnalyticsHighlight[]): Map<string, AnalyticsHighlight[]> {
  const map = new Map<string, AnalyticsHighlight[]>();
  for (const highlight of highlights) {
    const timestamp = extractHighlightTimestamp(highlight);
    if (timestamp === null) continue;
    map.set(timestamp, [...(map.get(timestamp) ?? []), highlight]);
  }
  return map;
}
