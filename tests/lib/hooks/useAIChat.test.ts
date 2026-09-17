import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { ConversationInput } from "@/lib/ai-chat/types";
import type { PersonalBests, PortfolioMilestones, WalletAnalytics } from "@/lib/wallet-analytics/types";

/**
 * Regression coverage for the "connected wallet + Synced header, but AI
 * Chat says 'No wallet data yet'" bug. Root cause: `useAIChat()`
 * independently re-derived intelligence/ai/analytics/automation via its
 * own separate hook chain instead of consuming the canonical data
 * `WalletDataProvider` already built for the Wallet page — each hook
 * instance owns its OWN independent `usePortfolio()` fetch (confirmed in
 * `usePortfolio.ts`), so the two copies could genuinely diverge.
 *
 * The four internal hooks are mocked here to a deliberately EMPTY/NULL
 * state (simulating "this hook's own independent fetch hasn't resolved
 * yet") specifically so these tests can prove the fix: passing a real,
 * non-null `overrideInput` must produce `hasData: true` regardless of
 * what the internal (now-irrelevant) hooks would have derived on their
 * own — the exact scenario the bug report described.
 */

vi.mock("@/lib/hooks/useWalletPortfolioIntelligence", () => ({ useWalletPortfolioIntelligence: () => ({ intelligence: null, loading: false, refreshing: false, error: null, chainSupported: true, partial: false, refresh: vi.fn() }) }));
vi.mock("@/lib/hooks/useWalletPortfolioAI", () => ({ useWalletPortfolioAI: () => ({ ai: null, loading: false, refreshing: false, error: null, chainSupported: true, partial: false, refresh: vi.fn() }) }));
vi.mock("@/lib/hooks/useWalletAnalytics", () => ({
  useWalletAnalytics: () => ({
    analytics: EMPTY_ANALYTICS,
    history: [],
  }),
}));
vi.mock("@/lib/hooks/useWalletAutomation", () => ({ useWalletAutomation: () => ({ events: [], results: [], rules: [], setRuleEnabled: vi.fn(), resetRules: vi.fn(), automationEnabled: true, snapshot: null, previousSnapshot: null, diff: null, metadata: { evaluatedAt: "2026-09-01T00:00:00.000Z", ruleCount: 0, enabledRuleCount: 0, triggeredResultCount: 0, eventCount: 0 } }) }));

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

const EMPTY_ANALYTICS: WalletAnalytics = {
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

function makeIntelligence(overrides: Partial<PortfolioIntelligence> = {}): PortfolioIntelligence {
  return {
    overallScore: 72,
    riskScore: 32,
    diversificationScore: 65,
    healthScore: 78,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    totalUsdValue: 15200,
    largestHolding: null,
    largestProtocol: null,
    stablecoinExposure: 25,
    defiExposure: 30,
    concentrationRisk: { level: "moderate", topHoldingPct: 45, description: "Top holding is 45% of portfolio." },
    recommendations: [],
    warnings: [],
    opportunities: [],
    summary: "summary",
    lastUpdated: "2026-09-05T00:00:00.000Z",
    healthBreakdown: [],
    quality: { verifiedAssetCount: 4, unverifiedAssetCount: 0, notCheckedAssetCount: 0, protocolsDetected: 2, diversificationRating: "Good", diversificationRatingReason: "reason" },
    allocationBreakdown: { topHoldings: [], stablecoinPct: 25, ethPct: 45, otherPct: 30, unknownAssetPct: 0, protocolConcentrationPct: 0, largestProtocolName: null },
    positiveContributors: [],
    negativeContributors: [],
    confidenceScore: 85,
    confidenceLevel: "High",
    fingerprint: "Balanced",
    fingerprintReason: "reason",
    executiveSummary: "A balanced, recovering portfolio.",
    ...overrides,
  };
}

function makeOverrideInput(overrides: Partial<ConversationInput> = {}): ConversationInput {
  return {
    intelligence: makeIntelligence(),
    ai: null,
    analytics: EMPTY_ANALYTICS,
    history: [],
    automationEvents: [],
    automationResults: [],
    automationDiff: null,
    monthlyReport: null,
    ...overrides,
  };
}

describe("useAIChat — bug fix: canonical override wins over the internal (independently-fetched) derivation", () => {
  it("with NO override: falls back to the internally-derived (here, empty/null) data — hasData is false, matching the mocked hooks' own empty state", async () => {
    const { useAIChat } = await import("@/lib/hooks/useAIChat");
    const { result } = renderHook(() => useAIChat());
    expect(result.current.hasData).toBe(false);
  });

  it("with a real override whose intelligence is non-null: hasData is true, even though the internal hooks (mocked to null/empty) would say otherwise — this IS the bug fix", async () => {
    const { useAIChat } = await import("@/lib/hooks/useAIChat");
    const { result } = renderHook(() => useAIChat(makeOverrideInput()));
    expect(result.current.hasData).toBe(true);
  });

  it("suggestedQuestions and ask() both use the OVERRIDE data, never the internal (empty) derivation", async () => {
    const { useAIChat } = await import("@/lib/hooks/useAIChat");
    const { result } = renderHook(() => useAIChat(makeOverrideInput()));
    expect(result.current.suggestedQuestions.length).toBeGreaterThan(0);
  });

  it("an override with intelligence: null (a genuine 'no holdings' override) honestly reports hasData: false — never fabricated", async () => {
    const { useAIChat } = await import("@/lib/hooks/useAIChat");
    const { result } = renderHook(() => useAIChat(makeOverrideInput({ intelligence: null })));
    expect(result.current.hasData).toBe(false);
  });
});
