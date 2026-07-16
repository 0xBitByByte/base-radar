import type { ProjectIntelligence, Health, Confidence, Sources } from "@/lib/intelligence/types";
import type { Chain, ProjectCategory, ProjectTag, VerificationStatus } from "@/data/projects/enums";
import type { ProviderName } from "@/lib/providers/common/types";
import { buildNarrativeSignals, buildProjectSummary, buildRiskAnalysis } from "@/lib/intelligence-engine";

/**
 * "Featured Base Ecosystem Projects" (PR9.2 landing section) reuses the real
 * `ProjectCard` component, which expects a full `ProjectIntelligence` — the
 * Intelligence Engine's computed output, normally only produced by an async,
 * live-provider-hitting call (`getAllProjectIntelligence`). A marketing page
 * shouldn't carry that network dependency (the same reasoning `DASHBOARD_STATS`/
 * `DASHBOARD_HIGHLIGHTS` already establish for the Hero preview), so this
 * hand-builds the same shape instead. `identity`/`community`/`chain` below are
 * sourced from each project's real, reviewed entry in `data/projects/seed/`
 * (name, categories, tags, chains, verification status) — only the
 * `health`/`confidence`/`tvl`/`github` numbers are illustrative, exactly like
 * the Hero preview's own stat values.
 */
type FeaturedProjectSpec = {
  id: string;
  name: string;
  shortDescription: string;
  categories: ProjectCategory[];
  tags: ProjectTag[];
  chains: Chain[];
  verificationStatus: VerificationStatus;
  health: Pick<Health, "score" | "label">;
  confidence: Pick<Confidence, "score" | "level">;
  tvlUsd?: number | null;
  githubStars?: number | null;
  /** Illustrative 24h price change, same rationale as `health`/`confidence` above — drives the marquee tile's "24H" stat and, via `market.changePct24h`, Quick View's own change display. */
  changePct24h?: number | null;
};

const PROVIDER_NAMES: ProviderName[] = ["coingecko", "dexscreener", "defillama", "blockscout", "github", "base"];

function emptySources(): Sources {
  return Object.fromEntries(
    PROVIDER_NAMES.map((provider) => [
      provider,
      { provider, status: "not_configured", fetchedAt: null, detail: null },
    ])
  ) as Sources;
}

function buildFeaturedProject(spec: FeaturedProjectSpec): ProjectIntelligence {
  const now = new Date().toISOString();

  // Reuses the exact same rule-based generation logic the real Intelligence
  // Engine runs for a live project (`lib/intelligence-engine`'s pure
  // functions) — fed this fixture's illustrative numbers, same as
  // `health`/`confidence` above, rather than hand-writing a second copy of
  // this text.
  const summary = buildProjectSummary({
    name: spec.name,
    healthScore: spec.health.score,
    healthLabel: spec.health.label,
    confidenceScore: spec.confidence.score,
    confidenceLevel: spec.confidence.level,
    verificationStatus: spec.verificationStatus,
    changePct24h: spec.changePct24h ?? null,
    tvlUsd: spec.tvlUsd ?? null,
    tvlChangePct24h: null,
    githubStars: spec.githubStars ?? null,
  });

  const narrative =
    spec.changePct24h != null
      ? (buildNarrativeSignals({
          samples: [{ category: spec.categories[0] ?? "General", changePct24h: spec.changePct24h, volumeUsd: 0 }],
        })[0] ?? null)
      : null;

  const risk = buildRiskAnalysis({
    healthScore: spec.health.score,
    confidenceScore: spec.confidence.score,
    verificationStatus: spec.verificationStatus,
    freshness: "fresh",
    hasRecentWhaleActivity: false,
    verifiedContractPct: null,
    liquidityUsd: null,
    tvlChangePct7d: null,
    githubCommitsLast7d: null,
    governanceActiveCount: null,
  });

  return {
    identity: {
      id: spec.id,
      slug: spec.id,
      name: spec.name,
      shortDescription: spec.shortDescription,
      description: spec.shortDescription,
      logoUrl: null,
      websiteUrl: "#",
      categories: spec.categories,
      tags: spec.tags,
      status: "live",
    },
    market: {
      available: spec.changePct24h != null,
      imageUrl: null,
      symbol: null,
      priceUsd: null,
      marketCapUsd: null,
      marketCapRank: null,
      fullyDilutedValuationUsd: null,
      changePct24h: spec.changePct24h ?? null,
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
    },
    tvl: {
      available: spec.tvlUsd != null,
      tvlUsd: spec.tvlUsd ?? null,
      changePct24h: null,
      changePct7d: null,
      changePct30d: null,
      defillamaCategory: null,
    },
    contracts: { count: 0, items: [] },
    github: {
      available: spec.githubStars != null,
      fullName: null,
      stars: spec.githubStars ?? null,
      forks: null,
      openIssues: null,
      latestReleaseTag: null,
      latestReleasePublishedAt: null,
      language: null,
      license: null,
      createdAt: null,
      pushedAt: null,
      commitsLast7d: null,
      commitsPrev7d: null,
      commitTrendPct: null,
    },
    chain: {
      chains: spec.chains,
      primaryChain: spec.chains[0],
      network: { available: false, gasGwei: null, blockHeight: null, estimatedTps: null },
    },
    community: {
      socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null },
      governanceUrl: null,
      verificationStatus: spec.verificationStatus,
    },
    health: { score: spec.health.score, label: spec.health.label, factors: [] },
    sources: emptySources(),
    confidence: { score: spec.confidence.score, level: spec.confidence.level, factors: [] },
    freshness: { newestSourceAt: now, oldestSourceAt: now, overall: "fresh", ageMsBySource: {} },
    metadata: { engineVersion: "landing-preview", generatedAt: now },
    summary,
    narrative,
    risk,
    governance: null,
  };
}

const FEATURED_PROJECT_SPECS: FeaturedProjectSpec[] = [
  {
    id: "aerodrome-finance",
    name: "Aerodrome Finance",
    shortDescription: "The central liquidity hub and ve(3,3) AMM for Base.",
    categories: ["dex", "yield"],
    tags: ["base-native", "real-yield"],
    chains: ["base"],
    verificationStatus: "verified",
    health: { score: 96, label: "excellent" },
    confidence: { score: 98, level: "high" },
    tvlUsd: 1_450_000_000,
    githubStars: 340,
    changePct24h: 4.2,
  },
  {
    id: "aave",
    name: "Aave",
    shortDescription: "Leading decentralized liquidity protocol for lending and borrowing.",
    categories: ["lending"],
    tags: ["cross-chain", "real-yield"],
    chains: ["base", "ethereum", "arbitrum", "optimism", "polygon", "avalanche"],
    verificationStatus: "verified",
    health: { score: 97, label: "excellent" },
    confidence: { score: 99, level: "high" },
    tvlUsd: 13_200_000_000,
    githubStars: 1150,
    changePct24h: 1.8,
  },
  {
    id: "morpho",
    name: "Morpho",
    shortDescription: "Peer-to-peer lending layer built on top of existing money markets.",
    categories: ["lending"],
    tags: ["real-yield", "developer-tooling"],
    chains: ["base", "ethereum"],
    verificationStatus: "verified",
    health: { score: 93, label: "excellent" },
    confidence: { score: 95, level: "high" },
    tvlUsd: 1_800_000_000,
    githubStars: 410,
    changePct24h: 6.5,
  },
  {
    id: "virtuals-protocol",
    name: "Virtuals Protocol",
    shortDescription: "Launchpad and framework for tokenized, autonomous AI agents on Base.",
    categories: ["ai"],
    tags: ["ai-agents", "base-native"],
    chains: ["base"],
    verificationStatus: "community",
    health: { score: 82, label: "good" },
    confidence: { score: 74, level: "medium" },
    tvlUsd: null,
    githubStars: null,
    changePct24h: 12.4,
  },
  {
    id: "zora",
    name: "Zora",
    shortDescription: "Onchain platform for creators to mint, collect, and trade media as NFTs.",
    categories: ["nft"],
    tags: ["creator-economy", "base-native"],
    chains: ["base", "ethereum", "optimism"],
    verificationStatus: "community",
    health: { score: 85, label: "good" },
    confidence: { score: 78, level: "medium" },
    tvlUsd: null,
    githubStars: 210,
    changePct24h: -3.1,
  },
  {
    id: "farcaster",
    name: "Farcaster",
    shortDescription: "Sufficiently decentralized social network built on Base and Optimism.",
    categories: ["social"],
    tags: ["onchain-social", "base-native"],
    chains: ["optimism", "base"],
    verificationStatus: "community",
    health: { score: 88, label: "good" },
    confidence: { score: 80, level: "medium" },
    tvlUsd: null,
    githubStars: 560,
    changePct24h: 2.7,
  },
  {
    id: "moonwell",
    name: "Moonwell",
    shortDescription: "Open lending and borrowing markets native to the Base ecosystem.",
    categories: ["lending"],
    tags: ["base-native", "real-yield"],
    chains: ["base"],
    verificationStatus: "community",
    health: { score: 89, label: "good" },
    confidence: { score: 84, level: "high" },
    tvlUsd: 220_000_000,
    githubStars: 95,
    changePct24h: 3.9,
  },
  {
    id: "hydrex",
    name: "Hydrex",
    shortDescription: "Perpetuals and yield trading protocol built natively for Base.",
    categories: ["derivatives"],
    tags: ["base-native", "perpetuals"],
    chains: ["base"],
    verificationStatus: "community",
    health: { score: 74, label: "fair" },
    confidence: { score: 68, level: "medium" },
    tvlUsd: 42_000_000,
    githubStars: null,
    changePct24h: -5.8,
  },
  {
    id: "basenames",
    name: "Basenames",
    shortDescription: "Onchain naming service for human-readable Base identities.",
    categories: ["identity"],
    tags: ["base-native", "public-good"],
    chains: ["base"],
    verificationStatus: "verified",
    health: { score: 91, label: "excellent" },
    confidence: { score: 90, level: "high" },
    tvlUsd: null,
    githubStars: null,
    changePct24h: 0.9,
  },
  {
    id: "clanker",
    name: "Clanker",
    shortDescription: "Onchain AI agent for deploying tokens directly from social posts.",
    categories: ["ai"],
    tags: ["ai-agents", "onchain-social", "base-native"],
    chains: ["base"],
    verificationStatus: "unverified",
    health: { score: 63, label: "fair" },
    confidence: { score: 52, level: "low" },
    tvlUsd: null,
    githubStars: null,
    changePct24h: -8.2,
  },
  {
    id: "compound",
    name: "Compound",
    shortDescription: "Algorithmic, autonomous interest rate protocol for lending markets.",
    categories: ["lending"],
    tags: ["cross-chain", "real-yield"],
    chains: ["base", "ethereum", "arbitrum", "polygon"],
    verificationStatus: "verified",
    health: { score: 95, label: "excellent" },
    confidence: { score: 97, level: "high" },
    tvlUsd: 2_650_000_000,
    githubStars: 780,
    changePct24h: 1.1,
  },
  {
    id: "curve-finance",
    name: "Curve Finance",
    shortDescription: "Efficient stableswap AMM for low-slippage trading between similarly priced assets.",
    categories: ["dex"],
    tags: ["cross-chain", "real-yield"],
    chains: ["base", "ethereum", "arbitrum", "optimism", "polygon"],
    verificationStatus: "verified",
    health: { score: 92, label: "excellent" },
    confidence: { score: 94, level: "high" },
    tvlUsd: 1_950_000_000,
    githubStars: 640,
    changePct24h: 2.3,
  },
  {
    id: "balancer",
    name: "Balancer",
    shortDescription: "Flexible AMM protocol supporting custom pool weightings and composable liquidity.",
    categories: ["dex"],
    tags: ["cross-chain"],
    chains: ["base", "ethereum", "arbitrum", "polygon"],
    verificationStatus: "verified",
    health: { score: 88, label: "good" },
    confidence: { score: 91, level: "high" },
    tvlUsd: 486_000_000,
    githubStars: 380,
    changePct24h: -1.4,
  },
  {
    id: "spark",
    name: "Spark",
    shortDescription: "Sky (formerly MakerDAO) lending and savings protocol extending onto Base.",
    categories: ["lending"],
    tags: ["cross-chain", "real-yield"],
    chains: ["base", "ethereum"],
    verificationStatus: "community",
    health: { score: 86, label: "good" },
    confidence: { score: 82, level: "high" },
    tvlUsd: 1_100_000_000,
    githubStars: 120,
    changePct24h: 4.6,
  },
  {
    id: "uniswap",
    name: "Uniswap",
    shortDescription: "The most widely used decentralized exchange protocol, live on Base.",
    categories: ["dex"],
    tags: ["cross-chain"],
    chains: ["base", "ethereum", "arbitrum", "optimism", "polygon"],
    verificationStatus: "verified",
    health: { score: 98, label: "excellent" },
    confidence: { score: 99, level: "high" },
    tvlUsd: 4_800_000_000,
    githubStars: 5100,
    changePct24h: 1.6,
  },
  {
    id: "seamless-protocol",
    name: "Seamless Protocol",
    shortDescription: "Base-native, community-governed lending and borrowing protocol.",
    categories: ["lending"],
    tags: ["base-native", "real-yield"],
    chains: ["base"],
    verificationStatus: "community",
    health: { score: 80, label: "good" },
    confidence: { score: 76, level: "medium" },
    tvlUsd: 95_000_000,
    githubStars: 60,
    changePct24h: 5.2,
  },
  {
    id: "extra-finance",
    name: "Extra Finance",
    shortDescription: "Leveraged yield farming and lending protocol native to Base.",
    categories: ["yield", "lending"],
    tags: ["base-native"],
    chains: ["base", "optimism"],
    verificationStatus: "community",
    health: { score: 77, label: "fair" },
    confidence: { score: 71, level: "medium" },
    tvlUsd: 58_000_000,
    githubStars: null,
    changePct24h: -2.9,
  },
  {
    id: "oku",
    name: "Oku",
    shortDescription: "Advanced trading interface for concentrated-liquidity DEXs across chains.",
    categories: ["dex"],
    tags: ["cross-chain"],
    chains: ["base"],
    verificationStatus: "unverified",
    health: { score: 66, label: "fair" },
    confidence: { score: 55, level: "low" },
    tvlUsd: null,
    githubStars: null,
    changePct24h: -6.7,
  },
  {
    id: "superchain-eco",
    name: "Superchain Eco",
    shortDescription: "Interoperability tooling connecting Base to the wider OP Superchain.",
    categories: ["infrastructure"],
    tags: ["cross-chain"],
    chains: ["base", "optimism"],
    verificationStatus: "community",
    health: { score: 79, label: "good" },
    confidence: { score: 70, level: "medium" },
    tvlUsd: null,
    githubStars: null,
    changePct24h: 3.3,
  },
  {
    id: "based-agents",
    name: "Based Agents",
    shortDescription: "Framework for deploying autonomous onchain agents native to Base.",
    categories: ["ai"],
    tags: ["ai-agents", "base-native"],
    chains: ["base"],
    verificationStatus: "unverified",
    health: { score: 60, label: "fair" },
    confidence: { score: 48, level: "low" },
    tvlUsd: null,
    githubStars: null,
    changePct24h: -11.5,
  },
];

export const FEATURED_PROJECTS: ProjectIntelligence[] = FEATURED_PROJECT_SPECS.map(buildFeaturedProject);
