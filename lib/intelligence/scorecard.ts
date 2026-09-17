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
 *
 * PR-084.06 (final completion) — three more tiles (`activity`,
 * `transparency`, `documentation`), closing the AI Intelligence roadmap's
 * signal-category gap. Same rule as every tile above: each is derived from
 * data this function (or an already-computed sibling tile) already has —
 * `activity` blends the already-computed `developer`/`momentum` tiles'
 * scores (the same blend pattern `aiRating` below already uses for
 * Health+Confidence, not a third independent model); `transparency` reuses
 * the same registered-contracts verification ratio the now-removed
 * `ProfileTrustCenter` (retired in PR-085.01) used to compute from the
 * identical `Contracts` field; `documentation` reuses the same `docsUrl`
 * presence check that component's Documentation trust tile used to make. No
 * new provider call, no new scoring model, nothing computed twice.
 */

import { clampScore, VERIFICATION_STATUS_LABEL } from "@/lib/intelligence/helpers";
import { countActiveProposals } from "@/lib/governance/helpers";
import type { Confidence, Contracts, GithubIntel, Health, Market, Risk, Trading, Tvl } from "@/lib/intelligence/types";
import type { RiskContributor } from "@/lib/intelligence-engine";
import type { GovernanceEvent } from "@/lib/governance/types";
import type { WhaleEvent } from "@/lib/whale/types";
import type { ProviderName } from "@/lib/providers/common/types";
import type { VerificationStatus } from "@/data/projects/enums";

export type ScorecardSeverity = "excellent" | "strong" | "moderate" | "weak" | "unknown";

export type ScorecardTileId =
  | "security"
  | "liquidity"
  | "momentum"
  | "developer"
  | "governance"
  | "community"
  | "whale"
  | "aiRating"
  | "activity"
  | "transparency"
  | "documentation";

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

/**
 * Maps a `RiskContributor`'s own severity (already computed by
 * `generateRiskAnalysis`, `lib/intelligence-engine/rule-based-provider.ts`)
 * onto a scorecard tile — never a second, independent scoring pass. When
 * there's no real signal (severity "unknown"), this reuses the
 * contributor's own real per-case `detail` (e.g. "No GitHub commit activity
 * data available for this project.") as the "What's missing" reason instead
 * of the generic `detail` param — that generic string is written as
 * evidence framing ("Derived from X in the Risk Analysis") and reads as
 * nonsense once prefixed with "What's missing:" (confirmed live on Aave's
 * Developer/Liquidity tiles before this fix — see PR-073).
 */
function tileFromContributorSeverity(
  id: ScorecardTileId,
  label: string,
  contributor: RiskContributor | undefined,
  detail: string,
  source: string
): ScorecardTile {
  const severity = contributor?.severity;
  const mapped: ScorecardSeverity =
    severity === "low" ? "excellent" : severity === "moderate" ? "moderate" : severity === "high" ? "weak" : "unknown";

  if (mapped === "unknown") {
    return {
      id,
      label,
      score: null,
      scoreLabel: "Not enough verified data",
      statusLabel: "Not Assessed",
      severity: "unknown",
      detail: contributor?.detail ?? detail,
      source,
    };
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
  /** PR-075 — same real, confirmed-mechanism distinction `ProfileGovernance`/`ProfileKeySignals` use: `governance === null` with a non-`"snapshot"` type means this project genuinely doesn't use Snapshot, not that nothing was configured. */
  governanceType: "snapshot" | "on-chain" | "forum" | "none" | null;
  whaleEvents: WhaleEvent[];
  narrativeLabel: string | null;
  communityLinkCount: number;
  communityLinkTotal: number;
  /** PR-084.06 — already computed by every caller (previously also read by the now-removed `ProfileTrustCenter`); reused here for the `transparency` tile's contract-verification ratio, never re-fetched. */
  contracts: Contracts;
  /** PR-084.06 — already computed by every caller for the report's own `verification` explanation; reused here for the `transparency` tile. */
  verificationStatus: VerificationStatus;
  /** PR-084.06 — already computed by every caller (`profile.community.socials.docs`); reused here for the `documentation` tile, the same real field the now-removed `ProfileTrustCenter`'s Documentation trust tile used to check. */
  docsUrl: string | null;
};

export type AiRatingGrade = "A+" | "A" | "B+" | "B" | "C" | "D";

/**
 * PR-1 (Universal Project Card, Phase 1) — extracted from this file's own
 * previously-inline AI Rating tile logic so `lib/projects/build.ts` can
 * reuse the exact same blend for `LiveProject.aiRating` instead of
 * recomputing a second, driftable copy of these thresholds. Pure, no
 * behavior change to `buildHealthScorecard`'s existing output below.
 */
export function computeAiRatingGrade(healthScore: number, confidenceScore: number): AiRatingGrade {
  const blended = (healthScore + confidenceScore) / 2;
  return blended >= 90 ? "A+" : blended >= 80 ? "A" : blended >= 70 ? "B+" : blended >= 60 ? "B" : blended >= 50 ? "C" : "D";
}

export function buildHealthScorecard(input: ScorecardInput): ScorecardTile[] {
  const contributors = input.risk.contributors;
  const findContributor = (label: string) => contributors.find((c) => c.label === label);

  const security = tileFromContributorSeverity(
    "security",
    "Security",
    findContributor("Smart Contract Risk"),
    "Derived from registered contract verification status and centralization signals in the Risk Analysis.",
    "Blockscout contract verification"
  );

  const liquidity = tileFromContributorSeverity(
    "liquidity",
    "Liquidity",
    findContributor("Liquidity Risk"),
    "Derived from live DexScreener-aggregated liquidity depth in the Risk Analysis.",
    "DexScreener trading data"
  );

  // PR-074 REVIEW #4/#9 — `findContributor("Developer Health")` is itself
  // derived entirely from `commitsLast7d`, which this codebase's fast/batch
  // path never populates (see `buildFastPathDeveloperTile`'s doc comment) —
  // meaning this always came back "unknown" on first paint, and stayed that
  // way forever if GitHub's rate limit later blocked the extended commit/
  // contributor/release calls too. Falls back to a real heuristic computed
  // from the same free `fetchRepo()` fields (stars/forks/pushedAt/releases)
  // instead of leaving the tile "Not Assessed" whenever the richer,
  // commit-based signal isn't available.
  const developerFromRisk = tileFromContributorSeverity(
    "developer",
    "Engineering Health",
    findContributor("Developer Health"),
    "Derived from recent GitHub commit activity in the Risk Analysis.",
    "GitHub repository stats"
  );
  const developer = developerFromRisk.severity === "unknown" ? buildFastPathDeveloperTile(input.github) : developerFromRisk;

  const activeProposals = countActiveProposals(input.governance);
  const confirmedGovernanceType =
    input.governance === null && (input.governanceType === "on-chain" || input.governanceType === "forum" || input.governanceType === "none")
      ? input.governanceType
      : null;
  const governanceDetail =
    activeProposals !== null
      ? `${activeProposals} active proposal${activeProposals === 1 ? "" : "s"} out of ${input.governance?.length ?? 0} tracked on Snapshot.`
      : confirmedGovernanceType === "on-chain"
        ? "This project governs itself through on-chain voting, not Snapshot — not tracked here."
        : confirmedGovernanceType === "forum"
          ? "This project governs itself through forum discussion, not Snapshot — not tracked here."
          : confirmedGovernanceType === "none"
            ? "This project is confirmed to have no governance mechanism."
            : "No Snapshot governance space is configured for this project in the registry.";
  const governance = tileFromContributorSeverity("governance", "Governance", findContributor("Governance Activity"), governanceDetail, "Snapshot governance data");

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
  const grade = computeAiRatingGrade(input.health.score, input.confidence.score);
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

  // Activity — a roll-up of the two tiles above that carry a real recency
  // signal (Engineering Health's commit/push cadence, Market Momentum's
  // price-change window), the same blend pattern `aiRating` above already
  // uses for Health+Confidence. Not a third independent activity model —
  // averages whichever of `developer`/`momentum`'s own already-computed
  // scores are real, and reports "not enough data" only when neither is.
  const activityInputs = [developer.score, momentum.score].filter((score): score is number => score !== null);
  const activity: ScorecardTile =
    activityInputs.length === 0
      ? {
          id: "activity",
          label: "Activity",
          score: null,
          scoreLabel: "Not enough verified data",
          statusLabel: "Not Assessed",
          severity: "unknown",
          detail: "Neither Engineering Health nor Market Momentum has a live signal to blend into an activity read yet.",
          source: "Base Radar Engineering Health + Market Momentum scores",
        }
      : (() => {
          const score = clampScore(activityInputs.reduce((sum, value) => sum + value, 0) / activityInputs.length);
          const severity: ScorecardSeverity = score >= 80 ? "excellent" : score >= 60 ? "strong" : score >= 40 ? "moderate" : "weak";
          return {
            id: "activity",
            label: "Activity",
            score,
            scoreLabel: `${score}/100`,
            statusLabel: SEVERITY_STATUS[severity],
            severity,
            detail: `Blends Engineering Health (${developer.score !== null ? `${developer.score}/100` : "not assessed"}) and Market Momentum (${momentum.score !== null ? `${momentum.score}/100` : "not assessed"}) into one overall activity read.`,
            source: "Base Radar Engineering Health + Market Momentum scores",
          } satisfies ScorecardTile;
        })();

  // Transparency — the same registered-contracts verification ratio the
  // now-removed `ProfileTrustCenter` used to compute from this project's
  // real `Contracts` field, exposed here as its own Scorecard tile instead
  // of being recomputed. Mirrors the `community` tile's own "real ratio,
  // honest gap when nothing to measure" shape.
  const verifiedContractCount = input.contracts.items.filter((contract) => contract.verified === true).length;
  const verifiedContractRatio = input.contracts.count > 0 ? verifiedContractCount / input.contracts.count : null;
  const transparencyScore = verifiedContractRatio !== null ? clampScore(verifiedContractRatio * 100) : null;
  const transparency: ScorecardTile =
    transparencyScore === null
      ? {
          id: "transparency",
          label: "Transparency",
          score: null,
          scoreLabel: "Not enough verified data",
          statusLabel: "Not Assessed",
          severity: "unknown",
          detail: "No contracts are currently registered for this project, so contract-verification transparency can't be assessed.",
          source: "Blockscout contract verification",
        }
      : {
          id: "transparency",
          label: "Transparency",
          score: transparencyScore,
          scoreLabel: `${transparencyScore}/100`,
          statusLabel: transparencyScore >= 70 ? "Transparent" : transparencyScore >= 35 ? "Partial" : "Limited",
          severity: transparencyScore >= 70 ? "excellent" : transparencyScore >= 35 ? "moderate" : "weak",
          detail: `${verifiedContractCount} of ${input.contracts.count} registered contract${input.contracts.count === 1 ? "" : "s"} verified on-chain. Registry listing status: ${VERIFICATION_STATUS_LABEL[input.verificationStatus]}.`,
          source: "Blockscout contract verification",
        };

  // Documentation — the same `docsUrl` presence check the now-removed
  // `ProfileTrustCenter`'s Documentation trust tile used to make, exposed
  // here as its own Scorecard tile. Binary by design: a link either exists
  // or it doesn't, no fabricated completeness gradient for a single real
  // field.
  const documentation: ScorecardTile = input.docsUrl
    ? {
        id: "documentation",
        label: "Documentation",
        score: 100,
        scoreLabel: "100/100",
        statusLabel: "Available",
        severity: "excellent",
        detail: "Technical documentation is linked for this project in the Base Radar registry.",
        source: "Base Radar registry",
      }
    : {
        id: "documentation",
        label: "Documentation",
        score: null,
        scoreLabel: "Not enough verified data",
        statusLabel: "Not Assessed",
        severity: "unknown",
        detail: "No documentation link is currently configured for this project in the registry.",
        source: "Base Radar registry",
      };

  return [security, liquidity, momentum, developer, governance, community, whale, aiRating, activity, transparency, documentation];
}

/**
 * PR-074 REVIEW #4/#9 — an Engineering Health assessment computed entirely
 * from the single `fetchRepo()` response that already determines
 * `github.available` (stars, forks, open issues, last push, latest release)
 * — zero extra GitHub calls. This is what lets Engineering Health/the
 * Scorecard's Developer tile show a real, evidence-backed verdict even when
 * GitHub's rate limit blocks the heavier extended-only endpoints (commit
 * activity, contributors, releases list) that `buildDeveloperEvidenceTile`
 * needs — confirmed live during this review: with GitHub's 60/hr
 * unauthenticated limit exhausted, every project's Developer tile was stuck
 * on "Not Assessed" even though its basic repo stats had already loaded.
 * `pushedAt` (updated on every real push to the default branch) is the one
 * genuinely free substitute for commit recency this response carries —
 * not as precise as a real commit count, but real, live, and free.
 */
export function buildFastPathDeveloperTile(github: GithubIntel): ScorecardTile {
  if (!github.available) {
    return {
      id: "developer",
      label: "Engineering Health",
      score: null,
      scoreLabel: "Not enough verified data",
      statusLabel: "Not Assessed",
      severity: "unknown",
      detail: "No GitHub repository data is currently available for this project.",
      source: "GitHub repository stats",
    };
  }

  let score = 30;
  const parts: string[] = [];

  if (github.pushedAt) {
    const daysSincePush = (Date.now() - Date.parse(github.pushedAt)) / 86_400_000;
    if (daysSincePush <= 30) {
      score += 30;
      parts.push("pushed to within the last 30 days");
    } else if (daysSincePush <= 90) {
      score += 18;
      parts.push("pushed to within the last 90 days");
    } else if (daysSincePush <= 365) {
      score += 5;
      parts.push(`last pushed ${Math.round(daysSincePush / 30)} months ago`);
    } else {
      parts.push(`no push in over a year (last: ${new Date(github.pushedAt).toISOString().slice(0, 10)})`);
    }
  }

  if (github.latestReleasePublishedAt) {
    const daysSinceRelease = (Date.now() - Date.parse(github.latestReleasePublishedAt)) / 86_400_000;
    if (daysSinceRelease <= 180) {
      score += 15;
      parts.push("shipped a tagged release within the last 6 months");
    } else {
      score += 5;
      parts.push("has tagged releases, though none recently");
    }
  }

  if (github.stars !== null && github.stars > 0) {
    if (github.stars >= 1000) {
      score += 20;
      parts.push(`${github.stars.toLocaleString()} GitHub stars`);
    } else if (github.stars >= 100) {
      score += 12;
      parts.push(`${github.stars.toLocaleString()} GitHub stars`);
    } else {
      score += 4;
      parts.push(`${github.stars.toLocaleString()} GitHub stars`);
    }
  }

  // A real, bounded backlog-health proxy (open issues relative to fork
  // count) — never claimed as precise as a maintainer-triaged number, just
  // a genuine signal this same response already carries for free.
  if (github.openIssues !== null && github.forks !== null && github.forks > 0 && github.openIssues / github.forks < 0.5) {
    score += 5;
  }

  score = clampScore(score);
  const severity: ScorecardSeverity = score >= 80 ? "excellent" : score >= 60 ? "strong" : score >= 40 ? "moderate" : "weak";

  return {
    id: "developer",
    label: "Engineering Health",
    score,
    scoreLabel: `${score}/100`,
    statusLabel: SEVERITY_STATUS[severity],
    severity,
    detail:
      parts.length > 0
        ? `Based on real repository signals: ${parts.join(", ")}. Commit-frequency and contributor-count evidence refines this further once GitHub's extended data resolves.`
        : "Repository is linked but carries no strong recency or traction signal yet.",
    source: "GitHub repository stats (stars, forks, releases, last push)",
  };
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
