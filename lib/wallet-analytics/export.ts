/**
 * V4-ANALYTICS-001A (Phase 13) — Export Readiness. Per the brief: "Do NOT
 * implement export. Only expose clean data structures." This file only
 * RESHAPES already-computed `WalletAnalytics` fields into a flat,
 * human-readable `{section, label, value}` row list — the one format a
 * future CSV/PDF table renderer would actually need and doesn't already
 * have (a JSON export needs nothing extra: the full `WalletAnalytics`
 * object is already plain, serializable data — `JSON.stringify(analytics)`
 * works today). No new calculation happens here.
 */

import { ANALYTICS_WINDOW_LABEL } from "@/lib/wallet-analytics/window";
import type { AnalyticsExportRow, AnalyticsExportSnapshot, AnalyticsWindow, BiggestPortfolioChange, ChangeFrequency, PortfolioMilestones, PortfolioStabilityIndex, Trend } from "@/lib/wallet-analytics/types";

function trendRows(trends: Trend[]): AnalyticsExportRow[] {
  return trends.map((t) => ({ section: "Trends", label: t.label, value: `${t.direction} (${t.confidence} confidence) — ${t.reason}` }));
}

function milestoneRows(milestones: PortfolioMilestones): AnalyticsExportRow[] {
  return Object.values(milestones)
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .map((m) => ({ section: "Milestones", label: m.label, value: `${m.value} (${m.date})` }));
}

function biggestChangeRows(biggestChange: BiggestPortfolioChange): AnalyticsExportRow[] {
  if (!biggestChange) return [];
  return [{ section: "Biggest Change", label: biggestChange.category, value: `${biggestChange.magnitude} — ${biggestChange.primaryCause}` }];
}

function stabilityRows(stability: PortfolioStabilityIndex): AnalyticsExportRow[] {
  if (!stability) return [];
  return [{ section: "Stability", label: "Portfolio Stability Index", value: `${stability.label} (${stability.reason})` }];
}

function changeFrequencyRows(changeFrequency: ChangeFrequency): AnalyticsExportRow[] {
  if (!changeFrequency) return [];
  return changeFrequency.metrics.map((m) => ({ section: "Change Frequency", label: m.label, value: `${m.lifetimeChanges} changes over ${m.lifetimeDays} days (${m.perWeek}/week)` }));
}

export function buildAnalyticsExportSnapshot(
  generatedAt: string,
  window: AnalyticsWindow,
  trends: Trend[],
  milestones: PortfolioMilestones,
  biggestChange: BiggestPortfolioChange,
  stability: PortfolioStabilityIndex,
  changeFrequency: ChangeFrequency
): AnalyticsExportSnapshot {
  return {
    generatedAt,
    window,
    rows: [
      { section: "Overview", label: "Window", value: ANALYTICS_WINDOW_LABEL[window] },
      { section: "Overview", label: "Generated", value: generatedAt },
      ...trendRows(trends),
      ...biggestChangeRows(biggestChange),
      ...milestoneRows(milestones),
      ...stabilityRows(stability),
      ...changeFrequencyRows(changeFrequency),
    ],
  };
}
