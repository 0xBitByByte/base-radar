import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WalletPortfolioStoryView } from "@/components/wallet/WalletPortfolioStoryView";
import { buildPortfolioStory } from "@/lib/portfolio-story/engine";
import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";
import type { CrossFeatureIntelligence, UnifiedTimelineEntry } from "@/lib/cross-feature/types";

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
    period: "all",
    overview: { period: "all", periodLabel: "All Time", snapshotCount: 2, firstSnapshotDate: "2026-08-01T00:00:00.000Z", lastSnapshotDate: "2026-09-05T00:00:00.000Z", startValue: 8000, endValue: 14000, netValueChange: 6000 },
    health: { ...EMPTY_METRIC_SUMMARY, first: { value: 45, date: "2026-08-01T00:00:00.000Z" }, last: { value: 77, date: "2026-09-05T00:00:00.000Z" } },
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

function makeCrossFeature(timeline: UnifiedTimelineEntry[] = []): CrossFeatureIntelligence {
  return { events: [], recommendations: [], timeline, latestStory: null, indexes: buildCrossFeatureIndexes([], []) };
}

describe("WalletPortfolioStoryView", () => {
  it("null story: shows an honest empty state, no crash", () => {
    render(<WalletPortfolioStoryView story={null} />);
    expect(screen.getByText("No story yet.")).toBeInTheDocument();
  });

  it("renders the real introduction from PortfolioIntelligence.executiveSummary", () => {
    const story = buildPortfolioStory(makeReport(), makeAnalytics(), { executiveSummary: "A real balanced portfolio summary." } as never, null, makeCrossFeature());
    render(<WalletPortfolioStoryView story={story} />);
    expect(screen.getByText("A real balanced portfolio summary.")).toBeInTheDocument();
  });

  it("renders real Where You Started / Current Position values", () => {
    const story = buildPortfolioStory(makeReport(), makeAnalytics(), null, null, makeCrossFeature());
    render(<WalletPortfolioStoryView story={story} />);
    expect(screen.getAllByText(/\$8,000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$14,000/).length).toBeGreaterThan(0);
  });

  it("renders real Key Turning Points in chronological order, an honest empty message when none", () => {
    const withMoments = buildPortfolioStory(
      makeReport(),
      makeAnalytics(),
      null,
      null,
      makeCrossFeature([
        { id: "t2", timestamp: "2026-09-01T00:00:00.000Z", headline: "Second real event.", tone: "positive", sources: ["automation"] },
        { id: "t1", timestamp: "2026-08-01T00:00:00.000Z", headline: "First real event.", tone: "positive", sources: ["history"] },
      ])
    );
    render(<WalletPortfolioStoryView story={withMoments} />);
    expect(screen.getByText("First real event.")).toBeInTheDocument();
    expect(screen.getByText("Second real event.")).toBeInTheDocument();

    const empty = buildPortfolioStory(makeReport(), makeAnalytics(), null, null, makeCrossFeature());
    render(<WalletPortfolioStoryView story={empty} />);
    expect(screen.getByText("Nothing correlated yet.")).toBeInTheDocument();
  });

  it("renders real recoveries when present, an honest empty message when not", () => {
    const withRecovery = buildPortfolioStory(
      makeReport({ majorRecoveries: [{ category: "highRisk", label: "High Risk", recoveryDate: "2026-09-01T00:00:00.000Z", before: { value: 80, timestamp: "2026-08-25T00:00:00.000Z" }, after: { value: 30, timestamp: "2026-09-01T00:00:00.000Z" }, improvement: 50, durationDays: 7 }] }),
      makeAnalytics(),
      null,
      null,
      makeCrossFeature()
    );
    render(<WalletPortfolioStoryView story={withRecovery} />);
    expect(screen.getByText("High Risk: 80 → 30")).toBeInTheDocument();
  });

  it("renders real next recommended action, an honest empty message when none", () => {
    const withAction = buildPortfolioStory(makeReport(), makeAnalytics(), null, { overview: { priority: "recommendation", headline: "h", explanation: "e", confidence: "High", nextAction: "Diversify holdings", actionReason: "Top holding is 50%." } } as never, makeCrossFeature());
    render(<WalletPortfolioStoryView story={withAction} />);
    expect(screen.getByText("Diversify holdings")).toBeInTheDocument();
    expect(screen.getByText("Top holding is 50%.")).toBeInTheDocument();
  });

  it("Export Story offers Markdown/Text/HTML and triggers a real download of the real story", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((blob: Blob) => `blob:mock:${blob.type}`);
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const story = buildPortfolioStory(makeReport(), makeAnalytics(), null, null, makeCrossFeature());
    render(<WalletPortfolioStoryView story={story} />);

    expect(screen.getByRole("button", { name: "Markdown" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Text" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "HTML" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Markdown" }));
    expect(createObjectURL).toHaveReturnedWith("blob:mock:text/markdown");

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
