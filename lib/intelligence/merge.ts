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
  Tvl,
} from "@/lib/intelligence/types";

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

export function mergeMarket(sources: ProjectSources): Market {
  const market = sources.market.data;
  return {
    available: sources.market.status === "live" && market !== null,
    priceUsd: market?.priceUsd ?? null,
    marketCapUsd: market?.marketCapUsd ?? null,
    fullyDilutedValuationUsd: market?.fullyDilutedValuationUsd ?? null,
    changePct24h: market?.changePct24h ?? null,
    sparkline7d: market?.sparkline7d ?? [],
  };
}

export function mergeTrading(sources: ProjectSources): Trading {
  const pairs = sources.trading.data ?? [];
  const available = sources.trading.status === "live" && pairs.length > 0;

  return {
    available,
    volume24hUsd: available ? sumBy(pairs, (p) => p.volume24hUsd ?? 0) : null,
    liquidityUsd: available ? sumBy(pairs, (p) => p.liquidityUsd ?? 0) : null,
    buys24h: available ? sumBy(pairs, (p) => p.buys24h ?? 0) : null,
    sells24h: available ? sumBy(pairs, (p) => p.sells24h ?? 0) : null,
    priceChangePct24h: available ? (pairs[0].priceChangePct24h ?? null) : null,
    pairCount: pairs.length,
  };
}

export function mergeTvl(sources: ProjectSources): Tvl {
  const protocol = sources.tvl.data;
  return {
    available: sources.tvl.status === "live" && protocol !== null,
    tvlUsd: protocol?.tvlUsd ?? null,
    changePct24h: protocol?.changePct24h ?? null,
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

export function mergeGithub(sources: ProjectSources): GithubIntel {
  const repo = sources.github.data;
  return {
    available: sources.github.status === "live" && repo !== null,
    fullName: repo?.fullName ?? null,
    stars: repo?.stars ?? null,
    forks: repo?.forks ?? null,
    openIssues: repo?.openIssues ?? null,
    latestReleaseTag: repo?.latestReleaseTag ?? null,
    latestReleasePublishedAt: repo?.latestReleasePublishedAt ?? null,
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
    },
    verificationStatus: project.verification.status,
  };
}
