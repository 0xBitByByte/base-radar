/**
 * V3-WALLET-003 — domain types for the wallet-holdings intelligence layer.
 * Named `lib/portfolio-intelligence/` per the brief, deliberately distinct
 * from THREE other, already-real "intelligence" systems this codebase
 * already has, none of which take a connected wallet's actual holdings as
 * input (confirmed via this feature's own required investigation pass):
 *
 * - `lib/portfolio/` — watchlist analytics (`PersonalWatchlist` +
 *   `IntelligenceAlert[]` in, `PortfolioIntelligence`/`PortfolioHealth`
 *   out). Same "Portfolio" word, entirely different subject (projects a
 *   user watches, not assets a wallet holds).
 * - `lib/alerts/intelligence/` — the Alert Engine, turns provider `Alert[]`
 *   into per-project `IntelligenceAlert`s (narrative/score/confidence).
 * - `lib/intelligence/` + `lib/intelligence-engine/` — single-project
 *   Health Scorecard / Risk Analysis, built from merged provider market
 *   data, not a wallet's asset list.
 *
 * This module's only real input is `Holdings`/`HoldingAsset[]` from
 * `lib/holdings/types.ts` (V3-WALLET-002) — never balances, prices, or any
 * other network call fetched again here. Every function in this directory
 * is a pure function of that input.
 */

import type { HoldingAsset } from "@/lib/holdings/types";

/** 4-tier risk semantic, matching the existing app-wide convention (`SeverityBadge`'s info/success/warning/critical, `RiskLevel` in `lib/intelligence-engine/`) — reused as a shape, not imported, since this module's actual risk factors are wallet-specific, not alert- or project-specific. */
export type RiskLevel = "low" | "moderate" | "elevated" | "high";

export type ScoredHolding = {
  symbol: string;
  name: string;
  address: string | null;
  usdValue: number;
  allocationPct: number;
};

export type ConcentrationRisk = {
  level: RiskLevel;
  /** The largest single priced holding's share of total known value, 0-100. */
  topHoldingPct: number;
  description: string;
};

export type PortfolioInsightTone = "positive" | "neutral" | "attention";

/** One opportunity/observation card — always backed by a real, already-computed number from this wallet's own holdings, never a fabricated market claim (no APR/yield/governance/TVL). */
export type PortfolioInsight = {
  id: string;
  title: string;
  description: string;
  tone: PortfolioInsightTone;
};

export type PortfolioWarning = {
  id: string;
  title: string;
  description: string;
  severity: Exclude<RiskLevel, "low">;
};

/** V4-INTELLIGENCE-001 */
export type ScoreContributionDirection = "positive" | "negative";

/**
 * One named, deterministic input to `healthScore` — the itemized
 * counterpart to the old opaque blended formula. `points` is always
 * non-negative; `direction` carries the sign. See `health.ts` for exactly
 * which five contributions exist and why those five (not more) avoid
 * double-counting the same underlying signal twice.
 */
export type ScoreContribution = {
  id: string;
  label: string;
  points: number;
  direction: ScoreContributionDirection;
  /** The real number/condition that produced `points` — e.g. "42.0% of known value is in verified contracts or native ETH." Never generic boilerplate. */
  explanation: string;
};

/** V4-INTELLIGENCE-001 */
export type DiversificationRating = "Excellent" | "Good" | "Fair" | "Poor";

/**
 * Verification/protocol/diversification-rating read on the same holdings —
 * distinct from `PortfolioIntelligence`'s own top-level `pricingCoverage`/
 * `unknownAssetCount` (data completeness), this is about contract trust and
 * ecosystem breadth. See `quality.ts`.
 */
export type PortfolioQuality = {
  /** Of ERC-20 holdings only — verification doesn't apply to native ETH. */
  verifiedAssetCount: number;
  unverifiedAssetCount: number;
  /** `verified: null` — never checked, not "checked and found unverified." */
  notCheckedAssetCount: number;
  /** Count of distinct known Base-ecosystem protocols represented among priced holdings — see `allocation.ts`'s `protocolConcentration`. */
  protocolsDetected: number;
  diversificationRating: DiversificationRating;
  /** The real score/threshold that produced `diversificationRating` — e.g. "Diversification score is 75/100 (>= 60), which this app rates Good." */
  diversificationRatingReason: string;
};

/**
 * Category-level allocation splits (of known/priced value, except
 * `unknownAssetPct` — see its own doc) plus the top holdings by value.
 */
export type AllocationBreakdown = {
  /** Up to 5, by USD value descending. */
  topHoldings: ScoredHolding[];
  /** % of known value in recognized stablecoins — same figure as `stablecoinExposure`, included here so the whole allocation split lives in one place. */
  stablecoinPct: number;
  /** % of known value in native ETH. */
  ethPct: number;
  /** % of known value in everything else priced (non-native, non-stablecoin ERC-20s) — same figure as `defiExposure`. */
  otherPct: number;
  /**
   * % of asset COUNT (not USD value) that's unpriced — an unpriced asset
   * has no known value to take a share of, so this is deliberately not
   * part of the `stablecoinPct + ethPct + otherPct` split (which sums to
   * ~100% of KNOWN value only).
   */
  unknownAssetPct: number;
  /** The largest single known protocol's share of known value, 0-100 — see `allocation.ts`'s `protocolConcentration`. */
  protocolConcentrationPct: number;
  largestProtocolName: string | null;
};

/** V4-INTELLIGENCE-001 */
export type PortfolioRecommendationPriority = "high" | "medium" | "low";

/**
 * Structured recommendation — replaces the old plain `string`. `explanation`
 * is the actionable "what," `reason` is the data-driven "why" (the exact
 * number/condition that caused this recommendation to exist), matching this
 * phase's explicit "every recommendation should explain what caused it"
 * requirement.
 */
export type PortfolioRecommendation = {
  id: string;
  title: string;
  explanation: string;
  reason: string;
  priority: PortfolioRecommendationPriority;
};

/** V4-INTELLIGENCE-002 */
export type ScoreContributorImportance = "high" | "medium" | "low";

/**
 * A presentation-layer relabeling of an already-computed signal — a
 * `ScoreContribution` (from `healthBreakdown`), `PortfolioWarning`, or
 * `PortfolioInsight` — never a new calculation. See `contributors.ts` for
 * exactly how `positiveContributors`/`negativeContributors` are assembled
 * and deduplicated against each other.
 */
export type ScoreContributor = {
  id: string;
  title: string;
  description: string;
  importance: ScoreContributorImportance;
  /** The real number/condition behind this contributor — same text as `description` today, kept as its own field since a UI may want to show them differently later (e.g. description as the headline, reason as a tooltip). */
  reason: string;
};

/** V4-INTELLIGENCE-002 */
export type ConfidenceLevel = "High" | "Medium" | "Low";

/**
 * V4-INTELLIGENCE-002 — one 10-value closed set. Rule-based only (see
 * `fingerprint.ts`'s fixed, ordered threshold chain) — never inferred,
 * guessed, or produced by a model. `Unclassified` is the one honest
 * addition beyond this phase's own example list, reserved for a wallet
 * with no priced holdings to classify at all — every other label requires
 * at least one real signal to have fired.
 */
export type PortfolioFingerprint =
  | "Conservative"
  | "Balanced"
  | "Growth"
  | "Aggressive"
  | "Stablecoin Heavy"
  | "DeFi Native"
  | "Experimental"
  | "Large Cap Focused"
  | "Concentrated"
  | "Mixed"
  | "Unclassified";

export type PortfolioIntelligence = {
  /** 0-100, a blended read of diversification + inverse risk + pricing coverage. See `score.ts` for the exact formula. */
  overallScore: number;
  /** 0-100, higher = riskier. See `risk.ts`. */
  riskScore: number;
  /** 0-100, higher = more evenly spread across assets (Herfindahl-based). See `diversification.ts`. */
  diversificationScore: number;
  /** 0-100, a blend of diversification, inverse risk, and pricing coverage — distinct from `overallScore` only in weighting; see `score.ts`. */
  healthScore: number;
  /**
   * V3-WALLET-004 — % of assets (by count) with a real price, 0-100. Was
   * already computed internally by `score.ts`'s `pricingCoverage()` to feed
   * `healthScore`, just not previously exposed as its own field — Wallet
   * Automation needs the raw number for its "pricing coverage dropped below
   * 80%" rule and must not recompute it (see that module's own doc comment
   * on why it only ever reads `PortfolioIntelligence`'s output).
   */
  pricingCoverage: number;
  /**
   * V3-WALLET-004 — count of held assets with `usdPrice: null`, i.e. exactly
   * `assets.filter(a => a.usdValue === null).length`. Same rationale as
   * `pricingCoverage` above: already implicitly known from `warnings`'
   * "unpriced-assets" entry, now exposed as a plain number instead of a
   * value wallet-automation would otherwise have to parse out of prose.
   */
  unknownAssetCount: number;
  /** V3-WALLET-004 — passed through from this engine's own `totalUsdValue` input, unchanged. Exposed so downstream consumers (Wallet Automation's `PortfolioValueChanged` event) never need to re-read raw holdings to get a number this engine already had. */
  totalUsdValue: number;
  largestHolding: ScoredHolding | null;
  /**
   * The largest holding this engine can honestly attribute to a known
   * Base-ecosystem project/protocol, via a small static symbol map (the
   * same "deterministically classifiable" allowance the brief itself
   * grants for asset tags) — never a fetched or guessed attribution. `null`
   * when no held token matches the static list, which is the honest,
   * expected outcome for most wallets, not a failure.
   */
  largestProtocol: ScoredHolding | null;
  /** % of total known USD value held in recognized stablecoins, 0-100. */
  stablecoinExposure: number;
  /** % of total known USD value held in non-native, non-stablecoin ERC-20s — an approximate "other token" exposure reading, not a claim about any specific protocol's TVL or yield. */
  defiExposure: number;
  concentrationRisk: ConcentrationRisk;
  /**
   * V4-INTELLIGENCE-001 — structured, not `string[]` anymore. Every
   * recommendation now carries its own `reason` (the real number/condition
   * that caused it) and `priority`, so a UI can answer "what caused this
   * recommendation?" from data instead of parsing prose. See
   * `recommendations.ts`.
   */
  recommendations: PortfolioRecommendation[];
  warnings: PortfolioWarning[];
  opportunities: PortfolioInsight[];
  /** One deterministic, template-built paragraph — never an LLM call. */
  summary: string;
  /** Passed through from `Holdings.fetchedAt` — this engine never stamps its own clock. */
  lastUpdated: string;
  /**
   * V4-INTELLIGENCE-001 — the itemized breakdown `healthScore` is the sum
   * of (clipped to 0-100). Answers "why is my Health Score 82?" from
   * structured data rather than a black-box blend. See `health.ts`.
   */
  healthBreakdown: ScoreContribution[];
  /** V4-INTELLIGENCE-001 — verification/protocol-detection/diversification-rating summary. See `quality.ts`. */
  quality: PortfolioQuality;
  /** V4-INTELLIGENCE-001 — top holdings and category-level % splits. See `allocation.ts`'s `buildAllocationBreakdown`. */
  allocationBreakdown: AllocationBreakdown;
  /** V4-INTELLIGENCE-002 — "why is my score X?" as a ready-to-render list, most-important-first within each array. Sourced from `healthBreakdown`/`warnings`/`opportunities` — see `contributors.ts`. */
  positiveContributors: ScoreContributor[];
  negativeContributors: ScoreContributor[];
  /**
   * V4-INTELLIGENCE-002 — NOT another health score. This measures how much
   * of this analysis the engine could actually back with real data (pricing
   * coverage, verified-contract coverage, classification coverage) — never
   * portfolio value, never asset quality. See `confidence.ts`.
   */
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  /** V4-INTELLIGENCE-002 — one rule-based label from a fixed, deterministic threshold chain. See `fingerprint.ts`. */
  fingerprint: PortfolioFingerprint;
  /** The real rule/thresholds that produced `fingerprint` — e.g. "Stablecoin exposure is 65.0% (>= 60%)." */
  fingerprintReason: string;
  /** V4-INTELLIGENCE-002 — health, largest holding, diversification, main risk, and top recommendation in one paragraph, composed entirely from already-built fields on this same object (never re-derived from raw assets). See `executiveSummary.ts`. */
  executiveSummary: string;
};

/** Internal shared shape most `lib/portfolio-intelligence/*` functions take — never re-derives allocation/pricing, only reads what `lib/holdings/normalize.ts` already computed. */
export type IntelligenceInput = {
  assets: HoldingAsset[];
  totalUsdValue: number;
  lastUpdated: string;
};
