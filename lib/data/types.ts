/**
 * Shared data contracts for every dashboard widget.
 *
 * Every aggregate function in `lib/data/aggregate.ts` resolves to one of
 * these shapes regardless of which provider (or mock fallback) produced it,
 * so widgets never need to change when a provider is swapped later.
 *
 * PR-052 — a handful of fields below also carry an optional `*Resolution:
 * MetricResolution<T>` (`lib/providers/common/resolution.ts`, the same
 * Provider Resolution Engine `lib/intelligence/` uses for the Project
 * Profile/Explorer) wherever `aggregate.ts` genuinely resolves that field
 * from more than one real candidate provider. These are additive — no
 * widget currently renders them, exactly like PR-037's `lifecycle`/
 * `verificationLevel` fields on `Project` — real provenance is available
 * in the data now, ready for a future UI pass to surface it, without any
 * change to what's rendered today.
 */
import type { MetricResolution } from "@/lib/providers/common/resolution";

export type DataSource = "live" | "mock";

export type Trend = "up" | "down" | "flat";

export type WithSource<T> = T & { source: DataSource };

export type SparklinePoint = {
  t: number;
  v: number;
};

export type KpiId =
  | "projects"
  | "tvl"
  | "volume24h"
  | "dexVolume24h"
  | "aiProjects"
  | "gas"
  | "stablecoins"
  | "transactions";

export type Kpi = {
  id: KpiId;
  label: string;
  value: number;
  format: "currency" | "number" | "gwei";
  deltaPct?: number;
  trend?: Trend;
  tooltip: string;
  /** PR-052 — set only for `dexVolume24h`, the one KPI resolved from more than one real candidate provider (CoinGecko primary, DexScreener fallback). `undefined` for every single-candidate KPI. */
  resolution?: MetricResolution<number>;
};

export type MarketOverview = {
  gasGwei: number;
  gasTrend: Trend;
  blockHeight: number;
  txCountLatestBlock: number;
  estimatedTps: number;
  chainId: number;
  chainName: string;
  /** Base-wide TVL from DefiLlama — `null` when unavailable, never fabricated. */
  tvlUsd: number | null;
  /** Total on-chain transactions today from Blockscout — `null` when unavailable. */
  transactionsToday: number | null;
  /** All-time unique addresses seen on Base, from Blockscout — `null` when unavailable. There is no free "active wallets in 24h" figure, so this is deliberately labeled as a cumulative count, not an activity metric. */
  totalAddresses: number | null;
};

export type HoldingAsset = {
  symbol: string;
  name: string;
  value: number;
  allocationPct: number;
};

export type PortfolioSummary = {
  totalValue: number;
  pnlPct24h: number;
  pnlValue24h: number;
  holdings: HoldingAsset[];
  sparkline: SparklinePoint[];
};

export type Narrative = {
  name: string;
  category: string;
  momentum: number;
  change24hPct: number;
};

export type AIProject = {
  name: string;
  symbol: string;
  activityScore: number;
  change24hPct: number;
  isNewLaunch: boolean;
};

export type WhaleEvent = {
  id: string;
  label: string;
  amountUsd: number;
  direction: "in" | "out";
  wallet: string;
  minutesAgo: number;
  isSmartMoney: boolean;
};

export type SignalKind = "buy" | "watch" | "momentum" | "new-listing";

export type Signal = {
  id: string;
  project: string;
  kind: SignalKind;
  strength: number;
  note: string;
};

export type ProjectSpotlight = {
  name: string;
  symbol: string;
  category: string;
  priceUsd: number;
  change24hPct: number;
  tvlUsd: number | null;
  fdvUsd: number | null;
  liquidityUsd: number | null;
  githubStars: number | null;
  developerActivityScore: number;
  aiScore: number;
  healthScore: number;
  communityScore: number;
  /** PR-052 — how `change24hPct` above was resolved: CoinGecko's matched-market change first, DefiLlama's own protocol-level change as a real fallback (previously an unattributed `??` chain). */
  changeResolution?: MetricResolution<number>;
};

export type RepoStats = {
  fullName: string;
  stars: number;
  forks: number;
  openIssues: number;
  latestReleaseTag: string | null;
  latestReleasePublishedAt: string | null;
};

export type ActivityKind =
  | "whale"
  | "github-release"
  | "governance"
  | "new-pool"
  | "large-swap"
  | "contract-verification";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  timestamp: string;
};

export type WelcomeStats = {
  projectsLaunchedToday: number;
  tvlUsd: number;
  whaleAlert: string;
  gasStatus: string;
  trendingNarrative: string;
  latestAiProject: string;
};

export type BriefTone = "positive" | "negative" | "neutral";

export type IntelligenceBriefPoint = {
  id: string;
  text: string;
  tone: BriefTone;
};

export type IntelligenceBrief = {
  points: IntelligenceBriefPoint[];
  generatedAt: string;
};

/**
 * Live-update content for one AI Intelligence Wall tile (landing page,
 * `components/landing/AIIntelligencePreview.tsx`). Keyed by the tile `id`
 * defined alongside that component's `TILE_DEFS` — a tile with no matching
 * entry here has no live data source and renders its neutral default state
 * rather than a fabricated value.
 */
export type WallTileUpdate = {
  headline: string;
  detail: string;
  time: string;
  /** 0-100, or `null` when the underlying signal has no meaningful confidence measure. */
  confidence: number | null;
  source: string;
};

export type IntelligenceWallData = Record<string, WallTileUpdate>;

export type HeatmapCategory =
  | "AI"
  | "DeFi"
  | "Gaming"
  | "RWA"
  | "Social"
  | "Infrastructure"
  | "Meme";

export type NarrativeHeatRow = {
  category: HeatmapCategory;
  heat: number;
  momentum: Trend;
  change24hPct: number;
};

export type LiveTicker = {
  blockHeight: number;
  gasGwei: number;
  ethPriceUsd: number;
  ethChangePct24h: number;
  btcPriceUsd: number;
  btcChangePct24h: number;
  tvlUsd: number;
  transactionsToday: number;
  /** PR-052 — how `ethPriceUsd` above was resolved: CoinGecko primary, Blockscout's own `ChainStats.ethPriceUsd` (previously fetched and discarded) as a real fallback. */
  ethPriceResolution?: MetricResolution<number>;
};
