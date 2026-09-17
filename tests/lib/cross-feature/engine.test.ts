import { describe, expect, it } from "vitest";

import { buildCrossFeatureIntelligence, type CrossFeatureInput } from "@/lib/cross-feature/engine";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones, AnalyticsHighlight } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
import type { AutomationResult } from "@/lib/automation/types";
import type { WalletEvent } from "@/lib/wallet-automation/types";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";

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
    concentrationRisk: { level: "moderate", topHoldingPct: 50, description: "desc" },
    recommendations: [],
    warnings: [],
    opportunities: [],
    summary: "summary",
    lastUpdated: "2026-09-01T00:00:00.000Z",
    healthBreakdown: [],
    quality: { verifiedAssetCount: 2, unverifiedAssetCount: 1, notCheckedAssetCount: 0, protocolsDetected: 1, diversificationRating: "Fair", diversificationRatingReason: "reason" },
    allocationBreakdown: { topHoldings: [], stablecoinPct: 20, ethPct: 50, otherPct: 30, unknownAssetPct: 0, protocolConcentrationPct: 0, largestProtocolName: null },
    positiveContributors: [],
    negativeContributors: [],
    confidenceScore: 80,
    confidenceLevel: "High",
    fingerprint: "Balanced",
    fingerprintReason: "reason",
    executiveSummary: "summary",
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
      facts: { totalUsdValue: 10000, largestHoldingSymbol: "ETH", largestProtocolName: null, lastUpdated: "2026-09-01T00:00:00.000Z" },
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

function makeAutomationResult(overrides: Partial<AutomationResult> = {}): AutomationResult {
  return {
    id: "automation:wallet-rule:health:1",
    ruleId: "wallet-rule:health",
    notificationId: "n1",
    title: "Health Score Changed",
    summary: "Health score moved from 40 to 70.",
    status: "triggered",
    triggeredAt: "2026-08-20T00:00:00.000Z",
    projectId: null,
    projectName: null,
    priority: "medium",
    link: "/dashboard/wallet",
    metadata: { source: "wallet-automation" },
    ...overrides,
  };
}

function makeWalletEvent(overrides: Partial<WalletEvent> = {}): WalletEvent {
  return { id: "event:1", kind: "PortfolioScoreChanged", timestamp: "2026-08-20T00:00:00.000Z", title: "Health Score Changed", summary: "Health improved.", tone: "positive", ...overrides };
}

function makeHighlight(overrides: Partial<AnalyticsHighlight> & { type: AnalyticsHighlight["type"]; topic: string }): AnalyticsHighlight {
  return { priority: "important", stars: 4, title: "Recovered from High Risk", reason: "Risk improved from 80 to 30.", supportingMetric: null, dedupeKey: `${overrides.type}:${overrides.topic}:2026-08-20T00:00:00.000Z`, ...overrides };
}

const EMPTY_INPUT: CrossFeatureInput = {
  intelligence: null,
  ai: null,
  analytics: makeAnalytics(),
  history: [],
  automationEvents: [],
  automationResults: [],
  monthlyReport: null,
};

describe("cross-feature engine — EMPTY STATES", () => {
  it("genuinely empty input yields empty everything, no crash", () => {
    const result = buildCrossFeatureIntelligence(EMPTY_INPUT);
    expect(result).toEqual({
      events: [],
      recommendations: [],
      timeline: [],
      latestStory: null,
      indexes: { eventByAutomationId: new Map(), recommendationByAutomationId: new Map(), recommendationById: new Map(), eventByTopic: new Map(), eventByHighlight: new Map() },
    });
  });

  it("MISSING MODULES: no intelligence -> no recommendations; no ai -> no isPrimary ever true", () => {
    const analytics = makeAnalytics({ highlights: [] });
    const result = buildCrossFeatureIntelligence({ ...EMPTY_INPUT, analytics, intelligence: null, ai: makeAI() });
    expect(result.recommendations).toEqual([]);
  });
});

describe("cross-feature engine — CORRELATION", () => {
  const history = [snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 40 }), snap({ timestamp: "2026-08-20T00:00:00.000Z", healthScore: 70, fingerprint: "Growth Seeker" })];
  const highlight = makeHighlight({ type: "recovery", topic: "risk" });
  const analytics = makeAnalytics({
    highlights: [highlight],
    trends: [{ metric: "risk", label: "Risk", direction: "improving", from: 80, to: 30, delta: -50, reason: "Risk improved from 80 to 30.", confidence: "high", confidenceDetail: { confidence: "high", confidenceReason: "", snapshotCount: 2, timeSpanDays: 19, consistencyScore: 1 } }],
  });
  const automationResults = [makeAutomationResult({ ruleId: "wallet-rule:risk", triggeredAt: "2026-08-20T00:00:00.000Z" })];
  const monthlyReport: HistoricalReport = {
    period: "30d",
    overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 2, firstSnapshotDate: "2026-08-01T00:00:00.000Z", lastSnapshotDate: "2026-08-20T00:00:00.000Z", startValue: 10000, endValue: 10000, netValueChange: 0 },
    health: { metric: "healthScore", label: "Health", highest: null, lowest: null, first: null, last: null, change: null },
    confidence: { metric: "confidenceScore", label: "Confidence", highest: null, lowest: null, first: null, last: null, change: null },
    risk: { metric: "riskScore", label: "Risk", highest: null, lowest: null, first: null, last: null, change: null },
    value: { metric: "totalValue", label: "Portfolio Value", highest: null, lowest: null, first: null, last: null, change: null },
    fingerprintChanges: [],
    majorRecoveries: [],
    personalBests: EMPTY_PERSONAL_BESTS,
    milestones: EMPTY_MILESTONES,
    highlights: [highlight],
    statistics: { highestValue: null, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement: null, largestDecline: null, recoveryCount: 0, milestoneCount: 0, snapshotCount: 2 },
  };

  const input: CrossFeatureInput = { intelligence: null, ai: null, analytics, history, automationEvents: [], automationResults, monthlyReport };

  it("correlates a real highlight to its real History snapshot, Analytics trend, Report period, chat question, and automation result", () => {
    const result = buildCrossFeatureIntelligence(input);
    expect(result.events).toHaveLength(1);
    const event = result.events[0];
    expect(event.headline).toBe("Risk improved from 80 to 30.");
    expect(event.refs.historySnapshotTimestamp).toBe("2026-08-20T00:00:00.000Z");
    expect(event.refs.analyticsTrendMetric).toBe("risk");
    expect(event.refs.reportPeriod).toBe("30d");
    expect(event.refs.chatQuestionId).toBe("biggestRisk");
    expect(event.refs.automationResultId).toBe("automation:wallet-rule:health:1"); // the fixture's id, matched by ruleId
  });

  it("HISTORY GAPS: a highlight date with NO matching real snapshot never fabricates a match", () => {
    const gapHighlight = makeHighlight({ type: "milestone", topic: "health", dedupeKey: "milestone:health:2020-01-01T00:00:00.000Z" });
    const result = buildCrossFeatureIntelligence({ ...input, analytics: makeAnalytics({ highlights: [gapHighlight] }) });
    expect(result.events[0].refs.historySnapshotTimestamp).toBeNull();
  });

  it("a topic with no real automation rule (diversification) never invents an automation ref", () => {
    const h = makeHighlight({ type: "newPersonalBest", topic: "diversification", dedupeKey: "newPersonalBest:diversification:2026-08-20T00:00:00.000Z" });
    const result = buildCrossFeatureIntelligence({ ...input, analytics: makeAnalytics({ highlights: [h] }), automationResults: [] });
    expect(result.events[0].refs.automationResultId).toBeNull();
  });
});

describe("cross-feature engine — RECOMMENDATION CORRELATION", () => {
  it("a known recommendation id correlates to its real topic's refs", () => {
    const intelligence = makeIntelligence({ recommendations: [{ id: "add-stablecoins", title: "Add stablecoins", explanation: "e", reason: "r", priority: "medium" }] });
    const result = buildCrossFeatureIntelligence({ ...EMPTY_INPUT, intelligence });
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].refs.analyticsTrendMetric).toBe("stablecoinAllocation");
    expect(result.recommendations[0].refs.chatQuestionId).toBe("portfolioEvolution");
  });

  it("an unrecognized recommendation id honestly correlates to nothing, never a guessed topic", () => {
    const intelligence = makeIntelligence({ recommendations: [{ id: "totally-new-recommendation", title: "New", explanation: "e", reason: "r", priority: "low" }] });
    const result = buildCrossFeatureIntelligence({ ...EMPTY_INPUT, intelligence });
    expect(result.recommendations[0].refs).toEqual({ historySnapshotTimestamp: null, analyticsTrendMetric: null, reportPeriod: null, chatQuestionId: null, automationResultId: null });
  });

  it("isPrimary reuses Portfolio AI's own already-ranked actions[0], never a second ranking", () => {
    const intelligence = makeIntelligence({
      recommendations: [
        { id: "add-stablecoins", title: "Add stablecoins", explanation: "e", reason: "r", priority: "medium" },
        { id: "review-dust", title: "Review dust", explanation: "e", reason: "r", priority: "low" },
      ],
    });
    const ai = makeAI({ actions: [{ id: "review-dust", title: "Review dust", description: "d", priority: "low", difficulty: "easy", estimatedImpact: "low", reason: "r" }] });
    const result = buildCrossFeatureIntelligence({ ...EMPTY_INPUT, intelligence, ai });
    expect(result.recommendations.find((r) => r.recommendationId === "review-dust")?.isPrimary).toBe(true);
    expect(result.recommendations.find((r) => r.recommendationId === "add-stablecoins")?.isPrimary).toBe(false);
  });

  it("no ai at all -> isPrimary is always false, never a crash", () => {
    const intelligence = makeIntelligence({ recommendations: [{ id: "add-stablecoins", title: "Add stablecoins", explanation: "e", reason: "r", priority: "medium" }] });
    const result = buildCrossFeatureIntelligence({ ...EMPTY_INPUT, intelligence, ai: null });
    expect(result.recommendations[0].isPrimary).toBe(false);
  });
});

describe("cross-feature engine — UNIFIED TIMELINE: deduplication and ordering", () => {
  it("DEDUPLICATION: an automation event and a highlight at the IDENTICAL real timestamp collapse into ONE entry with both sources, the automation headline winning", () => {
    const timestamp = "2026-08-20T00:00:00.000Z";
    const event = makeWalletEvent({ timestamp, title: "Health Score Changed" });
    const highlight = makeHighlight({ type: "recovery", topic: "health", dedupeKey: `recovery:health:${timestamp}`, reason: "Health recovered." });
    const result = buildCrossFeatureIntelligence({ ...EMPTY_INPUT, analytics: makeAnalytics({ highlights: [highlight] }), automationEvents: [event] });

    const matching = result.timeline.filter((t) => t.timestamp === timestamp);
    expect(matching).toHaveLength(1);
    expect(matching[0].headline).toBe("Health Score Changed"); // automation processed first, wins the headline
    expect(matching[0].sources).toEqual(expect.arrayContaining(["automation", "highlights"]));
  });

  it("a real History snapshot at the SAME timestamp as an automation event adds a source, not a second entry", () => {
    const timestamp = "2026-08-20T00:00:00.000Z";
    const event = makeWalletEvent({ timestamp });
    const history = [snap({ timestamp })];
    const result = buildCrossFeatureIntelligence({ ...EMPTY_INPUT, automationEvents: [event], history });
    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].sources).toEqual(expect.arrayContaining(["automation", "history"]));
  });

  it("a real History snapshot with NO automation event at its timestamp still gets its own real entry", () => {
    const history = [snap({ timestamp: "2026-08-20T00:00:00.000Z", fingerprint: "Growth Seeker", healthScore: 70 })];
    const result = buildCrossFeatureIntelligence({ ...EMPTY_INPUT, history });
    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].headline).toContain("Growth Seeker");
    expect(result.timeline[0].sources).toEqual(["history"]);
  });

  it("ORDERING: the timeline is sorted newest-first by real timestamp", () => {
    const history = [snap({ timestamp: "2026-08-01T00:00:00.000Z" }), snap({ timestamp: "2026-08-20T00:00:00.000Z" }), snap({ timestamp: "2026-08-10T00:00:00.000Z" })];
    const result = buildCrossFeatureIntelligence({ ...EMPTY_INPUT, history });
    expect(result.timeline.map((t) => t.timestamp)).toEqual(["2026-08-20T00:00:00.000Z", "2026-08-10T00:00:00.000Z", "2026-08-01T00:00:00.000Z"]);
  });

  it("Report fingerprint changes and recoveries add real entries, deduplicated against History at the same timestamp", () => {
    const timestamp = "2026-08-20T00:00:00.000Z";
    const monthlyReport: HistoricalReport = {
      period: "30d",
      overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 1, firstSnapshotDate: timestamp, lastSnapshotDate: timestamp, startValue: 10000, endValue: 10000, netValueChange: 0 },
      health: { metric: "healthScore", label: "Health", highest: null, lowest: null, first: null, last: null, change: null },
      confidence: { metric: "confidenceScore", label: "Confidence", highest: null, lowest: null, first: null, last: null, change: null },
      risk: { metric: "riskScore", label: "Risk", highest: null, lowest: null, first: null, last: null, change: null },
      value: { metric: "totalValue", label: "Portfolio Value", highest: null, lowest: null, first: null, last: null, change: null },
      fingerprintChanges: [{ from: "Cautious Holder", to: "Growth Seeker", date: timestamp }],
      majorRecoveries: [],
      personalBests: EMPTY_PERSONAL_BESTS,
      milestones: EMPTY_MILESTONES,
      highlights: [],
      statistics: { highestValue: null, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement: null, largestDecline: null, recoveryCount: 0, milestoneCount: 0, snapshotCount: 1 },
    };
    const result = buildCrossFeatureIntelligence({ ...EMPTY_INPUT, history: [snap({ timestamp })], monthlyReport });
    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].sources).toEqual(expect.arrayContaining(["report", "history"]));
  });
});

describe("cross-feature engine — latestStory", () => {
  it("null when there are no real correlated events", () => {
    expect(buildCrossFeatureIntelligence(EMPTY_INPUT).latestStory).toBeNull();
  });

  it("picks the real MOST RECENT event by timestamp, independent of Highlights' own priority order", () => {
    const older = makeHighlight({ type: "milestone", topic: "health", dedupeKey: "milestone:health:2026-08-01T00:00:00.000Z", priority: "historical", reason: "Older milestone." });
    const newer = makeHighlight({ type: "stabilityChange", topic: "stability", dedupeKey: "stabilityChange:stability:none", priority: "informational", reason: "Recent stability change." });
    // stabilityChange has no real date in its dedupeKey, so it anchors to the latest real snapshot instead
    const history = [snap({ timestamp: "2026-08-01T00:00:00.000Z" }), snap({ timestamp: "2026-09-01T00:00:00.000Z" })];
    const result = buildCrossFeatureIntelligence({ ...EMPTY_INPUT, analytics: makeAnalytics({ highlights: [older, newer] }), history });
    expect(result.latestStory?.headline).toBe("Recent stability change.");
  });
});

describe("cross-feature engine — DETERMINISM", () => {
  it("identical input produces an identical, deep-equal output", () => {
    const highlight = makeHighlight({ type: "recovery", topic: "health" });
    const input: CrossFeatureInput = { ...EMPTY_INPUT, analytics: makeAnalytics({ highlights: [highlight] }), history: [snap({ timestamp: "2026-08-20T00:00:00.000Z" })] };
    expect(buildCrossFeatureIntelligence(input)).toEqual(buildCrossFeatureIntelligence(input));
  });
});
