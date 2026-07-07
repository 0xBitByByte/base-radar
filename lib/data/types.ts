/**
 * Shared data contracts for every dashboard widget.
 *
 * Every aggregate function in `lib/data/aggregate.ts` resolves to one of
 * these shapes regardless of which provider (or mock fallback) produced it,
 * so widgets never need to change when a provider is swapped later.
 */

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
  sparkline: SparklinePoint[];
};

export type MarketOverview = {
  gasGwei: number;
  gasTrend: Trend;
  blockHeight: number;
  txCountLatestBlock: number;
  estimatedTps: number;
  activeWallets24h: number;
  chainId: number;
  chainName: string;
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

export type WatchlistItemKind = "project" | "wallet" | "token" | "narrative";

export type WatchlistItem = {
  id: string;
  kind: WatchlistItemKind;
  label: string;
  sublabel: string;
  changePct24h?: number;
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
};
