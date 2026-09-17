import { describe, expect, it } from "vitest";

import { askQuestion } from "@/lib/ai-chat/engine";
import { buildSuggestedQuestions } from "@/lib/ai-chat/suggestions";
import { AI_CHAT_QUESTION_IDS } from "@/lib/ai-chat/types";
import type { AIChatQuestionId, ConversationInput } from "@/lib/ai-chat/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
import type { AutomationResult } from "@/lib/automation/types";

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

function makeIntelligence(overrides: Partial<PortfolioIntelligence> = {}): PortfolioIntelligence {
  return {
    overallScore: 60,
    riskScore: 30,
    diversificationScore: 70,
    healthScore: 65,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    totalUsdValue: 10000,
    largestHolding: { symbol: "ETH", name: "Ethereum", address: null, usdValue: 5000, allocationPct: 50 },
    largestProtocol: null,
    stablecoinExposure: 20,
    defiExposure: 30,
    concentrationRisk: { level: "moderate", topHoldingPct: 50, description: "Your largest holding is 50% of known value." },
    recommendations: [{ id: "rec:diversify", title: "Diversify holdings", explanation: "Spread value across more assets.", reason: "Top holding is 50% of known value.", priority: "high" }],
    warnings: [{ id: "warning:concentration", title: "High Concentration", description: "One asset dominates your portfolio.", severity: "moderate" }],
    opportunities: [],
    summary: "Portfolio summary.",
    lastUpdated: "2026-09-01T00:00:00.000Z",
    healthBreakdown: [],
    quality: { verifiedAssetCount: 2, unverifiedAssetCount: 1, notCheckedAssetCount: 0, protocolsDetected: 1, diversificationRating: "Fair", diversificationRatingReason: "Diversification score is 70/100, rated Fair." },
    allocationBreakdown: { topHoldings: [], stablecoinPct: 20, ethPct: 50, otherPct: 30, unknownAssetPct: 0, protocolConcentrationPct: 0, largestProtocolName: null },
    positiveContributors: [],
    negativeContributors: [],
    confidenceScore: 80,
    confidenceLevel: "High",
    fingerprint: "Balanced",
    fingerprintReason: "Diversification score is 70/100 and no single category exceeds 60% of known value.",
    executiveSummary: "Your portfolio is Balanced with a Health score of 65.",
    ...overrides,
  };
}

function makeAI(overrides: Partial<PortfolioAI> = {}): PortfolioAI {
  return {
    overview: { priority: "recommendation", headline: "Diversify", explanation: "Consider diversifying.", confidence: "High", nextAction: "Diversify holdings", actionReason: "Top holding is 50% of known value." },
    insights: [],
    actions: [{ id: "rec:diversify", title: "Diversify holdings", description: "Spread value across more assets.", priority: "high", difficulty: "moderate", estimatedImpact: "high", reason: "Top holding is 50% of known value." }],
    timeline: [],
    summaryLines: [],
    conversationContext: {
      facts: { totalUsdValue: 10000, largestHoldingSymbol: "ETH", largestProtocolName: null, lastUpdated: "2026-09-01T00:00:00.000Z" },
      scores: { overallScore: 60, healthScore: 65, riskScore: 30, diversificationScore: 70, confidenceScore: 80 },
      warnings: [],
      recommendations: [],
      fingerprint: "Balanced",
      confidenceLevel: "High",
      contributors: { positive: [], negative: [] },
      summary: "Portfolio summary.",
    },
    ...overrides,
  };
}

function makeAutomationResult(overrides: Partial<AutomationResult> = {}): AutomationResult {
  return {
    id: "automation:wallet-rule:health:1",
    ruleId: "wallet-rule:health",
    notificationId: "wallet-notification:wallet-rule:health:1",
    title: "Health Score Changed",
    summary: "Health score moved from 50 to 65.",
    status: "triggered",
    triggeredAt: "2026-09-01T00:00:00.000Z",
    projectId: null,
    projectName: null,
    priority: "medium",
    link: "/dashboard/wallet",
    metadata: { source: "wallet-automation", reason: "Health score crossed a significant threshold." },
    ...overrides,
  };
}

const EMPTY_INPUT: ConversationInput = {
  intelligence: null,
  ai: null,
  analytics: makeAnalytics(),
  history: [],
  automationEvents: [],
  automationResults: [],
  automationDiff: null,
  monthlyReport: null,
};

describe("ai-chat engine — unsupported questions", () => {
  it("an unknown question id returns an honest, non-crashing 'unsupported' response", () => {
    const response = askQuestion("whatIsTheMeaningOfLife", EMPTY_INPUT);
    expect(response.answered).toBe(false);
    expect(response.answer).toContain("don't have a way to answer");
  });

  it("an empty string question id is handled the same honest way", () => {
    const response = askQuestion("", EMPTY_INPUT);
    expect(response.answered).toBe(false);
  });
});

describe("ai-chat engine — EMPTY WALLET (no intelligence)", () => {
  it("every question that needs intelligence answers honestly with no data, never throws", () => {
    for (const id of AI_CHAT_QUESTION_IDS) {
      expect(() => askQuestion(id, EMPTY_INPUT)).not.toThrow();
      const response = askQuestion(id, EMPTY_INPUT);
      expect(response.answered).toBe(true);
      expect(response.questionId).toBe(id);
    }
  });

  it("largestHolding honestly reports no priced holdings", () => {
    expect(askQuestion("largestHolding", EMPTY_INPUT).answer).toMatch(/no priced holdings/i);
  });

  it("diversification honestly reports no wallet data", () => {
    expect(askQuestion("diversification", EMPTY_INPUT).answer).toMatch(/no wallet data/i);
  });
});

describe("ai-chat engine — EMPTY HISTORY (intelligence exists, no snapshots)", () => {
  const input: ConversationInput = { ...EMPTY_INPUT, intelligence: makeIntelligence(), ai: makeAI() };

  it("healthChange honestly reports not enough history", () => {
    expect(askQuestion("healthChange", input).answer).toMatch(/not enough history/i);
  });

  it("thisMonth honestly reports not enough history for a report", () => {
    expect(askQuestion("thisMonth", input).answer).toMatch(/not enough history/i);
  });

  it("recentChanges/whatImproved/whatWorsened all answer honestly with no crash", () => {
    for (const id of ["recentChanges", "whatImproved", "whatWorsened"] as AIChatQuestionId[]) {
      expect(() => askQuestion(id, input)).not.toThrow();
      expect(askQuestion(id, input).answered).toBe(true);
    }
  });
});

describe("ai-chat engine — every supported question, with real data", () => {
  const history = [
    snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 40, fingerprint: "Cautious Holder" }),
    snap({ timestamp: "2026-08-20T00:00:00.000Z", healthScore: 70, fingerprint: "Growth Seeker" }),
  ];
  const intelligence = makeIntelligence({ confidenceLevel: "Low", confidenceScore: 30, pricingCoverage: 40, unknownAssetCount: 3 });
  const ai = makeAI({ insights: [{ id: "insight:risk", title: "High Concentration", summary: "One asset dominates your holdings.", importance: "high", reason: "Top holding is 50% of known value.", relatedAssets: ["ETH"], priority: "critical-risk" }] });
  const analytics = makeAnalytics({
    snapshotCount: 2,
    trends: [
      { metric: "health", label: "Health", direction: "improving", from: 40, to: 70, delta: 30, reason: "Health score moved from 40 to 70 across 2 snapshots.", confidence: "medium", confidenceDetail: { confidence: "medium", confidenceReason: "2 snapshots.", snapshotCount: 2, timeSpanDays: 19, consistencyScore: 1 } },
      { metric: "fingerprint", label: "Fingerprint", direction: "unknown", from: "Cautious Holder", to: "Growth Seeker", delta: null, reason: "Fingerprint changed 1 time across 2 snapshots (from Cautious Holder to Growth Seeker).", confidence: "unknown", confidenceDetail: { confidence: "unknown", confidenceReason: "Categorical.", snapshotCount: 2, timeSpanDays: 19, consistencyScore: null } },
    ],
    evolution: {
      largestImprovement: { metric: "health", label: "Health", detail: "Health improved from 40 to 70.", value: 30 },
      largestDeterioration: { metric: "risk", label: "Risk", detail: "Risk increased from 20 to 35.", value: 15 },
      biggestAllocationShift: null,
      mostStableAsset: null,
      mostVolatileAllocation: null,
      longestUnchangedRecommendation: null,
      mostRepeatedWarning: null,
    },
    timeline: [{ id: "t1", dayLabel: "Today", date: "2026-08-20", headline: "Health improved to 70.", tone: "positive", timestamp: "2026-08-20T00:00:00.000Z" }],
    milestones: { ...EMPTY_MILESTONES, highestPortfolioValue: { label: "Highest Portfolio Value", value: 13000, date: "2026-08-20T00:00:00.000Z", snapshot: history[1] } },
  });
  const monthlyReport = { period: "30d" as const, overview: { period: "30d" as const, periodLabel: "Last 30 Days", snapshotCount: 2, firstSnapshotDate: history[0].timestamp, lastSnapshotDate: history[1].timestamp, startValue: 10000, endValue: 10000, netValueChange: 0 }, health: { metric: "healthScore", label: "Health", highest: null, lowest: null, first: null, last: null, change: null }, confidence: { metric: "confidenceScore", label: "Confidence", highest: null, lowest: null, first: null, last: null, change: null }, risk: { metric: "riskScore", label: "Risk", highest: null, lowest: null, first: null, last: null, change: null }, value: { metric: "totalValue", label: "Portfolio Value", highest: null, lowest: null, first: null, last: null, change: null }, fingerprintChanges: [{ from: "Cautious Holder", to: "Growth Seeker", date: "2026-08-20T00:00:00.000Z" }], majorRecoveries: [], personalBests: EMPTY_PERSONAL_BESTS, milestones: EMPTY_MILESTONES, highlights: [], statistics: { highestValue: null, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement: null, largestDecline: null, recoveryCount: 0, milestoneCount: 0, snapshotCount: 2 } };
  const automationResults = [makeAutomationResult()];

  const input: ConversationInput = { intelligence, ai, analytics, history, automationEvents: [], automationResults, automationDiff: null, monthlyReport };

  it("every one of the 14 questions answers without throwing and marks answered:true", () => {
    for (const id of AI_CHAT_QUESTION_IDS) {
      expect(() => askQuestion(id, input)).not.toThrow();
      const response = askQuestion(id, input);
      expect(response.answered).toBe(true);
      expect(response.questionId).toBe(id);
      expect(response.question.length).toBeGreaterThan(0);
    }
  });

  it("healthChange cites the real Trend.reason verbatim", () => {
    expect(askQuestion("healthChange", input).answer).toBe("Health score moved from 40 to 70 across 2 snapshots.");
  });

  it("confidenceLow cites real, already-computed data-completeness facts", () => {
    const response = askQuestion("confidenceLow", input);
    expect(response.answer).toMatch(/40%/);
    expect(response.facts.some((f) => f.label === "Pricing Coverage")).toBe(true);
  });

  it("biggestRisk reuses the already-ranked critical-risk AI insight", () => {
    expect(askQuestion("biggestRisk", input).answer).toBe("One asset dominates your holdings.");
  });

  it("diversification cites the real diversificationRatingReason verbatim", () => {
    expect(askQuestion("diversification", input).answer).toBe(intelligence.quality.diversificationRatingReason);
  });

  it("recentChanges cites real Analytics timeline entries", () => {
    expect(askQuestion("recentChanges", input).answer).toContain("Health improved to 70.");
  });

  it("whatImproved cites the real largestImprovement finding", () => {
    expect(askQuestion("whatImproved", input).answer).toBe("Health improved from 40 to 70.");
  });

  it("whatWorsened cites the real largestDeterioration finding", () => {
    expect(askQuestion("whatWorsened", input).answer).toBe("Risk increased from 20 to 35.");
  });

  it("largestHolding cites the real ScoredHolding facts", () => {
    const response = askQuestion("largestHolding", input);
    expect(response.answer).toContain("ETH");
    expect(response.answer).toContain("50.0%");
  });

  it("fingerprintChange cites the real fingerprint Trend + current fingerprintReason", () => {
    const response = askQuestion("fingerprintChange", input);
    expect(response.answer).toContain("Fingerprint changed 1 time");
    expect(response.answer).toContain(intelligence.fingerprintReason);
  });

  it("improveFirst cites the real ai.overview.nextAction/actionReason", () => {
    const response = askQuestion("improveFirst", input);
    expect(response.answer).toBe("Diversify holdings");
    expect(response.facts.some((f) => f.label === "Why")).toBe(true);
  });

  it("thisMonth cites the real 30-day report", () => {
    const response = askQuestion("thisMonth", input);
    expect(response.answer).toContain("2 snapshots");
    expect(response.facts.some((f) => f.label === "Fingerprint Changes" && f.value === "1")).toBe(true);
  });

  it("portfolioEvolution cites real evolution findings", () => {
    const response = askQuestion("portfolioEvolution", input);
    expect(response.answer).toContain("Health improved from 40 to 70.");
  });

  it("topRecommendation cites the real, already-ranked ai.actions[0]", () => {
    const response = askQuestion("topRecommendation", input);
    expect(response.answer).toContain("Diversify holdings");
    expect(response.facts.some((f) => f.label === "Priority" && f.value === "high")).toBe(true);
  });

  it("automationTriggered cites the real triggered AutomationResult's title and reason", () => {
    const response = askQuestion("automationTriggered", input);
    expect(response.answer).toContain("Health Score Changed");
    expect(response.answer).toContain("Health score crossed a significant threshold.");
  });
});

describe("ai-chat engine — CONVERSATION DETERMINISM", () => {
  const intelligence = makeIntelligence();
  const ai = makeAI();
  const input: ConversationInput = { ...EMPTY_INPUT, intelligence, ai };

  it("identical input produces an identical response for every question", () => {
    for (const id of AI_CHAT_QUESTION_IDS) {
      const a = askQuestion(id, input);
      const b = askQuestion(id, input);
      expect(a).toEqual(b);
    }
  });
});

describe("ai-chat engine — SUGGESTED QUESTIONS", () => {
  it("no suggestions at all for a genuinely empty wallet with no data", () => {
    expect(buildSuggestedQuestions(EMPTY_INPUT)).toEqual([]);
  });

  it("suggestions disappear when their underlying data disappears — confidenceLow only suggested when confidence is genuinely Low", () => {
    const highConfidence = { ...EMPTY_INPUT, intelligence: makeIntelligence({ confidenceLevel: "High" }) };
    const lowConfidence = { ...EMPTY_INPUT, intelligence: makeIntelligence({ confidenceLevel: "Low" }) };
    expect(buildSuggestedQuestions(highConfidence).some((q) => q.id === "confidenceLow")).toBe(false);
    expect(buildSuggestedQuestions(lowConfidence).some((q) => q.id === "confidenceLow")).toBe(true);
  });

  it("fingerprintChange is only suggested when a real fingerprint change is on record", () => {
    const noChange = makeAnalytics({ trends: [{ metric: "fingerprint", label: "Fingerprint", direction: "stable", from: "Balanced", to: "Balanced", delta: null, reason: "stable", confidence: "unknown", confidenceDetail: { confidence: "unknown", confidenceReason: "", snapshotCount: 2, timeSpanDays: 1, consistencyScore: null } }] });
    const withChange = makeAnalytics({ trends: [{ metric: "fingerprint", label: "Fingerprint", direction: "unknown", from: "Balanced", to: "Growth", delta: null, reason: "changed", confidence: "unknown", confidenceDetail: { confidence: "unknown", confidenceReason: "", snapshotCount: 2, timeSpanDays: 1, consistencyScore: null } }] });
    expect(buildSuggestedQuestions({ ...EMPTY_INPUT, analytics: noChange }).some((q) => q.id === "fingerprintChange")).toBe(false);
    expect(buildSuggestedQuestions({ ...EMPTY_INPUT, analytics: withChange }).some((q) => q.id === "fingerprintChange")).toBe(true);
  });

  it("automationTriggered only suggested when at least one real result exists", () => {
    expect(buildSuggestedQuestions(EMPTY_INPUT).some((q) => q.id === "automationTriggered")).toBe(false);
    expect(buildSuggestedQuestions({ ...EMPTY_INPUT, automationResults: [makeAutomationResult()] }).some((q) => q.id === "automationTriggered")).toBe(true);
  });

  it("suggestions are deterministic for identical input", () => {
    const input = { ...EMPTY_INPUT, intelligence: makeIntelligence(), ai: makeAI() };
    expect(buildSuggestedQuestions(input)).toEqual(buildSuggestedQuestions(input));
  });
});

describe("ai-chat engine — CONTEXT REUSE (never recomputes, only reads real fields)", () => {
  it("healthChange's answer is the literal Trend.reason string, never a re-derived sentence", () => {
    const trendReason = "Health score moved from 10 to 90 across 4 snapshots.";
    const analytics = makeAnalytics({ trends: [{ metric: "health", label: "Health", direction: "improving", from: 10, to: 90, delta: 80, reason: trendReason, confidence: "high", confidenceDetail: { confidence: "high", confidenceReason: "", snapshotCount: 4, timeSpanDays: 10, consistencyScore: 1 } }] });
    const response = askQuestion("healthChange", { ...EMPTY_INPUT, analytics });
    expect(response.answer).toBe(trendReason);
  });

  it("thisMonth never builds its own report — a null monthlyReport (as if the caller never built one) yields the honest 'not enough history' answer, not a crash or a fabricated report", () => {
    const response = askQuestion("thisMonth", { ...EMPTY_INPUT, monthlyReport: null });
    expect(response.answer).toMatch(/not enough history/i);
  });
});
