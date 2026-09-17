/**
 * V4-INTELLIGENCE-002 — Portfolio Fingerprint: one deterministic, rule-based
 * label from a fixed, ORDERED threshold chain — first matching rule wins,
 * so exactly one label is ever produced. No AI, no randomness, no guessing.
 *
 * Deliberately takes already-computed numbers, not raw `HoldingAsset[]` —
 * every input here is something `engine.ts` has already built by the time
 * this runs (allocation split, concentration, diversification, protocol
 * concentration, classification coverage, risk score), so this file adds
 * zero new calculation of its own, only a decision tree over existing
 * outputs — and it's directly unit-testable with plain numbers, no fixture
 * wallets required.
 */

import type { PortfolioFingerprint, RiskLevel } from "@/lib/portfolio-intelligence/types";

export type FingerprintInputs = {
  pricedCount: number;
  stablecoinPct: number;
  ethPct: number;
  /** Non-native, non-stablecoin priced value — `defiExposure`/`allocationBreakdown.otherPct`. */
  otherPct: number;
  topHoldingPct: number;
  concentrationLevel: RiskLevel;
  diversificationScoreValue: number;
  protocolConcentrationPct: number;
  classificationCoveragePct: number;
  riskScoreValue: number;
};

const CONCENTRATED_THRESHOLD_PCT = 75;
const STABLECOIN_HEAVY_THRESHOLD_PCT = 60;
const EXPERIMENTAL_MAX_CLASSIFICATION_PCT = 30;
const DEFI_NATIVE_PROTOCOL_THRESHOLD_PCT = 40;
const CONSERVATIVE_STABLECOIN_THRESHOLD_PCT = 25;
const CONSERVATIVE_MAX_RISK = 30;
const GROWTH_AGGRESSIVE_OTHER_THRESHOLD_PCT = 40;
const LARGE_CAP_FOCUSED_ETH_THRESHOLD_PCT = 50;
const LARGE_CAP_FOCUSED_MAX_DIVERSIFICATION = 60;
const BALANCED_MIN_DIVERSIFICATION = 65;

export function buildPortfolioFingerprint(inputs: FingerprintInputs): { fingerprint: PortfolioFingerprint; reason: string } {
  const {
    pricedCount,
    stablecoinPct,
    ethPct,
    otherPct,
    topHoldingPct,
    concentrationLevel,
    diversificationScoreValue,
    protocolConcentrationPct,
    classificationCoveragePct,
    riskScoreValue,
  } = inputs;

  if (pricedCount === 0) {
    return { fingerprint: "Unclassified", reason: "No priced holdings yet — there's nothing real to classify." };
  }

  if (topHoldingPct >= CONCENTRATED_THRESHOLD_PCT) {
    return { fingerprint: "Concentrated", reason: `Your largest position is ${topHoldingPct.toFixed(1)}% of known value (>= ${CONCENTRATED_THRESHOLD_PCT}%).` };
  }

  if (stablecoinPct >= STABLECOIN_HEAVY_THRESHOLD_PCT) {
    return { fingerprint: "Stablecoin Heavy", reason: `Stablecoin exposure is ${stablecoinPct.toFixed(1)}% of known value (>= ${STABLECOIN_HEAVY_THRESHOLD_PCT}%).` };
  }

  if (classificationCoveragePct < EXPERIMENTAL_MAX_CLASSIFICATION_PCT) {
    return {
      fingerprint: "Experimental",
      reason: `Only ${classificationCoveragePct.toFixed(1)}% of known value is in a recognized stablecoin, ETH, or known protocol (< ${EXPERIMENTAL_MAX_CLASSIFICATION_PCT}%) — mostly unrecognized tokens.`,
    };
  }

  if (protocolConcentrationPct >= DEFI_NATIVE_PROTOCOL_THRESHOLD_PCT) {
    return { fingerprint: "DeFi Native", reason: `${protocolConcentrationPct.toFixed(1)}% of known value is in one recognized Base protocol (>= ${DEFI_NATIVE_PROTOCOL_THRESHOLD_PCT}%).` };
  }

  if (stablecoinPct >= CONSERVATIVE_STABLECOIN_THRESHOLD_PCT && riskScoreValue <= CONSERVATIVE_MAX_RISK) {
    return {
      fingerprint: "Conservative",
      reason: `Stablecoin exposure is ${stablecoinPct.toFixed(1)}% (>= ${CONSERVATIVE_STABLECOIN_THRESHOLD_PCT}%) and risk score is ${riskScoreValue}/100 (<= ${CONSERVATIVE_MAX_RISK}).`,
    };
  }

  if (otherPct >= GROWTH_AGGRESSIVE_OTHER_THRESHOLD_PCT && (concentrationLevel === "high" || concentrationLevel === "elevated")) {
    return {
      fingerprint: "Aggressive",
      reason: `${otherPct.toFixed(1)}% of known value is in non-stablecoin, non-ETH assets (>= ${GROWTH_AGGRESSIVE_OTHER_THRESHOLD_PCT}%), with ${concentrationLevel} concentration.`,
    };
  }

  if (otherPct >= GROWTH_AGGRESSIVE_OTHER_THRESHOLD_PCT && diversificationScoreValue >= BALANCED_MIN_DIVERSIFICATION) {
    return {
      fingerprint: "Growth",
      reason: `${otherPct.toFixed(1)}% of known value is in non-stablecoin, non-ETH assets (>= ${GROWTH_AGGRESSIVE_OTHER_THRESHOLD_PCT}%), spread across holdings (diversification ${diversificationScoreValue}/100).`,
    };
  }

  if (ethPct >= LARGE_CAP_FOCUSED_ETH_THRESHOLD_PCT && diversificationScoreValue < LARGE_CAP_FOCUSED_MAX_DIVERSIFICATION) {
    return {
      fingerprint: "Large Cap Focused",
      reason: `ETH is ${ethPct.toFixed(1)}% of known value (>= ${LARGE_CAP_FOCUSED_ETH_THRESHOLD_PCT}%), with moderate diversification (${diversificationScoreValue}/100).`,
    };
  }

  if (diversificationScoreValue >= BALANCED_MIN_DIVERSIFICATION) {
    return { fingerprint: "Balanced", reason: `Diversification score is ${diversificationScoreValue}/100 (>= ${BALANCED_MIN_DIVERSIFICATION}), with no single category dominating.` };
  }

  return { fingerprint: "Mixed", reason: "No single pattern (stablecoin-heavy, concentrated, protocol-dependent, or well-diversified) clearly dominates this portfolio." };
}
