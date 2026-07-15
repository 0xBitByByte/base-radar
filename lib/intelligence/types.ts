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
import type { NarrativeSignal, RiskLevel } from "@/lib/intelligence-engine";
import type { GovernanceEvent } from "@/lib/governance";

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
  priceUsd: number | null;
  marketCapUsd: number | null;
  fullyDilutedValuationUsd: number | null;
  changePct24h: number | null;
  sparkline7d: number[];
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
};

export type Tvl = {
  available: boolean;
  tvlUsd: number | null;
  changePct24h: number | null;
  defillamaCategory: string | null;
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
  };
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

export type SourceStatus = "live" | "unavailable" | "not_configured";

export type SourceAttribution = {
  provider: ProviderName;
  status: SourceStatus;
  fetchedAt: string | null;
  /** Why the status is what it is, e.g. "No coingeckoId configured" or a provider error message. */
  detail: string | null;
};

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
