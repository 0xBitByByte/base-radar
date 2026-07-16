/**
 * PR12.1 — pure derivations for the Project Profile's Executive Summary and
 * Project Health Scorecard. Every value here is computed from fields the
 * Intelligence Engine already produced (`Health`, `Confidence`, `Risk`,
 * `Market`, `Tvl`, `GithubIntel`, governance events, whale events) — no new
 * provider calls, no invented scoring model. Where a tile has no real
 * underlying signal, it reports `score: null` and the component renders
 * "Not enough verified data" rather than a guess.
 */

import { clampScore } from "@/lib/intelligence/helpers";
import type { Confidence, GithubIntel, Health, Market, Risk, Sources, Trading, Tvl } from "@/lib/intelligence/types";
import type { GovernanceEvent } from "@/lib/governance/types";
import type { WhaleEvent } from "@/lib/whale/types";
import type { VerificationStatus } from "@/data/projects/enums";
import type { ProviderName } from "@/lib/providers/common/types";

export type ScorecardSeverity = "excellent" | "strong" | "moderate" | "weak" | "unknown";

export type ScorecardTileId =
  | "security"
  | "liquidity"
  | "momentum"
  | "developer"
  | "governance"
  | "community"
  | "whale"
  | "aiRating";

export type ScorecardTrend = "up" | "down" | "stable";

export type ScorecardTile = {
  id: ScorecardTileId;
  label: string;
  /** `null` when there's no real signal to report — the component shows "Not enough verified data" rather than a guessed number. */
  score: number | null;
  /** What's actually displayed as the headline value — a "92/100"-style score, a plain risk label, or a letter grade, depending on the tile. */
  scoreLabel: string;
  statusLabel: string;
  severity: ScorecardSeverity;
  detail: string;
  source: string;
  /**
   * `undefined` when this tile has no real directional/delta signal to
   * report (most tiles are a severity *snapshot*, not a measured change
   * over time) — the Score Matrix renders a neutral dash rather than
   * fabricating a trend arrow. Only `momentum` currently has a genuine
   * real delta (the same live price-change percentage driving its score).
   */
  trend?: ScorecardTrend;
};

export type ExecutiveSummaryBulletTone = "positive" | "negative" | "neutral";

export type ExecutiveSummaryBulletKind =
  | "verification"
  | "confidence"
  | "tvl"
  | "price"
  | "developer"
  | "whale"
  | "governance"
  | "outlook";

export type ExecutiveSummaryBullet = {
  text: string;
  tone: ExecutiveSummaryBulletTone;
  /** Which real signal this bullet came from — lets the component pick a distinct icon per bullet instead of one generic tone icon everywhere. */
  kind: ExecutiveSummaryBulletKind;
};

const SEVERITY_SCORE: Record<Exclude<ScorecardSeverity, "unknown">, number> = {
  excellent: 92,
  strong: 78,
  moderate: 58,
  weak: 32,
};

const SEVERITY_STATUS: Record<ScorecardSeverity, string> = {
  excellent: "Excellent",
  strong: "Strong",
  moderate: "Moderate",
  weak: "Needs Attention",
  unknown: "Not Assessed",
};

/** Maps a `RiskContributor`'s own severity (already computed by `buildRiskContributors`) onto a scorecard tile — never a second, independent scoring pass. */
function tileFromContributorSeverity(
  id: ScorecardTileId,
  label: string,
  severity: "low" | "moderate" | "high" | "unknown" | undefined,
  detail: string,
  source: string
): ScorecardTile {
  const mapped: ScorecardSeverity =
    severity === "low" ? "excellent" : severity === "moderate" ? "moderate" : severity === "high" ? "weak" : "unknown";

  if (mapped === "unknown") {
    return { id, label, score: null, scoreLabel: "Not enough verified data", statusLabel: "Not Assessed", severity: "unknown", detail, source };
  }

  return {
    id,
    label,
    score: SEVERITY_SCORE[mapped],
    scoreLabel: `${SEVERITY_SCORE[mapped]}/100`,
    statusLabel: SEVERITY_STATUS[mapped],
    severity: mapped,
    detail,
    source,
  };
}

export type ScorecardInput = {
  health: Health;
  confidence: Confidence;
  risk: Risk;
  market: Market;
  tvl: Tvl;
  trading: Trading;
  github: GithubIntel;
  governance: GovernanceEvent[] | null;
  whaleEvents: WhaleEvent[];
  narrativeLabel: string | null;
  communityLinkCount: number;
  communityLinkTotal: number;
};

export function buildHealthScorecard(input: ScorecardInput): ScorecardTile[] {
  const contributors = input.risk.contributors;
  const findSeverity = (label: string) => contributors.find((c) => c.label === label)?.severity;

  const security = tileFromContributorSeverity(
    "security",
    "Security",
    findSeverity("Smart Contract Risk"),
    "Derived from registered contract verification status and centralization signals in the Risk Analysis.",
    "Blockscout contract verification"
  );

  const liquidity = tileFromContributorSeverity(
    "liquidity",
    "Liquidity",
    findSeverity("Liquidity Risk"),
    "Derived from live DexScreener-aggregated liquidity depth in the Risk Analysis.",
    "DexScreener trading data"
  );

  const developer = tileFromContributorSeverity(
    "developer",
    "Engineering Health",
    findSeverity("Developer Health"),
    "Derived from recent GitHub commit activity in the Risk Analysis.",
    "GitHub repository stats"
  );

  const governanceSeverity = findSeverity("Governance Activity");
  const activeProposals = input.governance?.filter((event) => event.status === "active").length ?? null;
  const governance = tileFromContributorSeverity(
    "governance",
    "Governance",
    governanceSeverity,
    activeProposals !== null
      ? `${activeProposals} active proposal${activeProposals === 1 ? "" : "s"} out of ${input.governance?.length ?? 0} tracked on Snapshot.`
      : "This project has no on-chain governance configured in the registry.",
    "Snapshot governance data"
  );

  // Momentum is the one tile with a real continuous input (a live % change)
  // rather than a discrete severity bucket — the score is a direct, bounded
  // transform of that real number (same `clampScore` helper `scoring.ts`
  // already uses for the identical field), never an independent estimate.
  let momentum: ScorecardTile;
  const changePct = input.market.available ? (input.market.changePct7d ?? input.market.changePct24h) : null;
  if (changePct === null) {
    momentum = {
      id: "momentum",
      label: "Market Momentum",
      score: null,
      scoreLabel: "Not enough verified data",
      statusLabel: "Not Assessed",
      severity: "unknown",
      detail: "No live CoinGecko price-change data is available for this project.",
      source: "CoinGecko market data",
    };
  } else {
    const score = clampScore(50 + changePct * 3);
    const severity: ScorecardSeverity = changePct >= 5 ? "excellent" : changePct >= 0 ? "strong" : changePct >= -10 ? "moderate" : "weak";
    momentum = {
      id: "momentum",
      label: "Market Momentum",
      score,
      scoreLabel: `${score}/100`,
      statusLabel: changePct >= 0 ? "Positive" : "Negative",
      severity,
      detail: `Based on a ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}% price move over the last available window.`,
      source: "CoinGecko market data",
      trend: changePct > 0 ? "up" : changePct < 0 ? "down" : "stable",
    };
  }

  // Community has no engine-computed score anywhere — this is a plain,
  // transparent completeness count (real links present ÷ platforms
  // tracked), never an invented engagement/quality metric.
  const communityScore = input.communityLinkTotal > 0 ? clampScore((input.communityLinkCount / input.communityLinkTotal) * 100) : null;
  const community: ScorecardTile =
    communityScore === null
      ? {
          id: "community",
          label: "Community",
          score: null,
          scoreLabel: "Not enough verified data",
          statusLabel: "Not Assessed",
          severity: "unknown",
          detail: "No community links are configured for this project in the registry.",
          source: "Base Radar registry",
        }
      : {
          id: "community",
          label: "Community",
          score: communityScore,
          scoreLabel: `${communityScore}/100`,
          statusLabel: communityScore >= 70 ? "Healthy" : communityScore >= 35 ? "Moderate" : "Limited",
          severity: communityScore >= 70 ? "excellent" : communityScore >= 35 ? "moderate" : "weak",
          detail: `${input.communityLinkCount} of ${input.communityLinkTotal} tracked community/official links are configured for this project.`,
          source: "Base Radar registry",
        };

  // Whale Activity is deliberately text-only (no numeric score) — the
  // underlying signal is a count of discrete events, not a continuous
  // metric, so a fabricated 0-100 number would imply false precision.
  const alertCount = input.whaleEvents.filter((event) => event.classification === "whale-alert").length;
  const whale: ScorecardTile =
    input.whaleEvents.length === 0
      ? {
          id: "whale",
          label: "Whale Activity",
          score: null,
          scoreLabel: "No Activity",
          statusLabel: "Stable",
          severity: "excellent",
          detail: "No large on-chain transfers were detected for this project during the monitored period.",
          source: "Blockscout whale detection",
        }
      : {
          id: "whale",
          label: "Whale Activity",
          score: null,
          scoreLabel: alertCount > 0 ? "Elevated" : "Moderate",
          statusLabel: alertCount > 0 ? "Watch" : "Normal",
          severity: alertCount > 0 ? "weak" : "moderate",
          detail: `${input.whaleEvents.length} large transfer${input.whaleEvents.length === 1 ? "" : "s"} detected, ${alertCount} flagged as a Whale Alert.`,
          source: "Blockscout whale detection",
        };

  // AI Rating blends the two scores the engine already computes end-to-end
  // (Health, Confidence) into one letter grade — a display transform of
  // real numbers, not a new model.
  const blended = (input.health.score + input.confidence.score) / 2;
  const grade = blended >= 90 ? "A+" : blended >= 80 ? "A" : blended >= 70 ? "B+" : blended >= 60 ? "B" : blended >= 50 ? "C" : "D";
  const outlook =
    input.narrativeLabel ??
    (input.risk.level === "low" ? "Stable" : input.risk.level === "moderate" ? "Neutral" : "Cautious");
  const aiRating: ScorecardTile = {
    id: "aiRating",
    label: "AI Rating",
    score: null,
    scoreLabel: grade,
    statusLabel: outlook,
    severity: blended >= 80 ? "excellent" : blended >= 60 ? "strong" : blended >= 40 ? "moderate" : "weak",
    detail: `Blends this project's Health score (${input.health.score}/100) and Confidence score (${input.confidence.score}/100).`,
    source: "Base Radar Health + Confidence scores",
  };

  return [security, liquidity, momentum, developer, governance, community, whale, aiRating];
}

/**
 * The AI Summary banner's single headline phrase — a plain-English bucket
 * of the exact same Health/Confidence scores and Risk level already
 * computed elsewhere on this page, not an independent judgment call.
 */
export function buildAiVerdict(health: Health, confidence: Confidence, risk: Risk): string {
  if (risk.level === "high") return "High Risk — Proceed With Caution";

  const blended = (health.score + confidence.score) / 2;
  if (blended >= 85 && risk.level === "low") return "Excellent Long-Term Project";
  if (blended >= 70) return "Solid, Actively Maintained Project";
  if (blended >= 50) return "Developing Project — Monitor Closely";
  return "Limited Data — Insufficient For A Confident Rating";
}

function formatVerificationClause(status: VerificationStatus): string {
  if (status === "verified") return "Verified";
  if (status === "community") return "Community-reviewed";
  if (status === "flagged") return "Registry-flagged";
  return "Unverified";
}

export type ExecutiveSummaryInput = {
  verificationStatus: VerificationStatus;
  risk: Risk;
  confidence: Confidence;
  tvl: Tvl;
  market: Market;
  github: GithubIntel;
  governance: GovernanceEvent[] | null;
  whaleEvents: WhaleEvent[];
  narrativeLabel: string | null;
};

/**
 * Up to 7 bullet points summarizing the entire project in one glance —
 * every clause traces back to a real, already-computed field. The
 * confidence disclaimer (when present) and the closing "AI Outlook" line
 * are never dropped even when other signals push the list toward the cap.
 */
export function buildExecutiveSummaryBullets(input: ExecutiveSummaryInput): ExecutiveSummaryBullet[] {
  const bullets: ExecutiveSummaryBullet[] = [];

  bullets.push({
    text: `${formatVerificationClause(input.verificationStatus)} project with ${input.risk.level} risk`,
    tone: input.risk.level === "low" ? "positive" : input.risk.level === "high" ? "negative" : "neutral",
    kind: "verification",
  });

  if (input.confidence.level === "low") {
    bullets.push({
      text: "Confidence in this analysis is limited — few live data sources are available for this project",
      tone: "negative",
      kind: "confidence",
    });
  }

  if (input.tvl.available && input.tvl.changePct7d !== null) {
    const up = input.tvl.changePct7d >= 0;
    bullets.push({
      text: `TVL ${up ? "increasing" : "decreasing"}: ${up ? "+" : ""}${input.tvl.changePct7d.toFixed(1)}% over the past 7 days`,
      tone: up ? "positive" : "negative",
      kind: "tvl",
    });
  }

  if (input.market.available && input.market.changePct7d !== null) {
    const up = input.market.changePct7d >= 0;
    bullets.push({
      text: `Price ${up ? "up" : "down"} ${up ? "+" : ""}${input.market.changePct7d.toFixed(1)}% over the past 7 days`,
      tone: up ? "positive" : "negative",
      kind: "price",
    });
  }

  if (input.github.available && input.github.commitsLast7d !== null) {
    bullets.push(
      input.github.commitsLast7d > 0
        ? { text: `Developer activity remains active: ${input.github.commitsLast7d} commits in the last 7 days`, tone: "positive", kind: "developer" }
        : { text: "No recent commits in the last 7 days", tone: "neutral", kind: "developer" }
    );
  }

  bullets.push(
    input.whaleEvents.length === 0
      ? { text: "No unusual whale activity detected", tone: "positive", kind: "whale" }
      : { text: `${input.whaleEvents.length} large on-chain transfer${input.whaleEvents.length === 1 ? "" : "s"} detected recently`, tone: "neutral", kind: "whale" }
  );

  if (input.governance !== null) {
    const activeCount = input.governance.filter((event) => event.status === "active").length;
    bullets.push(
      activeCount > 0
        ? { text: `${activeCount} active governance proposal${activeCount === 1 ? "" : "s"}`, tone: "positive", kind: "governance" }
        : { text: "Governance currently inactive", tone: "neutral", kind: "governance" }
    );
  }

  const capped = bullets.slice(0, 6);
  const outlook = input.narrativeLabel
    ? input.narrativeLabel[0].toUpperCase() + input.narrativeLabel.slice(1)
    : input.risk.level === "low"
      ? "Stable"
      : input.risk.level === "moderate"
        ? "Neutral"
        : "Cautious";
  capped.push({ text: `AI Outlook: ${outlook}`, tone: "neutral", kind: "outlook" });

  return capped;
}

export type AiInsightOutlookTone = "positive" | "negative" | "neutral";

export type AiInsight = {
  outlook: string;
  outlookTone: AiInsightOutlookTone;
  why: string[];
  whatToWatch: string[];
  confidenceLabel: "High" | "Medium" | "Low";
  dataSources: string[];
};

export const PROVIDER_DISPLAY_NAME: Record<ProviderName, string> = {
  coingecko: "CoinGecko",
  dexscreener: "DexScreener",
  defillama: "DefiLlama",
  blockscout: "Blockscout",
  github: "GitHub",
  base: "Base RPC",
};

const CONFIDENCE_LABEL: Record<Confidence["level"], "High" | "Medium" | "Low"> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export type AiInsightInput = {
  health: Health;
  confidence: Confidence;
  risk: Risk;
  tvl: Tvl;
  market: Market;
  github: GithubIntel;
  governance: GovernanceEvent[] | null;
  whaleEvents: WhaleEvent[];
  sources: Sources;
  narrativeLabel: string | null;
};

/**
 * PR12.1c Req 5.13 — "AI Insight" analyst note: a concise, plain-English
 * read of WHY the project currently looks the way it does and WHAT to
 * monitor next, generated entirely from fields the Intelligence Engine
 * already computed. Every clause traces to a real signal; nothing here is
 * an independent judgment beyond what `risk`/`health`/`confidence` already
 * concluded.
 */
export function buildAiInsight(input: AiInsightInput): AiInsight {
  const outlook = input.narrativeLabel
    ? input.narrativeLabel[0].toUpperCase() + input.narrativeLabel.slice(1)
    : input.risk.level === "low" && input.health.label !== "poor"
      ? "Stable"
      : input.risk.level === "high" || input.health.label === "poor"
        ? "Cautious"
        : "Neutral";
  const outlookTone: AiInsightOutlookTone =
    outlook === "Cautious" ? "negative" : outlook === "Stable" || outlook === "Bullish" ? "positive" : "neutral";

  const why: string[] = [];

  if (input.tvl.available && input.tvl.changePct7d !== null) {
    const up = input.tvl.changePct7d >= 0;
    why.push(`TVL has ${up ? "grown" : "declined"} ${Math.abs(input.tvl.changePct7d).toFixed(1)}% over the past 7 days.`);
  }

  if (input.github.available && input.github.commitsLast7d !== null) {
    why.push(
      input.github.commitsLast7d > 0
        ? `Development activity is ongoing, with ${input.github.commitsLast7d} commit${input.github.commitsLast7d === 1 ? "" : "s"} in the last 7 days.`
        : "No commits were recorded in the last 7 days — development activity has slowed."
    );
  }

  why.push(
    input.whaleEvents.length === 0
      ? "No significant whale outflows or inflows have been detected."
      : `${input.whaleEvents.length} large on-chain transfer${input.whaleEvents.length === 1 ? " has" : "s have"} been detected recently.`
  );

  if (input.governance !== null) {
    const activeCount = input.governance.filter((event) => event.status === "active").length;
    why.push(
      activeCount > 0
        ? `Governance is active, with ${activeCount} proposal${activeCount === 1 ? "" : "s"} currently open for voting.`
        : "Governance activity is currently quiet, with no proposals open for voting."
    );
  }

  const worstContributor = input.risk.contributors
    .filter((c) => c.severity === "high" || c.severity === "moderate")
    .sort((a) => (a.severity === "high" ? -1 : 1))[0];
  if (worstContributor) {
    why.push(`${worstContributor.label} is flagged as a watch area: ${worstContributor.detail}`);
  }

  why.push(`Overall project confidence is ${CONFIDENCE_LABEL[input.confidence.level].toLowerCase()}, based on ${Object.values(input.sources).filter((s) => s.status === "live").length} live data sources.`);

  const whatToWatch: string[] = [];
  if (input.governance !== null && input.governance.filter((event) => event.status === "active").length > 0) {
    whatToWatch.push("Monitor the outcome of upcoming governance proposals.");
  }
  if (input.tvl.available && input.tvl.changePct7d !== null && Math.abs(input.tvl.changePct7d) >= 15) {
    whatToWatch.push("Watch for continued TVL volatility.");
  }
  if (input.whaleEvents.length > 0) {
    whatToWatch.push("Observe any follow-on large on-chain transactions.");
  }
  if (input.confidence.level === "low") {
    whatToWatch.push("Data confidence is limited for this project — verify key metrics independently before acting on them.");
  }
  if (whatToWatch.length === 0) {
    whatToWatch.push("No unusual signals are currently flagged — revisit if TVL, price, or governance activity shifts.");
  }

  const dataSources = (Object.keys(input.sources) as ProviderName[])
    .filter((provider) => input.sources[provider].status === "live")
    .map((provider) => PROVIDER_DISPLAY_NAME[provider]);

  return {
    outlook,
    outlookTone,
    why: why.slice(0, 6),
    whatToWatch: whatToWatch.slice(0, 4),
    confidenceLabel: CONFIDENCE_LABEL[input.confidence.level],
    dataSources,
  };
}
