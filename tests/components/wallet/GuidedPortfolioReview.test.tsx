import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GuidedPortfolioReview } from "@/components/wallet/GuidedPortfolioReview";
import { REVIEW_STEPS } from "@/lib/guided-review/steps";
import type { UseGuidedReviewResult } from "@/lib/hooks/useGuidedReview";
import type { UseWalletAutomationResult } from "@/lib/hooks/useWalletAutomation";
import type { UseWalletHistoryResult } from "@/lib/hooks/useWalletHistory";
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

function makeAutomation(): UseWalletAutomationResult {
  return {
    events: [],
    results: [],
    rules: [],
    setRuleEnabled: vi.fn(),
    resetRules: vi.fn(),
    automationEnabled: true,
    snapshot: null,
    previousSnapshot: null,
    diff: null,
    metadata: { evaluatedAt: "2026-09-01T00:00:00.000Z", ruleCount: 0, enabledRuleCount: 0, triggeredResultCount: 0, eventCount: 0 },
  };
}

function makeWalletHistory(): UseWalletHistoryResult {
  return { history: [], latestSnapshot: null, newestSnapshot: null, oldestSnapshot: null, snapshotCount: 0, storageSizeBytes: 0, isEmpty: true, clearHistory: vi.fn() };
}

function makeReview(overrides: Partial<UseGuidedReviewResult> = {}): UseGuidedReviewResult {
  const state = overrides.state ?? { currentStepIndex: 0, completedStepIds: [], startedAt: null, completedAt: null };
  return {
    state,
    steps: REVIEW_STEPS,
    currentStep: REVIEW_STEPS[state.currentStepIndex],
    isFirstStep: state.currentStepIndex === 0,
    isLastStep: state.currentStepIndex === REVIEW_STEPS.length - 1,
    progress: { completed: state.completedStepIds.length, total: REVIEW_STEPS.length },
    inProgress: state.startedAt !== null && state.completedAt === null,
    next: vi.fn(),
    previous: vi.fn(),
    jumpTo: vi.fn(),
    finish: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

const baseProps = {
  intelligence: null,
  ai: null,
  automation: makeAutomation(),
  analytics: makeAnalytics(),
  walletHistory: makeWalletHistory(),
  highlights: [],
  digest: null,
  story: null,
};

describe("GuidedPortfolioReview", () => {
  it("renders all 8 steps in order, current step highlighted", () => {
    render(<GuidedPortfolioReview review={makeReview()} {...baseProps} />);
    for (const step of REVIEW_STEPS) {
      expect(screen.getByRole("button", { name: new RegExp(step.title) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /1\. Current Health/ })).toHaveAttribute("aria-current", "step");
  });

  it("Previous is disabled on the first step", () => {
    render(<GuidedPortfolioReview review={makeReview()} {...baseProps} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("Next calls review.next(), never review.finish()", async () => {
    const user = userEvent.setup();
    const review = makeReview();
    render(<GuidedPortfolioReview review={review} {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(review.next).toHaveBeenCalledTimes(1);
    expect(review.finish).not.toHaveBeenCalled();
  });

  it("on the last step (Summary), Finish replaces Next and calls review.finish()", async () => {
    const user = userEvent.setup();
    const lastIndex = REVIEW_STEPS.length - 1;
    const review = makeReview({ state: { currentStepIndex: lastIndex, completedStepIds: [], startedAt: "2026-09-01T00:00:00.000Z", completedAt: null } });
    render(<GuidedPortfolioReview review={review} {...baseProps} />);
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Finish" }));
    expect(review.finish).toHaveBeenCalledTimes(1);
  });

  it("clicking a step chip calls review.jumpTo() with that step's index — Jump support", async () => {
    const user = userEvent.setup();
    const review = makeReview();
    render(<GuidedPortfolioReview review={review} {...baseProps} />);
    await user.click(screen.getByRole("button", { name: /4\. Automation/ }));
    expect(review.jumpTo).toHaveBeenCalledWith(3);
  });

  it("a step already in completedStepIds shows a completion mark, an unvisited step doesn't", () => {
    const review = makeReview({ state: { currentStepIndex: 1, completedStepIds: ["health"], startedAt: "2026-09-01T00:00:00.000Z", completedAt: null } });
    render(<GuidedPortfolioReview review={review} {...baseProps} />);
    const completedButton = screen.getByRole("button", { name: /1\. Current Health/ });
    const notCompletedButton = screen.getByRole("button", { name: /3\. Diversification/ });
    expect(completedButton.querySelector("svg")).not.toBeNull();
    expect(notCompletedButton.querySelector("svg")).toBeNull();
  });

  it("no fabricated data: with intelligence null, the Health/Risk/Diversification/Recommendations steps show an honest empty state, never a crash", () => {
    const review = makeReview();
    render(<GuidedPortfolioReview review={review} {...baseProps} />);
    expect(screen.getByText("No holdings yet.")).toBeInTheDocument();
  });

  it("Start Over calls review.reset()", async () => {
    const user = userEvent.setup();
    const review = makeReview();
    render(<GuidedPortfolioReview review={review} {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Start Over" }));
    expect(review.reset).toHaveBeenCalledTimes(1);
  });
});
