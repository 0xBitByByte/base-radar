/**
 * The only module in this engine that imports from `lib/providers/*`.
 * Owns two jobs: fetching the (cache-backed) bulk provider data every
 * project lookup needs, and matching a single `Project`'s configured
 * identifiers against that bulk data. Every other intelligence module
 * works with the `ProjectSources` bundle this produces, never with the
 * Provider Layer directly.
 */

import { getProjects } from "@/data/projects/helpers";
import type { Project } from "@/data/projects/types";
import * as coingecko from "@/lib/providers/coingecko/service";
import * as dexscreener from "@/lib/providers/dexscreener/service";
import * as defillama from "@/lib/providers/defillama/service";
import * as blockscout from "@/lib/providers/blockscout/service";
import * as github from "@/lib/providers/github/service";
import * as base from "@/lib/providers/base/service";
import type { ProviderName, ProviderResult } from "@/lib/providers/common/types";
import { normalizeName, slugify, sumBy } from "@/lib/intelligence/helpers";
import { resolveTradingDiscoveryStrategies } from "@/lib/trading/discoveryStrategy";
import type {
  ProjectSources,
  ProviderSlice,
  SourceAttribution,
  Sources,
} from "@/lib/intelligence/types";

/** One entry per `ProjectSources` key, so callers never repeat this mapping. */
export const SOURCE_TO_PROVIDER: Record<keyof ProjectSources, ProviderName> = {
  market: "coingecko",
  trading: "dexscreener",
  tvl: "defillama",
  network: "base",
  verifiedContract: "blockscout",
  github: "github",
};

/**
 * PR-050 provider-resolution audit — which of these six real, integrated
 * providers has a genuine secondary candidate for the SAME metric today
 * (checked directly against each provider's mapped domain type before
 * writing any fallback logic — see `merge.ts`):
 *
 * - Price: CoinGecko (primary) → DexScreener's own pair `priceUsd` (real
 *   fallback, wired in `mergeMarket`).
 * - Volume 24h: DexScreener (primary) → CoinGecko's `total_volume` (real,
 *   already-mapped, previously-unused fallback, wired in `mergeTrading` —
 *   flagged medium-confidence since it's the asset's global exchange
 *   volume, not Base-DEX-specific).
 * - PR-051 — Trading/Liquidity matching itself was widened: `matchTrading`
 *   now tries a direct DexScreener address lookup against the project's own
 *   registered Base token contract first (real, exact, immune to the
 *   "currently trending" limitation the legacy `dexscreenerPairAddresses`
 *   path has), falling back to that legacy path unchanged for any project
 *   with specific pair addresses configured but no registered token
 *   contract. See `matchTrading` below and
 *   docs/PROVIDER_DATA_COVERAGE_AUDIT.md §5.2.
 * - TVL: DefiLlama only. CoinGecko's API doesn't expose per-protocol TVL,
 *   and no on-chain TVL aggregator is implemented — one real candidate.
 * - Liquidity: DexScreener only — no other integrated provider aggregates
 *   DEX liquidity depth.
 * - GitHub stats (stars/forks/releases/commits): GitHub only — the
 *   registry (`project.github`) stores a repo *reference*, never stats.
 * - Contract verification: Blockscout only — the registry stores
 *   addresses, never verification/compiler metadata.
 * - Governance: Snapshot only (`lib/governance`) — Tally/Compound-Governor/
 *   OZ-Governor/Aragon/Safe are named, real on-chain governance systems but
 *   explicitly not implemented (`getGovernanceProvider` throws if
 *   selected); wiring one of them is a real, scoped future PR, not
 *   something to fake a fallback for today.
 *
 * TVL/GitHub/Contracts/Governance each having exactly one real
 * provider is a fact about this codebase's current Provider Layer, not a
 * bug — every one of them already surfaces its real per-provider status and
 * failure reason via `SourceAttribution`/`Sources` (this file's
 * `buildSourcesSummary`) rather than a bare "unavailable."
 */

/** Typed `Object.keys` for `ProjectSources` — the one place this cast is written. */
export function sourceKeys(sources: ProjectSources): (keyof ProjectSources)[] {
  return Object.keys(sources) as (keyof ProjectSources)[];
}

export type ProviderBulkData = {
  markets: ProviderResult<coingecko.CoinMarket[]>;
  pairs: ProviderResult<dexscreener.Pair[]>;
  /**
   * PR-051 — direct DexScreener pair lookups for every registry project's
   * registered Base token contract, one shared batched call (not one per
   * project) mirroring `pairs`' own "shared, chain-wide, cached" pattern.
   * Real, exact matches, not limited to "currently trending" the way
   * `pairs` (a keyword search) is — see `matchTrading` below and
   * docs/PROVIDER_DATA_COVERAGE_AUDIT.md §5.2.
   */
  tokenPairs: ProviderResult<dexscreener.Pair[]>;
  protocols: ProviderResult<defillama.Protocol[]>;
  verifiedContract: ProviderResult<blockscout.VerifiedContract>;
  network: ProviderResult<base.NetworkStatus>;
};

/** Every distinct Base-chain token contract address registered across the whole registry — the input to the shared `tokenPairs` lookup above. */
function collectBaseTokenAddresses(): string[] {
  const addresses = new Set<string>();
  for (const project of getProjects()) {
    for (const contract of project.contracts) {
      if (contract.chain === "base" && contract.type === "token") addresses.add(contract.address);
    }
  }
  return [...addresses];
}

/**
 * PR-072 — every registry project's configured `providerIds.coingeckoId`,
 * the input to `getMarketsByIds`'s category-independent backfill fetch
 * below. Exported so `lib/branding/resolveProjectLogos.ts`'s lightweight
 * project-logo lookup can reuse this exact same list rather than
 * re-deriving it — one place iterates the registry for this purpose, not
 * two that could drift apart.
 */
export function collectRegistryCoingeckoIds(): string[] {
  const ids = new Set<string>();
  for (const project of getProjects()) {
    if (project.providerIds.coingeckoId) ids.add(project.providerIds.coingeckoId);
  }
  return [...ids];
}

/**
 * PR-072 — `matchMarket` searches whatever `markets` list it's handed by
 * exact `id`; this widens that list beyond the category-filtered bulk fetch
 * (which misses real registry projects CoinGecko doesn't tag
 * `base-ecosystem`, e.g. Uniswap) by also including every registry
 * project's own id-based lookup. Category-list entries win on conflict
 * (kept first) since that data is already fresher/broader; the id-based
 * fetch only ever fills in ids the category list didn't already have.
 */
function mergeMarketResults(
  categoryResult: ProviderResult<coingecko.CoinMarket[]>,
  registryResult: ProviderResult<coingecko.CoinMarket[]>
): ProviderResult<coingecko.CoinMarket[]> {
  if (!categoryResult.ok) return registryResult.ok ? registryResult : categoryResult;
  if (!registryResult.ok) return categoryResult;

  const seenIds = new Set(categoryResult.data.map((m) => m.id));
  const merged = [...categoryResult.data, ...registryResult.data.filter((m) => !seenIds.has(m.id))];
  return { ...categoryResult, data: merged };
}

/**
 * Fetches every "shared across all projects" provider result once. Safe to
 * call once per batch (see `engine.ts`'s `getAllProjectIntelligence`) and
 * reuse across many `gatherProjectSources` calls — and cheap even when
 * called once per project, since the Provider Layer's own cache
 * (`lib/providers/common/cache.ts`) de-dupes concurrent and repeated calls
 * within each provider's TTL window.
 */
export async function fetchProviderBulkData(): Promise<ProviderBulkData> {
  const [categoryMarkets, registryMarkets, pairs, tokenPairs, protocols, verifiedContract, network] = await Promise.all([
    coingecko.getBaseEcosystemMarkets(coingecko.BASE_ECOSYSTEM_MARKETS_PAGE_SIZE),
    coingecko.getMarketsByIds(collectRegistryCoingeckoIds()),
    dexscreener.getBaseTrendingPairs(),
    dexscreener.getPairsByTokenAddresses(collectBaseTokenAddresses()),
    defillama.getBaseProtocols(),
    blockscout.getRecentlyVerifiedContract(),
    base.getBaseNetworkStatus(),
  ]);
  const markets = mergeMarketResults(categoryMarkets, registryMarkets);
  return { markets, pairs, tokenPairs, protocols, verifiedContract, network };
}

export type MarketTvlTradingBulkData = Pick<ProviderBulkData, "markets" | "pairs" | "tokenPairs" | "protocols">;

/**
 * MASTER HARDENING PASS — Concern 1 (API cost audit). A leaner sibling of
 * `fetchProviderBulkData()` above, for the one real caller
 * (`lib/data/featuredIntelligenceSnapshot.ts`) that only ever reads
 * `markets`/`pairs`/`tokenPairs`/`protocols` — confirmed by that file's own
 * `NOT_NEEDED_SLICE` marking `network`/`verifiedContract` as "Not fetched
 * — not read by the Featured Intelligence snapshot." Auditing WHY those two
 * were still being fetched anyway found both are wired for a fast-
 * refreshing LIVE ticker elsewhere in the app, not for this 3-minute-cycle
 * consumer: `base.getBaseNetworkStatus()` has a 20-SECOND cache TTL (the
 * shortest of any provider, `lib/providers/base/service.ts`) and
 * `blockscout.getRecentlyVerifiedContract()` has a 60-second TTL
 * (`lib/providers/blockscout/service.ts`, "live chain-stats ticker only")
 * — both far shorter than Featured Intelligence's 180s outer cycle, so
 * EVERY regeneration found them expired and refetched them, for data this
 * consumer then explicitly discarded. Measured real impact: 60 base RPC
 * calls/hour + a share of blockscout's calls, entirely wasted (see the
 * PR report's before/after table).
 *
 * This does NOT touch `fetchProviderBulkData()` itself — `lib/intelligence/
 * engine.ts`'s `getAllProjectIntelligence()` (the real dashboard/Explorer
 * path, via `gatherProjectSources()`) genuinely needs `network`/
 * `verifiedContract`, so that function and its own TTLs stay exactly as
 * they are. The four calls this DOES make are the exact same, independently
 * `getOrSet`-cached provider service functions `fetchProviderBulkData()`
 * itself calls — so a dashboard visitor and a Featured Ecosystem
 * regeneration hitting the same cache key within its TTL still share one
 * real fetch, same as before; only the two genuinely-unused calls are
 * skipped for this specific caller.
 */
export async function fetchMarketTvlTradingBulkData(): Promise<MarketTvlTradingBulkData> {
  const [categoryMarkets, registryMarkets, pairs, tokenPairs, protocols] = await Promise.all([
    coingecko.getBaseEcosystemMarkets(coingecko.BASE_ECOSYSTEM_MARKETS_PAGE_SIZE),
    coingecko.getMarketsByIds(collectRegistryCoingeckoIds()),
    dexscreener.getBaseTrendingPairs(),
    dexscreener.getPairsByTokenAddresses(collectBaseTokenAddresses()),
    defillama.getBaseProtocols(),
  ]);
  const markets = mergeMarketResults(categoryMarkets, registryMarkets);
  return { markets, pairs, tokenPairs, protocols };
}

function unavailableSlice<T>(detail: string): ProviderSlice<T> {
  return { data: null, status: "unavailable", fetchedAt: null, matchQuality: "none", detail };
}

function notConfiguredSlice<T>(detail: string): ProviderSlice<T> {
  return { data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail };
}

/**
 * PR-098.06 — exported (was module-private) so a caller that only needs
 * the `market`/`tvl` slices (e.g. `lib/data/featuredIntelligenceSnapshot.ts`)
 * can call this directly against an already-fetched `bulk.markets` result,
 * instead of going through `gatherProjectSources()` — which unconditionally
 * also computes `trading`/`verifiedContract`/`network`, and critically
 * `github` via a REAL, PER-PROJECT, un-batchable live GitHub fetch
 * (`matchGithub`) — pure waste when nothing downstream reads those slices.
 * See the PR-098.06 audit report.
 */
export function matchMarket(project: Project, result: ProviderResult<coingecko.CoinMarket[]>): ProviderSlice<coingecko.CoinMarket> {
  const coingeckoId = project.providerIds.coingeckoId;
  if (!coingeckoId) return notConfiguredSlice("No coingeckoId configured on this project");
  if (!result.ok) return unavailableSlice(result.error.message);

  const match = result.data.find((m) => m.id === coingeckoId) ?? null;
  if (!match) return unavailableSlice(`No CoinGecko market found for id "${coingeckoId}"`);

  // PR-098.02 — mirrors `matchGithub`/`matchVerifiedContract`'s own
  // `result.stale` threading. `getBaseEcosystemMarkets`/`getMarketsByIds`
  // now carry `withStaleFallback`, so a live CoinGecko outage can degrade
  // to the last real, successfully-fetched market data instead of going
  // straight to unavailable — this surfaces that honestly instead of
  // silently presenting possibly-stale price/24h-change data as fresh.
  const detail = result.stale ? "Stale — CoinGecko is currently unavailable. Showing the last successfully fetched data." : null;
  return { data: match, status: "live", fetchedAt: result.fetchedAt, matchQuality: "exact", detail, stale: result.stale };
}

/**
 * Trading Discovery Strategy — routed through `resolveTradingDiscoveryStrategies`
 * (`lib/trading/discoveryStrategy.ts`), not a hardcoded token-contract check.
 * Returns an ORDERED list, not one verdict, because a project can genuinely
 * satisfy more than one signal (Aerodrome and Curve are real DEXes *and*
 * have their own real Base governance token) — each entry is tried in
 * order, falling through to the next on an empty result (never on a fetch
 * failure, which is returned immediately as-is). Two real data-yielding
 * kinds:
 *
 *  - `"token"` — a direct, exact match against the project's own registered
 *    Base token contract (`tokenPairsResult`, a real per-address DexScreener
 *    lookup, immune to the "currently trending" limitation below). The
 *    original, still-correct mechanism for any project whose real Base
 *    footprint IS a single tradeable token.
 *  - `"dex"` — every currently-trending Base pair whose `dexId` matches this
 *    project's own configured exchange identity (`result`, the shared
 *    trending-pairs fetch — see `dexscreener.getPairsByDexId`'s doc comment
 *    for why this is the honest, not-exhaustive-but-real mechanism DexScreener's
 *    API actually supports for "every pool this exchange hosts"). This is
 *    the branch that makes Uniswap/Balancer show real pools instead of
 *    "no pools" — neither has its own Base governance token, but both have
 *    real, active Base pools trading other projects' tokens.
 *
 * `"bridge_unimplemented"` / `"not_applicable"` are always single-entry
 * lists (see the resolver) — an honest, typed empty state with a real
 * reason, never silently indistinguishable from a fetch failure. The
 * legacy `dexscreenerPairAddresses` fallback (for a project with no token
 * contract but specific known pair addresses configured) is kept as a
 * final fallback after every real strategy is exhausted — unchanged
 * behavior for any project still using it.
 *
 * PR-099 — exported (was module-private), same reason as `matchMarket`/
 * `matchTvl` (PR-098.06): the Radar Score live pipeline
 * (`lib/data/featuredIntelligenceSnapshot.ts`) needs real DexScreener pool
 * data for Onchain Activity/Ecosystem Traction, reusing this exact
 * matching logic against the already-fetched shared `bulk` rather than
 * duplicating it.
 */
/**
 * Radar Score V2 Priority 3 — a deliberately low bar, not a quality
 * judgment: only rejects matches that are indistinguishable from noise
 * (live-verified real case: $1.38 volume, 2 transactions total across a
 * single matched pool). Combined volume >= $500 OR combined transactions
 * >= 10 clears every real, live-verified case checked during this audit
 * (Aerodrome $2.8M/3503 txns, Curve $65,927/433 txns, Uniswap's own
 * borderline $193/42 txns) while rejecting the one confirmed garbage
 * match (Balancer). Summed across every matched pool, not any single one
 * — a project with several small-but-real pools should still pass.
 */
function isMeaningfulTradingMatch(pairs: dexscreener.Pair[]): boolean {
  const totalVolume = pairs.reduce((sum, pair) => sum + (pair.volume24hUsd ?? 0), 0);
  const totalTxns = pairs.reduce((sum, pair) => sum + (pair.buys24h ?? 0) + (pair.sells24h ?? 0), 0);
  return totalVolume >= 500 || totalTxns >= 10;
}

export function matchTrading(
  project: Project,
  result: ProviderResult<dexscreener.Pair[]>,
  tokenPairsResult: ProviderResult<dexscreener.Pair[]>
): ProviderSlice<dexscreener.Pair[]> {
  const strategies = resolveTradingDiscoveryStrategies(project);
  let lastEmptyDetail: string | null = null;

  for (const strategy of strategies) {
    if (strategy.kind === "token") {
      if (!tokenPairsResult.ok) return unavailableSlice(tokenPairsResult.error.message);

      const chainId = project.providerIds.dexscreenerChainId ?? "base";
      const matches = tokenPairsResult.data.filter(
        (pair) => pair.chainId === chainId && normalizeName(pair.baseToken.address) === normalizeName(strategy.tokenAddress)
      );
      if (matches.length) {
        return { data: matches, status: "live", fetchedAt: tokenPairsResult.fetchedAt, matchQuality: "exact", detail: null };
      }
      lastEmptyDetail = `No DexScreener pair found for the registered token contract on chain "${chainId}"`;
      continue;
    }

    if (strategy.kind === "dex") {
      if (!result.ok) return unavailableSlice(result.error.message);
      const dexIdSet = new Set(strategy.dexIds);
      const matches = result.data.filter((pair) => dexIdSet.has(pair.dexId));
      // MASTER HARDENING PASS, Radar Score V2 Priority 3 — a confirmed,
      // reproduced defect: `search?q=base` (the endpoint behind `result`)
      // is a keyword/relevance search, not a volume ranking, so it can
      // surface a technically-matching but economically negligible pool
      // (live-verified: Balancer matched a single pool with $1.38 in 24h
      // volume and 2 total transactions, while its real Base activity went
      // unchecked because `matches.length > 0` was already satisfied).
      // `isMeaningfulMatch` gives the same protection the EXISTING
      // zero-match fallback already had — fall through to this project's
      // own exact "token" match (if configured) rather than trusting a
      // search-surfaced pool that's indistinguishable from noise. The
      // threshold is intentionally low (reject only clearly-negligible
      // matches, not "small but real" ones) — this is a match-quality
      // gate, not a scoring judgment; `normalizeOnchainActivity`'s own
      // log-normalize floors still do the real, separate job of scaling
      // whatever real data survives this gate.
      if (matches.length && isMeaningfulTradingMatch(matches)) {
        return { data: matches, status: "live", fetchedAt: result.fetchedAt, matchQuality: "exact", detail: null };
      }
      // Real DEX, real configured dexId — just nothing trending right now
      // (or only negligible matches, per the check above). See
      // `getPairsByDexId`'s own doc comment for why an empty result is a
      // genuine provider ceiling (trending-only search), not a broken
      // match. Falls through to the next strategy (e.g. this same
      // project's own token, if it has one) rather than stopping here.
      lastEmptyDetail = matches.length
        ? `Only negligible-volume Base pools found for dexId(s) "${strategy.dexIds.join(", ")}" (DexScreener's trending/search index, not a volume ranking) — deferred to a more representative match if one exists.`
        : `No currently-trending Base pools found for dexId(s) "${strategy.dexIds.join(", ")}" — DexScreener's search only covers trending pairs, not every pool this exchange hosts.`;
      continue;
    }

    // `"bridge_unimplemented"` / `"not_applicable"` — always the sole entry
    // in the list (see the resolver), so falls straight through to the
    // legacy-address check and final return below.
  }

  const addresses = project.providerIds.dexscreenerPairAddresses;
  if (addresses?.length) {
    if (!result.ok) return unavailableSlice(result.error.message);
    const normalized = addresses.map(normalizeName);
    const matches = result.data.filter((pair) => normalized.includes(normalizeName(pair.baseToken.address)));
    if (matches.length) {
      return { data: matches, status: "live", fetchedAt: result.fetchedAt, matchQuality: "exact", detail: null };
    }
    return unavailableSlice("Configured pair address(es) were not found in the current trending-pairs result");
  }

  if (lastEmptyDetail) return unavailableSlice(lastEmptyDetail);

  const soleStrategy = strategies[0];
  return notConfiguredSlice(
    soleStrategy.kind === "bridge_unimplemented"
      ? "Bridge relay/liquidity activity isn't the same data shape as an AMM pool, and no bridge-activity provider is integrated yet."
      : soleStrategy.kind === "not_applicable"
        ? soleStrategy.reason
        : "No trading data source configured for this project."
  );
}

/**
 * PR-074 DATA INTEGRITY AUDIT — reconstructs a parent protocol's real
 * aggregate TVL from its tagged DefiLlama sub-protocols (see `matchTvl`
 * below). Generic: driven entirely by the real `parentProtocol` field
 * DefiLlama already sets on each child, never a hardcoded project name.
 * Sums each child's own `tvlUsd` (mirrors what `/protocol/{slug}`'s own
 * aggregate total is built from — verified live against DefiLlama:
 * summing Uniswap's V1-V4 children reproduces `/protocol/uniswap`'s total
 * to within rounding). `changePct24h` is a TVL-weighted average across
 * whichever children report one — real arithmetic over real data, not a
 * guess — and `null` when none do, rather than fabricating a blend.
 */
function aggregateParentProtocolTvl(children: defillama.Protocol[]): defillama.Protocol {
  const globalTvlUsd = sumBy(children, (c) => c.globalTvlUsd);
  // PR-102 — sum only children that actually report a real Base-specific
  // figure; `null` (not 0) when NONE of them do, so a parent aggregate
  // never silently reads as "$0 on Base" when the truth is "no Base
  // breakdown data available" — the same N/A-vs-zero distinction applied
  // everywhere else in this engine.
  const childrenWithBaseTvl = children.filter((c) => c.baseTvlUsd !== null);
  const baseTvlUsd = childrenWithBaseTvl.length ? sumBy(childrenWithBaseTvl, (c) => c.baseTvlUsd!) : null;
  const weighted = children.filter((c) => c.changePct24h !== null && c.globalTvlUsd > 0);
  const weightedTvl = sumBy(weighted, (c) => c.globalTvlUsd);
  const changePct24h = weighted.length && weightedTvl > 0 ? sumBy(weighted, (c) => c.changePct24h! * c.globalTvlUsd) / weightedTvl : null;
  // Every child of one parent shares the same real category/logo in
  // practice (DefiLlama groups by product line, e.g. all "Dexs" or all
  // "Lending") — the largest child (by global TVL, the more stable/complete
  // figure for ranking children against each other) is the most
  // representative single source for display-only fields that can't be
  // meaningfully summed.
  const largest = [...children].sort((a, b) => b.globalTvlUsd - a.globalTvlUsd)[0];

  return {
    name: largest.name,
    symbol: largest.symbol,
    chains: largest.chains,
    globalTvlUsd,
    baseTvlUsd,
    marketCapUsd: null,
    changePct24h,
    category: largest.category,
    logoUrl: largest.logoUrl,
    parentProtocol: largest.parentProtocol,
  };
}

/**
 * V1-FIX-006A — exposes `matchTvl`'s real matching (including the parent-tag
 * aggregation genuinely needed for split protocols like Aerodrome/Uniswap,
 * which have no single top-level DefiLlama bulk-list entry — see `matchTvl`'s
 * own comment) to callers that already hold a plain, resolved `Protocol[]`
 * rather than a `ProviderResult` — the Executive Summary's TVL highlight
 * needs the same real match Project Profile pages get, not a second,
 * simpler (and for split protocols, wrong) implementation.
 */
export function findProjectProtocol(project: Project, protocols: defillama.Protocol[]): defillama.Protocol | null {
  const slice = matchTvl(project, { ok: true, data: protocols, source: "defillama", fetchedAt: new Date().toISOString() });
  return slice.status === "live" ? slice.data : null;
}

export type TvlMoverMatch = { project: Project; protocol: defillama.Protocol };

/**
 * V1-FIX-006A — the single tracked project with the largest real 24h TVL
 * move (by magnitude), scanning only projects with a configured
 * `defillamaSlug` against DefiLlama's already-fetched bulk protocol list.
 * `null` when no tracked project has a real, non-null 24h change to compare.
 * Threshold/"is this notable" decisions belong to the presentation layer
 * (`lib/dashboard/executiveSummary.ts`), not here — this only finds the real
 * largest mover, never filters it.
 */
export function findTopTvlMover(projects: Project[], protocols: defillama.Protocol[]): TvlMoverMatch | null {
  let best: TvlMoverMatch | null = null;
  let bestMagnitude = -Infinity;
  for (const project of projects) {
    if (!project.providerIds.defillamaSlug) continue;
    const protocol = findProjectProtocol(project, protocols);
    if (!protocol || protocol.changePct24h === null) continue;
    const magnitude = Math.abs(protocol.changePct24h);
    if (magnitude > bestMagnitude) {
      bestMagnitude = magnitude;
      best = { project, protocol };
    }
  }
  return best;
}

/** PR-098.06 — exported for the same reason as `matchMarket` above: `findProjectProtocol` (below) already wraps this but discards `stale`/`detail`, which a caller building its own `Tvl` via `mergeTvl` needs. */
export function matchTvl(project: Project, result: ProviderResult<defillama.Protocol[]>): ProviderSlice<defillama.Protocol> {
  const slug = project.providerIds.defillamaSlug;
  if (!slug) return notConfiguredSlice("No defillamaSlug configured on this project");
  if (!result.ok) return unavailableSlice(result.error.message);

  // DefiLlama's public protocol list exposes no stable slug field to match
  // against exactly (see docs/API.md) — this is a best-effort match on a
  // slugified protocol name, tracked as "fuzzy" so confidence.ts can weigh
  // it accordingly.
  const exactMatch = result.data.find((protocol) => slugify(protocol.name) === slug) ?? null;
  if (exactMatch) {
    return {
      data: exactMatch,
      status: "live",
      fetchedAt: result.fetchedAt,
      matchQuality: "fuzzy",
      // PR-098.06 — `stale` was never threaded before, even though
      // `getBaseProtocols()` has carried `withStaleFallback` since before
      // this file's own `matchMarket`/`matchGithub`/`matchVerifiedContract`
      // set the established precedent for surfacing it. A genuine gap this
      // audit found while consuming this slice's staleness directly for
      // the Featured Intelligence snapshot.
      detail: result.stale
        ? "Matched by normalized protocol name, not an exact slug. Stale — DefiLlama is currently unavailable; showing the last successfully fetched data."
        : "Matched by normalized protocol name, not an exact slug",
      stale: result.stale,
    };
  }

  // Many protocols (Uniswap, Aerodrome, Moonwell, ...) have no single
  // top-level bulk-list entry at all — DefiLlama splits them into
  // versioned/product sub-protocols (e.g. "Uniswap V3", "Aerodrome
  // Slipstream"), each carrying a real `parentProtocol: "parent#<slug>"`
  // field pointing back at the family. This is DefiLlama's own grouping
  // convention, not a heuristic this codebase invented — so matching on it
  // is generic and applies to any future project with the same shape, not
  // just the three confirmed during this audit.
  const children = result.data.filter((protocol) => protocol.parentProtocol === `parent#${slug}`);
  if (!children.length) return unavailableSlice(`No DefiLlama protocol matched slug "${slug}"`);

  return {
    data: aggregateParentProtocolTvl(children),
    status: "live",
    fetchedAt: result.fetchedAt,
    matchQuality: "fuzzy",
    detail: `Aggregated from ${children.length} DefiLlama sub-protocol(s) grouped under this project's parent (no single top-level bulk-list entry exists)${result.stale ? ". Stale — DefiLlama is currently unavailable; showing the last successfully fetched data." : ""}`,
    stale: result.stale,
  };
}

function matchNetwork(project: Project, result: ProviderResult<base.NetworkStatus>): ProviderSlice<base.NetworkStatus> {
  if (!project.chains.includes("base")) return notConfiguredSlice("Project is not deployed on Base");
  if (!result.ok) return unavailableSlice(result.error.message);

  return { data: result.data, status: "live", fetchedAt: result.fetchedAt, matchQuality: "exact", detail: null };
}

/**
 * PR-051 — checks every address this project could plausibly resolve on
 * Blockscout (the explicit `blockscoutAddress`, if set, plus every
 * registered Base-chain contract), not just the single `blockscoutAddress`
 * field — a project with several real contracts now has several chances to
 * match the bulk "most recently verified" result instead of exactly one.
 * This widens the existing heuristic; it does not replace it. Blockscout's
 * public API still only exposes the single most-recently-verified contract
 * chain-wide, not a lookup by address — see `getContractDetail`
 * (`blockscout/service.ts`) for the real, precise per-address alternative
 * already used by the Project Profile's Contracts section
 * (`ProfileContractDetailsAsync`/`ContractsList.tsx`), which is
 * deliberately NOT called here: doing so would mean one live Blockscout
 * request per registered contract on every Explorer batch load (20+
 * projects × their contracts), the exact per-project-call-count regression
 * `gatherExtendedProjectData`'s "single-project-only enrichment" split
 * exists to avoid. See docs/PROVIDER_DATA_COVERAGE_AUDIT.md §5.1/§9 and
 * this PR's report for the full reasoning.
 */
function matchVerifiedContract(
  project: Project,
  result: ProviderResult<blockscout.VerifiedContract>
): ProviderSlice<blockscout.VerifiedContract> {
  const candidateAddresses = [
    ...(project.providerIds.blockscoutAddress ? [project.providerIds.blockscoutAddress] : []),
    ...project.contracts.filter((c) => c.chain === "base").map((c) => c.address),
  ];
  if (!candidateAddresses.length) return notConfiguredSlice("No blockscoutAddress or Base contract configured on this project");
  if (!result.ok) return unavailableSlice(result.error.message);

  const normalizedCandidates = new Set(candidateAddresses.map(normalizeName));
  const isMatch = normalizedCandidates.has(normalizeName(result.data.address));
  if (!isMatch) {
    // Blockscout's public API only exposes the single most-recently-
    // verified contract chain-wide, not a lookup by address — so this will
    // almost always be "unavailable" unless one of this project's
    // registered addresses happens to be the very latest one verified on
    // Base. See docs/PROVIDER_DATA_COVERAGE_AUDIT.md §5.1 for the real,
    // precise per-address alternative this project's Contracts section
    // already uses instead, and why it isn't used here too.
    return unavailableSlice("None of this project's registered addresses was the most recently verified contract on Base");
  }

  // V1-IMPLEMENT-001 follow-up (ADR V1-BLOCKER-001, Phase 1) — mirrors
  // `matchGithub`'s own `result.stale` threading below exactly.
  // `getRecentlyVerifiedContract()` could not return `stale: true` before
  // Phase 1 wired `withStaleFallback` into it; now that it can, this slice
  // must surface that honestly instead of silently presenting a
  // possibly-hours-old "most recently verified contract" read as fresh.
  const detail = result.stale ? "Stale — Blockscout is currently unavailable. Showing the last successfully fetched data." : null;
  return { data: result.data, status: "live", fetchedAt: result.fetchedAt, matchQuality: "exact", detail, stale: result.stale };
}

/** PR-099 — exported (was module-private), same reason as `matchMarket`/`matchTvl`/`matchTrading`: the Radar Score live pipeline's Developer Activity dimension needs this exact GitHub match, without going through `gatherProjectSources()`'s unconditional trading/network/verifiedContract computation. */
export async function matchGithub(project: Project): Promise<ProviderSlice<github.RepoStats>> {
  if (!project.github) return notConfiguredSlice("No GitHub reference configured on this project");
  if (!project.github.repo) {
    return notConfiguredSlice("Only an org-level GitHub reference is configured (no specific repo)");
  }

  const result = await github.getRepoStats(`${project.github.owner}/${project.github.repo}`);
  if (!result.ok) return unavailableSlice(result.error.message);

  // PR-075 — `result.stale` means GitHub's live API just failed (almost
  // always a rate limit) and this is real, previously-fetched data instead
  // — `status` stays "live" (nothing fabricated, nothing hidden) but
  // `detail` carries the honest reason so the UI can label it, rather than
  // silently presenting stale data as fresh.
  const detail = result.stale ? "Stale — GitHub is currently rate limited. Showing the last successfully fetched data." : null;
  return { data: result.data, status: "live", fetchedAt: result.fetchedAt, matchQuality: "exact", detail, stale: result.stale };
}

/**
 * Resolves every provider slice for one project. Pass a `bulk` fetched via
 * `fetchProviderBulkData()` when processing many projects together so the
 * shared, chain-wide results aren't looked up redundantly.
 */
export async function gatherProjectSources(project: Project, bulk?: ProviderBulkData): Promise<ProjectSources> {
  // Fetching the shared bulk data (when not already supplied) and resolving
  // GitHub for this one project are independent — run them concurrently
  // rather than one after the other.
  const [data, githubSlice] = await Promise.all([
    bulk ? Promise.resolve(bulk) : fetchProviderBulkData(),
    matchGithub(project),
  ]);

  return {
    market: matchMarket(project, data.markets),
    trading: matchTrading(project, data.pairs, data.tokenPairs),
    tvl: matchTvl(project, data.protocols),
    network: matchNetwork(project, data.network),
    verifiedContract: matchVerifiedContract(project, data.verifiedContract),
    github: githubSlice,
  };
}

/** Projects `ProjectSources` into the public, per-provider `Sources` attribution section. */
export function buildSourcesSummary(sources: ProjectSources): Sources {
  const entries = sourceKeys(sources).map((key) => {
    const slice = sources[key];
    const provider = SOURCE_TO_PROVIDER[key];
    const attribution: SourceAttribution = {
      provider,
      status: slice.status,
      fetchedAt: slice.fetchedAt,
      detail: slice.detail,
      stale: slice.stale,
    };
    return [provider, attribution] as const;
  });

  return Object.fromEntries(entries) as Sources;
}
