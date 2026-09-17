/**
 * V4-FUTURE-002A (Phase 2) — the ONE shared fixture-builder module for
 * every Wallet dev/verification surface (`WalletVerificationHarness`,
 * `walletAssertions` tests). "No duplicated mock builders" per that
 * phase's own brief.
 *
 * Deliberately does NOT hand-craft `HistoricalReport`/`MonthlyDigest`/
 * `PortfolioStory`/`CrossFeatureIntelligence` — those are derived by
 * running a small, realistic BASE (`history`, `analytics`, `intelligence`,
 * `ai`, automation results/events) through the SAME real engine functions
 * every production hook already calls (`buildHistoricalReport`,
 * `buildMonthlyDigest`, `buildPortfolioStory`, `buildCrossFeatureIntelligence`).
 * This guarantees the "clean" fixture bundle is internally consistent by
 * construction — never a second, hand-typed copy of what those engines
 * would have produced, which could silently drift from real behavior.
 *
 * Dev/test-only: never imported by a production (non-dev, non-test) code
 * path.
 */

import { buildHistoricalReport } from "@/components/wallet/walletReportEngine";
import { buildMonthlyDigest } from "@/lib/monthly-digest/engine";
import { buildPortfolioStory } from "@/lib/portfolio-story/engine";
import { buildCrossFeatureIntelligence } from "@/lib/cross-feature/engine";
import type { WalletVerificationBundle } from "@/lib/dev/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
import type { AutomationResult } from "@/lib/automation/types";
import type { WalletEvent } from "@/lib/wallet-automation/types";
import type { PersonalBests, PortfolioMilestones, WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";

export const EMPTY_MILESTONES: PortfolioMilestones = {
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

export const EMPTY_PERSONAL_BESTS: PersonalBests = {
  bestHealth: null,
  bestConfidence: null,
  lowestRisk: null,
  largestPortfolioValue: null,
  bestDiversification: null,
  longestStablePortfolio: null,
};

export function makeAnalyticsSnapshot(overrides: Partial<AnalyticsSnapshot> & { timestamp: string }): AnalyticsSnapshot {
  return {
    analyticsVersion: 1,
    overallScore: 60,
    healthScore: 60,
    riskScore: 40,
    confidenceScore: 75,
    confidenceLevel: "moderate",
    fingerprint: "Balanced",
    largestHoldingSymbol: "ETH",
    largestProtocolName: null,
    primaryRecommendationId: null,
    topWarningId: null,
    totalValue: 10000,
    stablecoinExposure: 20,
    ethPct: 50,
    diversificationScore: 65,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    warningIds: [],
    topHoldings: [],
    ...overrides,
  };
}

/** Four real, ascending, internally-consistent snapshots — risk recovers on day 3, health/value trend upward throughout. */
export function makeRealisticHistory(): AnalyticsSnapshot[] {
  return [
    makeAnalyticsSnapshot({ timestamp: "2026-07-01T00:00:00.000Z", totalValue: 8000, healthScore: 45, riskScore: 80, overallScore: 50, confidenceScore: 60 }),
    makeAnalyticsSnapshot({ timestamp: "2026-08-01T00:00:00.000Z", totalValue: 9500, healthScore: 55, riskScore: 80, overallScore: 55, confidenceScore: 65 }),
    makeAnalyticsSnapshot({ timestamp: "2026-08-10T00:00:00.000Z", totalValue: 11000, healthScore: 65, riskScore: 32, overallScore: 68, confidenceScore: 80 }),
    makeAnalyticsSnapshot({ timestamp: "2026-09-05T00:00:00.000Z", totalValue: 15200, healthScore: 78, riskScore: 32, overallScore: 72, confidenceScore: 85 }),
  ];
}

export function makeWalletAnalytics(overrides: Partial<WalletAnalytics> = {}): WalletAnalytics {
  return {
    window: "all",
    snapshotCount: 4,
    trends: [],
    evolution: { largestImprovement: null, largestDeterioration: null, biggestAllocationShift: null, mostStableAsset: null, mostVolatileAllocation: null, longestUnchangedRecommendation: null, mostRepeatedWarning: null },
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
    executiveSummary: "A steadily improving, moderately diversified portfolio.",
    correlation: null,
    stability: null,
    milestones: EMPTY_MILESTONES,
    personalBests: EMPTY_PERSONAL_BESTS,
    recoveries: [{ category: "highRisk", label: "High Risk", recoveryDate: "2026-08-10T00:00:00.000Z", before: { value: 80, timestamp: "2026-08-01T00:00:00.000Z" }, after: { value: 32, timestamp: "2026-08-10T00:00:00.000Z" }, improvement: 48, durationDays: 9 }],
    changeFrequency: null,
    exportSnapshot: { generatedAt: "2026-09-05T00:00:00.000Z", window: "all", rows: [] },
    highlights: [
      { type: "milestone", priority: "important", stars: 4, title: "Crossed $15,000", reason: "Portfolio value passed a new high.", supportingMetric: null, topic: "value", dedupeKey: "milestone:value:15200" },
      { type: "recovery", priority: "positive", stars: 3, title: "Recovered from High Risk", reason: "Risk improved from 80 to 32.", supportingMetric: "risk", topic: "risk", dedupeKey: "recovery:risk:2026-08-10T00:00:00.000Z" },
    ],
    ...overrides,
  };
}

export function makePortfolioIntelligence(overrides: Partial<PortfolioIntelligence> = {}): PortfolioIntelligence {
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
    recommendations: [{ id: "r1", title: "Diversify further", explanation: "Top holding still dominant.", reason: "Top holding is 45% of portfolio.", priority: "medium" }],
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
    fingerprint: "Balanced" as const,
    fingerprintReason: "reason",
    executiveSummary: "A balanced, recovering portfolio with moderate risk and growing value — largest holding is 45%, main risk is concentration, top recommendation is further diversification.",
    ...overrides,
  };
}

export function makePortfolioAI(overrides: Partial<PortfolioAI> = {}): PortfolioAI {
  return {
    overview: { priority: "recommendation", headline: "Portfolio trending upward", explanation: "Your portfolio value and health score have both improved steadily this period.", confidence: "High", nextAction: "Diversify further", actionReason: "Top holding is 45% of portfolio." },
    insights: [],
    actions: [{ id: "r1", title: "Diversify further", description: "Top holding still dominant.", priority: "medium", difficulty: "moderate", estimatedImpact: "medium", reason: "Top holding is 45% of portfolio." }],
    timeline: [],
    summaryLines: [],
    conversationContext: {
      facts: { totalUsdValue: 15200, largestHoldingSymbol: "ETH", largestProtocolName: null, lastUpdated: "2026-09-05T00:00:00.000Z" },
      scores: { overallScore: 72, healthScore: 78, riskScore: 32, diversificationScore: 65, confidenceScore: 85 },
      warnings: [],
      recommendations: [],
      fingerprint: "Balanced" as const,
      confidenceLevel: "High",
      contributors: { positive: [], negative: [] },
      summary: "summary",
    },
    ...overrides,
  };
}

export function makeAutomationResult(overrides: Partial<AutomationResult> & { id: string }): AutomationResult {
  return {
    ruleId: "wallet-rule:health",
    notificationId: "n1",
    title: "Health Score Changed",
    summary: "Health score moved from 55 to 78.",
    status: "triggered",
    triggeredAt: "2026-08-10T00:00:00.000Z",
    projectId: null,
    projectName: null,
    priority: "medium",
    link: "/dashboard/wallet",
    metadata: { source: "wallet-automation" },
    ...overrides,
  };
}

export function makeWalletEvent(overrides: Partial<WalletEvent> & { id: string }): WalletEvent {
  return { kind: "PortfolioScoreChanged", timestamp: "2026-08-10T00:00:00.000Z", title: "Health Score Changed", summary: "Health score moved from 55 to 78.", tone: "positive", ...overrides };
}

/**
 * PR-092 final verification pass — real `HoldingAsset[]` fixture, added for
 * the SAME reason every other fixture in this file exists: no sandbox
 * wallet extension is available, so PR-092.03 (Held Projects Intelligence)
 * and PR-092.04 (Portfolio Monitoring) — both driven by real holdings, not
 * `PortfolioIntelligence` — had no way to be exercised in-browser without
 * this. Two holdings use the REAL, static Base contract addresses
 * `data/projects/seed/aave.ts`/`compound.ts` already carry (matched by
 * `buildHeldProjectLinks()`'s real address-match path — the strongest,
 * least guessable signal — never a fabricated join); one ("UNKNOWNTOKEN")
 * deliberately matches no known contract or symbol, to real-browser-verify
 * the honest "no tracked project" path.
 */
export function makeHoldingAssets(): import("@/lib/holdings/types").HoldingAsset[] {
  return [
    { address: null, symbol: "ETH", name: "Ethereum", logo: null, balance: BigInt("2500000000000000000"), decimals: 18, formattedBalance: "2.5", usdPrice: 2500, usdValue: 6250, allocationPct: 41.1, chain: "base", verified: null, tokenType: "native" },
    { address: "0x63706e401c06ac8513145b7687a14804d17f814b", symbol: "AAVE", name: "Aave Token", logo: null, balance: BigInt("30000000000000000000"), decimals: 18, formattedBalance: "30", usdPrice: 130, usdValue: 3900, allocationPct: 25.7, chain: "base", verified: true, tokenType: "erc20" },
    { address: "0x9e1028f5f1d5ede59748ffcee5532509976840e0", symbol: "COMP", name: "Compound", logo: null, balance: BigInt("500000000000000000000"), decimals: 18, formattedBalance: "500", usdPrice: 5, usdValue: 2500, allocationPct: 16.4, chain: "base", verified: true, tokenType: "erc20" },
    { address: "0xbaa5cc21fd487b8fcc2f632f3f4e8d37262a0842", symbol: "MORPHO", name: "Morpho", logo: null, balance: BigInt("1000000000000000000000"), decimals: 18, formattedBalance: "1,000", usdPrice: 2.39, usdValue: 2390, allocationPct: 15.7, chain: "base", verified: true, tokenType: "erc20" },
    { address: "0xfixture0000000000000000000000unknowntok", symbol: "UNKNOWNTOKEN", name: "Unknown Token (fixture)", logo: null, balance: BigInt("1000000000000000000000"), decimals: 18, formattedBalance: "1,000", usdPrice: 2.55, usdValue: 2550, allocationPct: 16.8, chain: "base", verified: null, tokenType: "erc20" },
  ];
}

export type WalletVerificationFixtureOverrides = {
  history?: AnalyticsSnapshot[];
  analytics?: WalletAnalytics;
  intelligence?: PortfolioIntelligence | null;
  ai?: PortfolioAI | null;
  automationResults?: AutomationResult[];
  automationEvents?: WalletEvent[];
};

/**
 * Builds a full, internally-consistent `WalletVerificationBundle` by
 * running a realistic base through the real engines — see this file's own
 * doc comment. Every override is independent, so a test/harness caller can
 * swap in exactly one deliberately-broken piece (e.g. duplicate
 * `automationResults`) while keeping everything else realistic.
 */
export function buildWalletVerificationFixtures(overrides: WalletVerificationFixtureOverrides = {}): WalletVerificationBundle {
  const history = overrides.history ?? makeRealisticHistory();
  const analytics = overrides.analytics ?? makeWalletAnalytics();
  const intelligence = overrides.intelligence !== undefined ? overrides.intelligence : makePortfolioIntelligence();
  const ai = overrides.ai !== undefined ? overrides.ai : makePortfolioAI();
  const automationResults = overrides.automationResults ?? [makeAutomationResult({ id: "automation:wallet-rule:health:1", metadata: { source: "wallet-automation" } })];
  const automationEvents = overrides.automationEvents ?? [makeWalletEvent({ id: "event:health-score-changed:2026-08-10T00:00:00.000Z" })];

  const report30d = buildHistoricalReport(history, analytics, "30d");
  const reportAll = buildHistoricalReport(history, analytics, "all");

  const crossFeature = buildCrossFeatureIntelligence({ intelligence, ai, analytics, history, automationEvents, automationResults, monthlyReport: report30d });

  const digest = buildMonthlyDigest(report30d, analytics, intelligence, ai, crossFeature);
  const story = buildPortfolioStory(reportAll, analytics, intelligence, ai, crossFeature);

  return { intelligence, ai, analytics, history, automationResults, automationEvents, report30d, reportAll, digest, story, crossFeature };
}
