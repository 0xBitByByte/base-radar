/**
 * PR-054 — the two adapters that turn this codebase's two existing project
 * models (`ProjectIntelligence` from `lib/intelligence/`, `DiscoveryProject`
 * from `lib/discovery/`) into the one shared `LiveProject` shape. Pure
 * functions, no fetching — `service.ts` is the only place that decides
 * *which* adapter to call for a given project and *when* to run them.
 */

import type { Project, SocialLinks } from "@/data/projects/types";
import type { ProjectIntelligence } from "@/lib/intelligence/types";
import type { DiscoveryProject } from "@/lib/discovery/project";
import type {
  CommunitySummary,
  ContractSummary,
  EngineeringSummary,
  GovernanceSummary,
  LiveProject,
  MarketSummary,
  SearchIdentifiers,
} from "@/lib/projects/types";

/**
 * PR-072 — the one logo-resolution priority order, used by both adapters
 * below: Registry `logoUrl` (editorial, most trusted) → CoinGecko token
 * image → DefiLlama protocol logo → GitHub org/repo avatar → (handled by
 * `ProjectLogo` itself, not here) generated initials as the last resort.
 * Every candidate here is real, already-fetched provider data — nothing is
 * a new request, and nothing is fabricated. Returns the winning URL plus
 * every other real candidate in the same order, so a caller can retry a
 * lower-priority source if the winner's URL turns out to be broken (a 404)
 * rather than jumping straight to initials.
 */
function resolveLogoUrl(candidates: (string | null)[]): { logoUrl: string | null; logoUrlFallbacks: string[] } {
  const real = candidates.filter((url): url is string => Boolean(url));
  return { logoUrl: real[0] ?? null, logoUrlFallbacks: real.slice(1) };
}

const SOCIAL_LINK_FIELDS: (keyof SocialLinks)[] = [
  "twitter",
  "discord",
  "telegram",
  "farcaster",
  "docs",
  "blog",
  "forum",
  "medium",
  "mirror",
  "linkedin",
];

/**
 * Builds the `LiveProject` for a registry-tracked project. `matchedDiscovery`
 * is the `DiscoveryProject` this run's Discovery pipeline matched back to
 * `project` (via a `"duplicate"|"updated"|"renamed"` `RegistryMatchType`) —
 * `null` when Discovery didn't (re)surface this project this run, which is
 * the common case and not an error.
 */
export function buildLiveProjectFromIntelligence(
  project: Project,
  intelligence: ProjectIntelligence,
  matchedDiscovery: DiscoveryProject | null
): LiveProject {
  const { identity, market, trading, tvl, contracts, github, chain, community, confidence, governance, sources, metadata } = intelligence;

  const socialLinkCount = SOCIAL_LINK_FIELDS.filter((field) => Boolean(project.social[field])).length;

  const marketSummary: MarketSummary = {
    available: market.available,
    priceUsd: market.priceUsd,
    changePct24h: market.changePct24h,
    marketCapUsd: market.marketCapUsd,
    fdvUsd: market.fullyDilutedValuationUsd,
    volume24hUsd: trading.volume24hUsd,
    liquidityUsd: trading.liquidityUsd,
    tvlUsd: tvl.tvlUsd,
  };

  const communitySummary: CommunitySummary = {
    verificationStatus: community.verificationStatus,
    socialLinkCount,
    socialLinkTotal: SOCIAL_LINK_FIELDS.length,
    governanceConfigured: community.governanceUrl !== null,
  };

  const engineeringSummary: EngineeringSummary = {
    available: github.available,
    stars: github.stars,
    forks: github.forks,
    commitsLast7d: github.commitsLast7d,
    commitTrendPct: github.commitTrendPct,
    hasRecentActivity: (github.commitsLast7d ?? 0) > 0,
  };

  const governanceSummary: GovernanceSummary = {
    configured: Boolean(project.governance?.snapshotSpace),
    activeProposalCount: governance ? governance.filter((event) => event.status === "active").length : null,
    totalProposalCount: governance ? governance.length : null,
  };

  const contractSummary: ContractSummary = {
    count: contracts.count,
    verifiedCount: contracts.items.filter((item) => item.verified === true).length,
  };

  const searchIdentifiers: SearchIdentifiers = {
    symbol: market.symbol,
    aliases: matchedDiscovery && matchedDiscovery.displayName !== project.name ? [matchedDiscovery.displayName] : [],
    coingeckoId: project.providerIds.coingeckoId ?? null,
    defillamaSlug: project.providerIds.defillamaSlug ?? null,
    github: github.fullName,
    contractAddresses: contracts.items.map((item) => item.address),
  };

  // PR-072 — the full priority chain (see `resolveLogoUrl`'s own doc comment):
  // registry → CoinGecko → DefiLlama → GitHub avatar. Previously stopped at
  // CoinGecko, which is exactly why a real, well-known project whose token
  // CoinGecko doesn't tag `category=base-ecosystem` (Uniswap being the
  // clearest example — see `sources.ts`'s `mergeMarketResults`) fell all the
  // way to initials even though this app already fetches its DefiLlama/
  // GitHub data anyway.
  const { logoUrl, logoUrlFallbacks } = resolveLogoUrl([
    identity.logoUrl,
    market.available ? market.imageUrl : null,
    tvl.available ? tvl.imageUrl : null,
    github.available ? github.avatarUrl : null,
  ]);

  return {
    id: project.id,
    slug: project.slug,
    source: "registry",
    identity: {
      name: identity.name,
      shortDescription: identity.shortDescription,
      description: identity.description,
      logoUrl,
      logoUrlFallbacks,
      websiteUrl: identity.websiteUrl,
    },
    category: identity.categories[0] ?? "other",
    subcategories: identity.tags,
    chains: chain.chains,
    status: identity.status,
    discoveryStatus: matchedDiscovery?.status ?? null,
    verification: {
      status: project.verification.status,
      level: project.verificationLevel?.level ?? null,
      verifiedAt: project.verification.verifiedAt ?? null,
    },
    confidence: { score: confidence.score, level: confidence.level, source: "intelligence" },
    providerAttribution: sources,
    discoveryEvidence: matchedDiscovery?.evidence ?? null,
    searchIdentifiers,
    market: marketSummary,
    community: communitySummary,
    engineering: engineeringSummary,
    governance: governanceSummary,
    contracts: contractSummary,
    lastUpdated: metadata.generatedAt,
    discoveryMetadata: matchedDiscovery
      ? {
          sources: matchedDiscovery.sources,
          discoveredAt: matchedDiscovery.discoveredAt,
          registryMatchType: matchedDiscovery.evidence.registryMatch.type,
        }
      : null,
  };
}

const DISCOVERY_SOCIAL_LINK_FIELDS: (keyof DiscoveryProject["socials"])[] = ["twitter", "discord", "telegram", "farcaster"];

/**
 * Builds the `LiveProject` for a discovery-only project — one Discovery
 * surfaced with no confirmed registry match (`RegistryMatchType` of
 * `"new"|"alias"|"needs-review"`, per `service.ts`'s merge rule). Every
 * field this project has no real evidence for is `null`/`false`/`0`, never
 * guessed — a discovery candidate is, by construction, thinner than a fully
 * intelligence-enriched registry project.
 */
export function buildLiveProjectFromDiscovery(discoveryProject: DiscoveryProject): LiveProject {
  const { evidence } = discoveryProject;
  const { enrichment } = evidence;

  const chains = Array.from(new Set(discoveryProject.contracts.map((contract) => contract.chain)));
  const socialLinkCount = DISCOVERY_SOCIAL_LINK_FIELDS.filter((field) => Boolean(discoveryProject.socials[field])).length;

  const marketSummary: MarketSummary = {
    available: enrichment.hasLiveMarketData,
    priceUsd: null,
    changePct24h: enrichment.changePct24h,
    marketCapUsd: null,
    fdvUsd: null,
    volume24hUsd: enrichment.volume24hUsd,
    liquidityUsd: null,
    tvlUsd: enrichment.tvlUsd,
  };

  const communitySummary: CommunitySummary = {
    verificationStatus: null,
    socialLinkCount,
    socialLinkTotal: DISCOVERY_SOCIAL_LINK_FIELDS.length,
    governanceConfigured: false,
  };

  const engineeringSummary: EngineeringSummary = {
    available: enrichment.githubActivity !== null,
    stars: null,
    forks: null,
    commitsLast7d: enrichment.githubActivity?.commitsLast7d ?? null,
    commitTrendPct: null,
    hasRecentActivity: enrichment.githubActivity?.hasRecentActivity ?? false,
  };

  const governanceSummary: GovernanceSummary = { configured: false, activeProposalCount: null, totalProposalCount: null };

  const contractSummary: ContractSummary = { count: discoveryProject.contracts.length, verifiedCount: null };

  const matchedProject = evidence.registryMatch.project;
  const searchIdentifiers: SearchIdentifiers = {
    symbol: null,
    aliases: matchedProject && matchedProject.name !== discoveryProject.displayName ? [matchedProject.name] : [],
    coingeckoId: discoveryProject.coingeckoId ?? null,
    defillamaSlug: discoveryProject.defillamaSlug ?? null,
    github: discoveryProject.github ? `${discoveryProject.github.owner}${discoveryProject.github.repo ? `/${discoveryProject.github.repo}` : ""}` : null,
    contractAddresses: discoveryProject.contracts.map((contract) => contract.address),
  };

  return {
    id: discoveryProject.id,
    slug: null,
    source: "discovery",
    identity: {
      name: discoveryProject.displayName,
      shortDescription: null,
      description: null,
      // PR-072 — was unconditionally `null` regardless of what Discovery
      // actually found; `discoveryProject.logoUrl` is real, already-fetched
      // provider image data (CoinGecko/DefiLlama) that a discovery-only
      // project simply never had a field to carry through before now (see
      // `lib/discovery/project.ts`'s `pickCandidateLogoUrl`). No registry
      // record and no per-project GitHub call exist for a discovery-only
      // project, so this is the one candidate available here — never a
      // fabricated fallback.
      logoUrl: discoveryProject.logoUrl ?? null,
      logoUrlFallbacks: [],
      websiteUrl: discoveryProject.website ?? null,
    },
    category: discoveryProject.category,
    subcategories: discoveryProject.tags,
    chains,
    status: null,
    discoveryStatus: discoveryProject.status,
    verification: { status: null, level: null, verifiedAt: null },
    confidence: { score: discoveryProject.confidence.score, level: discoveryProject.confidence.level, source: "discovery" },
    providerAttribution: null,
    discoveryEvidence: evidence,
    searchIdentifiers,
    market: marketSummary,
    community: communitySummary,
    engineering: engineeringSummary,
    governance: governanceSummary,
    contracts: contractSummary,
    lastUpdated: discoveryProject.discoveredAt,
    discoveryMetadata: {
      sources: discoveryProject.sources,
      discoveredAt: discoveryProject.discoveredAt,
      registryMatchType: evidence.registryMatch.type,
    },
  };
}
