/**
 * V4-INTELLIGENCE-003 (Phase 5) — the Unified Intelligence Timeline.
 * Deduplication happens BY CONSTRUCTION, not as a cleanup pass: every real
 * candidate is keyed by its own real timestamp in one `Map`, so two
 * candidates describing the identical real moment always collapse into one
 * entry (with both sources recorded) rather than two. This is safe because
 * `WalletEvent[]`/Wallet Analytics' own timeline/Portfolio AI's own
 * timeline are, by each of those modules' own documented design, ALL
 * reshapings of the exact same underlying event log (`lib/wallet-analytics/timeline.ts`'s
 * own doc comment: "NOT a second event-generation pass") — never three
 * independent sources this file would need a second dedup pass for.
 *
 * Automation events are processed FIRST so their real, specific headline
 * (e.g. "Health Score Changed") wins for a shared moment over a generic
 * fallback — a later source at the same timestamp only adds its name to
 * `sources`, never overwrites the headline.
 */

import { HIGHLIGHT_TONE } from "@/lib/cross-feature/events";
import type { UnifiedTimelineEntry, UnifiedTimelineSource } from "@/lib/cross-feature/types";
import type { AnalyticsHighlight } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
import type { WalletEvent, WalletEventTone } from "@/lib/wallet-automation/types";
import { extractHighlightTimestamp } from "@/components/wallet/walletHistoryFilters";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";

function upsert(map: Map<string, UnifiedTimelineEntry>, timestamp: string, source: UnifiedTimelineSource, build: () => { headline: string; tone: WalletEventTone }) {
  const existing = map.get(timestamp);
  if (existing) {
    if (!existing.sources.includes(source)) existing.sources.push(source);
    return;
  }
  const { headline, tone } = build();
  map.set(timestamp, { id: `timeline:${timestamp}`, timestamp, headline, tone, sources: [source] });
}

export function buildUnifiedTimeline(automationEvents: WalletEvent[], highlights: AnalyticsHighlight[], history: AnalyticsSnapshot[], monthlyReport: HistoricalReport | null): UnifiedTimelineEntry[] {
  const byTimestamp = new Map<string, UnifiedTimelineEntry>();

  for (const event of automationEvents) {
    upsert(byTimestamp, event.timestamp, "automation", () => ({ headline: event.title, tone: event.tone }));
  }

  for (const highlight of highlights) {
    const timestamp = extractHighlightTimestamp(highlight);
    if (timestamp) upsert(byTimestamp, timestamp, "highlights", () => ({ headline: highlight.reason, tone: HIGHLIGHT_TONE[highlight.type] }));
  }

  if (monthlyReport) {
    for (const change of monthlyReport.fingerprintChanges) {
      upsert(byTimestamp, change.date, "report", () => ({ headline: `Fingerprint changed: ${change.from} → ${change.to}`, tone: "neutral" }));
    }
    for (const recovery of monthlyReport.majorRecoveries) {
      upsert(byTimestamp, recovery.recoveryDate, "report", () => ({ headline: `Recovered from ${recovery.label}`, tone: "positive" }));
    }
  }

  for (const snapshot of history) {
    upsert(byTimestamp, snapshot.timestamp, "history", () => ({ headline: `Snapshot captured — ${snapshot.fingerprint}, Health ${snapshot.healthScore}`, tone: "neutral" }));
  }

  return [...byTimestamp.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
