import type {
  ActivityEvent,
  AIProject,
  IntelligenceBrief,
  Kpi,
  LiveTicker,
  MarketOverview,
  Narrative,
  NarrativeHeatRow,
  PortfolioSummary,
  ProjectSpotlight,
  RepoStats,
  Signal,
  SparklinePoint,
  WatchlistItem,
  WelcomeStats,
  WhaleEvent,
} from "@/lib/data/types";

function sparkline(base: number, points = 24, volatility = 0.03): SparklinePoint[] {
  let value = base;
  return Array.from({ length: points }, (_, i) => {
    value += value * (Math.sin(i * 1.3) * volatility);
    return { t: i, v: Math.round(value * 100) / 100 };
  });
}

export const MOCK_KPIS: Kpi[] = [
  {
    id: "projects",
    label: "Projects",
    value: 2314,
    format: "number",
    deltaPct: 1.8,
    trend: "up",
    tooltip: "Live protocols and apps tracked on Base.",
    sparkline: sparkline(2314, 12, 0.02),
  },
  {
    id: "tvl",
    label: "TVL",
    value: 3_680_000_000,
    format: "currency",
    deltaPct: 3.4,
    trend: "up",
    tooltip: "Total value locked across Base DeFi.",
    sparkline: sparkline(3_680_000_000, 12, 0.02),
  },
  {
    id: "volume24h",
    label: "24H Volume",
    value: 486_000_000,
    format: "currency",
    deltaPct: 9.2,
    trend: "up",
    tooltip: "Combined 24h transaction volume on Base.",
    sparkline: sparkline(486_000_000, 12, 0.03),
  },
  {
    id: "dexVolume24h",
    label: "DEX Volume",
    value: 142_000_000,
    format: "currency",
    deltaPct: -4.1,
    trend: "down",
    tooltip: "24h decentralized exchange trading volume on Base.",
    sparkline: sparkline(142_000_000, 12, 0.03),
  },
  {
    id: "aiProjects",
    label: "AI Projects",
    value: 87,
    format: "number",
    deltaPct: 12.5,
    trend: "up",
    tooltip: "AI-native projects building on Base.",
    sparkline: sparkline(87, 12, 0.025),
  },
  {
    id: "gas",
    label: "Gas",
    value: 0.014,
    format: "gwei",
    deltaPct: 6,
    trend: "up",
    tooltip: "Current average gas price on Base.",
    sparkline: sparkline(0.014, 12, 0.04),
  },
  {
    id: "stablecoins",
    label: "Stablecoins",
    value: 2_910_000_000,
    format: "currency",
    deltaPct: 1.2,
    trend: "up",
    tooltip: "Total stablecoin supply on Base.",
    sparkline: sparkline(2_910_000_000, 12, 0.015),
  },
  {
    id: "transactions",
    label: "Transactions",
    value: 8_420_000,
    format: "number",
    deltaPct: 2.7,
    trend: "up",
    tooltip: "Total transactions in the last 24h.",
    sparkline: sparkline(8_420_000, 12, 0.02),
  },
];

export const MOCK_MARKET_OVERVIEW: MarketOverview = {
  gasGwei: 0.014,
  gasTrend: "up",
  blockHeight: 24_812_309,
  txCountLatestBlock: 148,
  estimatedTps: 74,
  activeWallets24h: 412_000,
  chainId: 8453,
  chainName: "Base",
};

export const MOCK_PORTFOLIO: PortfolioSummary = {
  totalValue: 48_213.42,
  pnlPct24h: 4.8,
  pnlValue24h: 2206.31,
  holdings: [
    { symbol: "ETH", name: "Ethereum", value: 21_400, allocationPct: 44.4 },
    { symbol: "USDC", name: "USD Coin", value: 12_800, allocationPct: 26.5 },
    { symbol: "AERO", name: "Aerodrome", value: 8_100, allocationPct: 16.8 },
    { symbol: "cbBTC", name: "Coinbase Wrapped BTC", value: 5_913.42, allocationPct: 12.3 },
  ],
  sparkline: sparkline(46000, 24, 0.02),
};

export const MOCK_NARRATIVES: Narrative[] = [
  { name: "AI Agents", category: "Artificial Intelligence", momentum: 92, change24hPct: 18.4 },
  { name: "Onchain Social", category: "Consumer", momentum: 78, change24hPct: 9.1 },
  { name: "RWA Lending", category: "DeFi", momentum: 71, change24hPct: 5.6 },
  { name: "Memecoins", category: "Culture", momentum: 64, change24hPct: -3.2 },
];

export const MOCK_AI_PROJECTS: AIProject[] = [
  { name: "NeuroBase AI", symbol: "NBAI", activityScore: 94, change24hPct: 21.3, isNewLaunch: false },
  { name: "AgentForge", symbol: "AGF", activityScore: 88, change24hPct: 14.7, isNewLaunch: true },
  { name: "OnchainMind", symbol: "MIND", activityScore: 76, change24hPct: 6.2, isNewLaunch: false },
];

export const MOCK_WHALE_EVENTS: WhaleEvent[] = [
  {
    id: "w1",
    label: "Large ETH transfer",
    amountUsd: 4_820_000,
    direction: "out",
    wallet: "0x7a3f…9c21",
    minutesAgo: 6,
    isSmartMoney: true,
  },
  {
    id: "w2",
    label: "USDC deposit",
    amountUsd: 1_950_000,
    direction: "in",
    wallet: "0x1e2b…44af",
    minutesAgo: 22,
    isSmartMoney: false,
  },
  {
    id: "w3",
    label: "cbBTC accumulation",
    amountUsd: 3_100_000,
    direction: "in",
    wallet: "0x9f0c…7731",
    minutesAgo: 41,
    isSmartMoney: true,
  },
];

export const MOCK_SIGNALS: Signal[] = [
  { id: "s1", project: "Aerodrome", kind: "momentum", strength: 88, note: "Volume up 34% in 4h" },
  { id: "s2", project: "NeuroBase AI", kind: "buy", strength: 81, note: "Smart money accumulating" },
  { id: "s3", project: "OnchainMind", kind: "watch", strength: 62, note: "Approaching resistance" },
  { id: "s4", project: "Based Frogs", kind: "new-listing", strength: 54, note: "Listed 2h ago" },
];

export const MOCK_PROJECT_SPOTLIGHT: ProjectSpotlight = {
  name: "Aerodrome Finance",
  symbol: "AERO",
  category: "DEX",
  priceUsd: 0.82,
  change24hPct: 6.4,
  tvlUsd: 1_240_000_000,
  fdvUsd: 890_000_000,
  liquidityUsd: 210_000_000,
  githubStars: 312,
  developerActivityScore: 78,
  aiScore: 41,
  healthScore: 91,
  communityScore: 87,
};

export const MOCK_REPO_STATS: RepoStats = {
  fullName: "base-org/node",
  stars: 1240,
  forks: 318,
  openIssues: 42,
  latestReleaseTag: "v0.9.0",
  latestReleasePublishedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
};

export const MOCK_ACTIVITY_FEED: ActivityEvent[] = [
  {
    id: "a1",
    kind: "whale",
    title: "Whale moved $4.8M ETH",
    detail: "0x7a3f…9c21 → Coinbase",
    timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
  },
  {
    id: "a2",
    kind: "new-pool",
    title: "New pool: AERO / cbBTC",
    detail: "Aerodrome Finance",
    timestamp: new Date(Date.now() - 1000 * 60 * 19).toISOString(),
  },
  {
    id: "a3",
    kind: "large-swap",
    title: "Large swap: 620K USDC → ETH",
    detail: "Uniswap v3 on Base",
    timestamp: new Date(Date.now() - 1000 * 60 * 33).toISOString(),
  },
  {
    id: "a4",
    kind: "governance",
    title: "New proposal: BIP-14",
    detail: "Base Improvement Proposals",
    timestamp: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
  },
  {
    id: "a5",
    kind: "contract-verification",
    title: "Contract verified",
    detail: "NeuroBaseRouter.sol on Blockscout",
    timestamp: new Date(Date.now() - 1000 * 60 * 74).toISOString(),
  },
];

export const MOCK_WELCOME_STATS: WelcomeStats = {
  projectsLaunchedToday: 6,
  tvlUsd: 3_680_000_000,
  whaleAlert: "$4.8M ETH moved 6m ago",
  gasStatus: "Low · 0.014 gwei",
  trendingNarrative: "AI Agents",
  latestAiProject: "AgentForge",
};

export const MOCK_INTELLIGENCE_BRIEF: IntelligenceBrief = {
  points: [
    { id: "b1", text: "AI Agents dominate (+18%)", tone: "positive" },
    { id: "b2", text: "TVL increased 2.3%", tone: "positive" },
    { id: "b3", text: "Gas remains low", tone: "positive" },
    { id: "b4", text: "Whale transferred $4.8M ETH", tone: "neutral" },
    { id: "b5", text: "6 projects launched today", tone: "positive" },
    { id: "b6", text: "Aerodrome volume up 28%", tone: "positive" },
  ],
  generatedAt: new Date().toISOString(),
};

export const MOCK_NARRATIVE_HEATMAP: NarrativeHeatRow[] = [
  { category: "AI", heat: 92, momentum: "up", change24hPct: 18.4 },
  { category: "DeFi", heat: 74, momentum: "up", change24hPct: 5.1 },
  { category: "Gaming", heat: 48, momentum: "flat", change24hPct: 0.8 },
  { category: "RWA", heat: 63, momentum: "up", change24hPct: 5.6 },
  { category: "Social", heat: 71, momentum: "up", change24hPct: 9.1 },
  { category: "Infrastructure", heat: 55, momentum: "flat", change24hPct: 1.2 },
  { category: "Meme", heat: 39, momentum: "down", change24hPct: -3.2 },
];

export const MOCK_WATCHLIST: WatchlistItem[] = [
  { id: "wl1", kind: "project", label: "Aerodrome Finance", sublabel: "DEX · AERO", changePct24h: 6.4 },
  { id: "wl2", kind: "token", label: "cbBTC", sublabel: "Coinbase Wrapped BTC", changePct24h: 1.1 },
  {
    id: "wl3",
    kind: "wallet",
    label: "0x7a3f…9c21",
    sublabel: "Smart money · last active 6m ago",
  },
  { id: "wl4", kind: "narrative", label: "AI Agents", sublabel: "Artificial Intelligence", changePct24h: 18.4 },
];

export const MOCK_LIVE_TICKER: LiveTicker = {
  blockHeight: 24_812_309,
  gasGwei: 0.014,
  ethPriceUsd: 3_450,
  ethChangePct24h: 1.8,
  btcPriceUsd: 96_500,
  btcChangePct24h: 0.6,
  tvlUsd: 3_680_000_000,
  transactionsToday: 4_120_000,
};
