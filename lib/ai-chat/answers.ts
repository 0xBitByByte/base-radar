/**
 * V4-AI-CHAT-001 (Phase 3) — one deterministic answer-builder per question
 * id. Every function here only SELECTS and TEMPLATES already-real fields
 * off `ConversationInput` — none of them compute a score, a trend
 * direction, a risk level, or any other judgment. "Never fabricate
 * answers" is enforced by construction: every fact cited traces to a real
 * field, and a builder returns the honest "not enough data yet" answer
 * (`answered: true`, empty `facts`) rather than inventing one when the
 * real data isn't there.
 */

import { AI_CHAT_QUESTIONS } from "@/lib/ai-chat/questions";
import type { AIChatFact, AIChatResponse, ConversationInput } from "@/lib/ai-chat/types";

function noData(questionId: keyof typeof AI_CHAT_QUESTIONS, answer: string): AIChatResponse {
  const question = AI_CHAT_QUESTIONS[questionId];
  return { questionId, question: question.prompt, answered: true, answer, facts: [], sources: question.sources };
}

function respond(questionId: keyof typeof AI_CHAT_QUESTIONS, answer: string, facts: AIChatFact[]): AIChatResponse {
  const question = AI_CHAT_QUESTIONS[questionId];
  return { questionId, question: question.prompt, answered: true, answer, facts, sources: question.sources };
}

function findTrend(input: ConversationInput, metric: string) {
  return input.analytics.trends.find((t) => t.metric === metric);
}

function healthChange(input: ConversationInput): AIChatResponse {
  const trend = findTrend(input, "health");
  // `buildTrends()` itself already returns an honest "not enough history
  // yet" reason for fewer than 2 snapshots — no separate check needed here.
  if (!trend) return noData("healthChange", "Not enough history yet to explain a change in Health.");
  const facts: AIChatFact[] = [{ label: "Health Trend", value: trend.reason }];
  const contributor = input.ai?.conversationContext.contributors.positive[0] ?? input.ai?.conversationContext.contributors.negative[0];
  if (contributor) facts.push({ label: "Biggest Contributor", value: contributor.reason });
  return respond("healthChange", trend.reason, facts);
}

function confidenceLow(input: ConversationInput): AIChatResponse {
  if (!input.intelligence) return noData("confidenceLow", "No wallet data yet — connect a wallet to see Confidence.");
  const { confidenceScore, confidenceLevel, pricingCoverage, unknownAssetCount, quality } = input.intelligence;
  if (confidenceLevel !== "Low") {
    return respond("confidenceLow", `Confidence isn't low right now — it's ${confidenceLevel} (${confidenceScore}/100).`, [{ label: "Confidence", value: `${confidenceLevel} (${confidenceScore}/100)` }]);
  }
  const facts: AIChatFact[] = [
    { label: "Confidence Score", value: `${confidenceScore}/100 (Low)` },
    { label: "Pricing Coverage", value: `${pricingCoverage}% of assets have a known price` },
    { label: "Unpriced Assets", value: String(unknownAssetCount) },
    { label: "Verified Assets", value: `${quality.verifiedAssetCount} verified, ${quality.unverifiedAssetCount} unverified, ${quality.notCheckedAssetCount} not checked` },
  ];
  return respond(
    "confidenceLow",
    `Confidence is Low (${confidenceScore}/100) because only ${pricingCoverage}% of assets have a known price, with ${unknownAssetCount} unpriced asset${unknownAssetCount === 1 ? "" : "s"} and ${quality.unverifiedAssetCount + quality.notCheckedAssetCount} unverified or unchecked contract${quality.unverifiedAssetCount + quality.notCheckedAssetCount === 1 ? "" : "s"}.`,
    facts
  );
}

function biggestRisk(input: ConversationInput): AIChatResponse {
  if (!input.intelligence) return noData("biggestRisk", "No wallet data yet — connect a wallet to see risk.");
  const topInsight = input.ai?.insights.find((i) => i.priority === "critical-risk") ?? input.ai?.insights[0] ?? null;
  if (topInsight) {
    return respond("biggestRisk", topInsight.summary, [
      { label: topInsight.title, value: topInsight.reason },
      { label: "Concentration", value: input.intelligence.concentrationRisk.description },
    ]);
  }
  const topWarning = input.intelligence.warnings[0];
  if (topWarning) {
    return respond("biggestRisk", topWarning.description, [{ label: topWarning.title, value: topWarning.description }]);
  }
  return respond("biggestRisk", "No significant risks detected right now.", [{ label: "Concentration", value: input.intelligence.concentrationRisk.description }]);
}

function diversification(input: ConversationInput): AIChatResponse {
  if (!input.intelligence) return noData("diversification", "No wallet data yet — connect a wallet to see diversification.");
  const { diversificationScore, quality, allocationBreakdown } = input.intelligence;
  const facts: AIChatFact[] = [
    { label: "Diversification Score", value: `${diversificationScore}/100` },
    { label: "Rating", value: quality.diversificationRating },
    { label: "Protocols Detected", value: String(quality.protocolsDetected) },
    { label: "Allocation", value: `${allocationBreakdown.stablecoinPct}% stablecoins, ${allocationBreakdown.ethPct}% ETH, ${allocationBreakdown.otherPct}% other` },
  ];
  return respond("diversification", quality.diversificationRatingReason, facts);
}

function recentChanges(input: ConversationInput): AIChatResponse {
  const entries = input.analytics.timeline.slice(0, 3);
  if (entries.length === 0) return noData("recentChanges", "No recent changes recorded yet.");
  return respond(
    "recentChanges",
    `${entries.length} recent change${entries.length === 1 ? "" : "s"}: ${entries.map((e) => e.headline).join("; ")}.`,
    entries.map((e) => ({ label: e.dayLabel, value: e.headline }))
  );
}

function whatImproved(input: ConversationInput): AIChatResponse {
  const improving = input.analytics.trends.filter((t) => t.direction === "improving");
  const largest = input.analytics.evolution.largestImprovement;
  if (!largest && improving.length === 0) return noData("whatImproved", "Nothing has improved yet — not enough history to compare.");
  const facts: AIChatFact[] = improving.map((t) => ({ label: t.label, value: t.reason }));
  const answer = largest ? largest.detail : improving[0].reason;
  return respond("whatImproved", answer, facts);
}

function whatWorsened(input: ConversationInput): AIChatResponse {
  const declining = input.analytics.trends.filter((t) => t.direction === "declining");
  const largest = input.analytics.evolution.largestDeterioration;
  if (!largest && declining.length === 0) return noData("whatWorsened", "Nothing has become worse recently — not enough history to compare.");
  const facts: AIChatFact[] = declining.map((t) => ({ label: t.label, value: t.reason }));
  const answer = largest ? largest.detail : declining[0].reason;
  return respond("whatWorsened", answer, facts);
}

function largestHolding(input: ConversationInput): AIChatResponse {
  if (!input.intelligence || !input.intelligence.largestHolding) return noData("largestHolding", "No priced holdings yet.");
  const holding = input.intelligence.largestHolding;
  const facts: AIChatFact[] = [
    { label: "Symbol", value: holding.symbol },
    { label: "Value", value: `$${holding.usdValue.toLocaleString()}` },
    { label: "Allocation", value: `${holding.allocationPct.toFixed(1)}%` },
  ];
  if (input.intelligence.largestProtocol) facts.push({ label: "Protocol", value: input.intelligence.largestProtocol.name });
  return respond("largestHolding", `Your largest holding is ${holding.symbol}, ${holding.allocationPct.toFixed(1)}% of known value ($${holding.usdValue.toLocaleString()}).`, facts);
}

function fingerprintChange(input: ConversationInput): AIChatResponse {
  const trend = findTrend(input, "fingerprint");
  if (!input.intelligence) return noData("fingerprintChange", "No wallet data yet.");
  if (!trend || trend.direction !== "unknown") {
    return respond("fingerprintChange", `Your fingerprint (${input.intelligence.fingerprint}) hasn't changed. ${input.intelligence.fingerprintReason}`, [
      { label: "Current Fingerprint", value: input.intelligence.fingerprint },
      { label: "Why", value: input.intelligence.fingerprintReason },
    ]);
  }
  return respond("fingerprintChange", `${trend.reason} ${input.intelligence.fingerprintReason}`, [
    { label: "Fingerprint History", value: trend.reason },
    { label: "Current Reason", value: input.intelligence.fingerprintReason },
  ]);
}

function improveFirst(input: ConversationInput): AIChatResponse {
  if (!input.ai || !input.ai.overview.nextAction) return noData("improveFirst", "No recommendation available yet.");
  const { nextAction, actionReason } = input.ai.overview;
  const facts: AIChatFact[] = actionReason ? [{ label: "Recommended Action", value: nextAction }, { label: "Why", value: actionReason }] : [{ label: "Recommended Action", value: nextAction }];
  return respond("improveFirst", nextAction, facts);
}

function thisMonth(input: ConversationInput): AIChatResponse {
  const report = input.monthlyReport;
  if (!report) return noData("thisMonth", "Not enough history yet for a monthly report.");
  const facts: AIChatFact[] = [
    { label: "Snapshots", value: String(report.overview.snapshotCount) },
    { label: "Net Value Change", value: report.overview.netValueChange !== null ? `${report.overview.netValueChange >= 0 ? "+" : ""}$${report.overview.netValueChange.toLocaleString()}` : "—" },
    { label: "Fingerprint Changes", value: String(report.fingerprintChanges.length) },
    { label: "Recoveries", value: String(report.majorRecoveries.length) },
  ];
  const answer = `Over the last 30 days: ${report.overview.snapshotCount} snapshot${report.overview.snapshotCount === 1 ? "" : "s"}, ${
    report.overview.netValueChange !== null ? `net value change of ${report.overview.netValueChange >= 0 ? "+" : ""}$${report.overview.netValueChange.toLocaleString()}` : "no value change recorded"
  }, ${report.majorRecoveries.length} recover${report.majorRecoveries.length === 1 ? "y" : "ies"}, and ${report.fingerprintChanges.length} fingerprint change${report.fingerprintChanges.length === 1 ? "" : "s"}.`;
  return respond("thisMonth", answer, facts);
}

function portfolioEvolution(input: ConversationInput): AIChatResponse {
  const { evolution, milestones } = input.analytics;
  const findings = [evolution.largestImprovement, evolution.largestDeterioration, evolution.biggestAllocationShift].filter((f): f is NonNullable<typeof f> => f !== null);
  if (findings.length === 0 && !milestones.highestPortfolioValue) return noData("portfolioEvolution", "Not enough history yet to describe how your portfolio has evolved.");
  const facts: AIChatFact[] = findings.map((f) => ({ label: f.label, value: f.detail }));
  if (milestones.highestPortfolioValue) facts.push({ label: "All-Time High Value", value: `$${milestones.highestPortfolioValue.value.toLocaleString()}` });
  const answer = findings.length > 0 ? findings.map((f) => f.detail).join(" ") : "Your portfolio hasn't shown a significant change yet.";
  return respond("portfolioEvolution", answer, facts);
}

function topRecommendation(input: ConversationInput): AIChatResponse {
  const action = input.ai?.actions[0];
  if (!action) return noData("topRecommendation", "No recommendations available right now.");
  return respond("topRecommendation", `${action.title}: ${action.description}`, [
    { label: action.title, value: action.reason },
    { label: "Priority", value: action.priority },
    { label: "Difficulty", value: action.difficulty },
    { label: "Estimated Impact", value: action.estimatedImpact },
  ]);
}

function automationTriggered(input: ConversationInput): AIChatResponse {
  const result = input.automationResults[0];
  if (!result) return noData("automationTriggered", "No automation has triggered yet.");
  const reason = typeof result.metadata?.reason === "string" ? result.metadata.reason : null;
  const facts: AIChatFact[] = [{ label: result.title, value: result.summary }];
  if (reason) facts.push({ label: "Reason", value: reason });
  return respond("automationTriggered", reason ? `${result.title}: ${reason}` : `${result.title} — ${result.summary}`, facts);
}

export const AI_CHAT_ANSWER_BUILDERS: Record<string, (input: ConversationInput) => AIChatResponse> = {
  healthChange,
  confidenceLow,
  biggestRisk,
  diversification,
  recentChanges,
  whatImproved,
  whatWorsened,
  largestHolding,
  fingerprintChange,
  improveFirst,
  thisMonth,
  portfolioEvolution,
  topRecommendation,
  automationTriggered,
};
