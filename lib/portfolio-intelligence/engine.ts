/**
 * V3-WALLET-003 — the one public entry point every consumer (dashboard
 * widget, `/dashboard/wallet` page, any future caller) goes through.
 * `buildPortfolioIntelligence` is a pure function of already-normalized
 * holdings: no fetch, no cache, no React import, no wallet/network access —
 * everything it needs is already sitting in `Holdings`/`HoldingAsset[]`
 * from `usePortfolio()` (V3-WALLET-002). See `types.ts` for why this lives
 * in its own directory rather than `lib/portfolio/` or `lib/intelligence/`.
 *
 * V4-INTELLIGENCE-001 — every underlying number (`diversification`,
 * `coverage`, `protocolConcentration`, etc.) is computed exactly once here
 * and threaded into whichever of `health.ts`/`quality.ts`/`allocation.ts`/
 * `risk.ts`/`recommendations.ts`/`opportunities.ts` needs it, rather than
 * each module re-deriving it independently — see the Performance Review in
 * that phase's own report for the full call-count accounting.
 *
 * V4-INTELLIGENCE-002 — adds explainability/extensibility outputs
 * (`positiveContributors`/`negativeContributors`, `confidenceScore`/
 * `confidenceLevel`, `fingerprint`, `executiveSummary`), all composed from
 * fields this function already computed for the phase above — none of them
 * re-read raw `assets` a second time except `buildConfidence` itself (see
 * that phase's Performance Review for why).
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import {
  buildAllocationBreakdown,
  classificationCoverage,
  defiExposure,
  largestHolding,
  largestProtocol,
  stablecoinExposure,
} from "@/lib/portfolio-intelligence/allocation";
import { buildConfidence } from "@/lib/portfolio-intelligence/confidence";
import { buildScoreContributors } from "@/lib/portfolio-intelligence/contributors";
import { diversificationScore } from "@/lib/portfolio-intelligence/diversification";
import { buildExecutiveSummary } from "@/lib/portfolio-intelligence/executiveSummary";
import { buildPortfolioFingerprint } from "@/lib/portfolio-intelligence/fingerprint";
import { buildHealthBreakdown, healthScoreFromBreakdown } from "@/lib/portfolio-intelligence/health";
import { buildOpportunities } from "@/lib/portfolio-intelligence/opportunities";
import { buildPortfolioQuality } from "@/lib/portfolio-intelligence/quality";
import { buildRecommendations } from "@/lib/portfolio-intelligence/recommendations";
import { buildWarnings, concentrationRisk, riskScore } from "@/lib/portfolio-intelligence/risk";
import { overallScore, pricingCoverage } from "@/lib/portfolio-intelligence/score";
import { buildSummary } from "@/lib/portfolio-intelligence/summary";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";

export function buildPortfolioIntelligence(assets: HoldingAsset[], totalUsdValue: number, lastUpdated: string): PortfolioIntelligence {
  const diversification = diversificationScore(assets);
  const risk = riskScore(assets, totalUsdValue);
  const coverage = pricingCoverage(assets);

  // V4-INTELLIGENCE-001 — `health` is now the sum of `healthBreakdown`'s
  // own itemized contributions (see `health.ts`), which already resolves to
  // 0 on its own for a zero-coverage wallet (the "Unknown Assets" deduction
  // is the only nonzero term, and it clips at the floor) — no separate
  // `coverage === 0 ? 0 : ...` special case needed for `health` anymore,
  // unlike the old blended formula this replaces.
  const healthBreakdown = buildHealthBreakdown(assets, totalUsdValue);
  const health = healthScoreFromBreakdown(healthBreakdown);

  // `overallScore` still needs its own zero-coverage guard: `risk` reads 0
  // for a wallet with nothing priced (every risk condition it checks is
  // gated on real priced data existing), which is a fabricated "confirmed
  // safe" reading indistinguishable from genuine low risk — the same
  // "unknown, not zero" honesty this file has always applied here.
  const overall = coverage === 0 ? 0 : overallScore(diversification, risk, health);
  const unknownAssetCount = assets.filter((asset) => asset.usdValue === null).length;

  const quality = buildPortfolioQuality(assets, totalUsdValue);
  const allocationBreakdown = buildAllocationBreakdown(assets, totalUsdValue);
  const warnings = buildWarnings(assets, totalUsdValue);
  const recommendations = buildRecommendations(assets, totalUsdValue, diversification);
  const opportunities = buildOpportunities(assets, totalUsdValue, diversification);
  const concentration = concentrationRisk(assets);
  const topHolding = largestHolding(assets);

  const { positiveContributors, negativeContributors } = buildScoreContributors(healthBreakdown, warnings, opportunities);
  const { confidenceScore, confidenceLevel } = buildConfidence(assets, totalUsdValue);
  const { fingerprint, reason: fingerprintReason } = buildPortfolioFingerprint({
    pricedCount: assets.filter((asset) => asset.usdValue !== null).length,
    stablecoinPct: allocationBreakdown.stablecoinPct,
    ethPct: allocationBreakdown.ethPct,
    otherPct: allocationBreakdown.otherPct,
    topHoldingPct: concentration.topHoldingPct,
    concentrationLevel: concentration.level,
    diversificationScoreValue: diversification,
    protocolConcentrationPct: allocationBreakdown.protocolConcentrationPct,
    classificationCoveragePct: classificationCoverage(assets, totalUsdValue),
    riskScoreValue: risk,
  });
  const executiveSummary = buildExecutiveSummary({
    healthScore: health,
    largestHolding: topHolding,
    diversificationScore: diversification,
    diversificationRating: quality.diversificationRating,
    topWarning: warnings[0] ?? null,
    topRecommendation: recommendations[0] ?? null,
  });

  return {
    overallScore: overall,
    riskScore: risk,
    diversificationScore: diversification,
    healthScore: health,
    healthBreakdown,
    pricingCoverage: coverage,
    unknownAssetCount,
    totalUsdValue,
    largestHolding: topHolding,
    largestProtocol: largestProtocol(assets),
    stablecoinExposure: stablecoinExposure(assets, totalUsdValue),
    defiExposure: defiExposure(assets, totalUsdValue),
    concentrationRisk: concentration,
    quality,
    allocationBreakdown,
    recommendations,
    warnings,
    opportunities,
    summary: buildSummary(assets, totalUsdValue, diversification),
    lastUpdated,
    positiveContributors,
    negativeContributors,
    confidenceScore,
    confidenceLevel,
    fingerprint,
    fingerprintReason,
    executiveSummary,
  };
}

export type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
