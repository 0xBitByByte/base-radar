import type { PROVIDER_NAMES } from "@/lib/providers/common/types";
import type { MetricResolution, SourceAttribution } from "@/lib/providers/common/resolution";
import type { ProjectIntelligence, Sources } from "@/lib/intelligence/types";
import type { DiscoveryProject } from "@/lib/discovery/project";
import type { LiveProject } from "@/lib/projects/types";
import { registryProject } from "../discovery/fixtures";

type ProviderName = (typeof PROVIDER_NAMES)[number];

const NOT_CONFIGURED_ATTRIBUTION: SourceAttribution = { provider: "coingecko", status: "not_configured", fetchedAt: null, detail: "Not configured in this fixture." };

function unresolvedMetric<T>(): MetricResolution<T> {
  return { value: null, provider: null, attemptedProviders: [], fallbackUsed: false, lastUpdated: null, confidence: null, failureReason: "No provider configured in this fixture." };
}

function sourcesFixture(): Sources {
  const providers: ProviderName[] = ["coingecko", "dexscreener", "defillama", "blockscout", "github", "base"];
  return Object.fromEntries(providers.map((provider) => [provider, { ...NOT_CONFIGURED_ATTRIBUTION, provider }])) as Sources;
}

/** A minimal-but-complete `ProjectIntelligence` fixture — every field a real, honest "no data" default, overridable per test. */
export function intelligence(overrides: Partial<ProjectIntelligence> = {}): ProjectIntelligence {
  return {
    identity: {
      id: "test-project",
      slug: "test-project",
      name: "Test Project",
      shortDescription: "A test project.",
      description: "A test project used only in unit tests.",
      logoUrl: null,
      websiteUrl: "https://test-project.example",
      categories: ["dex"],
      tags: [],
      status: "live",
    },
    market: {
      available: false,
      imageUrl: null,
      symbol: null,
      priceUsd: null,
      marketCapUsd: null,
      marketCapRank: null,
      fullyDilutedValuationUsd: null,
      changePct24h: null,
      changePct7d: null,
      changePct30d: null,
      circulatingSupply: null,
      totalSupply: null,
      maxSupply: null,
      athUsd: null,
      athDate: null,
      atlUsd: null,
      atlDate: null,
      sparkline7d: [],
      genesisDate: null,
      priceResolution: unresolvedMetric(),
    },
    trading: {
      available: false,
      volume24hUsd: null,
      liquidityUsd: null,
      buys24h: null,
      sells24h: null,
      priceChangePct24h: null,
      pairCount: 0,
      pools: [],
      largestPool: null,
      volumeResolution: unresolvedMetric(),
      liquidityResolution: unresolvedMetric(),
    },
    tvl: {
      available: false,
      tvlUsd: null,
      changePct24h: null,
      changePct7d: null,
      changePct30d: null,
      defillamaCategory: null,
      tvlResolution: unresolvedMetric(),
      imageUrl: null,
    },
    contracts: { count: 0, items: [] },
    github: {
      available: false,
      fullName: null,
      stars: null,
      forks: null,
      openIssues: null,
      latestReleaseTag: null,
      latestReleasePublishedAt: null,
      latestReleaseNoteSummary: null,
      language: null,
      license: null,
      createdAt: null,
      pushedAt: null,
      commitsLast7d: null,
      commitsPrev7d: null,
      commitTrendPct: null,
      avatarUrl: null,
    },
    chain: {
      chains: ["base"],
      primaryChain: "base",
      network: { available: false, gasGwei: null, blockHeight: null, estimatedTps: null },
    },
    community: {
      socials: {
        twitter: null,
        discord: null,
        telegram: null,
        farcaster: null,
        docs: null,
        blog: null,
        forum: null,
        medium: null,
        mirror: null,
        linkedin: null,
      },
      governanceUrl: null,
      verificationStatus: "verified",
    },
    health: { score: 50, label: "unknown", factors: [] },
    sources: sourcesFixture(),
    confidence: { score: 50, level: "medium", factors: [] },
    freshness: { newestSourceAt: null, oldestSourceAt: null, overall: "unknown", ageMsBySource: {} },
    metadata: { engineVersion: "test", generatedAt: "2026-01-01T00:00:00.000Z" },
    summary: "A test project used only in unit tests.",
    narrative: null,
    risk: { level: "moderate", explanation: "No risk analysis in this fixture.", contributors: [] },
    governance: null,
    ...overrides,
  };
}

export { registryProject };

/** A minimal-but-complete `DiscoveryProject` fixture. */
export function discoveryProject(overrides: Partial<DiscoveryProject> = {}): DiscoveryProject {
  return {
    id: "coingecko:test-coin",
    displayName: "Test Project",
    normalizedName: "test project",
    socials: {},
    contracts: [],
    discoveredAt: "2026-01-01T00:00:00.000Z",
    category: "dex",
    tags: [],
    status: "discovered",
    confidence: { score: 50, level: "medium", factors: [] },
    sources: ["coingecko"],
    evidence: {
      registryMatch: { type: "new", project: null, matches: [], strongestMatch: null, reason: "No existing registry project shares any identifier with this candidate." },
      classification: { category: "dex", tags: [], confidence: "low", method: "unclassified", evidence: null },
      confidence: { score: 50, level: "medium", factors: [] },
      enrichment: { hasLiveMarketData: false, hasLiveTvlData: false, volume24hUsd: null, tvlUsd: null, changePct24h: null, githubActivity: null },
      statusReason: "No existing registry match and no corroborating activity evidence yet — a bare, unconfirmed discovery.",
    },
    ...overrides,
  };
}

/** A minimal-but-complete `LiveProject` fixture for testing collections/sort/filter/search/pagination in isolation from `build.ts`. */
export function liveProject(overrides: Partial<LiveProject> = {}): LiveProject {
  return {
    id: "test-project",
    slug: "test-project",
    source: "registry",
    identity: {
      name: "Test Project",
      shortDescription: "A test project.",
      description: "A test project.",
      logoUrl: null,
      logoUrlFallbacks: [],
      websiteUrl: "https://test-project.example",
    },
    category: "dex",
    subcategories: [],
    chains: ["base"],
    status: "live",
    discoveryStatus: null,
    verification: { status: "verified", level: null, verifiedAt: null },
    confidence: { score: 50, level: "medium", source: "intelligence" },
    providerAttribution: null,
    discoveryEvidence: null,
    searchIdentifiers: { symbol: null, aliases: [], coingeckoId: null, defillamaSlug: null, github: null, contractAddresses: [] },
    market: { available: false, priceUsd: null, changePct24h: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null },
    community: { verificationStatus: "verified", socialLinkCount: 0, socialLinkTotal: 10, governanceConfigured: false },
    engineering: { available: false, stars: null, forks: null, commitsLast7d: null, commitTrendPct: null, hasRecentActivity: false },
    governance: { configured: false, activeProposalCount: null, totalProposalCount: null },
    contracts: { count: 0, verifiedCount: 0 },
    lastUpdated: "2026-01-01T00:00:00.000Z",
    discoveryMetadata: null,
    ...overrides,
  };
}
