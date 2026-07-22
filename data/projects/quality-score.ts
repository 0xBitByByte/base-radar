import type { Project, ProjectQualityFactors, ProjectQualityScore } from "@/data/projects/types";

/**
 * PR-037 — Relative weight of each quality factor in the composite score.
 * Sums to 1. See docs/PROJECT_REGISTRY.md "Quality Score" for the
 * reasoning behind these weights.
 */
export const QUALITY_SCORE_WEIGHTS: Record<keyof ProjectQualityFactors, number> = {
  metadataCompleteness: 0.1,
  security: 0.2,
  activity: 0.15,
  liquidity: 0.15,
  development: 0.15,
  community: 0.1,
  documentation: 0.15,
};

/**
 * The one quality factor computable from the static registry alone today.
 * Every other factor (security, activity, liquidity, development,
 * community) requires live data from the provider/intelligence layer and
 * is deliberately out of scope here — see docs/PROJECT_REGISTRY.md
 * "Quality Score" and "Explicitly out of scope for this layer".
 */
export function computeMetadataCompletenessFactor(project: Project): number {
  const checks: boolean[] = [
    Boolean(project.logoUrl),
    Boolean(project.github),
    Object.keys(project.social).length > 0,
    project.contracts.length > 0,
    Object.values(project.providerIds).some((value) => value !== undefined),
    Boolean(project.governance),
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

/**
 * Composes a full `ProjectQualityScore` from every factor. This function
 * only performs the weighted average — the five factors it doesn't
 * compute itself (everything but `metadataCompleteness`) must be supplied
 * by a future live-data pass; it never invents a missing factor's value.
 */
export function computeQualityScore(factors: ProjectQualityFactors, now: Date = new Date()): ProjectQualityScore {
  const total = (Object.keys(QUALITY_SCORE_WEIGHTS) as Array<keyof ProjectQualityFactors>).reduce(
    (sum, key) => sum + factors[key] * QUALITY_SCORE_WEIGHTS[key],
    0
  );
  return {
    total: Math.round(total),
    factors,
    computedAt: now.toISOString(),
  };
}
