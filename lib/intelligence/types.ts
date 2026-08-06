/**
 * The Project Intelligence Engine's type contract.
 *
 * `ProjectIntelligence` is the single, normalized, provider-agnostic shape
 * this whole layer exists to produce. It is built from two inputs — a
 * `Project` (Project Registry, `data/projects/`) and live data pulled
 * through the Provider Layer (`lib/providers/`) — and never leaks a
 * provider-specific response shape to a caller: every section below is
 * expressed in this engine's own vocabulary, not CoinGecko's, DexScreener's,
 * DefiLlama's, Blockscout's, GitHub's, or Base RPC's.
 *
 * Internally, `ProjectSources`/`ProviderSlice<T>` (also defined here) are
 * the intermediate, per-provider "what did we find for this project"
 * bundle that `sources.ts` produces and `merge.ts`/`confidence.ts`/
 * `freshness.ts` consume. Those *do* reference Provider Layer domain types
 * (`CoinMarket`, `Pair`, etc.) — that's expected, since this engine's job
 * is literally to consume the Provider Layer. The rule is about the
 * engine's OUTPUT boundary (`ProjectIntelligence` itself), not its
 * internal plumbing.
 */

import type {
  Chain,
  ContractType,
  ProjectCategory,
  ProjectStatus,
  ProjectTag,
  VerificationStatus,
} from "@/data/projects/enums";
import type { CoinMarket } from "@/lib/providers/coingecko/service";
import type { Pair } from "@/lib/providers/dexscreener/service";
import type { Protocol } from "@/lib/providers/defillama/service";
import type { VerifiedContract } from "@/lib/providers/blockscout/service";
import type { RepoStats } from "@/lib/providers/github/service";
import type { NetworkStatus } from "@/lib/providers/base/service";
import type { ProviderName } from "@/lib/providers/common/types";
import type { NarrativeSignal, RiskContributor, RiskLevel } from "@/lib/intelligence-engine";
import type { GovernanceEvent } from "@/lib/governance";
/**
 * PR-052 — the Provider Resolution Engine's own vocabulary now lives in
 * `lib/providers/common/resolution.ts` (shared with `lib/data/aggregate.ts`)
 * rather than being defined here. Imported normally (for use within this
 * file, e.g. `Market.priceResolution` below) and re-exported at the bottom
 * of this file so every existing `@/lib/intelligence/types` import
 * elsewhere in the codebase keeps working unchanged. See that file's doc
 * comment for why the move happened, and
 * docs/PR-052_UNIFIED_INTELLIGENCE_LAYER.md for the full audit.
 */
import type {
  MetricConfidence,
  MetricResolution,
  ProviderAttempt,
  SourceAttribution,
  SourceStatus,
} from "@/lib/providers/common/resolution";

// ---------------------------------------------------------------------------
// Output sections
// ---------------------------------------------------------------------------

export type Identity = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  logoUrl: string | null;
  websiteUrl: string;
  categories: ProjectCategory[];
  tags: ProjectTag[];
  status: ProjectStatus;
};

export type Market = {
  available: boolean;
  imageUrl: string | null;
  symbol: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  marketCapRank: number | null;
  fullyDilutedValuationUsd: number | null;
  changePct24h: number | null;
  changePct7d: number | null;
  changePct30d: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  athUsd: number | null;
  athDate: string | null;
  atlUsd: number | null;
  atlDate: string | null;
  sparkline7d: number[];
  /** CoinGecko's genesis/launch date — `null` when not on record, fetched only on the Project Profile page (per-coin endpoint, too heavy for the bulk ecosystem list). */
  genesisDate: string | null;
  /** PR-050 provider-resolution — how `priceUsd` above was resolved: CoinGecko first, DexScreener's own pair price as a real fallback when CoinGecko has no listing. See `lib/intelligence/resolution.ts`. */
  priceResolution: MetricResolution<number>;
};

export type TradingPool = {
  dexId: string;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  pairCreatedAt: number | null;
  /** DexScreener's `baseToken.symbol` — already produced by the mapper, just not previously carried through `mergeTrading` (PR13.7 Goal 9). */
  baseTokenSymbol: string | null;
};

export type Trading = {
  available: boolean;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
  priceChangePct24h: number | null;
  /** Number of matched DexScreener pairs this figure is aggregated from. */
  pairCount: number;
  /** Matched pools, sorted by liquidity descending — real per-pool DexScreener data, not fabricated. */
  pools: TradingPool[];
  largestPool: TradingPool | null;
  /** PR-050 provider-resolution — how `volume24hUsd` above was resolved: DexScreener's on-chain pair volume first, CoinGecko's exchange-wide `total_volume` as a real (if broader-scoped) fallback. See `lib/intelligence/resolution.ts`. */
  volumeResolution: MetricResolution<number>;
  /** PR-050 provider-resolution — DexScreener is the only DEX-liquidity-depth provider this Engine integrates; formalized into the same resolution shape as `volumeResolution`/`priceResolution` for a consistent UI contract, even though there is currently only one real candidate. */
  liquidityResolution: MetricResolution<number>;
};

export type Tvl = {
  available: boolean;
  tvlUsd: number | null;
  changePct24h: number | null;
  /** `null` when fewer than 7/30 days of history are available in `getProtocolTvlHistory`. */
  changePct7d: number | null;
  changePct30d: number | null;
  defillamaCategory: string | null;
  /** PR-050 provider-resolution — DefiLlama is the only protocol-TVL provider this Engine integrates (CoinGecko's API doesn't expose per-protocol TVL, and no on-chain TVL aggregator is implemented). Formalized into the same resolution shape for a consistent UI contract. */
  tvlResolution: MetricResolution<number>;
  /** PR-072 — DefiLlama's own protocol logo, a real third-priority logo candidate (behind the registry and CoinGecko) — `null` when DefiLlama has none on record for this protocol. */
  imageUrl: string | null;
};

export type ContractInfo = {
  chain: Chain;
  address: string;
  type: ContractType;
  label: string | null;
  /** `null` means unknown/not checked — see docs/API.md's Blockscout section for why this is rarely resolvable today. */
  verified: boolean | null;
};

export type Contracts = {
  count: number;
  items: ContractInfo[];
};

export type GithubIntel = {
  available: boolean;
  fullName: string | null;
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
  latestReleaseTag: string | null;
  latestReleasePublishedAt: string | null;
  /** One-line summary of the latest release's real notes — `null` when GitHub has no notes on record for it. */
  latestReleaseNoteSummary: string | null;
  language: string | null;
  license: string | null;
  createdAt: string | null;
  pushedAt: string | null;
  /** `null` when GitHub hasn't finished computing commit stats yet for this repo (a real, expected "not ready" state — see `github/client.ts`). */
  commitsLast7d: number | null;
  commitsPrev7d: number | null;
  commitTrendPct: number | null;
  /** PR-072 — the repo owner's real avatar, the last-resort logo candidate behind the registry, CoinGecko, and DefiLlama. `null` when GitHub isn't available for this project at all. */
  avatarUrl: string | null;
  /** PR-075 — `true` when the fields above are real but stale (GitHub's live API just failed, usually rate-limited) rather than freshly fetched. */
  stale: boolean;
  /** PR-075 — when the data actually came from GitHub, real and honest either way (never "now" for stale data). `null` when `available` is `false`. */
  dataFetchedAt: string | null;
};

export type ChainInfo = {
  chains: Chain[];
  primaryChain: Chain;
  network: {
    available: boolean;
    gasGwei: number | null;
    blockHeight: number | null;
    estimatedTps: number | null;
  };
};

export type Community = {
  socials: {
    twitter: string | null;
    discord: string | null;
    telegram: string | null;
    farcaster: string | null;
    docs: string | null;
    blog: string | null;
    forum: string | null;
    medium: string | null;
    mirror: string | null;
    linkedin: string | null;
  };
  /** Real Snapshot/governance forum URL — `null` when this project has no `governance.governanceUrl` configured (never fabricated). */
  governanceUrl: string | null;
  /** PR-074/PR-075 — distinguishes a real, confirmed non-Snapshot governance mechanism ("on-chain", "forum", or "none") from simply having no `snapshotSpace` configured yet. `null` when neither is known. */
  governanceType: "snapshot" | "on-chain" | "forum" | "none" | null;
  /** Mirrors the registry's own editorial trust signal — see docs/PROJECT_REGISTRY.md. */
  verificationStatus: VerificationStatus;
};

export type HealthLabel = "excellent" | "good" | "fair" | "poor" | "unknown";

export type Health = {
  /** 0-100. A transparently-derived heuristic, not a third-party metric — see `scoring.ts`. */
  score: number;
  label: HealthLabel;
  /** Plain-English breakdown of what fed the score, for debuggability. */
  factors: string[];
};

/** Re-exported for every existing `@/lib/intelligence/types` import site — see the PR-052 import comment above for where these are actually defined now. */
export type { SourceStatus, SourceAttribution, MetricConfidence, ProviderAttempt, MetricResolution };

/** One attribution entry per provider this engine knows how to consult. */
export type Sources = Record<ProviderName, SourceAttribution>;

export type ConfidenceLevel = "high" | "medium" | "low";

export type Confidence = {
  /** 0-100. */
  score: number;
  level: ConfidenceLevel;
  factors: string[];
};

export type FreshnessLevel = "fresh" | "mixed" | "stale" | "unknown";

export type Freshness = {
  /** ISO timestamp of the most recently fetched live source, or `null` if none are live. */
  newestSourceAt: string | null;
  /** ISO timestamp of the least recently fetched live source, or `null` if none are live. */
  oldestSourceAt: string | null;
  overall: FreshnessLevel;
  ageMsBySource: Partial<Record<ProviderName, number>>;
};

export type Metadata = {
  engineVersion: string;
  generatedAt: string;
};

/** A qualitative risk read distinct from `Health` — see `lib/intelligence-engine`'s `generateRiskAnalysis`. */
export type Risk = {
  level: RiskLevel;
  explanation: string;
  contributors: RiskContributor[];
};

export type ProjectIntelligence = {
  identity: Identity;
  market: Market;
  trading: Trading;
  tvl: Tvl;
  contracts: Contracts;
  github: GithubIntel;
  chain: ChainInfo;
  community: Community;
  health: Health;
  sources: Sources;
  confidence: Confidence;
  freshness: Freshness;
  metadata: Metadata;
  /** A generated 1-2 sentence summary from `lib/intelligence-engine` — real, already-computed Health/Confidence/TVL/GitHub figures in, plain-English text out. Never fabricated copy. */
  summary: string;
  /** This project's own category momentum, derived from its live 24h price/volume change. `null` when no live market data is available to derive it from. */
  narrative: NarrativeSignal | null;
  risk: Risk;
  /**
   * Real Snapshot governance events — `null` when this project has no
   * `governance.snapshotSpace` configured in the registry (never fabricated),
   * an empty array when configured but currently no proposals are returned.
   */
  governance: GovernanceEvent[] | null;
};

// ---------------------------------------------------------------------------
// Internal: per-provider "did we find this project's data" bundle
// ---------------------------------------------------------------------------

export type MatchQuality = "exact" | "fuzzy" | "none";

/**
 * One provider's contribution toward a single project's intelligence.
 * `data` is `null` whenever `status !== "live"`.
 */
export type ProviderSlice<T> = {
  data: T | null;
  status: SourceStatus;
  fetchedAt: string | null;
  matchQuality: MatchQuality;
  detail: string | null;
  /** PR-075 — `true` when `data` is real but stale (served from cache after a live refetch failed), mirroring `ProviderSuccess.stale`. `fetchedAt` above stays the real original fetch time either way. */
  stale?: boolean;
};

/**
 * Built by `sources.ts`, consumed by `merge.ts`, `confidence.ts`, and
 * `freshness.ts`. Exactly one key per provider this engine currently
 * integrates with.
 */
export type ProjectSources = {
  market: ProviderSlice<CoinMarket>;
  trading: ProviderSlice<Pair[]>;
  tvl: ProviderSlice<Protocol>;
  network: ProviderSlice<NetworkStatus>;
  verifiedContract: ProviderSlice<VerifiedContract>;
  github: ProviderSlice<RepoStats>;
};
