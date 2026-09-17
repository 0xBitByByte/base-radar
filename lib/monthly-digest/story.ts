/**
 * V4-FUTURE-001 (Phase 4) — Story Assembly. Reuses
 * `CrossFeatureIntelligence.timeline` verbatim (already the deduplicated,
 * cross-module-correlated moment list Cross-Feature Intelligence built) —
 * this file's only real job is FILTERING it to the digest's own period
 * bounds and reversing it to read chronologically forward (the timeline
 * itself is newest-first, the right order for a browse list; a story reads
 * oldest-first). No new event, no new headline — every `DigestStoryEntry`
 * is a real `UnifiedTimelineEntry`'s own `timestamp`/`headline`.
 */

import type { DigestStoryEntry } from "@/lib/monthly-digest/types";
import type { UnifiedTimelineEntry } from "@/lib/cross-feature/types";

export function buildPortfolioStory(timeline: UnifiedTimelineEntry[], periodStart: string | null, periodEnd: string | null): DigestStoryEntry[] {
  if (!periodStart || !periodEnd) return [];
  const startMs = new Date(periodStart).getTime();
  const endMs = new Date(periodEnd).getTime();

  return timeline
    .filter((entry) => {
      const t = new Date(entry.timestamp).getTime();
      return t >= startMs && t <= endMs;
    })
    .map((entry) => ({ timestamp: entry.timestamp, headline: entry.headline }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
