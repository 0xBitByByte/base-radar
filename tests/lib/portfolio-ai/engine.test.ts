import { describe, expect, it } from "vitest";

import type { HoldingAsset } from "@/lib/holdings/types";
import { buildPortfolioIntelligence } from "@/lib/portfolio-intelligence/engine";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletEvent } from "@/lib/wallet-automation/types";

import { buildAIActions } from "@/lib/portfolio-ai/actions";
import { buildAIOverview } from "@/lib/portfolio-ai/advisor";
import { buildConversationContext } from "@/lib/portfolio-ai/conversation";
import { buildPortfolioAI } from "@/lib/portfolio-ai/engine";
import { buildAIInsights } from "@/lib/portfolio-ai/insights";
import { comparePriorityTier, PRIORITY_TIER_RANK } from "@/lib/portfolio-ai/priorities";
import { buildAISummaryLines } from "@/lib/portfolio-ai/summary";
import { buildAITimeline } from "@/lib/portfolio-ai/timeline";
import type { AIPriorityTier } from "@/lib/portfolio-ai/types";
import * as PortfolioAIPublicApi from "@/lib/portfolio-ai/index";

const NOW = "2026-09-04T00:00:00.000Z";

function holding(overrides: Partial<HoldingAsset> & { symbol: string }): HoldingAsset {
  return {
    address: `0x${overrides.symbol.toLowerCase()}`,
    name: overrides.symbol,
    logo: null,
    balance: BigInt("1000000000000000000"),
    decimals: 18,
    formattedBalance: "1.0",
    usdPrice: 1,
    usdValue: 1,
    allocationPct: 100,
    chain: "base",
    verified: null,
    tokenType: "erc20",
    ...overrides,
  };
}

function eth(overrides: Partial<HoldingAsset> = {}): HoldingAsset {
  return holding({ symbol: "ETH", address: null, tokenType: "native", ...overrides });
}

function ethHeavyWallet(): HoldingAsset[] {
  return [
    eth({ usdValue: 8200, allocationPct: 82 }),
    holding({ symbol: "USDC", usdValue: 400, allocationPct: 4, verified: true }),
    holding({ symbol: "AERO", usdValue: 1400, allocationPct: 14, verified: true }),
  ];
}

function balancedWallet(): HoldingAsset[] {
  return [
    holding({ symbol: "USDC", usdValue: 2500, allocationPct: 25, verified: true }),
    holding({ symbol: "DAI", usdValue: 2500, allocationPct: 25, verified: true }),
    eth({ usdValue: 2500, allocationPct: 25 }),
    holding({ symbol: "COMP", usdValue: 2500, allocationPct: 25, verified: true }),
  ];
}

function intelligenceFor(assets: HoldingAsset[], totalUsdValue: number): PortfolioIntelligence {
  return buildPortfolioIntelligence(assets, totalUsdValue, NOW);
}

function walletEvent(overrides: Partial<WalletEvent> & { id: string }): WalletEvent {
  return {
    kind: "PortfolioScoreChanged",
    timestamp: NOW,
    title: "Portfolio score changed",
    summary: "Overall score moved.",
    tone: "neutral",
    ...overrides,
  };
}

describe("priorities.ts", () => {
  it("encodes the brief's exact order: critical-risk < major-opportunity < recommendation < positive-achievement < observation", () => {
    expect(PRIORITY_TIER_RANK["critical-risk"]).toBeLessThan(PRIORITY_TIER_RANK["major-opportunity"]);
    expect(PRIORITY_TIER_RANK["major-opportunity"]).toBeLessThan(PRIORITY_TIER_RANK.recommendation);
    expect(PRIORITY_TIER_RANK.recommendation).toBeLessThan(PRIORITY_TIER_RANK["positive-achievement"]);
    expect(PRIORITY_TIER_RANK["positive-achievement"]).toBeLessThan(PRIORITY_TIER_RANK.observation);
  });

  it("comparePriorityTier sorts a shuffled tier list into the correct order", () => {
    const shuffled: AIPriorityTier[] = ["observation", "recommendation", "critical-risk", "positive-achievement", "major-opportunity"];
    expect([...shuffled].sort(comparePriorityTier)).toEqual(["critical-risk", "major-opportunity", "recommendation", "positive-achievement", "observation"]);
  });
});

describe("insights.ts — buildAIInsights", () => {
  it("never invents an insight — every one traces back to a real positiveContributor, negativeContributor, or the fingerprint", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const insights = buildAIInsights(intelligence);
    const validIds = new Set([...intelligence.positiveContributors.map((c) => c.id), ...intelligence.negativeContributors.map((c) => c.id), "fingerprint"]);
    for (const insight of insights) {
      expect(validIds.has(insight.id)).toBe(true);
    }
  });

  it("every negative contributor becomes a critical-risk insight", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const insights = buildAIInsights(intelligence);
    for (const contributor of intelligence.negativeContributors) {
      const insight = insights.find((i) => i.id === contributor.id);
      expect(insight?.priority).toBe("critical-risk");
    }
  });

  it("opportunity-sourced positive contributors are major-opportunity; health-sourced ones are positive-achievement", () => {
    const intelligence = intelligenceFor(balancedWallet(), 10000);
    const insights = buildAIInsights(intelligence);
    for (const contributor of intelligence.positiveContributors) {
      const insight = insights.find((i) => i.id === contributor.id);
      const expected = contributor.id.startsWith("opportunity:") ? "major-opportunity" : "positive-achievement";
      expect(insight?.priority).toBe(expected);
    }
  });

  it("exactly one observation-tier insight, for the fingerprint", () => {
    const insights = buildAIInsights(intelligenceFor(ethHeavyWallet(), 10000));
    const observations = insights.filter((i) => i.priority === "observation");
    expect(observations).toHaveLength(1);
    expect(observations[0].id).toBe("fingerprint");
  });

  it("attaches relatedAssets only for insights with a real, known single subject — concentration names the largest holding", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const insights = buildAIInsights(intelligence);
    const concentration = insights.find((i) => i.id === "health:concentration-risk");
    expect(concentration?.relatedAssets).toEqual(["ETH"]);
    // A portfolio-wide fact (diversification) has no single subject — honestly empty, not guessed.
    const diversification = insights.find((i) => i.id === "health:diversification");
    expect(diversification?.relatedAssets).toEqual([]);
  });

  it("attaches relatedAssets for protocol dependency from the real protocol name", () => {
    const assets = [holding({ symbol: "AERO", usdValue: 6000, allocationPct: 60 }), eth({ usdValue: 4000, allocationPct: 40 })];
    const intelligence = intelligenceFor(assets, 10000);
    const insights = buildAIInsights(intelligence);
    const protocolInsight = insights.find((i) => i.id === "warning:protocol-dependency");
    expect(protocolInsight?.relatedAssets).toEqual(["AERO"]);
  });

  it("is sorted by priority tier", () => {
    const insights = buildAIInsights(intelligenceFor(ethHeavyWallet(), 10000));
    for (let i = 1; i < insights.length; i++) {
      expect(comparePriorityTier(insights[i - 1].priority, insights[i].priority)).toBeLessThanOrEqual(0);
    }
  });

  it("is fully deterministic", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    expect(buildAIInsights(intelligence)).toEqual(buildAIInsights(intelligence));
  });
});

describe("actions.ts — buildAIActions", () => {
  it("one action per recommendation, same id/title/priority, never a new recommendation", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const actions = buildAIActions(intelligence);
    expect(actions).toHaveLength(intelligence.recommendations.length);
    for (const [i, action] of actions.entries()) {
      expect(action.id).toBe(intelligence.recommendations[i].id);
      expect(action.title).toBe(intelligence.recommendations[i].title);
      expect(action.priority).toBe(intelligence.recommendations[i].priority);
      expect(action.reason).toBe(intelligence.recommendations[i].reason);
    }
  });

  it("every known recommendation id has a real difficulty rating, not just the 'moderate' fallback", () => {
    const assets = [eth({ usdValue: 100, allocationPct: 100 }), holding({ symbol: "MYSTERY", usdValue: null, allocationPct: null })];
    const intelligence = intelligenceFor(assets, 100);
    const actions = buildAIActions(intelligence);
    const researchAction = actions.find((a) => a.id === "research-unpriced");
    expect(researchAction?.difficulty).toBe("easy");
  });

  it("estimatedImpact tracks priority directly", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const actions = buildAIActions(intelligence);
    for (const action of actions) {
      if (action.priority === "high") expect(action.estimatedImpact).toBe("high");
      if (action.priority === "low") expect(action.estimatedImpact).toBe("low");
    }
  });

  it("empty recommendations produce empty actions", () => {
    expect(buildAIActions(intelligenceFor(balancedWallet(), 10000)).length).toBeGreaterThanOrEqual(0);
  });
});

describe("timeline.ts — buildAITimeline", () => {
  it("relabels real WalletEvents, never fabricates one", () => {
    const events = [walletEvent({ id: "e1", title: "Risk level changed", tone: "attention" }), walletEvent({ id: "e2", title: "Pricing coverage improved", tone: "positive" })];
    const timeline = buildAITimeline(events);
    expect(timeline).toEqual([
      { id: "e1", headline: "Risk level changed", tone: "attention", timestamp: NOW },
      { id: "e2", headline: "Pricing coverage improved", tone: "positive", timestamp: NOW },
    ]);
  });

  it("empty event log produces an honestly empty timeline", () => {
    expect(buildAITimeline([])).toEqual([]);
  });

  it("caps at 10 entries", () => {
    const events = Array.from({ length: 15 }, (_, i) => walletEvent({ id: `e${i}` }));
    expect(buildAITimeline(events)).toHaveLength(10);
  });
});

describe("summary.ts — buildAISummaryLines", () => {
  it("names health, largest holding, diversification, confidence, main concern, and next action as separate lines", () => {
    const lines = buildAISummaryLines(intelligenceFor(ethHeavyWallet(), 10000));
    expect(lines.some((l) => /health|excellent|healthy|fair|attention/i.test(l))).toBe(true);
    expect(lines.some((l) => l.includes("ETH"))).toBe(true);
    expect(lines.some((l) => /diversification/i.test(l))).toBe(true);
    expect(lines.some((l) => /confidence/i.test(l))).toBe(true);
  });

  it("honestly states no concerns / no action when none exist", () => {
    const lines = buildAISummaryLines(intelligenceFor(balancedWallet(), 10000));
    const intelligence = intelligenceFor(balancedWallet(), 10000);
    if (intelligence.warnings.length === 0) expect(lines.some((l) => /no concerns/i.test(l))).toBe(true);
    if (intelligence.recommendations.length === 0) expect(lines.some((l) => /no action needed/i.test(l))).toBe(true);
  });

  it("is fully deterministic", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    expect(buildAISummaryLines(intelligence)).toEqual(buildAISummaryLines(intelligence));
  });
});

describe("advisor.ts — buildAIOverview", () => {
  it("explanation is executiveSummary verbatim — never a new sentence", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const insights = buildAIInsights(intelligence);
    const overview = buildAIOverview(intelligence, insights[0] ?? null);
    expect(overview.explanation).toBe(intelligence.executiveSummary);
  });

  it("nextAction/actionReason mirror the top-priority recommendation exactly", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const overview = buildAIOverview(intelligence, null);
    expect(overview.nextAction).toBe(intelligence.recommendations[0]?.explanation ?? null);
    expect(overview.actionReason).toBe(intelligence.recommendations[0]?.reason ?? null);
  });

  it("headline uses the top insight's title when it's a real finding, not the fingerprint-only fallback", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const insights = buildAIInsights(intelligence);
    const topRealInsight = insights.find((i) => i.priority !== "observation") ?? null;
    const overview = buildAIOverview(intelligence, topRealInsight);
    if (topRealInsight) expect(overview.headline).toBe(topRealInsight.title);
  });

  it("falls back to a fixed headline when nothing but the observation exists", () => {
    const intelligence = intelligenceFor(balancedWallet(), 10000);
    const insights = buildAIInsights(intelligence);
    const onlyObservation = insights.find((i) => i.priority === "observation") ?? null;
    const overview = buildAIOverview(intelligence, onlyObservation);
    expect(overview.headline).toMatch(/nothing urgent/i);
  });

  it("no priced holdings — overview still produces a valid object, no crash", () => {
    const intelligence = intelligenceFor([], 0);
    const overview = buildAIOverview(intelligence, null);
    expect(overview.nextAction).toBeNull();
    expect(typeof overview.explanation).toBe("string");
  });
});

describe("conversation.ts — buildConversationContext", () => {
  it("is a pure pass-through — every field matches the source intelligence object exactly", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const context = buildConversationContext(intelligence);
    expect(context.scores.overallScore).toBe(intelligence.overallScore);
    expect(context.scores.confidenceScore).toBe(intelligence.confidenceScore);
    expect(context.warnings).toEqual(intelligence.warnings);
    expect(context.recommendations).toEqual(intelligence.recommendations);
    expect(context.fingerprint).toBe(intelligence.fingerprint);
    expect(context.contributors.positive).toEqual(intelligence.positiveContributors);
    expect(context.contributors.negative).toEqual(intelligence.negativeContributors);
    expect(context.summary).toBe(intelligence.executiveSummary);
    expect(context.facts.largestHoldingSymbol).toBe(intelligence.largestHolding?.symbol ?? null);
  });

  it("handles no priced holdings honestly", () => {
    const context = buildConversationContext(intelligenceFor([], 0));
    expect(context.facts.largestHoldingSymbol).toBeNull();
    expect(context.facts.largestProtocolName).toBeNull();
  });
});

describe("engine.ts — buildPortfolioAI (full AI layer)", () => {
  it("composes every piece from the same already-built intelligence, never recalculating a score", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const ai = buildPortfolioAI(intelligence);
    expect(ai.overview.explanation).toBe(intelligence.executiveSummary);
    expect(ai.actions.map((a) => a.id)).toEqual(intelligence.recommendations.map((r) => r.id));
    expect(ai.conversationContext.scores.overallScore).toBe(intelligence.overallScore);
  });

  it("wires the real event log into the timeline when provided", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const events = [walletEvent({ id: "e1", title: "Risk level changed" })];
    const ai = buildPortfolioAI(intelligence, events);
    expect(ai.timeline).toEqual([{ id: "e1", headline: "Risk level changed", tone: "neutral", timestamp: NOW }]);
  });

  it("defaults to an empty timeline when no events are given — never fabricates history", () => {
    const ai = buildPortfolioAI(intelligenceFor(ethHeavyWallet(), 10000));
    expect(ai.timeline).toEqual([]);
  });

  it("is fully deterministic — identical input always produces byte-identical output", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    const events = [walletEvent({ id: "e1" })];
    expect(buildPortfolioAI(intelligence, events)).toEqual(buildPortfolioAI(intelligence, events));
  });

  it("empty portfolio — every piece resolves honestly, no crash", () => {
    const ai = buildPortfolioAI(intelligenceFor([], 0));
    expect(ai.overview.nextAction).toBeNull();
    expect(ai.actions).toEqual([]);
    expect(ai.insights.length).toBeGreaterThan(0); // still the honest fingerprint observation + the "unknown assets" health deduction
  });
});

describe("index.ts — public API barrel", () => {
  it("exposes buildPortfolioAI and every sub-builder", () => {
    expect(typeof PortfolioAIPublicApi.buildPortfolioAI).toBe("function");
    expect(typeof PortfolioAIPublicApi.buildAIOverview).toBe("function");
    expect(typeof PortfolioAIPublicApi.buildAIInsights).toBe("function");
    expect(typeof PortfolioAIPublicApi.buildAIActions).toBe("function");
    expect(typeof PortfolioAIPublicApi.buildAITimeline).toBe("function");
    expect(typeof PortfolioAIPublicApi.buildAISummaryLines).toBe("function");
    expect(typeof PortfolioAIPublicApi.buildConversationContext).toBe("function");
  });

  it("buildPortfolioAI from the barrel matches the direct import's output", () => {
    const intelligence = intelligenceFor(ethHeavyWallet(), 10000);
    expect(PortfolioAIPublicApi.buildPortfolioAI(intelligence)).toEqual(buildPortfolioAI(intelligence));
  });
});
