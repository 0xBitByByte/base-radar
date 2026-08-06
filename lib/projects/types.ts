/**
 * PR-054 — Live Projects Service type contract.
 *
 * `LiveProject` is the one reusable model this whole module exists to
 * produce: a merge of the Project Registry (`data/projects/`), the
 * Provider Resolution Engine (`lib/providers/common/resolution.ts`, PR-052),
 * the Project Intelligence Engine (`lib/intelligence/`, pre-existing), and
 * the Live Discovery Engine (`lib/discovery/`, PR-053) into a single,
 * UI-agnostic shape. No field here exists to serve one specific page's
 * layout — that's deliberate, per the PR-054 brief's own Task 2 constraint
 * ("No UI-specific fields"). Every future Projects page, Dashboard widget,
 * search feature, or API route should read a `LiveProject` off this
 * module's `service.ts`, never re-derive one by hand.
 */

import type { Chain, DiscoverySource, ProjectCategory, ProjectStatus, ProjectTag, VerificationStatus } from "@/data/projects/enums";
import type { DiscoveryEvidence } from "@/lib/discovery/project";
import type { DiscoveryStatus } from "@/lib/discovery/status";
import type { RegistryMatchType } from "@/lib/discovery/registryMatch";
import type { Sources } from "@/lib/intelligence/types";
import type { VerificationLevel } from "@/data/projects/enums";

// ---------------------------------------------------------------------------
// Identity & summary sub-types
// ---------------------------------------------------------------------------

export type LiveProjectIdentity = {
  name: string;
  /** `null` for a discovery-only project — no editorial registry description exists for it yet. */
  shortDescription: string | null;
  description: string | null;
  /** The single best logo candidate, already priority-resolved (registry → CoinGecko → DefiLlama → GitHub avatar). `null` only when none of those sources has one. */
  logoUrl: string | null;
  /** PR-072 — every other real, lower-priority logo candidate `logoUrl` didn't win, in the same priority order, for `ProjectLogo` to retry if `logoUrl`'s URL turns out to be broken (a 404, not just absent) — never attempted before `logoUrl`, and this app's UI never needs to reach further than this list before falling back to initials. Empty when no lower-priority candidate exists. */
  logoUrlFallbacks: string[];
  websiteUrl: string | null;
};

export type MarketSummary = {
  available: boolean;
  priceUsd: number | null;
  changePct24h: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  tvlUsd: number | null;
};

export type CommunitySummary = {
  verificationStatus: VerificationStatus | null;
  /** How many of `SocialLinks`' fields are populated. */
  socialLinkCount: number;
  /** Total number of social link slots this model is aware of — the denominator for `socialLinkCount`. */
  socialLinkTotal: number;
  governanceConfigured: boolean;
};

export type EngineeringSummary = {
  available: boolean;
  stars: number | null;
  forks: number | null;
  commitsLast7d: number | null;
  commitTrendPct: number | null;
  hasRecentActivity: boolean;
};

export type GovernanceSummary = {
  configured: boolean;
  activeProposalCount: number | null;
  totalProposalCount: number | null;
};

export type ContractSummary = {
  count: number;
  /** `null` when verification status isn't tracked for these contracts (a discovery-only project's raw candidate contracts carry no `verified` field). */
  verifiedCount: number | null;
};

export type ConfidenceLevel = "high" | "medium" | "low";

export type LiveProjectConfidence = {
  score: number;
  level: ConfidenceLevel;
  /** Which engine produced `score`/`level` — a registry-tracked project's confidence comes from `lib/intelligence`'s `Confidence`; a discovery-only project's comes from `lib/discovery`'s `DiscoveryConfidence`. */
  source: "intelligence" | "discovery";
};

export type LiveProjectVerification = {
  status: VerificationStatus | null;
  level: VerificationLevel | null;
  /** ISO date this project's registry entry was last reviewed (`Project.verification.verifiedAt`) — `null` when never reviewed, or for a discovery-only project with no registry entry at all. */
  verifiedAt: string | null;
};

export type DiscoveryMetadata = {
  sources: DiscoverySource[];
  discoveredAt: string | null;
  registryMatchType: RegistryMatchType | null;
};

/**
 * Every real, structured identifier the Search Index (Task 6) can key on
 * beyond `identity.name`/`slug`/`websiteUrl` — kept as its own sub-type
 * rather than inlined so `search.ts` has one place to read from. Every
 * field is `null`/empty when this project genuinely has no such
 * identifier — never guessed.
 */
export type SearchIdentifiers = {
  symbol: string | null;
  /** Alternate names this project is known by — e.g. a Discovery-surfaced rename/alias candidate's differing display name. Real evidence only, never a guessed variant. */
  aliases: string[];
  coingeckoId: string | null;
  defillamaSlug: string | null;
  /** `"owner/repo"`, matching the format this codebase's GitHub provider calls already use. */
  github: string | null;
  contractAddresses: string[];
};

// ---------------------------------------------------------------------------
// LiveProject
// ---------------------------------------------------------------------------

export type LiveProjectSource = "registry" | "discovery";

/**
 * The unified, reusable project model. Built by `build.ts`'s two adapters
 * and assembled by `service.ts`'s `getLiveProjects()` — see that file's own
 * doc comment for the merge rule between registry-derived and
 * discovery-only projects.
 */
export type LiveProject = {
  /** Stable identifier: the registry `Project.id` for `source === "registry"`, or the `DiscoveryProject.id` for `source === "discovery"`. */
  id: string;
  /** `null` for a discovery-only project — it has no registry route yet. */
  slug: string | null;
  source: LiveProjectSource;
  identity: LiveProjectIdentity;
  category: ProjectCategory;
  /** Narrative tags, reusing the existing `ProjectTag` vocabulary rather than inventing a new "subcategory" concept. */
  subcategories: ProjectTag[];
  chains: Chain[];
  /** `null` for a discovery-only project — `ProjectStatus` is a registry-only concept. */
  status: ProjectStatus | null;
  /** `null` for a pure registry project this run's Discovery pipeline didn't also surface. */
  discoveryStatus: DiscoveryStatus | null;
  verification: LiveProjectVerification;
  confidence: LiveProjectConfidence;
  /** `null` for a discovery-only project — no resolved provider attribution exists without a built `ProjectIntelligence` record. */
  providerAttribution: Sources | null;
  /** `null` for a registry project this run's Discovery pipeline didn't also surface. */
  discoveryEvidence: DiscoveryEvidence | null;
  searchIdentifiers: SearchIdentifiers;
  market: MarketSummary;
  community: CommunitySummary;
  engineering: EngineeringSummary;
  governance: GovernanceSummary;
  contracts: ContractSummary;
  /** ISO timestamp — the intelligence record's `metadata.generatedAt` for a registry project, or the discovery project's `discoveredAt` for a discovery-only one. */
  lastUpdated: string;
  /**
   * PR-074 — the registry entry's own real, static `lifecycle.updatedAt`
   * (`data/projects/types.ts`'s `ProjectLifecycle`) — distinct from
   * `lastUpdated` above, which is really "when this intelligence report was
   * generated" (effectively "now," on every request, for every project) and
   * carries no real recency signal at all. `null` for a discovery-only
   * project (no registry entry to have an edit date) or a registry project
   * whose entry has never recorded one.
   */
  registryUpdatedAt: string | null;
  /** `null` when this project was never surfaced by this run's Discovery pipeline (a pure registry project with no discovery corroboration this run). */
  discoveryMetadata: DiscoveryMetadata | null;
};

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export type LiveProjectCollections = {
  verified: LiveProject[];
  new: LiveProject[];
  recentlyUpdated: LiveProject[];
  recentlyDiscovered: LiveProject[];
  recentlyVerified: LiveProject[];
  trending: LiveProject[];
  upcoming: LiveProject[];
  highConfidence: LiveProject[];
  needsReview: LiveProject[];
  byCategory: Record<ProjectCategory, LiveProject[]>;
};

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export const SORT_FIELDS = [
  "confidence",
  "marketCap",
  "tvl",
  "volume",
  /** PR-063 — `market.liquidityUsd`. Distinct from `volume`/`tvl`: DEX liquidity depth, not trading throughput or locked-value. */
  "liquidity",
  "activity",
  "alphabetical",
  "discoveryDate",
  "updatedDate",
  /** PR-056 — `engineering.stars`. Distinct from `"activity"` (`commitsLast7d`) — a star count and a commit-activity count are different signals and were conflated in PR-055's "Top GitHub" naming discussion; this field lets a consumer sort by either independently. */
  "stars",
  /** PR-056 — `verification.verifiedAt`. Powers an interactive "Recently Verified" sort on the Full Directory, distinct from the `recentlyVerified` collection's own fixed 30-day window. */
  "verifiedDate",
  /** PR-074 REVIEW #2 — `Math.abs(market.changePct24h)`, biggest 24h move in either direction. Powers the "Top Movers" fallback leaderboard shown when GitHub-derived rankings (`"stars"`/`"activity"`) have zero qualifying projects (e.g. GitHub rate-limited), so a provider outage never empties an entire section. */
  "movers",
] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export type SortOrder = "asc" | "desc";

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * PR-056 — `category`/`status`/`discoveryStatus`/`verificationStatus` each
 * accept either a single value (backward-compatible with every PR-054 call
 * site) or an array for multi-select. An array is matched as OR — a project
 * passes a facet if it matches *any* selected value — while every distinct
 * facet in `FilterOptions` still combines as AND, exactly like Explorer's
 * own established `ExplorerFilters` semantics
 * (`components/explorer/filters.ts`). Example: `{category: ["dex",
 * "lending"], verified: true}` matches a DEX-or-Lending project that is
 * ALSO verified — never DEX-or-Lending-or-verified.
 */
export type FilterOptions = {
  category?: ProjectCategory | ProjectCategory[];
  status?: ProjectStatus | ProjectStatus[];
  discoveryStatus?: DiscoveryStatus | DiscoveryStatus[];
  verificationStatus?: VerificationStatus | VerificationStatus[];
  /** `true` requires a resolved market read (`market.available`); `false` requires the opposite. */
  hasMarket?: boolean;
  hasTvl?: boolean;
  /** PR-056 — mirrors `hasTvl` exactly: `true` requires a non-null `market.volume24hUsd`. */
  hasVolume?: boolean;
  /** PR-074 REVIEW #2 — mirrors `hasTvl` exactly: `true` requires a non-null `market.marketCapUsd`. Powers the "Top Market Cap" fallback leaderboard. */
  hasMarketCap?: boolean;
  /** PR-074 REVIEW #2 — mirrors `hasTvl` exactly: `true` requires a non-null `market.changePct24h`. Powers the "Top Movers" fallback leaderboard. */
  hasChangePct24h?: boolean;
  hasGithub?: boolean;
  hasGovernance?: boolean;
  hasContracts?: boolean;
  minConfidence?: number;
  /** PR-071 Round 3 — exact confidence tier (`project.confidence.level`), for the toolbar's All/High/Medium/Low control. Independent of `minConfidence`, which stays a raw numeric floor used elsewhere (e.g. the "Emerging" collection). */
  confidenceLevel?: ConfidenceLevel;
  /**
   * PR-056 — the composed "Verified" facet the PR-055 UX design calls for:
   * `true` requires `verification.status === "verified"` OR
   * `discoveryStatus === "verified"` — the exact same rule
   * `collections.ts`'s `isVerified` already implements for the `verified`
   * collection, reused here (not reimplemented) so the definition of
   * "verified" lives in exactly one place.
   */
  verified?: boolean;
  /**
   * PR-063 — one active range per financial metric. Every metric present
   * combines as AND with every other facet here, exactly like the rest of
   * `FilterOptions`. A project with no real value for a given metric never
   * matches any range for it — a `null` is "no data," never treated as
   * "below every threshold."
   */
  financialRanges?: Partial<Record<FinancialMetric, FinancialRangeId>>;
};

// ---------------------------------------------------------------------------
// Financial filtering (PR-063)
// ---------------------------------------------------------------------------

/**
 * The four financial dimensions this app can filter/sort by — each backed
 * by exactly one provider (`lib/projects/financial.ts`'s
 * `FINANCIAL_METRIC_PROVIDER`), never a value blended across providers.
 */
export const FINANCIAL_METRICS = ["tvl", "liquidity", "marketCap", "volume"] as const;
export type FinancialMetric = (typeof FINANCIAL_METRICS)[number];

export const FINANCIAL_METRIC_LABELS: Record<FinancialMetric, string> = {
  tvl: "TVL",
  liquidity: "Liquidity",
  marketCap: "Market Cap",
  volume: "24H Volume",
};

/**
 * Every real bucket id across every metric's range picker. Ranges are fixed,
 * hand-chosen thresholds (defined once in `lib/projects/financial.ts`) —
 * never derived from which specific projects happen to exist today.
 * Matching a project against one is always a live numeric comparison at
 * request time, so membership is always computed dynamically (Task 2), never
 * a hardcoded per-project list.
 */
export type FinancialRangeId =
  | "tvl-under-1m"
  | "tvl-1m-10m"
  | "tvl-10m-100m"
  | "tvl-over-100m"
  | "liquidity-under-500k"
  | "liquidity-500k-5m"
  | "liquidity-over-5m"
  | "marketCap-small"
  | "marketCap-mid"
  | "marketCap-large"
  | "volume-low"
  | "volume-medium"
  | "volume-high";

export type FinancialRangeDef = {
  id: FinancialRangeId;
  metric: FinancialMetric;
  /** Human-readable, e.g. `"> $100M"` or `"Large (> $1B)"`. */
  label: string;
  /** Inclusive lower bound; `null` means no lower bound. */
  min: number | null;
  /** Exclusive upper bound; `null` means no upper bound. */
  max: number | null;
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type SearchIndexEntry = {
  id: string;
  /** Every real, distinct string this project can be found by — name, aliases, symbol, slug, CoinGecko id, DefiLlama slug, GitHub, website, contract addresses. Lowercased. */
  tokens: string[];
  project: LiveProject;
};

export type ProjectSearchIndex = SearchIndexEntry[];

export type SearchResult = {
  project: LiveProject;
  /** Higher is a better match. Deterministic given the same index + query. */
  score: number;
};

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export type PaginationOptions = {
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};
