/**
 * V3-WALLET-003 — risk scoring and warning generation. Mirrors the pattern
 * already established by `lib/intelligence-engine/rule-based-provider.ts`'s
 * `buildRiskAnalysis`/`buildRiskContributors` (found during this feature's
 * required investigation): walk a fixed list of real, checkable conditions,
 * add bounded points and a real reason for each one that actually applies,
 * then threshold the total into a label. Nothing here is copied from that
 * file (it scores project market data, not wallet holdings) — only the
 * shape is reused.
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import { largestHolding, protocolConcentration, stablecoinExposure } from "@/lib/portfolio-intelligence/allocation";
import { pricingCoverage } from "@/lib/portfolio-intelligence/score";
import type { ConcentrationRisk, PortfolioWarning, RiskLevel } from "@/lib/portfolio-intelligence/types";

/** Dust threshold — a priced holding worth less than this is clutter, not a real position. Deliberately small and fixed, not derived from portfolio size. */
const DUST_USD_THRESHOLD = 1;
/** Below this, coverage is materially incomplete — distinct from (and less sensitive than) the "at least one unpriced asset exists" `unpriced-assets` warning below: a 50-asset wallet missing one dust token still has ~98% coverage and shouldn't also trip this one. */
const LOW_PRICING_COVERAGE_THRESHOLD = 70;
/** A single known protocol carrying at least this much known value is a real dependency, not just "your largest holding happens to be a protocol token" (that's already `concentration-*` above). */
const PROTOCOL_DEPENDENCY_THRESHOLD_PCT = 50;

function concentrationLevel(topHoldingPct: number): RiskLevel {
  if (topHoldingPct >= 75) return "high";
  if (topHoldingPct >= 50) return "elevated";
  if (topHoldingPct >= 25) return "moderate";
  return "low";
}

export function concentrationRisk(assets: HoldingAsset[]): ConcentrationRisk {
  const top = largestHolding(assets);
  const topHoldingPct = top?.allocationPct ?? 0;
  const level = concentrationLevel(topHoldingPct);

  const description =
    top === null
      ? "No priced holdings to assess concentration for yet."
      : level === "high"
        ? `${top.symbol} alone makes up ${topHoldingPct.toFixed(1)}% of your known portfolio value — a single-asset move dominates your total.`
        : level === "elevated"
          ? `${top.symbol} makes up ${topHoldingPct.toFixed(1)}% of your known portfolio value — a sizeable concentration in one asset.`
          : level === "moderate"
            ? `${top.symbol} is your largest position at ${topHoldingPct.toFixed(1)}% — a moderate, not extreme, concentration.`
            : `Your largest position (${top.symbol}) is ${topHoldingPct.toFixed(1)}% of known value — no single asset dominates.`;

  return { level, topHoldingPct, description };
}

/**
 * 0-100, higher = riskier. Additive, capped model over real, checkable
 * conditions only — no market-derived risk (volatility, liquidity depth)
 * since this engine has no such data, per the brief's "never invent unless
 * already available" rule.
 */
export function riskScore(assets: HoldingAsset[], totalUsdValue: number): number {
  let score = 0;

  const { topHoldingPct } = concentrationRisk(assets);
  if (topHoldingPct >= 75) score += 40;
  else if (topHoldingPct >= 50) score += 25;
  else if (topHoldingPct >= 25) score += 10;

  const pricedCount = assets.filter((asset) => asset.usdValue !== null).length;
  if (pricedCount > 0 && stablecoinExposure(assets, totalUsdValue) === 0) score += 15;

  const unpricedCount = assets.filter((asset) => asset.usdValue === null).length;
  if (unpricedCount > 0) score += Math.min(15, unpricedCount * 5);

  // `verified === false` is a real, explicit negative signal from Blockscout
  // — `null` means "not checked" (see `lib/holdings/types.ts`'s own doc
  // comment) and must never be scored as risk; that would fabricate
  // suspicion about something honestly unknown.
  const unverifiedValue = assets
    .filter((asset) => asset.verified === false && asset.usdValue !== null)
    .reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0);
  if (totalUsdValue > 0 && unverifiedValue / totalUsdValue >= 0.05) score += 15;

  // V4-INTELLIGENCE-001 (item 6) — a real, separate axis from single-asset
  // concentration above: a wallet can hold several different tokens (no one
  // asset dominates `topHoldingPct`) that all belong to the same recognized
  // protocol. Modest weight (10, vs. concentration's up to 40) since today's
  // static `KNOWN_PROTOCOL_SYMBOLS` map is one symbol per protocol, so this
  // condition is currently reachable only when that one symbol *is* the
  // large holding — genuinely new information once the map grows to cover
  // more than one token per protocol, not double-counted with concentration
  // today.
  const { largestProtocolPct } = protocolConcentration(assets, totalUsdValue);
  if (largestProtocolPct >= PROTOCOL_DEPENDENCY_THRESHOLD_PCT) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Fixed severity order (most severe first) — the one place "how should multiple warnings be prioritized" is decided, so every caller sees the same order rather than push-order (which was really just "the order this function happened to check conditions in", not a deliberate priority). */
const SEVERITY_RANK: Record<PortfolioWarning["severity"], number> = { high: 0, elevated: 1, moderate: 2 };

export function buildWarnings(assets: HoldingAsset[], totalUsdValue: number): PortfolioWarning[] {
  const warnings: PortfolioWarning[] = [];
  const { level, topHoldingPct } = concentrationRisk(assets);
  const top = largestHolding(assets);

  if (level === "high" && top) {
    warnings.push({
      id: "concentration-high",
      title: "Heavy concentration in one asset",
      description: `${top.symbol} is ${topHoldingPct.toFixed(1)}% of your known portfolio value. A price move in this one asset drives most of your total.`,
      severity: "high",
    });
  } else if (level === "elevated" && top) {
    warnings.push({
      id: "concentration-elevated",
      title: "Sizeable concentration in one asset",
      description: `${top.symbol} makes up ${topHoldingPct.toFixed(1)}% of your known portfolio value.`,
      severity: "elevated",
    });
  }

  const pricedCount = assets.filter((asset) => asset.usdValue !== null).length;
  if (pricedCount > 0 && stablecoinExposure(assets, totalUsdValue) === 0) {
    warnings.push({
      id: "no-stablecoins",
      title: "No stablecoin exposure",
      description: "None of your known holdings are stablecoins, so your total value moves entirely with volatile asset prices.",
      severity: "moderate",
    });
  }

  const unpriced = assets.filter((asset) => asset.usdValue === null);
  if (unpriced.length > 0) {
    warnings.push({
      id: "unpriced-assets",
      title: `${unpriced.length} asset${unpriced.length === 1 ? "" : "s"} with unknown pricing`,
      description: `${unpriced.map((asset) => asset.symbol).join(", ")} could not be priced — your total value and allocation percentages may be incomplete.`,
      severity: "moderate",
    });
  }

  const dust = assets.filter((asset) => asset.usdValue !== null && asset.usdValue > 0 && asset.usdValue < DUST_USD_THRESHOLD);
  if (dust.length > 0) {
    warnings.push({
      id: "dust-holdings",
      title: `${dust.length} dust holding${dust.length === 1 ? "" : "s"}`,
      description: `${dust.map((asset) => asset.symbol).join(", ")} ${dust.length === 1 ? "is" : "are"} worth less than $${DUST_USD_THRESHOLD} — negligible value, just clutter in your holdings list.`,
      severity: "moderate",
    });
  }

  // V4-INTELLIGENCE-001 (item 6) — distinct from `unpriced-assets` above:
  // that one fires whenever ANY asset is unpriced, however small; this one
  // only fires when overall coverage is materially low, so a large wallet
  // missing one dust token doesn't also trip a second, redundant warning.
  const coverage = pricingCoverage(assets);
  if (assets.length > 0 && coverage < LOW_PRICING_COVERAGE_THRESHOLD) {
    warnings.push({
      id: "low-pricing-coverage",
      title: "Low pricing coverage",
      description: `Only ${coverage}% of your holdings (by count) have a known price — your total value and every allocation percentage shown may be materially incomplete.`,
      severity: "elevated",
    });
  }

  const { largestProtocolName, largestProtocolPct } = protocolConcentration(assets, totalUsdValue);
  if (largestProtocolName && largestProtocolPct >= PROTOCOL_DEPENDENCY_THRESHOLD_PCT) {
    warnings.push({
      id: "protocol-dependency",
      title: "Single protocol dependency",
      description: `${largestProtocolPct.toFixed(1)}% of your known value depends on ${largestProtocolName} — an issue with that one protocol would affect most of your portfolio.`,
      severity: "elevated",
    });
  }

  return warnings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
