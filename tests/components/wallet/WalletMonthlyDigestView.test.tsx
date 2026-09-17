import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WalletMonthlyDigestView } from "@/components/wallet/WalletMonthlyDigestView";
import { buildMonthlyDigest } from "@/lib/monthly-digest/engine";
import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";

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

const EMPTY_PERSONAL_BESTS: PersonalBests = { bestHealth: null, bestConfidence: null, lowestRisk: null, largestPortfolioValue: null, bestDiversification: null, longestStablePortfolio: null };
const EMPTY_METRIC_SUMMARY = { metric: "healthScore", label: "Health", highest: null, lowest: null, first: null, last: null, change: null };

function makeReport(overrides: Partial<HistoricalReport> = {}): HistoricalReport {
  return {
    period: "30d",
    overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 2, firstSnapshotDate: "2026-08-20T00:00:00.000Z", lastSnapshotDate: "2026-09-05T00:00:00.000Z", startValue: 8000, endValue: 14000, netValueChange: 6000 },
    health: { ...EMPTY_METRIC_SUMMARY, first: { value: 45, date: "2026-08-20T00:00:00.000Z" }, last: { value: 77, date: "2026-09-05T00:00:00.000Z" } },
    confidence: { ...EMPTY_METRIC_SUMMARY, metric: "confidenceScore", label: "Confidence" },
    risk: { ...EMPTY_METRIC_SUMMARY, metric: "riskScore", label: "Risk" },
    value: { ...EMPTY_METRIC_SUMMARY, metric: "totalValue", label: "Portfolio Value" },
    fingerprintChanges: [],
    majorRecoveries: [],
    personalBests: EMPTY_PERSONAL_BESTS,
    milestones: EMPTY_MILESTONES,
    highlights: [],
    statistics: { highestValue: null, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement: null, largestDecline: null, recoveryCount: 0, milestoneCount: 0, snapshotCount: 2 },
    ...overrides,
  };
}

function makeAnalytics(overrides: Partial<WalletAnalytics> = {}): WalletAnalytics {
  return {
    window: "all",
    snapshotCount: 0,
    trends: [],
    evolution: { largestImprovement: null, largestDeterioration: null, biggestAllocationShift: null, mostStableAsset: null, mostVolatileAllocation: null, longestUnchangedRecommendation: null, mostRepeatedWarning: null },
    biggestChange: null,
    allocation: { topChanges: [], newAssets: [], removedAssets: [], growingPositions: [], shrinkingPositions: [], protocolExposureChange: { from: null, to: null, changed: false }, nativeVsStablecoinChange: { ethPctFrom: 0, ethPctTo: 0, stablecoinPctFrom: 0, stablecoinPctTo: 0 } },
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

const EMPTY_CROSS_FEATURE: CrossFeatureIntelligence = { events: [], recommendations: [], timeline: [], latestStory: null, indexes: buildCrossFeatureIndexes([], []) };

describe("WalletMonthlyDigestView", () => {
  it("null digest: shows an honest empty state, no crash", () => {
    render(<WalletMonthlyDigestView digest={null} />);
    expect(screen.getByText("No digest yet.")).toBeInTheDocument();
  });

  it("renders the real month label and real health summary values", () => {
    const digest = buildMonthlyDigest(makeReport(), makeAnalytics(), null, null, EMPTY_CROSS_FEATURE, "2026-09-06T00:00:00.000Z");
    render(<WalletMonthlyDigestView digest={digest} />);
    expect(screen.getByText("September 2026 Digest")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("77")).toBeInTheDocument();
  });

  it("renders real recoveries when present, an honest empty message when not", () => {
    const withRecovery = buildMonthlyDigest(
      makeReport({ majorRecoveries: [{ category: "highRisk", label: "High Risk", recoveryDate: "2026-09-01T00:00:00.000Z", before: { value: 80, timestamp: "2026-08-25T00:00:00.000Z" }, after: { value: 30, timestamp: "2026-09-01T00:00:00.000Z" }, improvement: 50, durationDays: 7 }] }),
      makeAnalytics(),
      null,
      null,
      EMPTY_CROSS_FEATURE
    );
    render(<WalletMonthlyDigestView digest={withRecovery} />);
    expect(screen.getByText("High Risk: 80 → 30")).toBeInTheDocument();

    const empty = buildMonthlyDigest(makeReport(), makeAnalytics(), null, null, EMPTY_CROSS_FEATURE);
    render(<WalletMonthlyDigestView digest={empty} />);
    expect(screen.getByText("No recoveries this period.")).toBeInTheDocument();
  });

  it("renders the real chronological Portfolio Story from CrossFeatureIntelligence", () => {
    const crossFeature: CrossFeatureIntelligence = {
      events: [],
      recommendations: [],
      timeline: [{ id: "t1", timestamp: "2026-08-25T00:00:00.000Z", headline: "Health improved to 77.", tone: "positive", sources: ["automation"] }],
      latestStory: null,
      indexes: buildCrossFeatureIndexes([], []),
    };
    const digest = buildMonthlyDigest(makeReport(), makeAnalytics(), null, null, crossFeature);
    render(<WalletMonthlyDigestView digest={digest} />);
    expect(screen.getByText("Health improved to 77.")).toBeInTheDocument();
  });

  it("Export Digest offers Markdown/Text/HTML and triggers a real download of the real digest", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((blob: Blob) => `blob:mock:${blob.type}`);
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const digest = buildMonthlyDigest(makeReport(), makeAnalytics(), null, null, EMPTY_CROSS_FEATURE, "2026-09-06T00:00:00.000Z");
    render(<WalletMonthlyDigestView digest={digest} />);

    expect(screen.getByRole("button", { name: "Markdown" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Text" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "HTML" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Markdown" }));
    expect(createObjectURL).toHaveReturnedWith("blob:mock:text/markdown");

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
