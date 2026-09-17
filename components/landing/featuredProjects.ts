import type { MetricResolution, ProjectIntelligence, Health, Confidence, Sources } from "@/lib/intelligence/types";
import type { Chain, ProjectCategory, ProjectTag, VerificationStatus } from "@/data/projects/enums";
import type { ProviderName } from "@/lib/providers/common/types";
import { buildNarrativeSignals, buildProjectSummary, buildRiskAnalysis } from "@/lib/intelligence-engine";
import { getProject } from "@/data/projects/helpers";
import type { FeaturedIntelligenceSnapshot } from "@/lib/data/featuredIntelligenceSnapshot";
import { radarScoreToHealthLabel } from "@/lib/intelligence/radarScore";

/** This landing page never calls the real Provider Layer (see the module comment below), so there's no real resolution path to report — an empty, honest "no provider configured" resolution for every illustrative numeric field. */
function emptyResolution<T>(): MetricResolution<T> {
  return {
    value: null,
    provider: null,
    attemptedProviders: [],
    fallbackUsed: false,
    lastUpdated: null,
    confidence: null,
    failureReason: "This marketing preview doesn't call the live Provider Layer.",
  };
}

/**
 * PR-098.02 — Featured Ecosystem 24H% semantics audit. This tile's "24H"
 * stat purports to be THE PROJECT'S OWN TOKEN USD PRICE CHANGE — a claim
 * about a specific real-world quantity, unlike `health`/`confidence`
 * (generic illustrative scores that apply to any project regardless of
 * whether it has a token at all). Showing a number here for a project with
 * no real, verified token mapping would be a fabricated fact, not just an
 * "illustrative" one — so this cross-checks the canonical registry
 * (`data/projects/seed/`, the same source of truth PR-098.01 established
 * real provider mappings in) and nulls out any spec-provided
 * `changePct24h` for a project with no verified `providerIds.coingeckoId`,
 * regardless of what the spec array below says. This makes the "only
 * show a value when the project has a verified token" rule an enforced
 * invariant rather than a one-time hand-edit that could silently drift out
 * of sync with the registry again. Also guards against a non-finite
 * illustrative value (defensive, mirrors the same guard added to the real
 * pipeline's `coingecko/mapper.ts`).
 */
function resolveTokenChangePct24h(projectId: string, illustrativeValue: number | null | undefined): number | null {
  if (illustrativeValue == null || !Number.isFinite(illustrativeValue)) return null;
  const hasVerifiedToken = Boolean(getProject(projectId)?.providerIds.coingeckoId);
  return hasVerifiedToken ? illustrativeValue : null;
}

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
  /**
   * PR-098.02 — UNLIKE `health`/`confidence` above, this is NOT freely
   * illustrative: it purports to be this project's own real token USD
   * price change over 24h, so `buildFeaturedProject()` runs it through
   * `resolveTokenChangePct24h()` and nulls it out for any project with no
   * verified `providerIds.coingeckoId` in the registry, regardless of what
   * value is set here. Drives the marquee tile's "Token 24H" stat (the
   * Quick View drawer this used to also feed was removed in PR13.5 —
   * tiles now navigate straight to the real Project Profile page).
   */
  changePct24h?: number | null;
  /**
   * Real, static logo URL — the project's real `providerIds.coingeckoId`
   * (`data/projects/seed/`) resolved once, by hand, against CoinGecko's own
   * public `/coins/{id}` endpoint (its stable `image.small` CDN URL), or a
   * project's real GitHub org avatar (`github.com/{owner}.png`) when no
   * coingeckoId is on record. This is a plain static asset reference, not a
   * live runtime provider call — the landing page still makes zero network
   * calls to build itself. `undefined`/omitted for the handful of fixture
   * entries with no real coingeckoId or GitHub org on file (`oku`,
   * `clanker` — see PR-098.01's audit report for why each of these still
   * has none) — those honestly fall back to initials rather than a guessed
   * URL. `hydrex`/`spark` gained real ones in PR-098.01, once real
   * registry mappings existed. (`based-agents`/`superchain-eco` were
   * removed entirely in PR-100 — see that PR's report for why neither
   * could ever have a real logo, or any other real provider data.)
   */
  logoUrl?: string | null;
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

  // PR-098.02 — computed once, fed into every downstream consumer of "this
  // project's token 24h change" below (the numeric stat, the generated
  // summary prose, and the narrative signal) so a project with no verified
  // token mapping can't end up with a fabricated number in one place and
  // fabricated PROSE describing a price move in another.
  const tokenChangePct24h = resolveTokenChangePct24h(spec.id, spec.changePct24h);

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
    changePct24h: tokenChangePct24h,
    tvlUsd: spec.tvlUsd ?? null,
    tvlChangePct24h: null,
    githubStars: spec.githubStars ?? null,
  });

  const narrative =
    tokenChangePct24h != null
      ? (buildNarrativeSignals({
          samples: [{ category: spec.categories[0] ?? "General", changePct24h: tokenChangePct24h, volumeUsd: 0 }],
        })[0] ?? null)
      : null;

  const risk = buildRiskAnalysis({
    healthScore: spec.health.score,
    confidenceScore: spec.confidence.score,
    verificationStatus: spec.verificationStatus,
    freshness: "fresh",
    hasRecentWhaleActivity: false,
    verifiedContractPct: null,
    hasRegisteredContracts: false,
    liquidityUsd: null,
    tvlChangePct7d: null,
    githubCommitsLast7d: null,
    githubAvailable: false,
    githubStars: null,
    githubPushedAt: null,
    githubLatestReleasePublishedAt: null,
    governanceActiveCount: null,
    governanceType: null,
  });

  return {
    identity: {
      id: spec.id,
      slug: spec.id,
      name: spec.name,
      shortDescription: spec.shortDescription,
      description: spec.shortDescription,
      logoUrl: spec.logoUrl ?? null,
      websiteUrl: "#",
      categories: spec.categories,
      tags: spec.tags,
      status: "live",
    },
    market: {
      available: tokenChangePct24h != null,
      imageUrl: null,
      symbol: null,
      priceUsd: null,
      marketCapUsd: null,
      marketCapRank: null,
      fullyDilutedValuationUsd: null,
      changePct24h: tokenChangePct24h,
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
      priceResolution: emptyResolution<number>(),
      stale: false,
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
      volumeResolution: emptyResolution<number>(),
      liquidityResolution: emptyResolution<number>(),
    },
    tvl: {
      available: spec.tvlUsd != null,
      tvlUsd: spec.tvlUsd ?? null,
      // PR-102 — this illustrative fixture has no real global/Base
      // distinction to draw (it's a single hand-authored placeholder
      // number, never fetched from DefiLlama) — mirrored here so the type
      // is satisfied without fabricating a second, different number.
      globalTvlUsd: spec.tvlUsd ?? null,
      changePct24h: null,
      changePct7d: null,
      changePct30d: null,
      defillamaCategory: null,
      tvlResolution: emptyResolution<number>(),
      imageUrl: null,
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
      latestReleaseNoteSummary: null,
      language: null,
      license: null,
      createdAt: null,
      pushedAt: null,
      commitsLast7d: null,
      commitsPrev7d: null,
      commitTrendPct: null,
      developerCadence: null,
      avatarUrl: null,
      stale: false,
      dataFetchedAt: null,
    },
    chain: {
      chains: spec.chains,
      primaryChain: spec.chains[0],
      network: { available: false, gasGwei: null, blockHeight: null, estimatedTps: null },
    },
    community: {
      socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null },
      governanceUrl: null,
      governanceType: null,
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/31745/small/token.png?1696530564",
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/12645/small/aave-token-round.png?1720472354",
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/29837/small/Morpho-token-icon.png?1726771230",
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/34057/small/LOGOMARK.png?1708356054",
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/54693/small/zora.jpg?1741094751",
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
    // PR-098.02 — Farcaster has no `coingeckoId` in the registry (no real
    // FARCASTER token exists), so `resolveTokenChangePct24h` nulls this out
    // regardless; left `null` here too rather than a fabricated figure a
    // future reader could mistake for real illustrative intent.
    changePct24h: null,
    logoUrl: "https://github.com/farcasterxyz.png",
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/26133/small/WELL.png?1696525221",
  },
  {
    // PR-098.01 — corrected from "Perpetuals and yield trading protocol" /
    // categories: ["derivatives"], which was never accurate. Hydrex is a
    // ve(3,3) MetaDEX/AMM (same category of protocol as Aerodrome), now
    // confirmed via a real registry entry (`data/projects/seed/hydrex.ts`)
    // with a live-verified CoinGecko id, DexScreener dexId, and DefiLlama
    // slug. `health`/`confidence`/`tvlUsd`/`changePct24h` remain
    // illustrative, same as every other entry here.
    id: "hydrex",
    name: "Hydrex",
    shortDescription: "Liquidity-neutral ve(3,3) MetaDEX purpose-built for Base.",
    categories: ["dex", "yield"],
    tags: ["base-native", "real-yield"],
    chains: ["base"],
    verificationStatus: "community",
    health: { score: 74, label: "fair" },
    confidence: { score: 68, level: "medium" },
    tvlUsd: 42_000_000,
    githubStars: null,
    changePct24h: -5.8,
    logoUrl: "https://coin-images.coingecko.com/coins/images/69177/small/HYDX_logo_%282%29.png?1757748253",
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
    // PR-098.02 — Basenames has no `coingeckoId` (it's a naming service,
    // not a tokenized protocol) — no real 24h token price change exists.
    changePct24h: null,
    logoUrl: "https://github.com/base-org.png",
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
    // PR-098.02 — no `coingeckoId` on file for Clanker (no verified
    // CLANKER-token CoinGecko mapping) — see PR-098.01's audit.
    changePct24h: null,
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/10775/small/COMP.png?1696510737",
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/12124/small/Curve.png?1696511967",
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/11683/small/Balancer.png?1696511572",
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
    // PR-098.01 — real CoinGecko id is "spark-2", confirmed live (a naive
    // "spark" id 404s). See `data/projects/seed/spark.ts`.
    logoUrl: "https://coin-images.coingecko.com/coins/images/38637/small/Spark-Logomark-RGB.png?1744878896",
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/12504/small/uniswap-logo.png?1720676669",
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/33480/small/Seamless_Logo_Black_Transparent.png?1702019657",
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
    logoUrl: "https://coin-images.coingecko.com/coins/images/30973/small/Ex_logo-white-blue_ring_288x.png?1696529812",
  },
  {
    id: "oku",
    name: "Oku",
    shortDescription: "Trading interface / aggregator for concentrated-liquidity DEXs across chains.",
    // PR-101 — was ["dex"]; Oku doesn't operate a DEX or own liquidity, it's
    // an interface over Uniswap v3/Morpho's pools — corrected to match the
    // canonical registry's own category (`data/projects/seed/oku.ts`), and
    // so this fixture's TVL/token framing can't drift from the real entry.
    categories: ["infrastructure"],
    tags: ["cross-chain"],
    chains: ["base"],
    verificationStatus: "unverified",
    health: { score: 66, label: "fair" },
    confidence: { score: 55, level: "low" },
    tvlUsd: null,
    githubStars: null,
    // PR-098.02 — Oku has no token of its own (confirmed genuinely
    // unavailable, not just missing, in PR-098.01's audit).
    changePct24h: null,
  },
  // PR-100 — "superchain-eco" and "based-agents" were removed from this
  // list entirely (not just nulled out). PR-100's independent research
  // confirmed: Superchain Eco (superchain.eco) is a real entity, but it's
  // an ecosystem directory/informational site for the whole OP Superchain
  // (500+ third-party projects, 17 chains) — not itself a protocol with a
  // token, TVL, Base contracts, or governance, so it structurally cannot
  // produce the "measurable onchain intelligence" Featured Ecosystem exists
  // to show; "Based Agents" has no distinct canonical protocol at all — the
  // only real, verifiable entity anywhere near that name is `Based Agent`
  // (singular), an individual developer's open-source AI-agent template
  // (github.com/murrlincoln/Based-Agent, built on Coinbase's AgentKit), not
  // an organization or protocol with its own token/TVL/contracts/
  // governance. Neither had a registry entry before this PR (confirmed by
  // `tests/data/projects/pr098-provider-mapping.test.ts`) and neither gets
  // one now — no fabricated mapping was created for either. See the
  // PR-100 report for the full identity research and the replacement
  // candidate shortlist (a pending product decision, not resolved here).
];

export const FEATURED_PROJECTS: ProjectIntelligence[] = FEATURED_PROJECT_SPECS.map(buildFeaturedProject);

/** Every real Featured Ecosystem project id, in display order — the exact set `getFeaturedIntelligenceSnapshot()` (PR-098.05) should fetch live data for. */
export const FEATURED_PROJECT_IDS: string[] = FEATURED_PROJECT_SPECS.map((spec) => spec.id);

/**
 * PR-098.05 — Landing Page Intelligence Delivery Architecture. Overlays a
 * real, live `FeaturedIntelligenceSnapshot` (TVL + Token 24H Change) on top
 * of the illustrative fixture above, for whichever projects the snapshot
 * has real data for. `resolveTokenChangePct24h`'s registry cross-check
 * (PR-098.02) still applies to the live value exactly as it does to the
 * illustrative one — a live 24h% for a project with no verified
 * `coingeckoId` is still nulled out, never shown.
 *
 * Falls back to the illustrative spec value (not to "—") when the live
 * snapshot has nothing for a given project — a transient provider hiccup
 * during one regeneration cycle degrades to the same number visitors were
 * already seeing, not a visible regression. This is a genuinely different
 * case from PR-098.02's "never fabricate a number for a tokenless
 * project" rule: this project DOES have a verified mapping (the whole
 * reason it's in the snapshot at all) — falling back to the last-known
 * illustrative baseline during a hiccup is closer in spirit to this
 * engine's existing `stale`-data pattern than to fabrication.
 *
 * PR-099 — Live Radar Score & Intelligence Normalization. Same fallback
 * discipline now applies to `health` too: when `live.radarScore.score` is
 * a real number (the live methodology cleared its own minimum-evidence
 * bar — PR-098.04, unchanged), it overrides the illustrative
 * `spec.health` entirely. When it's `null` (insufficient live evidence —
 * NOT the same thing as "no snapshot at all"), `spec.health` stays
 * illustrative, exactly as before PR-099 — never a fabricated live-looking
 * score for a project the real methodology genuinely can't score yet.
 */
export function buildFeaturedProjectsWithSnapshot(snapshot: FeaturedIntelligenceSnapshot | null): ProjectIntelligence[] {
  if (!snapshot) return FEATURED_PROJECTS;
  const liveById = new Map(snapshot.entries.map((entry) => [entry.id, entry]));

  return FEATURED_PROJECT_SPECS.map((spec) => {
    const live = liveById.get(spec.id);
    if (!live || !live.available) return buildFeaturedProject(spec);
    const liveScore = live.radarScore?.score ?? null;
    return buildFeaturedProject({
      ...spec,
      tvlUsd: live.tvlUsd ?? spec.tvlUsd,
      changePct24h: live.tokenChangePct24h ?? spec.changePct24h,
      health: liveScore !== null ? { score: liveScore, label: radarScoreToHealthLabel(liveScore) } : spec.health,
    });
  });
}
