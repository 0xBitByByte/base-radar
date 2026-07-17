/**
 * PR12.1 — pure derivations for the Project Profile's Project Health
 * Scorecard. Every value here is computed from fields the Intelligence
 * Engine already produced (`Health`, `Confidence`, `Risk`, `Market`, `Tvl`,
 * `GithubIntel`, governance events, whale events) — no new provider calls,
 * no invented scoring model. Where a tile has no real underlying signal, it
 * reports `score: null` and the component renders "Not enough verified
 * data" rather than a guess.
 *
 * PR13.7 — `buildAiVerdict`, `buildExecutiveSummaryBullets`, and
 * `buildAiInsight` (all previously here) are deleted: they independently
 * re-derived overlapping facts into three separately-rendered cards, the
 * direct cause of a confirmed duplication bug. `lib/intelligence/report.ts`'s
 * `buildIntelligenceReport` replaces all three with one merged derivation.
 */

import { clampScore } from "@/lib/intelligence/helpers";
import type { Confidence, GithubIntel, Health, Market, Risk, Trading, Tvl } from "@/lib/intelligence/types";
import type { GovernanceEvent } from "@/lib/governance/types";
import type { WhaleEvent } from "@/lib/whale/types";
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
 * PR13.7 Goal 6 — real, evidence-backed replacement for the Scorecard's
 * Developer tile, built once the extended/streamed GitHub calls resolve
 * (`ProfileDeveloperTileAsync`). The fast-path Developer tile is always
 * "Not Assessed" — `commitsLast7d`/commit data isn't merged into the main
 * `ProjectIntelligence` build until the extended/streamed path resolves
 * (see `page.tsx`'s docstring on the fast/slow split) — so this tile can't
 * reuse the Risk Analysis's own frozen "Developer Health" severity without
 * either blocking first paint or showing stale data. Instead it computes
 * its own transparent, bounded activity-volume score from the same three
 * real numbers its `detail` text reports (commits/contributors/releases) —
 * the same kind of documented, bounded transform the `momentum` tile above
 * already uses for a live price-change percentage, not a fabricated model.
 * Falls back to the original fast-path tile whenever none of the three
 * numbers resolved to real data.
 */
export function buildDeveloperEvidenceTile(
  commitsLast90d: number | null,
  contributorCount: number | null,
  releaseCount: number | null,
  fallback: ScorecardTile
): ScorecardTile {
  if (commitsLast90d === null && contributorCount === null && releaseCount === null) {
    return fallback;
  }

  const score = clampScore(30 + (commitsLast90d ?? 0) * 0.3 + (contributorCount ?? 0) * 2 + (releaseCount ?? 0) * 3);
  const severity: ScorecardSeverity = score >= 80 ? "excellent" : score >= 60 ? "strong" : score >= 40 ? "moderate" : "weak";

  const parts: string[] = [];
  if (commitsLast90d !== null) parts.push(`${commitsLast90d} commit${commitsLast90d === 1 ? "" : "s"} in the last 90 days`);
  if (contributorCount !== null) parts.push(`${contributorCount} contributor${contributorCount === 1 ? "" : "s"}`);
  if (releaseCount !== null) parts.push(`${releaseCount} release${releaseCount === 1 ? "" : "s"} in the last year`);

  return {
    id: "developer",
    label: "Engineering Health",
    score,
    scoreLabel: `${score}/100`,
    statusLabel: SEVERITY_STATUS[severity],
    severity,
    detail: parts.length > 0 ? parts.join(", ") + "." : fallback.detail,
    source: "GitHub repository activity",
  };
}

export const PROVIDER_DISPLAY_NAME: Record<ProviderName, string> = {
  coingecko: "CoinGecko",
  dexscreener: "DexScreener",
  defillama: "DefiLlama",
  blockscout: "Blockscout",
  github: "GitHub",
  base: "Base RPC",
};
