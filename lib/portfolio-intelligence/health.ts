/**
 * V4-INTELLIGENCE-001 — the itemized Health Score breakdown. Replaces the
 * old opaque blend (`healthScore = diversification*0.4 + (100-risk)*0.4 +
 * pricing*0.2`, removed from `score.ts`) with five named, independently-
 * computed contributions that sum (then clip to 0-100) to the same
 * headline number — "why is my Health Score 82?" is now answerable by
 * reading this array, not by reverse-engineering a formula.
 *
 * Exactly five contributions, chosen specifically to avoid double-counting
 * the same underlying signal twice (the investigation this phase's own
 * brief asked for, item 4):
 *
 *   + Diversification    — asset-level spread (Herfindahl, `diversification.ts`)
 *   + Stablecoin Exposure — asset-CLASS mix (do you hold any real cushion)
 *   + Verified Assets     — contract TRUST (native ETH + Blockscout-verified ERC-20s)
 *   − Concentration Risk  — a targeted flag for the SPECIFIC dangerous case
 *                           (>=50% in one asset), not a second continuous
 *                           re-statement of the same Herfindahl curve
 *                           Diversification already scores across the whole
 *                           range — see the field-level comment below for
 *                           why this doesn't just double-pay concentration
 *   − Unknown Assets      — data completeness (`pricingCoverage`'s inverse;
 *                           deliberately the ONLY place pricing coverage
 *                           feeds health, since a separate "+Pricing
 *                           Coverage" line would just be this same fact
 *                           stated twice with the sign flipped)
 *
 * Positive ceiling is calibrated to 100 (50+25+25) so a portfolio with
 * perfect diversification, a real stablecoin cushion, and fully-verified
 * holdings scores near 100 before any deduction — confirmed against the
 * worked examples in `tests/lib/portfolio-intelligence/health.test.ts`.
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import { stablecoinExposure } from "@/lib/portfolio-intelligence/allocation";
import { diversificationScore } from "@/lib/portfolio-intelligence/diversification";
import { concentrationRisk } from "@/lib/portfolio-intelligence/risk";
import { pricingCoverage } from "@/lib/portfolio-intelligence/score";
import type { ScoreContribution } from "@/lib/portfolio-intelligence/types";

/** Full credit at this stablecoin %, or higher — a small real cushion earns the full bonus; more than that gives no additional health credit (this module scores balance, not maximal capital preservation). */
const STABLECOIN_FULL_CREDIT_PCT = 25;

/** Exported (V4-INTELLIGENCE-002) — `confidence.ts` reuses this exact computation for its own "verified asset coverage" axis rather than redefining "what counts as trusted" a second time. */
export function verifiedSharePct(assets: HoldingAsset[], totalUsdValue: number): number {
  if (totalUsdValue <= 0) return 0;
  // Native ETH has no contract to verify at all — structurally it can never
  // be a malicious/unverified token, so it counts toward "trusted" value on
  // the same honest basis `HoldingAsset`'s own doc comment already applies
  // (the concept simply doesn't apply to it, which is not the same as
  // "unknown"). An ERC-20 only counts when Blockscout has explicitly
  // confirmed it (`verified === true`) — `null` (not checked) earns nothing,
  // same "never fabricate trust for the merely unknown" rule `risk.ts`
  // already applies when scoring the negative case.
  const trustedValue = assets
    .filter((asset) => (asset.tokenType === "native" || asset.verified === true) && asset.usdValue !== null)
    .reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0);
  return Math.round((trustedValue / totalUsdValue) * 1000) / 10;
}

export function buildHealthBreakdown(assets: HoldingAsset[], totalUsdValue: number): ScoreContribution[] {
  const diversification = diversificationScore(assets);
  const coverage = pricingCoverage(assets);
  const stableExposure = stablecoinExposure(assets, totalUsdValue);
  const trustedPct = verifiedSharePct(assets, totalUsdValue);
  const { level, topHoldingPct } = concentrationRisk(assets);

  const diversificationPoints = Math.round((diversification / 100) * 50);
  const stablecoinPoints = Math.round((Math.min(stableExposure, STABLECOIN_FULL_CREDIT_PCT) / STABLECOIN_FULL_CREDIT_PCT) * 25);
  const verifiedPoints = Math.round((trustedPct / 100) * 25);

  // Deliberately only the two most severe tiers deduct — `diversification`
  // above already scores the full concentration range continuously via
  // Herfindahl; a deduction that also scaled continuously across every tier
  // would be paying the same fact twice under two labels. This is reserved
  // for flagging the specific high-severity case as an EXTRA signal, not a
  // restatement of the same curve.
  const concentrationPoints = level === "high" ? 15 : level === "elevated" ? 5 : 0;
  const unknownPoints = Math.round(((100 - coverage) / 100) * 30);

  return [
    {
      id: "diversification",
      label: "Diversification",
      points: diversificationPoints,
      direction: "positive",
      explanation: `Diversification score is ${diversification}/100 — how evenly your known value is spread across assets.`,
    },
    {
      id: "stablecoin-exposure",
      label: "Stablecoin Exposure",
      points: stablecoinPoints,
      direction: "positive",
      explanation:
        stableExposure > 0
          ? `${stableExposure.toFixed(1)}% of known value is in stablecoins.`
          : "None of your known holdings are stablecoins.",
    },
    {
      id: "verified-assets",
      label: "Verified Assets",
      points: verifiedPoints,
      direction: "positive",
      explanation: `${trustedPct.toFixed(1)}% of known value is native ETH or a Blockscout-verified contract.`,
    },
    {
      id: "concentration-risk",
      label: "Concentration Risk",
      points: concentrationPoints,
      direction: "negative",
      explanation:
        level === "high" || level === "elevated"
          ? `Your largest position is ${topHoldingPct.toFixed(1)}% of known value — a ${level} concentration.`
          : "No single position is concentrated enough to flag on its own.",
    },
    {
      id: "unknown-assets",
      label: "Unknown Assets",
      points: unknownPoints,
      direction: "negative",
      explanation: coverage < 100 ? `${(100 - coverage).toFixed(0)}% of your holdings (by count) couldn't be priced.` : "Every held asset has a known price.",
    },
  ];
}

/** Sum of `points` (positive minus negative), clipped to 0-100 — the one place `healthScore`'s headline number is derived from its own breakdown, so the two can never silently disagree. */
export function healthScoreFromBreakdown(breakdown: ScoreContribution[]): number {
  const sum = breakdown.reduce((total, item) => total + (item.direction === "positive" ? item.points : -item.points), 0);
  return Math.max(0, Math.min(100, Math.round(sum)));
}
