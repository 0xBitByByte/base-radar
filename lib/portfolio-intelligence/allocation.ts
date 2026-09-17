/**
 * V3-WALLET-003 — allocation reads over already-normalized holdings. Never
 * recomputes `usdValue`/`allocationPct` — `lib/holdings/normalize.ts`
 * already did that; this only reads and classifies.
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import type { AllocationBreakdown, ScoredHolding } from "@/lib/portfolio-intelligence/types";

/** Deliberately small and conservative — well-established USD-pegged stablecoins actually seen on Base. Symbol match only (case-insensitive); never a fetched or inferred classification. */
const STABLECOIN_SYMBOLS = new Set(["USDC", "USDBC", "USDT", "DAI", "LUSD", "FRAX", "GUSD", "USDS", "CRVUSD"]);

/**
 * A small, static, hand-maintained map of well-known Base-ecosystem
 * governance/utility token symbols to the project they belong to — the same
 * "deterministically classifiable" allowance the brief grants for asset
 * tags. Deliberately not exhaustive: absence from this list means "unknown
 * to this engine," reported honestly as `largestProtocol: null`, never
 * guessed. Never fetched, never inferred from price/volume — a symbol is
 * either on this list or it isn't.
 */
const KNOWN_PROTOCOL_SYMBOLS: Record<string, string> = {
  AERO: "Aerodrome Finance",
  COMP: "Compound",
  MORPHO: "Morpho",
  WELL: "Moonwell",
  EXTRA: "Extra Finance",
  UNI: "Uniswap",
  LINK: "Chainlink",
  MKR: "Maker",
  CRV: "Curve",
  BAL: "Balancer",
  SNX: "Synthetix",
  LDO: "Lido",
};

/** Exported (V4-INTELLIGENCE-001) — `buildAllocationBreakdown` below reuses this for `topHoldings` rather than redefining the same object shape a second time. */
export function toScoredHolding(asset: HoldingAsset): ScoredHolding {
  return {
    symbol: asset.symbol,
    name: asset.name,
    address: asset.address,
    usdValue: asset.usdValue ?? 0,
    allocationPct: asset.allocationPct ?? 0,
  };
}

export function isStablecoin(asset: HoldingAsset): boolean {
  return STABLECOIN_SYMBOLS.has(asset.symbol.toUpperCase());
}

/** Priced assets only, sorted by USD value descending — the same order `normalizeHoldings` already sorts to, re-asserted here rather than assumed, since this module's contract is to never trust incoming order silently. */
export function pricedAssetsByValue(assets: HoldingAsset[]): HoldingAsset[] {
  return assets.filter((asset) => asset.usdValue !== null && asset.allocationPct !== null).sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0));
}

export function largestHolding(assets: HoldingAsset[]): ScoredHolding | null {
  const [top] = pricedAssetsByValue(assets);
  return top ? toScoredHolding(top) : null;
}

export function largestProtocol(assets: HoldingAsset[]): ScoredHolding | null {
  const classified = pricedAssetsByValue(assets).filter((asset) => KNOWN_PROTOCOL_SYMBOLS[asset.symbol.toUpperCase()] !== undefined);
  const [top] = classified;
  if (!top) return null;
  return { ...toScoredHolding(top), name: KNOWN_PROTOCOL_SYMBOLS[top.symbol.toUpperCase()] };
}

/** % of `totalUsdValue` held in recognized stablecoins, 0-100. `totalUsdValue` of 0 (nothing priced) honestly reads as 0, not NaN or a fabricated guess. */
export function stablecoinExposure(assets: HoldingAsset[], totalUsdValue: number): number {
  if (totalUsdValue <= 0) return 0;
  const stableValue = assets.filter((asset) => isStablecoin(asset) && asset.usdValue !== null).reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0);
  return Math.round((stableValue / totalUsdValue) * 1000) / 10;
}

/** % of `totalUsdValue` held in non-native, non-stablecoin ERC-20s — an approximate "everything else" reading (this engine has no per-protocol TVL/liquidity data to be more precise than that), 0-100. */
export function defiExposure(assets: HoldingAsset[], totalUsdValue: number): number {
  if (totalUsdValue <= 0) return 0;
  const otherValue = assets
    .filter((asset) => asset.tokenType === "erc20" && !isStablecoin(asset) && asset.usdValue !== null)
    .reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0);
  return Math.round((otherValue / totalUsdValue) * 1000) / 10;
}

/** V4-INTELLIGENCE-001 — % of `totalUsdValue` held in native ETH. The one category `stablecoinExposure`/`defiExposure` don't cover between them (`defiExposure` explicitly excludes native assets), so "where did the rest of my known value go" was previously only answerable by subtraction. */
export function ethExposure(assets: HoldingAsset[], totalUsdValue: number): number {
  if (totalUsdValue <= 0) return 0;
  const ethValue = assets
    .filter((asset) => asset.tokenType === "native" && asset.usdValue !== null)
    .reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0);
  return Math.round((ethValue / totalUsdValue) * 1000) / 10;
}

/** V4-INTELLIGENCE-001 — the top `n` priced holdings by value, as `ScoredHolding`s. Used by `buildAllocationBreakdown`'s "Top 5 Holdings" and directly exposed so a future consumer never has to re-sort `assets` itself. */
export function topHoldings(assets: HoldingAsset[], n = 5): ScoredHolding[] {
  return pricedAssetsByValue(assets).slice(0, n).map(toScoredHolding);
}

export type ProtocolConcentration = {
  /** Count of distinct known protocols represented among priced holdings — 0 when nothing held matches `KNOWN_PROTOCOL_SYMBOLS`. */
  protocolsDetected: number;
  largestProtocolName: string | null;
  /** Sum of every priced holding attributed to `largestProtocolName` — grouped by protocol NAME, not by symbol, so a future protocol with more than one mapped symbol is summed correctly without touching this function again. Today's static map happens to be one symbol per protocol, so this equals that one holding's value for now — a real limitation of the map's current size, not of this function's logic. */
  largestProtocolValue: number;
  /** `largestProtocolValue` as a % of `totalUsdValue`, 0-100. */
  largestProtocolPct: number;
};

/**
 * V4-INTELLIGENCE-001 (item 4) — a genuinely separate axis from
 * `diversificationScore`: that score measures spread across individual
 * ASSETS (Herfindahl over `allocationPct`); this measures how much known
 * value sits inside recognized Base-ecosystem PROTOCOLS specifically,
 * grouped by protocol name rather than by symbol. The two never read the
 * same underlying number — a wallet can hold many different assets (high
 * asset diversification) that still all belong to one protocol (high
 * protocol concentration), or vice versa — so exposing both, computed
 * independently, avoids collapsing two different questions into one score.
 */
export function protocolConcentration(assets: HoldingAsset[], totalUsdValue: number): ProtocolConcentration {
  const byProtocol = new Map<string, number>();
  for (const asset of pricedAssetsByValue(assets)) {
    const protocolName = KNOWN_PROTOCOL_SYMBOLS[asset.symbol.toUpperCase()];
    if (!protocolName) continue;
    byProtocol.set(protocolName, (byProtocol.get(protocolName) ?? 0) + (asset.usdValue ?? 0));
  }

  let largestProtocolName: string | null = null;
  let largestProtocolValue = 0;
  for (const [name, value] of byProtocol) {
    if (value > largestProtocolValue) {
      largestProtocolName = name;
      largestProtocolValue = value;
    }
  }

  return {
    protocolsDetected: byProtocol.size,
    largestProtocolName,
    largestProtocolValue,
    largestProtocolPct: totalUsdValue > 0 ? Math.round((largestProtocolValue / totalUsdValue) * 1000) / 10 : 0,
  };
}

/**
 * V4-INTELLIGENCE-001 (items 3, 5) — the one place `topHoldings`,
 * `stablecoinExposure`/`ethExposure`/`defiExposure`, and
 * `protocolConcentration` are combined into a single presentation-ready
 * object, so `engine.ts` computes each underlying number exactly once and
 * every UI consumer reads one field instead of recomputing a split itself.
 */
export function buildAllocationBreakdown(assets: HoldingAsset[], totalUsdValue: number): AllocationBreakdown {
  const unpricedCount = assets.filter((asset) => asset.usdValue === null).length;
  const { largestProtocolName, largestProtocolPct } = protocolConcentration(assets, totalUsdValue);

  return {
    topHoldings: topHoldings(assets),
    stablecoinPct: stablecoinExposure(assets, totalUsdValue),
    ethPct: ethExposure(assets, totalUsdValue),
    otherPct: defiExposure(assets, totalUsdValue),
    unknownAssetPct: assets.length > 0 ? Math.round((unpricedCount / assets.length) * 1000) / 10 : 0,
    protocolConcentrationPct: largestProtocolPct,
    largestProtocolName,
  };
}

/**
 * V4-INTELLIGENCE-002 — % of KNOWN (priced) value this engine can actually
 * categorize: a recognized stablecoin, native ETH, or a known protocol
 * token — vs. a generic, unclassified ERC-20. Distinct from
 * `pricingCoverage` (which measures whether a PRICE is known at all) and
 * from `protocolConcentration` (which only looks at the single LARGEST
 * protocol) — this sums every classifiable bucket together, the one real
 * "how much of this portfolio does the engine actually understand" number.
 * Used by `confidence.ts`; exported so nothing else has to re-sum the same
 * three buckets independently.
 */
export function classificationCoverage(assets: HoldingAsset[], totalUsdValue: number): number {
  if (totalUsdValue <= 0) return 0;
  const classifiedValue = assets
    .filter((asset) => asset.usdValue !== null && (asset.tokenType === "native" || isStablecoin(asset) || KNOWN_PROTOCOL_SYMBOLS[asset.symbol.toUpperCase()] !== undefined))
    .reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0);
  return Math.round((classifiedValue / totalUsdValue) * 1000) / 10;
}
