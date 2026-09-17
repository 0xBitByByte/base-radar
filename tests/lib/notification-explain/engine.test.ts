import { describe, expect, it } from "vitest";

import { buildNotificationExplanation } from "@/lib/notification-explain/engine";
import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";
import { AI_CHAT_QUESTIONS } from "@/lib/ai-chat/questions";
import type { AutomationResult } from "@/lib/automation/types";
import type { CrossFeatureIntelligence, CorrelatedEvent, RecommendationCorrelation, FeatureRefs } from "@/lib/cross-feature/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones, Trend } from "@/lib/wallet-analytics/types";

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

function makeAI(overrides: Partial<PortfolioAI> = {}): PortfolioAI {
  return {
    overview: { priority: "recommendation", headline: "h", explanation: "e", confidence: "High", nextAction: null, actionReason: null },
    insights: [],
    actions: [],
    timeline: [],
    summaryLines: [],
    conversationContext: {
      facts: { totalUsdValue: 10000, largestHoldingSymbol: null, largestProtocolName: null, lastUpdated: "2026-09-01T00:00:00.000Z" },
      scores: { overallScore: 60, healthScore: 65, riskScore: 30, diversificationScore: 70, confidenceScore: 80 },
      warnings: [],
      recommendations: [],
      fingerprint: "Balanced",
      confidenceLevel: "High",
      contributors: { positive: [], negative: [] },
      summary: "summary",
    },
    ...overrides,
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

const EMPTY_REFS: FeatureRefs = { historySnapshotTimestamp: null, analyticsTrendMetric: null, reportPeriod: null, chatQuestionId: null, automationResultId: null };

function makeCrossFeature(overrides: Partial<CrossFeatureIntelligence> = {}): CrossFeatureIntelligence {
  const events = overrides.events ?? [];
  const recommendations = overrides.recommendations ?? [];
  return { events, recommendations, timeline: overrides.timeline ?? [], latestStory: overrides.latestStory ?? null, indexes: buildCrossFeatureIndexes(events, recommendations) };
}

describe("notification-explain — EMPTY STATE / MISSING REFERENCES", () => {
  it("no matching CorrelatedEvent or RecommendationCorrelation: honest, empty-but-real explanation, never a crash", () => {
    const explanation = buildNotificationExplanation(makeResult(), makeCrossFeature(), null, makeAnalytics());
    expect(explanation.resultId).toBe("automation:wallet-rule:health:1");
    expect(explanation.headline).toBe("Health Score Changed");
    expect(explanation.reason).toBe("Health score moved from 40 to 70."); // falls back to result.summary
    expect(explanation.supportingEvidence).toEqual([]);
    expect(explanation.refs).toEqual(EMPTY_REFS);
    expect(explanation.relatedRecommendation).toBeNull();
    expect(explanation.nextAction).toBeNull();
    expect(explanation.confidence).toBe("unknown");
  });

  it("HISTORY GAPS: a matched event with a null historySnapshotTimestamp (no real snapshot on record) is honestly reflected, not fabricated", () => {
    const event: CorrelatedEvent = {
      id: "event:1",
      topic: "health",
      label: "Health improved",
      timestamp: "2026-09-01T00:00:00.000Z",
      tone: "positive",
      headline: "Health score moved from 40 to 70 across 2 snapshots.",
      refs: { ...EMPTY_REFS, automationResultId: "automation:wallet-rule:health:1", analyticsTrendMetric: "health" },
    };
    const explanation = buildNotificationExplanation(makeResult(), makeCrossFeature({ events: [event] }), null, makeAnalytics());
    expect(explanation.refs.historySnapshotTimestamp).toBeNull();
    expect(explanation.supportingEvidence).toEqual(["Health score moved from 40 to 70 across 2 snapshots."]);
  });
});

describe("notification-explain — ALL NOTIFICATION KINDS", () => {
  it("a 'smart' result with a real metadata.reason uses it verbatim, over the plain summary", () => {
    const result = makeResult({ metadata: { source: "wallet-automation", reason: "Confidence dropped below 45%." } });
    const explanation = buildNotificationExplanation(result, makeCrossFeature(), null, makeAnalytics());
    expect(explanation.reason).toBe("Confidence dropped below 45%.");
  });

  it("an original (non-smart) result with no metadata.reason falls back to the real result.summary", () => {
    const result = makeResult({ metadata: { source: "wallet-automation" }, summary: "Concentration exceeded 75%." });
    const explanation = buildNotificationExplanation(result, makeCrossFeature(), null, makeAnalytics());
    expect(explanation.reason).toBe("Concentration exceeded 75%.");
  });

  it("works identically across different real ruleIds — never a rule-specific branch that could miss a kind", () => {
    for (const ruleId of ["wallet-rule:concentration", "wallet-rule:stablecoin", "wallet-rule:risk", "wallet-rule:fingerprint", "wallet-rule:top-warning"] as const) {
      const result = makeResult({ ruleId, id: `automation:${ruleId}:1` });
      expect(() => buildNotificationExplanation(result, makeCrossFeature(), null, makeAnalytics())).not.toThrow();
    }
  });
});

describe("notification-explain — SUPPORTING EVIDENCE (Phase 4)", () => {
  it("combines the matched event's real headline AND the matched Trend's real reason when they genuinely differ", () => {
    const trend: Trend = { metric: "health", label: "Health", direction: "improving", from: 40, to: 70, delta: 30, reason: "Health score moved from 40 to 70 across 3 snapshots (medium confidence).", confidence: "medium", confidenceDetail: { confidence: "medium", confidenceReason: "", snapshotCount: 3, timeSpanDays: 10, consistencyScore: 1 } };
    const event: CorrelatedEvent = { id: "event:1", topic: "health", label: "Health improved", timestamp: "2026-09-01T00:00:00.000Z", tone: "positive", headline: "Highest Health Score reached 70.", refs: { ...EMPTY_REFS, automationResultId: "automation:wallet-rule:health:1", analyticsTrendMetric: "health" } };
    const explanation = buildNotificationExplanation(makeResult(), makeCrossFeature({ events: [event] }), null, makeAnalytics({ trends: [trend] }));
    expect(explanation.supportingEvidence).toEqual(["Highest Health Score reached 70.", "Health score moved from 40 to 70 across 3 snapshots (medium confidence)."]);
    expect(explanation.confidence).toBe("medium"); // reused verbatim from the real Trend
  });

  it("never duplicates the same real fact twice when the event headline and trend reason happen to be identical", () => {
    const sameText = "Health score moved from 40 to 70.";
    const trend: Trend = { metric: "health", label: "Health", direction: "improving", from: 40, to: 70, delta: 30, reason: sameText, confidence: "high", confidenceDetail: { confidence: "high", confidenceReason: "", snapshotCount: 3, timeSpanDays: 10, consistencyScore: 1 } };
    const event: CorrelatedEvent = { id: "event:1", topic: "health", label: "Health improved", timestamp: "2026-09-01T00:00:00.000Z", tone: "positive", headline: sameText, refs: { ...EMPTY_REFS, automationResultId: "automation:wallet-rule:health:1", analyticsTrendMetric: "health" } };
    const explanation = buildNotificationExplanation(makeResult(), makeCrossFeature({ events: [event] }), null, makeAnalytics({ trends: [trend] }));
    expect(explanation.supportingEvidence).toEqual([sameText]);
  });
});

describe("notification-explain — RECOMMENDATION REUSE (Phase 3/5)", () => {
  it("relatedRecommendation is the exact real RecommendationCorrelation object Cross-Feature Intelligence already matched", () => {
    const recommendation: RecommendationCorrelation = { recommendationId: "add-stablecoins", title: "Add stablecoins", isPrimary: false, refs: { ...EMPTY_REFS, automationResultId: "automation:wallet-rule:health:1" } };
    const explanation = buildNotificationExplanation(makeResult(), makeCrossFeature({ recommendations: [recommendation] }), null, makeAnalytics());
    expect(explanation.relatedRecommendation).toBe(recommendation);
    expect(explanation.nextAction).toEqual({ action: "Add stablecoins", reason: null }); // not primary -> no AI-authored reason attached
  });

  it("a PRIMARY related recommendation attaches Portfolio AI's own real actionReason", () => {
    const recommendation: RecommendationCorrelation = { recommendationId: "add-stablecoins", title: "Add stablecoins", isPrimary: true, refs: { ...EMPTY_REFS, automationResultId: "automation:wallet-rule:health:1" } };
    const ai = makeAI({ overview: { priority: "recommendation", headline: "h", explanation: "e", confidence: "High", nextAction: "Add stablecoins", actionReason: "Stablecoin exposure is only 12%." } });
    const explanation = buildNotificationExplanation(makeResult(), makeCrossFeature({ recommendations: [recommendation] }), ai, makeAnalytics());
    expect(explanation.nextAction).toEqual({ action: "Add stablecoins", reason: "Stablecoin exposure is only 12%." });
  });
});

describe("notification-explain — AI QUESTION REUSE (Phase 5)", () => {
  it("suggestedQuestions reuses real prompt text from the static AI Chat catalog — never invented text", () => {
    const event: CorrelatedEvent = { id: "event:1", topic: "risk", label: "Risk changed", timestamp: "2026-09-01T00:00:00.000Z", tone: "attention", headline: "Risk increased.", refs: { ...EMPTY_REFS, automationResultId: "automation:wallet-rule:health:1", chatQuestionId: "biggestRisk" } };
    const explanation = buildNotificationExplanation(makeResult(), makeCrossFeature({ events: [event] }), null, makeAnalytics());
    expect(explanation.suggestedQuestions).toContainEqual({ id: "biggestRisk", prompt: AI_CHAT_QUESTIONS.biggestRisk.prompt });
  });

  it("DEDUPLICATION: always includes the universal 'recentChanges' fallback, but never twice when the matched topic question IS recentChanges", () => {
    const withTopic = buildNotificationExplanation(makeResult(), makeCrossFeature(), null, makeAnalytics());
    // no matched event -> chatQuestionId null -> only the universal fallback, exactly once
    expect(withTopic.suggestedQuestions).toEqual([{ id: "recentChanges", prompt: AI_CHAT_QUESTIONS.recentChanges.prompt }]);

    const event: CorrelatedEvent = { id: "event:1", topic: "value", label: "Value changed", timestamp: "2026-09-01T00:00:00.000Z", tone: "neutral", headline: "Portfolio value changed.", refs: { ...EMPTY_REFS, automationResultId: "automation:wallet-rule:health:1", chatQuestionId: "recentChanges" } };
    const withDuplicateTopic = buildNotificationExplanation(makeResult(), makeCrossFeature({ events: [event] }), null, makeAnalytics());
    expect(withDuplicateTopic.suggestedQuestions).toEqual([{ id: "recentChanges", prompt: AI_CHAT_QUESTIONS.recentChanges.prompt }]);
  });
});

describe("notification-explain — DUPLICATE TIMESTAMPS (V4-FUTURE-002G)", () => {
  it("two different AutomationResults sharing the identical triggeredAt each resolve to their OWN correct explanation — keyed by real id, never confused by the shared timestamp", () => {
    const resultA = makeResult({ id: "automation:wallet-rule:health:1", triggeredAt: "2026-09-01T00:00:00.000Z" });
    const resultB = makeResult({ id: "automation:wallet-rule:risk:1", ruleId: "wallet-rule:risk", triggeredAt: "2026-09-01T00:00:00.000Z", title: "Risk Level Changed", summary: "Risk moved from moderate to low." });

    const eventA: CorrelatedEvent = { id: "event:health", topic: "health", label: "Health improved", timestamp: "2026-09-01T00:00:00.000Z", tone: "positive", headline: "Health improved to 70.", refs: { ...EMPTY_REFS, automationResultId: resultA.id, analyticsTrendMetric: "health" } };
    const eventB: CorrelatedEvent = { id: "event:risk", topic: "risk", label: "Risk improved", timestamp: "2026-09-01T00:00:00.000Z", tone: "positive", headline: "Risk dropped to low.", refs: { ...EMPTY_REFS, automationResultId: resultB.id, analyticsTrendMetric: "risk" } };

    const crossFeature = makeCrossFeature({ events: [eventA, eventB] });
    const analytics = makeAnalytics();

    const explanationA = buildNotificationExplanation(resultA, crossFeature, null, analytics);
    const explanationB = buildNotificationExplanation(resultB, crossFeature, null, analytics);

    expect(explanationA.resultId).toBe(resultA.id);
    expect(explanationA.supportingEvidence).toContain("Health improved to 70.");
    expect(explanationA.supportingEvidence).not.toContain("Risk dropped to low.");

    expect(explanationB.resultId).toBe(resultB.id);
    expect(explanationB.supportingEvidence).toContain("Risk dropped to low.");
    expect(explanationB.supportingEvidence).not.toContain("Health improved to 70.");
  });
});

describe("notification-explain — DETERMINISM", () => {
  it("identical inputs produce an identical, deep-equal explanation", () => {
    const event: CorrelatedEvent = { id: "event:1", topic: "health", label: "Health improved", timestamp: "2026-09-01T00:00:00.000Z", tone: "positive", headline: "Health improved.", refs: { ...EMPTY_REFS, automationResultId: "automation:wallet-rule:health:1", analyticsTrendMetric: "health" } };
    const crossFeature = makeCrossFeature({ events: [event] });
    const analytics = makeAnalytics();
    const a = buildNotificationExplanation(makeResult(), crossFeature, makeAI(), analytics);
    const b = buildNotificationExplanation(makeResult(), crossFeature, makeAI(), analytics);
    expect(a).toEqual(b);
  });
});
