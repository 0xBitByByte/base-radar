/**
 * Pure combination logic: `Project` (Project Registry) + `ProjectSources`
 * (Provider Layer, already matched by `sources.ts`) → the normalized
 * output sections of `ProjectIntelligence`. No I/O, no caching, no
 * provider-specific knowledge beyond reading the already-mapped domain
 * types `sources.ts` hands over.
 *
 * Deliberately excludes `Health`, `Confidence`, and `Freshness` — those
 * need cross-cutting context (timestamps, success/failure counts) beyond a
 * simple merge, so they live in `scoring.ts`, `confidence.ts`, and
 * `freshness.ts` respectively.
 */

import type { Project } from "@/data/projects/types";
import { normalizeName, sumBy } from "@/lib/intelligence/helpers";
import type {
  ChainInfo,
  Community,
  ContractInfo,
  Contracts,
  GithubIntel,
  Identity,
  Market,
  ProjectSources,
  Trading,
  TradingPool,
  Tvl,
} from "@/lib/intelligence/types";
import type { CommitActivity } from "@/lib/providers/github/service";
import type { SparklinePoint } from "@/lib/data/types";

/**
 * Real percentage change between the oldest point in `history` at least
 * `days` old and the most recent point. `null` when the series doesn't
 * reach back that far. Exported (not just used internally by `mergeTvl`) so
 * the Project Profile page can apply the exact same math to a TVL history
 * series that streams in after first paint, instead of re-deriving it.
 */
export function changePctOverDays(history: SparklinePoint[] | null, days: number): number | null {
  if (!history || history.length < 2) return null;
  const latest = history[history.length - 1];
  // DefiLlama timestamps are unix seconds.
  const targetT = latest.t - days * 86_400;
  const past = history.find((point) => point.t >= targetT);
  if (!past || past.v <= 0) return null;
  return ((latest.v - past.v) / past.v) * 100;
}

export function mergeIdentity(project: Project): Identity {
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    shortDescription: project.shortDescription,
    description: project.description,
    logoUrl: project.logoUrl ?? null,
    websiteUrl: project.websiteUrl,
    categories: project.categories,
    tags: project.tags,
    status: project.status,
  };
}

export function mergeMarket(sources: ProjectSources, genesisDate: string | null = null): Market {
  const market = sources.market.data;
  return {
    available: sources.market.status === "live" && market !== null,
    imageUrl: market?.imageUrl ?? null,
    symbol: market?.symbol ?? null,
    priceUsd: market?.priceUsd ?? null,
    marketCapUsd: market?.marketCapUsd ?? null,
    marketCapRank: market?.marketCapRank ?? null,
    fullyDilutedValuationUsd: market?.fullyDilutedValuationUsd ?? null,
    changePct24h: market?.changePct24h ?? null,
    changePct7d: market?.changePct7d ?? null,
    changePct30d: market?.changePct30d ?? null,
    circulatingSupply: market?.circulatingSupply ?? null,
    totalSupply: market?.totalSupply ?? null,
    maxSupply: market?.maxSupply ?? null,
    athUsd: market?.athUsd ?? null,
    athDate: market?.athDate ?? null,
    atlUsd: market?.atlUsd ?? null,
    atlDate: market?.atlDate ?? null,
    sparkline7d: market?.sparkline7d ?? [],
    genesisDate,
  };
}

export function mergeTrading(sources: ProjectSources): Trading {
  const pairs = sources.trading.data ?? [];
  const available = sources.trading.status === "live" && pairs.length > 0;

  const pools: TradingPool[] = available
    ? pairs
        .map((p) => ({
          dexId: p.dexId,
          liquidityUsd: p.liquidityUsd,
          volume24hUsd: p.volume24hUsd,
          pairCreatedAt: p.pairCreatedAt,
          baseTokenSymbol: p.baseToken.symbol,
        }))
        .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0))
    : [];

  return {
    available,
    volume24hUsd: available ? sumBy(pairs, (p) => p.volume24hUsd ?? 0) : null,
    liquidityUsd: available ? sumBy(pairs, (p) => p.liquidityUsd ?? 0) : null,
    buys24h: available ? sumBy(pairs, (p) => p.buys24h ?? 0) : null,
    sells24h: available ? sumBy(pairs, (p) => p.sells24h ?? 0) : null,
    priceChangePct24h: available ? (pairs[0].priceChangePct24h ?? null) : null,
    pairCount: pairs.length,
    pools,
    largestPool: pools[0] ?? null,
  };
}

export function mergeTvl(sources: ProjectSources, tvlHistory: SparklinePoint[] | null = null): Tvl {
  const protocol = sources.tvl.data;
  return {
    available: sources.tvl.status === "live" && protocol !== null,
    tvlUsd: protocol?.tvlUsd ?? null,
    changePct24h: protocol?.changePct24h ?? null,
    changePct7d: changePctOverDays(tvlHistory, 7),
    changePct30d: changePctOverDays(tvlHistory, 30),
    defillamaCategory: protocol?.category ?? null,
  };
}

export function mergeContracts(project: Project, sources: ProjectSources): Contracts {
  const verifiedAddress = sources.verifiedContract.data?.address;

  const items: ContractInfo[] = project.contracts.map((contract) => ({
    chain: contract.chain,
    address: contract.address,
    type: contract.type,
    label: contract.label ?? null,
    verified: verifiedAddress && normalizeName(verifiedAddress) === normalizeName(contract.address) ? true : null,
  }));

  return { count: items.length, items };
}

export function mergeGithub(sources: ProjectSources, commitActivity: CommitActivity | null = null): GithubIntel {
  const repo = sources.github.data;
  return {
    available: sources.github.status === "live" && repo !== null,
    fullName: repo?.fullName ?? null,
    stars: repo?.stars ?? null,
    forks: repo?.forks ?? null,
    openIssues: repo?.openIssues ?? null,
    latestReleaseTag: repo?.latestReleaseTag ?? null,
    latestReleasePublishedAt: repo?.latestReleasePublishedAt ?? null,
    latestReleaseNoteSummary: repo?.latestReleaseNoteSummary ?? null,
    language: repo?.language ?? null,
    license: repo?.license ?? null,
    createdAt: repo?.createdAt ?? null,
    pushedAt: repo?.pushedAt ?? null,
    commitsLast7d: commitActivity?.commitsLast7d ?? null,
    commitsPrev7d: commitActivity?.commitsPrev7d ?? null,
    commitTrendPct: commitActivity?.trendPct ?? null,
  };
}

export function mergeChain(project: Project, sources: ProjectSources): ChainInfo {
  const network = sources.network.data;
  return {
    chains: project.chains,
    primaryChain: project.chains[0] ?? "base",
    network: {
      available: sources.network.status === "live" && network !== null,
      gasGwei: network?.gasGwei ?? null,
      blockHeight: network?.blockHeight ?? null,
      estimatedTps: network?.estimatedTps ?? null,
    },
  };
}

export function mergeCommunity(project: Project): Community {
  return {
    socials: {
      twitter: project.social.twitter ?? null,
      discord: project.social.discord ?? null,
      telegram: project.social.telegram ?? null,
      farcaster: project.social.farcaster ?? null,
      docs: project.social.docs ?? null,
      blog: project.social.blog ?? null,
      forum: project.social.forum ?? null,
      medium: project.social.medium ?? null,
      mirror: project.social.mirror ?? null,
      linkedin: project.social.linkedin ?? null,
    },
    governanceUrl: project.governance?.governanceUrl ?? null,
    verificationStatus: project.verification.status,
  };
}
