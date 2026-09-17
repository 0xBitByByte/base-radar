import { describe, expect, it } from "vitest";

import { buildHistoricalReport, filterHistoryByReportPeriod, REPORT_PERIODS, REPORT_PERIOD_LABEL, type ReportPeriod } from "@/components/wallet/walletReportEngine";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

function snap(overrides: Partial<AnalyticsSnapshot> & { timestamp: string }): AnalyticsSnapshot {
  return {
    analyticsVersion: 1,
    overallScore: 60,
    healthScore: 65,
    riskScore: 30,
    confidenceScore: 80,
    confidenceLevel: "moderate",
    fingerprint: "Mixed",
    largestHoldingSymbol: "ETH",
    largestProtocolName: null,
    primaryRecommendationId: null,
    topWarningId: null,
    totalValue: 10000,
    stablecoinExposure: 20,
    ethPct: 50,
    diversificationScore: 70,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    warningIds: [],
    topHoldings: [],
    ...overrides,
  };
}

const EMPTY_MILESTONES: PortfolioMilestones = {
  highestPortfolioValue: null,
  highestHealthScore: null,
  highestConfidence: null,
  lowestRisk: null,
  bestDiversification: null,
  largestStablecoinAllocation: null,
  largestEthAllocation: null,
  firstWalletConnection: null,
  mostRecentFingerprint: null,
};

const EMPTY_PERSONAL_BESTS: PersonalBests = {
  bestHealth: null,
  bestConfidence: null,
  lowestRisk: null,
  largestPortfolioValue: null,
  bestDiversification: null,
  longestStablePortfolio: null,
};

function makeAnalytics(overrides: Partial<WalletAnalytics> = {}): WalletAnalytics {
  return {
    window: "all",
    snapshotCount: 0,
    trends: [],
    evolution: {
      largestImprovement: null,
      largestDeterioration: null,
      biggestAllocationShift: null,
      mostStableAsset: null,
      mostVolatileAllocation: null,
      longestUnchangedRecommendation: null,
      mostRepeatedWarning: null,
    },
    biggestChange: null,
    allocation: {
      topChanges: [],
      newAssets: [],
      removedAssets: [],
      growingPositions: [],
      shrinkingPositions: [],
      protocolExposureChange: { from: null, to: null, changed: false },
      nativeVsStablecoinChange: { ethPctFrom: 0, ethPctTo: 0, stablecoinPctFrom: 0, stablecoinPctTo: 0 },
    },
    timeline: [],
    executiveSummary: "",
    correlation: null,
    stability: null,
    milestones: EMPTY_MILESTONES,
    personalBests: EMPTY_PERSONAL_BESTS,
    recoveries: [],
    changeFrequency: null,
    exportSnapshot: { generatedAt: "2026-09-01T00:00:00.000Z", window: "all", rows: [] },
    highlights: [],
    ...overrides,
  };
}

const NOW = "2026-09-05T00:00:00.000Z";

describe("walletReportEngine — filterHistoryByReportPeriod", () => {
  const history = [
    snap({ timestamp: "2026-06-01T00:00:00.000Z" }),
    snap({ timestamp: "2026-08-10T00:00:00.000Z" }),
    snap({ timestamp: "2026-08-30T00:00:00.000Z" }),
    snap({ timestamp: "2026-09-04T00:00:00.000Z" }),
  ];

  it("'all' returns the full real history unfiltered", () => {
    expect(filterHistoryByReportPeriod(history, "all", NOW)).toEqual(history);
  });

  it("'1d' (PR-092.05, Daily) keeps only real snapshots within the last 24 hours", () => {
    // NOW is 2026-09-05T00:00:00.000Z; 1 day back is 2026-09-04T00:00:00.000Z — only that exact snapshot falls within this real window.
    expect(filterHistoryByReportPeriod(history, "1d", NOW)).toEqual([history[3]]);
  });

  it("'7d' keeps only real snapshots within the last 7 days", () => {
    // NOW is 2026-09-05; 7 days back is 2026-08-29 — both Aug 30 and Sep 4 fall within that real window.
    expect(filterHistoryByReportPeriod(history, "7d", NOW)).toEqual([history[2], history[3]]);
  });

  it("'30d' keeps real snapshots within the last 30 days", () => {
    // 30 days back is 2026-08-06 — Aug 10/30 and Sep 4 all fall within that real window; Jun 1 does not.
    expect(filterHistoryByReportPeriod(history, "30d", NOW)).toEqual([history[1], history[2], history[3]]);
  });

  it("'90d' keeps real snapshots within the last 90 days", () => {
    expect(filterHistoryByReportPeriod(history, "90d", NOW)).toEqual([history[1], history[2], history[3]]);
  });

  it("every real period is covered with a real label", () => {
    for (const period of REPORT_PERIODS) {
      expect(REPORT_PERIOD_LABEL[period]).toBeTruthy();
    }
  });
});

describe("walletReportEngine — buildHistoricalReport: EMPTY HISTORY", () => {
  it("null for genuinely empty history — nothing real to report", () => {
    expect(buildHistoricalReport([], makeAnalytics(), "all", NOW)).toBeNull();
  });
});

describe("walletReportEngine — buildHistoricalReport: SINGLE SNAPSHOT", () => {
  it("a real report with one real snapshot — bounds equal, no change, no fingerprint transitions", () => {
    const history = [snap({ timestamp: "2026-09-04T00:00:00.000Z", healthScore: 70, totalValue: 12000 })];
    const report = buildHistoricalReport(history, makeAnalytics(), "all", NOW)!;

    expect(report.overview.snapshotCount).toBe(1);
    expect(report.overview.startValue).toBe(12000);
    expect(report.overview.endValue).toBe(12000);
    expect(report.overview.netValueChange).toBe(0);
    expect(report.fingerprintChanges).toEqual([]);
    expect(report.statistics.largestImprovement).toBeNull();
    expect(report.statistics.largestDecline).toBeNull();
    expect(report.statistics.snapshotCount).toBe(1);
    expect(report.health.highest?.value).toBe(70);
    expect(report.health.lowest?.value).toBe(70);
  });
});

describe("walletReportEngine — buildHistoricalReport: MULTIPLE SNAPSHOTS", () => {
  const history = [
    snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 40, riskScore: 60, confidenceScore: 50, totalValue: 8000, fingerprint: "Cautious Holder" }),
    snap({ timestamp: "2026-08-15T00:00:00.000Z", healthScore: 55, riskScore: 45, confidenceScore: 62, totalValue: 9500, fingerprint: "Cautious Holder" }),
    snap({ timestamp: "2026-08-25T00:00:00.000Z", healthScore: 70, riskScore: 30, confidenceScore: 75, totalValue: 11000, fingerprint: "Balanced Holder" }),
    snap({ timestamp: "2026-09-04T00:00:00.000Z", healthScore: 85, riskScore: 20, confidenceScore: 90, totalValue: 13500, fingerprint: "Growth Seeker" }),
  ];

  it("Overview: real bounds, real start/end value, real net change", () => {
    const report = buildHistoricalReport(history, makeAnalytics(), "all", NOW)!;
    expect(report.overview.snapshotCount).toBe(4);
    expect(report.overview.startValue).toBe(8000);
    expect(report.overview.endValue).toBe(13500);
    expect(report.overview.netValueChange).toBe(5500);
  });

  it("Health/Confidence/Risk/Value summaries: real highest/lowest via the SAME extremeMilestone algorithm Milestones uses", () => {
    const report = buildHistoricalReport(history, makeAnalytics(), "all", NOW)!;
    expect(report.health.highest?.value).toBe(85);
    expect(report.health.lowest?.value).toBe(40);
    expect(report.risk.highest?.value).toBe(60); // "highest" is a real fact even for Risk — no direction judgment applied here
    expect(report.risk.lowest?.value).toBe(20);
    expect(report.confidence.change).toBe(40);
    expect(report.value.change).toBe(5500);
  });

  it("Fingerprint Changes: every real consecutive transition, in order", () => {
    const report = buildHistoricalReport(history, makeAnalytics(), "all", NOW)!;
    expect(report.fingerprintChanges).toEqual([
      { from: "Cautious Holder", to: "Balanced Holder", date: "2026-08-25T00:00:00.000Z" },
      { from: "Balanced Holder", to: "Growth Seeker", date: "2026-09-04T00:00:00.000Z" },
    ]);
  });

  it("statistics: largestImprovement/largestDecline reuse compareSnapshots(first, last) — real field, real signed delta", () => {
    const report = buildHistoricalReport(history, makeAnalytics(), "all", NOW)!;
    // first->last: health +45, risk -40, confidence +40, value +5500 (largest by |delta|, but currency-formatted so compared numerically)
    expect(report.statistics.largestImprovement?.key).toBe("totalValue");
    expect(report.statistics.largestImprovement?.delta).toBe(5500);
    expect(report.statistics.largestDecline?.key).toBe("riskScore");
    expect(report.statistics.largestDecline?.delta).toBe(-40);
  });

  it("statistics.snapshotCount matches the real period-filtered count", () => {
    const report = buildHistoricalReport(history, makeAnalytics(), "all", NOW)!;
    expect(report.statistics.snapshotCount).toBe(4);
  });

  it("REPORT DETERMINISM: identical inputs produce an identical report", () => {
    const analytics = makeAnalytics();
    const a = buildHistoricalReport(history, analytics, "30d", NOW);
    const b = buildHistoricalReport(history, analytics, "30d", NOW);
    expect(a).toEqual(b);
  });

  it("ALL REPORT WINDOWS run without error and produce internally consistent snapshot counts", () => {
    for (const period of REPORT_PERIODS as ReportPeriod[]) {
      const report = buildHistoricalReport(history, makeAnalytics(), period, NOW)!;
      expect(report.overview.snapshotCount).toBe(report.statistics.snapshotCount);
      expect(report.overview.snapshotCount).toBeLessThanOrEqual(history.length);
    }
  });

  it("never recomputes Analytics — majorRecoveries/personalBests/milestones/highlights are the EXACT objects/arrays passed in, filtered or verbatim, never rebuilt", () => {
    const recovery = { category: "highRisk" as const, label: "High Risk", recoveryDate: "2026-08-20T00:00:00.000Z", before: { value: 80, timestamp: "2026-08-15T00:00:00.000Z" }, after: { value: 40, timestamp: "2026-08-20T00:00:00.000Z" }, improvement: 40, durationDays: 5 };
    const analytics = makeAnalytics({ recoveries: [recovery], highlights: [], milestones: EMPTY_MILESTONES, personalBests: EMPTY_PERSONAL_BESTS });
    const report = buildHistoricalReport(history, analytics, "all", NOW)!;
    expect(report.majorRecoveries).toEqual([recovery]); // in-period, kept verbatim
    expect(report.personalBests).toBe(analytics.personalBests); // same reference — never rebuilt
    expect(report.milestones).toBe(analytics.milestones);
    expect(report.highlights).toBe(analytics.highlights);
  });

  it("majorRecoveries is filtered OUT when the recovery's real date falls outside the selected period", () => {
    const recovery = { category: "highRisk" as const, label: "High Risk", recoveryDate: "2026-06-01T00:00:00.000Z", before: { value: 80, timestamp: "2026-05-25T00:00:00.000Z" }, after: { value: 40, timestamp: "2026-06-01T00:00:00.000Z" }, improvement: 40, durationDays: 7 };
    const analytics = makeAnalytics({ recoveries: [recovery] });
    const report = buildHistoricalReport(history, analytics, "7d", NOW)!;
    expect(report.majorRecoveries).toEqual([]);
    expect(report.statistics.recoveryCount).toBe(0);
  });
});
