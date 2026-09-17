/**
 * V4-ANALYTICS-001 / V4-ANALYTICS-001A — the one public entry point,
 * mirroring `lib/portfolio-intelligence/engine.ts`/`lib/portfolio-ai/engine.ts`'s
 * own shape: every underlying piece built exactly once, composed into
 * `WalletAnalytics`. Pure, synchronous, no React — takes an already-
 * accumulated `AutomationSnapshot[]` (see `lib/hooks/useWalletAnalytics.ts`
 * for where that array actually lives) and the already-real `WalletEvent[]`
 * log. Never re-fetches, never reruns Portfolio Discovery/Intelligence/AI/
 * Automation.
 *
 * V4-ANALYTICS-001A (Phase 2) — `window`/`now` are new, optional, backward-
 * compatible parameters. `window` (default `"all"`, the original behavior)
 * FILTERS `history`/`events` via `window.ts` before handing the filtered
 * arrays to the same, unmodified `buildTrends()`/`buildPortfolioEvolution()`/
 * `buildAllocationAnalytics()`/`buildAnalyticsTimeline()`/
 * `buildAnalyticsExecutiveSummary()`/`buildTrendCorrelation()`/
 * `buildStabilityIndex()` — no duplicate trend-computation path.
 * `milestones`/`personalBests`/`recoveries`/`changeFrequency` are
 * deliberately computed from the FULL, UNFILTERED `history` regardless of
 * `window` — see each type's own doc comment for why an all-time record
 * isn't a windowed concept. `now` defaults to the real current time; pass
 * it explicitly for deterministic tests.
 *
 * No separate `performance.ts`: the brief's "Recommended structure" lists
 * one, but its only honest content — portfolio value trend, biggest
 * improvement — is already exactly what `trend.ts`/`comparison.ts`
 * provide. A distinct "performance score" combining trends into one new
 * number would be exactly the second intelligence engine this phase's own
 * rules forbid, so that file was deliberately not created rather than
 * padded with a duplicate or risky metric.
 */

import { buildAllocationAnalytics } from "@/lib/wallet-analytics/allocation";
import { buildBiggestChange } from "@/lib/wallet-analytics/biggestChange";
import { buildPortfolioEvolution } from "@/lib/wallet-analytics/comparison";
import { buildTrendCorrelation } from "@/lib/wallet-analytics/correlation";
import { buildAnalyticsExportSnapshot } from "@/lib/wallet-analytics/export";
import { buildChangeFrequency } from "@/lib/wallet-analytics/frequency";
import { buildAnalyticsHighlights } from "@/lib/wallet-analytics/highlights";
import { buildPortfolioMilestones } from "@/lib/wallet-analytics/milestones";
import { buildPersonalBests } from "@/lib/wallet-analytics/personalBests";
import { buildRecoveryAnalysis } from "@/lib/wallet-analytics/recovery";
import { buildStabilityIndex } from "@/lib/wallet-analytics/stability";
import { buildAnalyticsExecutiveSummary } from "@/lib/wallet-analytics/summary";
import { buildAnalyticsTimeline } from "@/lib/wallet-analytics/timeline";
import { buildTrends } from "@/lib/wallet-analytics/trend";
import type { AnalyticsWindow, WalletAnalytics } from "@/lib/wallet-analytics/types";
import { filterEventsByWindow, filterHistoryByWindow } from "@/lib/wallet-analytics/window";
import type { AutomationSnapshot, WalletEvent } from "@/lib/wallet-automation/types";

export function buildWalletAnalytics(
  history: AutomationSnapshot[],
  events: WalletEvent[] = [],
  window: AnalyticsWindow = "all",
  now: string = new Date().toISOString()
): WalletAnalytics {
  const windowedHistory = filterHistoryByWindow(history, window, now);
  const windowedEvents = filterEventsByWindow(events, window, now);

  const trends = buildTrends(windowedHistory);
  const evolution = buildPortfolioEvolution(windowedHistory);
  const allocation = buildAllocationAnalytics(windowedHistory);
  const biggestChange = buildBiggestChange(trends, allocation, windowedHistory);
  const changeFrequency = buildChangeFrequency(history);
  const milestones = buildPortfolioMilestones(history);
  const stability = buildStabilityIndex(trends, buildChangeFrequency(windowedHistory), windowedHistory.length);

  const personalBests = buildPersonalBests(milestones, history);
  const recoveries = buildRecoveryAnalysis(history);
  const correlation = buildTrendCorrelation(trends, biggestChange?.metric ?? null);

  const analyticsWithoutHighlights: WalletAnalytics = {
    window,
    snapshotCount: windowedHistory.length,
    trends,
    evolution,
    biggestChange,
    allocation,
    timeline: buildAnalyticsTimeline(windowedEvents),
    executiveSummary: buildAnalyticsExecutiveSummary(trends, evolution, windowedHistory.length),
    correlation,
    stability,
    milestones,
    personalBests,
    recoveries,
    changeFrequency,
    exportSnapshot: buildAnalyticsExportSnapshot(now, window, trends, milestones, biggestChange, stability, changeFrequency),
    highlights: [],
  };

  // V4-ANALYTICS-001B — Highlights reads the WHOLE already-built object
  // above (trends/biggestChange/recoveries/milestones/personalBests/
  // stability/correlation), so it's computed last, over the real, final
  // values every other field already settled on — never a second pass that
  // recomputes any of them.
  return { ...analyticsWithoutHighlights, highlights: buildAnalyticsHighlights(analyticsWithoutHighlights) };
}

export type { WalletAnalytics } from "@/lib/wallet-analytics/types";
