import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ExplainAutomationAction } from "@/components/wallet/ExplainAutomationAction";
import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";
import type { AutomationResult } from "@/lib/automation/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";

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

function makeAnalytics(): WalletAnalytics {
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
  };
}

function makeResult(overrides: Partial<AutomationResult> = {}): AutomationResult {
  return {
    id: "automation:wallet-rule:health:1",
    ruleId: "wallet-rule:health",
    notificationId: "n1",
    title: "Health Score Changed",
    summary: "Health score moved from 40 to 70.",
    status: "triggered",
    triggeredAt: "2026-09-01T00:00:00.000Z",
    projectId: null,
    projectName: null,
    priority: "medium",
    link: "/dashboard/wallet",
    metadata: { source: "wallet-automation" },
    ...overrides,
  };
}

const EMPTY_CROSS_FEATURE: CrossFeatureIntelligence = { events: [], recommendations: [], timeline: [], latestStory: null, indexes: buildCrossFeatureIndexes([], []) };

describe("ExplainAutomationAction", () => {
  it("renders nothing for a non-wallet-sourced (watchlist/project) result — never a fabricated explanation", () => {
    const { container } = render(<ExplainAutomationAction result={makeResult({ metadata: { source: "watchlist-automation" } })} crossFeature={EMPTY_CROSS_FEATURE} ai={null} analytics={makeAnalytics()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when metadata is entirely absent", () => {
    const { container } = render(<ExplainAutomationAction result={makeResult({ metadata: undefined as unknown as AutomationResult["metadata"] })} crossFeature={EMPTY_CROSS_FEATURE} ai={null} analytics={makeAnalytics()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the real Explain button for a wallet-sourced result", () => {
    render(<ExplainAutomationAction result={makeResult()} crossFeature={EMPTY_CROSS_FEATURE} ai={null} analytics={makeAnalytics()} />);
    expect(screen.getByRole("button", { name: /Explain/ })).toBeInTheDocument();
  });

  it("opening it shows the real result's own headline/reason — the exact same explanation buildNotificationExplanation would produce directly", async () => {
    const user = userEvent.setup();
    render(<ExplainAutomationAction result={makeResult()} crossFeature={EMPTY_CROSS_FEATURE} ai={null} analytics={makeAnalytics()} />);
    await user.click(screen.getByRole("button", { name: /Explain/ }));
    expect(screen.getByText("Health Score Changed")).toBeInTheDocument();
    expect(screen.getByText("Health score moved from 40 to 70.")).toBeInTheDocument();
  });

  it("passes askQuestion through to the real suggested-question buttons unchanged", async () => {
    const user = userEvent.setup();
    const askQuestion = vi.fn();
    render(<ExplainAutomationAction result={makeResult()} crossFeature={EMPTY_CROSS_FEATURE} ai={null} analytics={makeAnalytics()} askQuestion={askQuestion} />);
    await user.click(screen.getByRole("button", { name: /Explain/ }));
    await user.click(screen.getByRole("button", { name: "What changed recently?" }));
    expect(askQuestion).toHaveBeenCalledWith("recentChanges");
  });
});
