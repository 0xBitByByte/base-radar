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
import { normalizeName, slugify } from "@/lib/intelligence/helpers";
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
 * TVL/Liquidity/GitHub/Contracts/Governance each having exactly one real
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
 * Fetches every "shared across all projects" provider result once. Safe to
 * call once per batch (see `engine.ts`'s `getAllProjectIntelligence`) and
 * reuse across many `gatherProjectSources` calls — and cheap even when
 * called once per project, since the Provider Layer's own cache
 * (`lib/providers/common/cache.ts`) de-dupes concurrent and repeated calls
 * within each provider's TTL window.
 */
export async function fetchProviderBulkData(): Promise<ProviderBulkData> {
  const [markets, pairs, tokenPairs, protocols, verifiedContract, network] = await Promise.all([
    coingecko.getBaseEcosystemMarkets(coingecko.BASE_ECOSYSTEM_MARKETS_PAGE_SIZE),
    dexscreener.getBaseTrendingPairs(),
    dexscreener.getPairsByTokenAddresses(collectBaseTokenAddresses()),
    defillama.getBaseProtocols(),
    blockscout.getRecentlyVerifiedContract(),
    base.getBaseNetworkStatus(),
  ]);
  return { markets, pairs, tokenPairs, protocols, verifiedContract, network };
}

function unavailableSlice<T>(detail: string): ProviderSlice<T> {
  return { data: null, status: "unavailable", fetchedAt: null, matchQuality: "none", detail };
}

function notConfiguredSlice<T>(detail: string): ProviderSlice<T> {
  return { data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail };
}

function matchMarket(project: Project, result: ProviderResult<coingecko.CoinMarket[]>): ProviderSlice<coingecko.CoinMarket> {
  const coingeckoId = project.providerIds.coingeckoId;
  if (!coingeckoId) return notConfiguredSlice("No coingeckoId configured on this project");
  if (!result.ok) return unavailableSlice(result.error.message);

  const match = result.data.find((m) => m.id === coingeckoId) ?? null;
  if (!match) return unavailableSlice(`No CoinGecko market found for id "${coingeckoId}"`);

  return { data: match, status: "live", fetchedAt: result.fetchedAt, matchQuality: "exact", detail: null };
}

/**
 * PR-051 — tries a direct, exact match against the project's own registered
 * Base token contract first (`tokenPairsResult`, a real per-address
 * DexScreener lookup, immune to the "currently trending" limitation below),
 * falling back to the legacy `dexscreenerPairAddresses`-based search-and-
 * filter match for any project that has specific pair addresses configured
 * but no registered token contract. Neither path is removed — this widens
 * coverage without changing either mechanism's own behavior.
 */
function matchTrading(
  project: Project,
  result: ProviderResult<dexscreener.Pair[]>,
  tokenPairsResult: ProviderResult<dexscreener.Pair[]>
): ProviderSlice<dexscreener.Pair[]> {
  const tokenContract = project.contracts.find((c) => c.chain === "base" && c.type === "token");
  if (tokenContract) {
    if (!tokenPairsResult.ok) return unavailableSlice(tokenPairsResult.error.message);

    const chainId = project.providerIds.dexscreenerChainId ?? "base";
    const matches = tokenPairsResult.data.filter(
      (pair) => pair.chainId === chainId && normalizeName(pair.baseToken.address) === normalizeName(tokenContract.address)
    );
    if (matches.length) {
      return { data: matches, status: "live", fetchedAt: tokenPairsResult.fetchedAt, matchQuality: "exact", detail: null };
    }
    // A registered token with no current DexScreener pair on `chainId` is a
    // real, honest "no live pair yet" — not a reason to fall through to the
    // weaker legacy path below, which would only ever produce a worse match.
    return unavailableSlice(`No DexScreener pair found for the registered token contract on chain "${chainId}"`);
  }

  const addresses = project.providerIds.dexscreenerPairAddresses;
  if (!addresses?.length) return notConfiguredSlice("No dexscreenerPairAddresses configured on this project");
  if (!result.ok) return unavailableSlice(result.error.message);

  const normalized = addresses.map(normalizeName);
  const matches = result.data.filter((pair) => normalized.includes(normalizeName(pair.baseToken.address)));
  if (!matches.length) {
    // getBaseTrendingPairs() only searches currently-trending pairs — a
    // configured address that isn't trending right now simply won't
    // appear here. See docs/API.md's DexScreener section.
    return unavailableSlice("Configured pair address(es) were not found in the current trending-pairs result");
  }

  return { data: matches, status: "live", fetchedAt: result.fetchedAt, matchQuality: "exact", detail: null };
}

function matchTvl(project: Project, result: ProviderResult<defillama.Protocol[]>): ProviderSlice<defillama.Protocol> {
  const slug = project.providerIds.defillamaSlug;
  if (!slug) return notConfiguredSlice("No defillamaSlug configured on this project");
  if (!result.ok) return unavailableSlice(result.error.message);

  // DefiLlama's public protocol list exposes no stable slug field to match
  // against exactly (see docs/API.md) — this is a best-effort match on a
  // slugified protocol name, tracked as "fuzzy" so confidence.ts can weigh
  // it accordingly.
  const match = result.data.find((protocol) => slugify(protocol.name) === slug) ?? null;
  if (!match) return unavailableSlice(`No DefiLlama protocol matched slug "${slug}"`);

  return {
    data: match,
    status: "live",
    fetchedAt: result.fetchedAt,
    matchQuality: "fuzzy",
    detail: "Matched by normalized protocol name, not an exact slug",
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

  return { data: result.data, status: "live", fetchedAt: result.fetchedAt, matchQuality: "exact", detail: null };
}

async function matchGithub(project: Project): Promise<ProviderSlice<github.RepoStats>> {
  if (!project.github) return notConfiguredSlice("No GitHub reference configured on this project");
  if (!project.github.repo) {
    return notConfiguredSlice("Only an org-level GitHub reference is configured (no specific repo)");
  }

  const result = await github.getRepoStats(`${project.github.owner}/${project.github.repo}`);
  if (!result.ok) return unavailableSlice(result.error.message);

  return { data: result.data, status: "live", fetchedAt: result.fetchedAt, matchQuality: "exact", detail: null };
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
    };
    return [provider, attribution] as const;
  });

  return Object.fromEntries(entries) as Sources;
}
