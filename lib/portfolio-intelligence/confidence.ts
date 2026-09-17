/**
 * V4-INTELLIGENCE-002 — Confidence Score: NOT another health score. This
 * answers a different question — "how much of this analysis can Base Radar
 * actually back with real data?" — from three genuinely independent data-
 * completeness axes, never from portfolio value or asset quality:
 *
 *   - Pricing coverage    — % of assets with a known price (also covers
 *                           "unknown assets": an unpriced asset IS the same
 *                           fact as missing coverage, so it isn't scored
 *                           twice under a separate label — the same
 *                           double-counting discipline `health.ts` already
 *                           applies to its own five contributions).
 *   - Verified coverage   — reuses `health.ts`'s own `verifiedSharePct`
 *                           rather than redefining "what counts as trusted."
 *   - Classification cov. — `allocation.ts`'s `classificationCoverage`: how
 *                           much of known value the engine can categorize
 *                           at all (stablecoin/native/known protocol vs. a
 *                           generic, unrecognized ERC-20).
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import { classificationCoverage } from "@/lib/portfolio-intelligence/allocation";
import { verifiedSharePct } from "@/lib/portfolio-intelligence/health";
import { pricingCoverage } from "@/lib/portfolio-intelligence/score";
import type { ConfidenceLevel } from "@/lib/portfolio-intelligence/types";

const PRICING_WEIGHT = 0.4;
const VERIFIED_WEIGHT = 0.3;
const CLASSIFICATION_WEIGHT = 0.3;

const HIGH_THRESHOLD = 75;
const MEDIUM_THRESHOLD = 45;

export function confidenceLevelFromScore(score: number): ConfidenceLevel {
  if (score >= HIGH_THRESHOLD) return "High";
  if (score >= MEDIUM_THRESHOLD) return "Medium";
  return "Low";
}

export function buildConfidence(assets: HoldingAsset[], totalUsdValue: number): { confidenceScore: number; confidenceLevel: ConfidenceLevel } {
  const coverage = pricingCoverage(assets);
  const verified = verifiedSharePct(assets, totalUsdValue);
  const classified = classificationCoverage(assets, totalUsdValue);

  const confidenceScore = Math.max(0, Math.min(100, Math.round(coverage * PRICING_WEIGHT + verified * VERIFIED_WEIGHT + classified * CLASSIFICATION_WEIGHT)));

  return { confidenceScore, confidenceLevel: confidenceLevelFromScore(confidenceScore) };
}
