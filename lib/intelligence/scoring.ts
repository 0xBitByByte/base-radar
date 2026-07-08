/**
 * Computes the `Health` section: a composite, transparently-derived score
 * summarizing how "alive" a project looks right now. Not a third-party
 * metric — a heuristic blend of whatever live signals this engine
 * actually has for the project, in the same spirit as the dashboard's
 * existing `getProjectSpotlight` composite score
 * (`lib/data/aggregate.ts`), generalized to work for any registry entry.
 *
 * Pure function — takes already-merged sections, no I/O.
 */

import type { Project } from "@/data/projects/types";
import { clampScore, formatSigned } from "@/lib/intelligence/helpers";
import type { GithubIntel, Health, HealthLabel, Market, Trading, Tvl } from "@/lib/intelligence/types";

const NEUTRAL_BASELINE = 50;
const FLAGGED_SCORE = 5;

type HealthInputs = {
  market: Market;
  trading: Trading;
  tvl: Tvl;
  github: GithubIntel;
};

export function computeHealth(project: Project, sections: HealthInputs): Health {
  // A flagged registry entry should never present as healthy, regardless
  // of what its market/TVL/GitHub metrics look like.
  if (project.verification.status === "flagged") {
    return {
      score: FLAGGED_SCORE,
      label: "poor",
      factors: ["Registry has flagged this project — health capped regardless of other signals"],
    };
  }

  const factors: string[] = [];
  let score = NEUTRAL_BASELINE;
  let signalCount = 0;

  if (sections.tvl.available && sections.tvl.tvlUsd) {
    signalCount++;
    const points = clampScore(Math.log10(Math.max(sections.tvl.tvlUsd, 10)) * 8, 0, 30);
    score += points;
    factors.push(`TVL signal (${formatSigned(points)})`);
  }

  if (sections.github.available && sections.github.stars !== null) {
    signalCount++;
    const points = clampScore(Math.log10(Math.max(sections.github.stars, 10)) * 10, 0, 25);
    score += points;
    factors.push(`GitHub activity signal (${formatSigned(points)})`);
  }

  if (sections.trading.available && sections.trading.liquidityUsd) {
    signalCount++;
    const points = clampScore(Math.log10(Math.max(sections.trading.liquidityUsd, 10)) * 6, 0, 20);
    score += points;
    factors.push(`Trading liquidity signal (${formatSigned(points)})`);
  }

  if (sections.market.available && sections.market.changePct24h !== null) {
    signalCount++;
    const momentum = clampScore(sections.market.changePct24h, -10, 10);
    score += momentum;
    factors.push(`24h price momentum (${formatSigned(momentum)})`);
  }

  if (signalCount === 0) {
    return { score: 0, label: "unknown", factors: ["No live signals available to assess health"] };
  }

  const clamped = clampScore(score);
  const label: HealthLabel = clamped >= 80 ? "excellent" : clamped >= 60 ? "good" : clamped >= 40 ? "fair" : "poor";

  return { score: clamped, label, factors };
}
