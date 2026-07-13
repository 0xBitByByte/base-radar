/**
 * Aggregation layer — the only module UI components should import data from.
 *
 * Each function calls the relevant free-tier provider(s), merges whatever
 * succeeds on top of the typed mock baseline, and reports whether any live
 * data made it through. Providers never throw — they resolve to `null` on
 * failure — so a slow/unavailable API degrades a single field instead of
 * crashing the page. Swapping a provider (or adding a paid one later) only
 * means editing the corresponding function body here; every widget keeps
 * consuming the same shape.
 *
 * Every exported function is wrapped in React's `cache()` (PR9.3.4 §8) —
 * since each dashboard widget now fetches its own data independently
 * (`app/dashboard/page.tsx`), some of these are called from more than one
 * place within the same request (e.g. `getKpis()` is called directly by the
 * KPI row and again inside `getIntelligenceBrief()`); `cache()` collapses
 * those into a single call per request instead of firing the underlying
 * provider requests twice.
 */

import { cache } from "react";

import * as baseRpc from "@/lib/data/providers/baseRpc";
import * as blockscout from "@/lib/data/providers/blockscout";
import * as coingecko from "@/lib/data/providers/coingecko";
import * as defillama from "@/lib/data/providers/defillama";
import * as dexscreener from "@/lib/data/providers/dexscreener";
import * as github from "@/lib/data/providers/github";
import { formatNumber, formatPrice } from "@/lib/data/format";
import {
  MOCK_ACTIVITY_FEED,
  MOCK_AI_PROJECTS,
  MOCK_INTELLIGENCE_BRIEF,
  MOCK_KPIS,
  MOCK_LIVE_TICKER,
  MOCK_MARKET_OVERVIEW,
  MOCK_NARRATIVE_HEATMAP,
  MOCK_NARRATIVES,
  MOCK_PORTFOLIO,
  MOCK_PROJECT_SPOTLIGHT,
  MOCK_SIGNALS,
  MOCK_WATCHLIST,
  MOCK_WELCOME_STATS,
  MOCK_WHALE_EVENTS,
} from "@/lib/data/mock";
import type {
  ActivityEvent,
  AIProject,
  DataSource,
  IntelligenceBrief,
  IntelligenceBriefPoint,
  Kpi,
  KpiId,
  LiveTicker,
  MarketOverview,
  Narrative,
  NarrativeHeatRow,
  PortfolioSummary,
  ProjectSpotlight,
  Signal,
  Trend,
  WatchlistItem,
  WelcomeStats,
  WhaleEvent,
  WithSource,
} from "@/lib/data/types";

const PRIMARY_REPO = "base-org/node";

// A handful of well-known Base protocols mapped to their public GitHub repo,
// so the spotlight can show real developer activity when the top Base
// protocol (by TVL) happens to be one of these. Falls back to a TVL-derived
// estimate otherwise — there's no free API that maps an arbitrary DefiLlama
// protocol name to its repo.
const KNOWN_PROTOCOL_REPOS: Record<string, string> = {
  "aerodrome finance": "aerodrome-finance/contracts",
  "aerodrome slipstream": "aerodrome-finance/slipstream",
  "aave v3": "aave/aave-v3-core",
  "compound v3": "compound-finance/comet",
  moonwell: "moonwell-fi/moonwell-contracts-monorepo",
  "uniswap v3": "Uniswap/v3-core",
};

// Deliberately stricter than a bare /ai/i substring test, which false-positives
// on names like "Chainbase", "USDai", or "OriginTrail" that merely contain the
// letters "ai". Requires "AI" as its own capitalized word, or one of a few
// unambiguous AI-native keywords.
function looksLikeAIProject(name: string): boolean {
  return /\bAI\b/.test(name) || /agent|neuro|gpt|\bllm\b/i.test(name);
}

function trendOf(deltaPct: number | undefined): Trend {
  if (deltaPct === undefined) return "flat";
  if (deltaPct > 0.05) return "up";
  if (deltaPct < -0.05) return "down";
  return "flat";
}

function patchKpi(items: Kpi[], id: KpiId, value: number, deltaPct?: number) {
  const idx = items.findIndex((k) => k.id === id);
  if (idx === -1) return;
  items[idx] = {
    ...items[idx],
    value,
    deltaPct: deltaPct ?? items[idx].deltaPct,
    trend: deltaPct === undefined ? items[idx].trend : trendOf(deltaPct),
  };
}

async function getKpisImpl(): Promise<WithSource<{ items: Kpi[] }>> {
  const items = MOCK_KPIS.map((k) => ({ ...k }));
  let liveHits = 0;

  const [tvlRes, stableRes, protocolsRes, netRes, marketsRes, chainStatsRes] =
    await Promise.allSettled([
      defillama.getBaseChainTvl(),
      defillama.getBaseStablecoinMcap(),
      defillama.getBaseProtocols(),
      baseRpc.getBaseNetworkStatus(),
      coingecko.getBaseEcosystemMarkets(100),
      blockscout.getChainStats(),
    ]);

  if (tvlRes.status === "fulfilled" && tvlRes.value) {
    patchKpi(items, "tvl", tvlRes.value.tvlUsd, tvlRes.value.changePct24h);
    liveHits++;
  }
  if (stableRes.status === "fulfilled" && stableRes.value !== null) {
    patchKpi(items, "stablecoins", stableRes.value);
    liveHits++;
  }
  if (protocolsRes.status === "fulfilled" && protocolsRes.value) {
    patchKpi(items, "projects", protocolsRes.value.length);
    liveHits++;
  }
  if (netRes.status === "fulfilled" && netRes.value) {
    patchKpi(items, "gas", Math.round(netRes.value.gasGwei * 1000) / 1000);
    liveHits++;
  }
  if (marketsRes.status === "fulfilled" && marketsRes.value) {
    const markets = marketsRes.value;
    const dexVolume = markets.reduce((sum, m) => sum + (m.total_volume ?? 0), 0);
    if (dexVolume > 0) {
      patchKpi(items, "dexVolume24h", dexVolume);
      liveHits++;
    }
    const aiCount = markets.filter((m) => looksLikeAIProject(m.name)).length;
    if (aiCount > 0) {
      patchKpi(items, "aiProjects", aiCount);
      liveHits++;
    }
  }
  if (chainStatsRes.status === "fulfilled" && chainStatsRes.value) {
    patchKpi(items, "transactions", chainStatsRes.value.transactionsToday);
    liveHits++;
  }

  return { items, source: liveHits > 0 ? "live" : "mock" };
}
export const getKpis = cache(getKpisImpl);

async function getMarketOverviewImpl(): Promise<WithSource<MarketOverview>> {
  const net = await baseRpc.getBaseNetworkStatus();
  if (!net) return { ...MOCK_MARKET_OVERVIEW, source: "mock" };
  return {
    gasGwei: net.gasGwei,
    gasTrend: trendOf(net.gasGwei - MOCK_MARKET_OVERVIEW.gasGwei),
    blockHeight: net.blockHeight,
    txCountLatestBlock: net.txCountLatestBlock,
    estimatedTps: net.estimatedTps,
    activeWallets24h: MOCK_MARKET_OVERVIEW.activeWallets24h,
    chainId: net.chainId,
    chainName: "Base",
    source: "live",
  };
}
export const getMarketOverview = cache(getMarketOverviewImpl);

async function getPortfolioSummaryImpl(): Promise<WithSource<PortfolioSummary>> {
  // No wallet is connected in this shell, so this stays mock by design —
  // ready to be replaced by a real balances read the moment wallet connect
  // ships, without any change to `PortfolioWidget`.
  return { ...MOCK_PORTFOLIO, source: "mock" };
}
export const getPortfolioSummary = cache(getPortfolioSummaryImpl);

async function getTrendingNarrativesImpl(): Promise<WithSource<Narrative[]>> {
  // Narrative classification isn't exposed by a free API — curated for now,
  // shaped so a categorization service can populate it later.
  return Object.assign(
    MOCK_NARRATIVES.map((n) => ({ ...n })),
    { source: "mock" as const }
  );
}
export const getTrendingNarratives = cache(getTrendingNarrativesImpl);

async function getAIProjectsImpl(): Promise<WithSource<AIProject[]>> {
  const mockResult = () =>
    Object.assign(
      MOCK_AI_PROJECTS.map((p) => ({ ...p })),
      { source: "mock" as const }
    );

  try {
    const markets = await coingecko.getBaseEcosystemMarkets(150);
    if (!markets) return mockResult();

    const aiMarkets = markets.filter((m) => looksLikeAIProject(m.name));
    if (!aiMarkets.length) {
      return mockResult();
    }

    const maxVolume = Math.max(...aiMarkets.map((m) => m.total_volume ?? 0), 1);
    const projects: AIProject[] = aiMarkets.slice(0, 6).map((m) => ({
      name: m.name,
      symbol: m.symbol.toUpperCase(),
      activityScore: Math.round(((m.total_volume ?? 0) / maxVolume) * 100),
      change24hPct: m.price_change_percentage_24h ?? 0,
      isNewLaunch: false,
    }));

    return Object.assign(projects, { source: "live" as const });
  } catch {
    return mockResult();
  }
}
export const getAIProjects = cache(getAIProjectsImpl);

async function getWhaleEventsImpl(): Promise<WithSource<WhaleEvent[]>> {
  // Whale-transfer indexing requires a paid API (e.g. Whale Alert) — mocked
  // for now, typed identically to what that integration would return.
  return Object.assign(
    MOCK_WHALE_EVENTS.map((e) => ({ ...e })),
    { source: "mock" as const }
  );
}
export const getWhaleEvents = cache(getWhaleEventsImpl);

async function getSignalsImpl(): Promise<WithSource<Signal[]>> {
  try {
    const pairs = await dexscreener.getBaseTrendingPairs();
    if (!pairs || !pairs.length) {
      return Object.assign(MOCK_SIGNALS.map((s) => ({ ...s })), { source: "mock" as const });
    }

    const now = Date.now();
    const signals: Signal[] = pairs.slice(0, 6).map((pair, i) => {
      const change = pair.priceChange?.h24 ?? 0;
      const ageHours = pair.pairCreatedAt ? (now - pair.pairCreatedAt) / 3_600_000 : Infinity;
      const buys = pair.txns?.h24?.buys ?? 0;
      const sells = pair.txns?.h24?.sells ?? 0;

      const kind: Signal["kind"] =
        ageHours < 48
          ? "new-listing"
          : change > 15
            ? "momentum"
            : buys > sells * 1.5
              ? "buy"
              : "watch";

      const strength = Math.max(5, Math.min(99, Math.round(50 + change)));

      return {
        id: `${pair.baseToken.address}-${i}`,
        project: pair.baseToken.name || pair.baseToken.symbol,
        kind,
        strength,
        note:
          kind === "new-listing"
            ? `Listed on ${pair.dexId} recently`
            : `${change >= 0 ? "+" : ""}${change.toFixed(1)}% 24h · ${buys} buys / ${sells} sells`,
      };
    });

    return Object.assign(signals, { source: "live" as const });
  } catch {
    return Object.assign(MOCK_SIGNALS.map((s) => ({ ...s })), { source: "mock" as const });
  }
}
export const getSignals = cache(getSignalsImpl);

async function getProjectSpotlightImpl(): Promise<WithSource<ProjectSpotlight>> {
  try {
    const top = await defillama.getTopBaseProtocol();
    if (!top) return { ...MOCK_PROJECT_SPOTLIGHT, source: "mock" };

    const markets = await coingecko.getBaseEcosystemMarkets(150);
    const match = markets?.find(
      (m) => m.symbol.toLowerCase() === top.symbol?.toLowerCase() || m.name === top.name
    );

    const change24hPct = match?.price_change_percentage_24h ?? top.change_1d ?? 0;
    const category = top.category ?? "DeFi";

    const repoSlug = KNOWN_PROTOCOL_REPOS[top.name.toLowerCase()];
    const repo = repoSlug ? await github.getRepoStats(repoSlug) : null;

    // Real GitHub stars drive this when we have a known repo mapping;
    // otherwise fall back to a TVL-derived estimate of engineering activity.
    const developerActivityScore = repo
      ? Math.min(99, Math.round(Math.log10(Math.max(repo.stars, 10)) * 22))
      : Math.min(80, Math.round(Math.log10(Math.max(top.tvl, 10)) * 8));

    const aiScore =
      looksLikeAIProject(top.name) || category.toLowerCase().includes("ai") ? 82 : 24;

    // Composite, transparently-derived confidence score — not a third-party
    // metric — blending live TVL scale and 24h price action.
    const healthScore = Math.max(
      10,
      Math.min(99, Math.round(70 + change24hPct * 1.5 + (top.tvl > 50_000_000 ? 10 : 0)))
    );

    return {
      name: top.name,
      symbol: (top.symbol || match?.symbol || "").toUpperCase(),
      category,
      priceUsd: match?.current_price ?? 0,
      change24hPct,
      tvlUsd: top.tvl,
      fdvUsd: match?.fully_diluted_valuation ?? top.mcap ?? null,
      liquidityUsd: null,
      githubStars: repo?.stars ?? null,
      developerActivityScore,
      aiScore,
      healthScore,
      communityScore: Math.min(99, Math.round(Math.log10(Math.max(top.tvl, 10)) * 10)),
      source: "live",
    };
  } catch {
    return { ...MOCK_PROJECT_SPOTLIGHT, source: "mock" };
  }
}
export const getProjectSpotlight = cache(getProjectSpotlightImpl);

async function getActivityFeedImpl(): Promise<WithSource<ActivityEvent[]>> {
  let events: ActivityEvent[] = MOCK_ACTIVITY_FEED.map((e) => ({ ...e }));
  let liveHits = 0;

  const repo = await github.getRepoStats(PRIMARY_REPO);
  if (repo?.latestReleaseTag && repo.latestReleasePublishedAt) {
    events.unshift({
      id: `gh-${repo.latestReleaseTag}`,
      kind: "github-release",
      title: `${repo.fullName} released ${repo.latestReleaseTag}`,
      detail: `${formatNumber(repo.stars)} stars · ${formatNumber(repo.forks)} forks`,
      timestamp: repo.latestReleasePublishedAt,
    });
    liveHits++;
  }

  const pairs = await dexscreener.getBaseTrendingPairs();
  if (pairs && pairs[0]) {
    const p = pairs[0];
    events.unshift({
      id: `swap-${p.baseToken.address}`,
      kind: "large-swap",
      title: `High volume on ${p.baseToken.symbol}`,
      detail: `${formatPrice(Math.round(p.volume?.h24 ?? 0))} 24h volume on ${p.dexId}`,
      timestamp: new Date().toISOString(),
    });
    liveHits++;
  }

  const verifiedContract = await blockscout.getRecentlyVerifiedContract();
  if (verifiedContract) {
    // Replace the mock placeholder now that a real verified contract is available.
    events = events.filter((e) => e.kind !== "contract-verification");
    events.unshift({
      id: `verify-${verifiedContract.address}`,
      kind: "contract-verification",
      title: `Contract verified: ${verifiedContract.name ?? "Unnamed contract"}`,
      detail: `${verifiedContract.address.slice(0, 6)}…${verifiedContract.address.slice(-4)} on Blockscout`,
      timestamp: verifiedContract.verifiedAt,
    });
    liveHits++;
  }

  const sorted = events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const source: DataSource = liveHits > 0 ? "live" : "mock";

  return Object.assign(sorted, { source });
}
export const getActivityFeed = cache(getActivityFeedImpl);

async function getWelcomeStatsImpl(): Promise<WithSource<WelcomeStats>> {
  const [tvlRes, netRes, repoRes] = await Promise.allSettled([
    defillama.getBaseChainTvl(),
    baseRpc.getBaseNetworkStatus(),
    github.getRepoStats(PRIMARY_REPO),
  ]);

  const tvl = tvlRes.status === "fulfilled" ? tvlRes.value : null;
  const net = netRes.status === "fulfilled" ? netRes.value : null;
  const repo = repoRes.status === "fulfilled" ? repoRes.value : null;

  let liveHits = 0;
  const stats: WelcomeStats = { ...MOCK_WELCOME_STATS };

  if (tvl) {
    stats.tvlUsd = tvl.tvlUsd;
    liveHits++;
  }
  if (net) {
    stats.gasStatus = net.gasGwei < 0.02 ? `Low · ${net.gasGwei.toFixed(3)} gwei` : `${net.gasGwei.toFixed(3)} gwei`;
    liveHits++;
  }
  if (repo?.latestReleaseTag) {
    stats.latestAiProject = MOCK_WELCOME_STATS.latestAiProject;
    liveHits++;
  }

  return { ...stats, source: liveHits > 0 ? "live" : "mock" };
}
export const getWelcomeStats = cache(getWelcomeStatsImpl);

async function getIntelligenceBriefImpl(): Promise<WithSource<IntelligenceBrief>> {
  try {
    return await buildIntelligenceBrief();
  } catch {
    return { ...MOCK_INTELLIGENCE_BRIEF, source: "mock" };
  }
}
export const getIntelligenceBrief = cache(getIntelligenceBriefImpl);

async function buildIntelligenceBrief(): Promise<WithSource<IntelligenceBrief>> {
  const [kpisRes, marketRes, welcomeRes, signalsRes] = await Promise.allSettled([
    getKpis(),
    getMarketOverview(),
    getWelcomeStats(),
    getSignals(),
  ]);

  const kpis = kpisRes.status === "fulfilled" ? kpisRes.value : { items: MOCK_KPIS, source: "mock" as const };
  const market = marketRes.status === "fulfilled" ? marketRes.value : { ...MOCK_MARKET_OVERVIEW, source: "mock" as const };
  const welcome = welcomeRes.status === "fulfilled" ? welcomeRes.value : { ...MOCK_WELCOME_STATS, source: "mock" as const };
  const signals = signalsRes.status === "fulfilled" ? signalsRes.value : Object.assign(MOCK_SIGNALS.map((s) => ({ ...s })), { source: "mock" as const });

  const points: IntelligenceBriefPoint[] = [];

  points.push({
    id: "narrative",
    text: `${welcome.trendingNarrative} dominate narratives`,
    tone: "positive",
  });

  const tvlKpi = kpis.items.find((k) => k.id === "tvl");
  if (tvlKpi?.deltaPct !== undefined) {
    const up = tvlKpi.deltaPct >= 0;
    points.push({
      id: "tvl",
      text: `TVL ${up ? "increased" : "decreased"} ${Math.abs(tvlKpi.deltaPct).toFixed(1)}%`,
      tone: up ? "positive" : "negative",
    });
  }

  points.push({
    id: "gas",
    text: market.gasGwei < 0.02 ? "Gas remains low" : `Gas at ${market.gasGwei.toFixed(3)} gwei`,
    tone: market.gasGwei < 0.02 ? "positive" : "neutral",
  });

  points.push({ id: "whale", text: `Whale transferred ${welcome.whaleAlert}`, tone: "neutral" });

  points.push({
    id: "launches",
    text: `${welcome.projectsLaunchedToday} projects launched today`,
    tone: "positive",
  });

  const momentumSignal = signals.find((s) => s.kind === "momentum") ?? signals[0];
  if (momentumSignal) {
    points.push({
      id: "momentum",
      text: `${momentumSignal.project} ${momentumSignal.note}`,
      tone: momentumSignal.strength >= 50 ? "positive" : "neutral",
    });
  }

  const anyLive = [kpis.source, market.source, welcome.source, signals.source].includes("live");

  return {
    points: points.slice(0, 6),
    generatedAt: new Date().toISOString(),
    source: anyLive ? "live" : "mock",
  };
}

async function getNarrativeHeatmapImpl(): Promise<WithSource<NarrativeHeatRow[]>> {
  // Narrative-to-category heat classification isn't exposed by a free API —
  // curated for now, shaped identically to what a categorization service
  // would return.
  return Object.assign(
    MOCK_NARRATIVE_HEATMAP.map((row) => ({ ...row })),
    { source: "mock" as const }
  );
}
export const getNarrativeHeatmap = cache(getNarrativeHeatmapImpl);

async function getWatchlistImpl(): Promise<WithSource<WatchlistItem[]>> {
  // Pinned items are inherently user-specific and require accounts/wallet
  // connect, neither of which exist in this shell yet.
  return Object.assign(
    MOCK_WATCHLIST.map((item) => ({ ...item })),
    { source: "mock" as const }
  );
}
export const getWatchlist = cache(getWatchlistImpl);

async function getLiveTickerImpl(): Promise<WithSource<LiveTicker>> {
  const ticker: LiveTicker = { ...MOCK_LIVE_TICKER };
  let liveHits = 0;

  const [netRes, pricesRes, tvlRes, chainStatsRes] = await Promise.allSettled([
    baseRpc.getBaseNetworkStatus(),
    coingecko.getMajorPrices(),
    defillama.getBaseChainTvl(),
    blockscout.getChainStats(),
  ]);

  if (netRes.status === "fulfilled" && netRes.value) {
    ticker.blockHeight = netRes.value.blockHeight;
    ticker.gasGwei = netRes.value.gasGwei;
    liveHits++;
  }
  if (pricesRes.status === "fulfilled" && pricesRes.value) {
    ticker.ethPriceUsd = pricesRes.value.eth.usd;
    ticker.ethChangePct24h = pricesRes.value.eth.changePct24h;
    ticker.btcPriceUsd = pricesRes.value.btc.usd;
    ticker.btcChangePct24h = pricesRes.value.btc.changePct24h;
    liveHits++;
  }
  if (tvlRes.status === "fulfilled" && tvlRes.value) {
    ticker.tvlUsd = tvlRes.value.tvlUsd;
    liveHits++;
  }
  if (chainStatsRes.status === "fulfilled" && chainStatsRes.value) {
    ticker.transactionsToday = chainStatsRes.value.transactionsToday;
    liveHits++;
  }

  return { ...ticker, source: liveHits > 0 ? "live" : "mock" };
}
export const getLiveTicker = cache(getLiveTickerImpl);
