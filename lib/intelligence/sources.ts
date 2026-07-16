/**
 * The only module in this engine that imports from `lib/providers/*`.
 * Owns two jobs: fetching the (cache-backed) bulk provider data every
 * project lookup needs, and matching a single `Project`'s configured
 * identifiers against that bulk data. Every other intelligence module
 * works with the `ProjectSources` bundle this produces, never with the
 * Provider Layer directly.
 */

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

/** Typed `Object.keys` for `ProjectSources` — the one place this cast is written. */
export function sourceKeys(sources: ProjectSources): (keyof ProjectSources)[] {
  return Object.keys(sources) as (keyof ProjectSources)[];
}

export type ProviderBulkData = {
  markets: ProviderResult<coingecko.CoinMarket[]>;
  pairs: ProviderResult<dexscreener.Pair[]>;
  protocols: ProviderResult<defillama.Protocol[]>;
  verifiedContract: ProviderResult<blockscout.VerifiedContract>;
  network: ProviderResult<base.NetworkStatus>;
};

/**
 * Fetches every "shared across all projects" provider result once. Safe to
 * call once per batch (see `engine.ts`'s `getAllProjectIntelligence`) and
 * reuse across many `gatherProjectSources` calls — and cheap even when
 * called once per project, since the Provider Layer's own cache
 * (`lib/providers/common/cache.ts`) de-dupes concurrent and repeated calls
 * within each provider's TTL window.
 */
let bulkCallCounter = 0;

export async function fetchProviderBulkData(): Promise<ProviderBulkData> {
  const label = `fetchProviderBulkData:${++bulkCallCounter}`;
  console.time(label);
  try {
    const [markets, pairs, protocols, verifiedContract, network] = await Promise.all([
      coingecko.getBaseEcosystemMarkets(250),
      dexscreener.getBaseTrendingPairs(),
      defillama.getBaseProtocols(),
      blockscout.getRecentlyVerifiedContract(),
      base.getBaseNetworkStatus(),
    ]);
    return { markets, pairs, protocols, verifiedContract, network };
  } finally {
    console.timeEnd(label);
  }
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

function matchTrading(project: Project, result: ProviderResult<dexscreener.Pair[]>): ProviderSlice<dexscreener.Pair[]> {
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

function matchVerifiedContract(
  project: Project,
  result: ProviderResult<blockscout.VerifiedContract>
): ProviderSlice<blockscout.VerifiedContract> {
  const address = project.providerIds.blockscoutAddress;
  if (!address) return notConfiguredSlice("No blockscoutAddress configured on this project");
  if (!result.ok) return unavailableSlice(result.error.message);

  const isMatch = normalizeName(result.data.address) === normalizeName(address);
  if (!isMatch) {
    // Blockscout's public API only exposes the single most-recently-
    // verified contract chain-wide, not a lookup by address — so this will
    // almost always be "unavailable" unless this project's contract
    // happens to be the very latest one verified on Base. See Future
    // Recommendations in the PR notes for the provider enhancement this
    // would need (a `getContractByAddress`-style function).
    return unavailableSlice("Configured address was not the most recently verified contract on Base");
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
  const label = `gatherProjectSources:${project.slug}`;
  console.time(label);
  try {
    // Fetching the shared bulk data (when not already supplied) and resolving
    // GitHub for this one project are independent — run them concurrently
    // rather than one after the other.
    const [data, githubSlice] = await Promise.all([
      bulk ? Promise.resolve(bulk) : fetchProviderBulkData(),
      matchGithub(project),
    ]);

    return {
      market: matchMarket(project, data.markets),
      trading: matchTrading(project, data.pairs),
      tvl: matchTvl(project, data.protocols),
      network: matchNetwork(project, data.network),
      verifiedContract: matchVerifiedContract(project, data.verifiedContract),
      github: githubSlice,
    };
  } finally {
    console.timeEnd(label);
  }
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
