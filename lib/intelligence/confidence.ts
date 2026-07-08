/**
 * Computes the `Confidence` section: how much this engine trusts the
 * `ProjectIntelligence` record it just assembled. Pure function — takes
 * the registry's own verification status plus the `ProjectSources` bundle
 * `sources.ts` produced, no I/O.
 */

import type { Project } from "@/data/projects/types";
import type { VerificationStatus } from "@/data/projects/enums";
import { clampScore, formatSigned } from "@/lib/intelligence/helpers";
import { sourceKeys } from "@/lib/intelligence/sources";
import type { Confidence, ConfidenceLevel, ProjectSources } from "@/lib/intelligence/types";

const NEUTRAL_BASELINE = 50;

// The registry's own editorial trust signal dominates the score — a
// "flagged" project should never read as trustworthy regardless of how
// much live data happens to be available for it.
const VERIFICATION_POINTS: Record<VerificationStatus, number> = {
  verified: 40,
  community: 20,
  unverified: 5,
  flagged: -60,
};

const LIVE_SOURCE_POINTS = 10;
const FUZZY_MATCH_MULTIPLIER = 0.5;

const SOURCE_LABELS: Record<keyof ProjectSources, string> = {
  market: "CoinGecko market data",
  trading: "DexScreener trading data",
  tvl: "DefiLlama TVL data",
  network: "Base network status",
  verifiedContract: "Blockscout contract verification",
  github: "GitHub repository stats",
};

export function computeConfidence(project: Project, sources: ProjectSources): Confidence {
  const factors: string[] = [];
  let score = NEUTRAL_BASELINE;

  const verificationPoints = VERIFICATION_POINTS[project.verification.status];
  score += verificationPoints;
  factors.push(`Registry verification: ${project.verification.status} (${formatSigned(verificationPoints)})`);

  for (const key of sourceKeys(sources)) {
    const slice = sources[key];
    if (slice.status !== "live") continue;

    const isFuzzy = slice.matchQuality === "fuzzy";
    const points = isFuzzy ? Math.round(LIVE_SOURCE_POINTS * FUZZY_MATCH_MULTIPLIER) : LIVE_SOURCE_POINTS;
    score += points;
    factors.push(
      `${SOURCE_LABELS[key]}: live${isFuzzy ? " (approximate match)" : ""} (${formatSigned(points)})`
    );
  }

  const clamped = clampScore(score);
  const level: ConfidenceLevel = clamped >= 70 ? "high" : clamped >= 40 ? "medium" : "low";

  return { score: clamped, level, factors };
}
