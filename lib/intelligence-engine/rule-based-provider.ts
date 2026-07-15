/**
 * The default (and, for PR10, only) `IntelligenceProvider` implementation —
 * deterministic logic over real, already-fetched provider data. Every
 * output trace back to a concrete input field; nothing here fabricates a
 * value. Same style/spirit as `lib/intelligence/scoring.ts`'s
 * `computeHealth` — a transparent heuristic, not a black box.
 */

import { formatCompactCurrency } from "@/lib/data/format";
import type { IntelligenceBriefPoint } from "@/lib/data/types";
import type {
  BriefInput,
  BriefOutput,
  IntelligenceProvider,
  NarrativeCategorySample,
  NarrativeInput,
  NarrativeOutput,
  NarrativeSignal,
  ProjectSummaryInput,
  ProjectSummaryOutput,
  RiskAnalysisInput,
  RiskAnalysisOutput,
  RiskLevel,
} from "@/lib/intelligence-engine/types";

const MAX_BRIEF_POINTS = 6;

function buildBriefPoints(input: BriefInput): IntelligenceBriefPoint[] {
  const points: IntelligenceBriefPoint[] = [];

  if (input.narrative) {
    const { category, label, changePct24h } = input.narrative;
    points.push({
      id: "narrative",
      text: `${category} ${label} (${changePct24h >= 0 ? "+" : ""}${changePct24h.toFixed(1)}%)`,
      tone: changePct24h >= 0 ? "positive" : "negative",
    });
  }

  const tvlKpi = input.kpis.find((k) => k.id === "tvl");
  if (tvlKpi?.deltaPct !== undefined) {
    const up = tvlKpi.deltaPct >= 0;
    points.push({
      id: "tvl",
      text: `TVL ${up ? "increased" : "decreased"} ${Math.abs(tvlKpi.deltaPct).toFixed(1)}%`,
      tone: up ? "positive" : "negative",
    });
  }

  points.push({
    id: "gas",
    text: input.market.gasGwei < 0.02 ? "Gas remains low" : `Gas at ${input.market.gasGwei.toFixed(3)} gwei`,
    tone: input.market.gasGwei < 0.02 ? "positive" : "neutral",
  });

  const topWhale = [...input.whaleEvents].sort((a, b) => b.usdValue - a.usdValue)[0];
  if (topWhale) {
    const label = topWhale.classification === "whale-alert" ? "Whale Alert" : "Large on-chain transfer";
    const detail = topWhale.detail ? ` — ${topWhale.detail}` : "";
    points.push({
      id: "whale",
      text: `${label}: ${formatCompactCurrency(topWhale.usdValue)} ${topWhale.tokenSymbol}${detail}`,
      tone: "neutral",
    });
  }

  if (input.governanceEvents.length > 0) {
    const passed = input.governanceEvents.find((e) => e.status === "passed");
    const activeCount = input.governanceEvents.filter((e) => e.status === "active").length;
    if (passed) {
      points.push({ id: "governance", text: `${passed.projectName}: "${passed.title}" passed`, tone: "positive" });
    } else if (activeCount > 0) {
      points.push({
        id: "governance",
        text: `${activeCount} governance proposal${activeCount === 1 ? "" : "s"} active`,
        tone: "neutral",
      });
    }
  }

  if (input.developerActivity?.commitsLast7d) {
    points.push({
      id: "developer",
      text: `${input.developerActivity.repoLabel}: ${input.developerActivity.commitsLast7d} commits this week`,
      tone: "positive",
    });
  }

  if (input.topSignal) {
    points.push({
      id: "momentum",
      text: `${input.topSignal.project} ${input.topSignal.note}`,
      tone: input.topSignal.strength >= 50 ? "positive" : "neutral",
    });
  }

  return points.slice(0, MAX_BRIEF_POINTS);
}

function narrativeLabel(changePct24h: number): string {
  if (changePct24h >= 10) return "surging";
  if (changePct24h >= 3) return "gaining momentum";
  if (changePct24h <= -10) return "sharply cooling";
  if (changePct24h <= -3) return "cooling off";
  return "holding steady";
}

/**
 * Pure logic behind `generateProjectSummary` — extracted so callers that
 * can't or shouldn't go through the async `IntelligenceProvider` interface
 * (e.g. `components/landing/featuredProjects.ts`'s static marketing fixture)
 * can still produce this exact same, real-data-driven text synchronously,
 * instead of hand-writing a second copy of this sentence template.
 */
export function buildProjectSummary(input: ProjectSummaryInput): string {
  const sentences: string[] = [];

  const trustClause =
    input.verificationStatus === "verified"
      ? "Verified"
      : input.verificationStatus === "community"
        ? "Community-reviewed"
        : input.verificationStatus === "flagged"
          ? "Flagged"
          : "Unverified";

  const tvlClause =
    input.tvlUsd !== null
      ? ` with ${formatCompactCurrency(input.tvlUsd)} TVL${
          input.tvlChangePct24h !== null
            ? ` (${input.tvlChangePct24h >= 0 ? "+" : ""}${input.tvlChangePct24h.toFixed(1)}% 24h)`
            : ""
        }`
      : "";

  sentences.push(`${trustClause} project${tvlClause}, ${input.healthLabel} health (${input.healthScore}/100).`);

  const confidenceClause = `${input.confidenceLevel} confidence (${input.confidenceScore}/100)`;
  const githubClause = input.githubStars !== null ? `, ${input.githubStars.toLocaleString()} GitHub stars` : "";
  sentences.push(`${confidenceClause}${githubClause}.`);

  return sentences.join(" ");
}

/** Pure logic behind `generateNarrative` — see `buildProjectSummary`'s doc comment for why this is exported standalone. */
export function buildNarrativeSignals(input: NarrativeInput): NarrativeSignal[] {
  if (input.samples.length === 0) return [];

  const grouped = new Map<string, NarrativeCategorySample[]>();
  for (const sample of input.samples) {
    const list = grouped.get(sample.category) ?? [];
    list.push(sample);
    grouped.set(sample.category, list);
  }

  const maxVolume = Math.max(...input.samples.map((s) => s.volumeUsd), 1);

  const signals: NarrativeSignal[] = Array.from(grouped.entries()).map(([category, items]) => {
    const avgChange = items.reduce((sum, s) => sum + s.changePct24h, 0) / items.length;
    const totalVolume = items.reduce((sum, s) => sum + s.volumeUsd, 0);
    // Strength blends how strong the average price move is with how much
    // real volume backs it — a big move on negligible volume shouldn't
    // outrank a moderate move backed by real liquidity.
    const strength = Math.max(0, Math.min(100, Math.round(Math.abs(avgChange) * 2 + (totalVolume / maxVolume) * 40)));
    return { category, label: narrativeLabel(avgChange), changePct24h: avgChange, strength };
  });

  signals.sort((a, b) => b.strength - a.strength);
  return signals;
}

/** Pure logic behind `generateRiskAnalysis` — see `buildProjectSummary`'s doc comment for why this is exported standalone. */
export function buildRiskAnalysis(input: RiskAnalysisInput): RiskAnalysisOutput {
  if (input.verificationStatus === "flagged") {
    return { level: "high", explanation: "Registry-flagged project — treat all data with caution." };
  }

  let riskScore = 0;
  const reasons: string[] = [];

  if (input.healthScore < 40) {
    riskScore += 2;
    reasons.push("low health score");
  } else if (input.healthScore < 60) {
    riskScore += 1;
  }

  if (input.confidenceScore < 40) {
    riskScore += 2;
    reasons.push("low confidence");
  } else if (input.confidenceScore < 70) {
    riskScore += 1;
  }

  if (input.verificationStatus === "unverified") {
    riskScore += 1;
    reasons.push("unverified registry status");
  }

  if (input.freshness === "stale" || input.freshness === "unknown") {
    riskScore += 1;
    reasons.push("stale data");
  }

  if (input.hasRecentWhaleActivity) {
    riskScore += 1;
    reasons.push("recent large on-chain transfers");
  }

  const level: RiskLevel = riskScore >= 5 ? "high" : riskScore >= 3 ? "elevated" : riskScore >= 1 ? "moderate" : "low";

  const explanation =
    reasons.length > 0
      ? `${level[0].toUpperCase()}${level.slice(1)} risk — ${reasons.join(", ")}.`
      : "Low risk — strong health, confidence, and data freshness across all tracked signals.";

  return { level, explanation };
}

export class RuleBasedIntelligenceProvider implements IntelligenceProvider {
  async generateBrief(input: BriefInput): Promise<BriefOutput> {
    return {
      points: buildBriefPoints(input),
      generatedAt: new Date().toISOString(),
    };
  }

  async generateProjectSummary(input: ProjectSummaryInput): Promise<ProjectSummaryOutput> {
    return { summary: buildProjectSummary(input) };
  }

  async generateNarrative(input: NarrativeInput): Promise<NarrativeOutput> {
    return { signals: buildNarrativeSignals(input) };
  }

  async generateRiskAnalysis(input: RiskAnalysisInput): Promise<RiskAnalysisOutput> {
    return buildRiskAnalysis(input);
  }
}
