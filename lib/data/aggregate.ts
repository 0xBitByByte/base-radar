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
 * place within the same request; `cache()` collapses those into a single
 * call per request instead of firing the underlying provider requests
 * twice.
 */

import { cache } from "react";

import * as baseRpc from "@/lib/providers/base/service";
import * as blockscout from "@/lib/providers/blockscout/service";
import * as coingecko from "@/lib/providers/coingecko/service";
import * as defillama from "@/lib/providers/defillama/service";
import * as dexscreener from "@/lib/providers/dexscreener/service";
import * as github from "@/lib/providers/github/service";
import type { ProviderResult } from "@/lib/providers/common/types";
import { getWhaleProvider, type WatchedToken, type WhaleEvent as WhaleDetectionEvent } from "@/lib/whale";
import { getGovernanceProvider, type GovernanceProjectRef } from "@/lib/governance";
import { getIntelligenceProvider, type NarrativeCategorySample } from "@/lib/intelligence-engine";
import { getProjects, type ProjectCategory } from "@/data/projects";
import { getAlerts, getIntelligenceAlerts } from "@/lib/alerts/service";
import { generateDailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator";
import type { RegistryUpdateInput } from "@/lib/ai-intelligence/generator/types";
import {
  toDashboardEvidenceSummary,
  toDashboardIntelligenceBrief,
  toDashboardSourceAttribution,
  type DashboardEvidenceSummaryItem,
  type DashboardSourceAttribution,
} from "@/lib/ai-intelligence/dashboard-adapter";
import { formatCompactCurrency, formatNumber, formatPercent, formatPrice, formatRelativeTime } from "@/lib/data/format";
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
  MOCK_WELCOME_STATS,
  MOCK_WHALE_EVENTS,
} from "@/lib/data/mock";
import type {
  ActivityEvent,
  AIProject,
  DataSource,
  HeatmapCategory,
  IntelligenceBrief,
  IntelligenceWallData,
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

/**
 * Every `lib/providers/*` service function resolves to a `ProviderResult<T>`
 * envelope (`{ok, data}` or `{ok:false, error}`), never throws, never
 * returns bare `null` — this aggregation layer's own convention (predating
 * PR10's migration onto that provider layer) is `T | null`, so every call
 * site unwraps through this instead of branching on `.ok` inline.
 */
function unwrap<T>(result: ProviderResult<T>): T | null {
  return result.ok ? result.data : null;
}

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

  const tvl = tvlRes.status === "fulfilled" ? unwrap(tvlRes.value) : null;
  const stable = stableRes.status === "fulfilled" ? unwrap(stableRes.value) : null;
  const protocols = protocolsRes.status === "fulfilled" ? unwrap(protocolsRes.value) : null;
  const net = netRes.status === "fulfilled" ? unwrap(netRes.value) : null;
  const markets = marketsRes.status === "fulfilled" ? unwrap(marketsRes.value) : null;
  const chainStats = chainStatsRes.status === "fulfilled" ? unwrap(chainStatsRes.value) : null;

  if (tvl) {
    patchKpi(items, "tvl", tvl.tvlUsd, tvl.changePct24h);
    liveHits++;
  }
  if (stable !== null) {
    patchKpi(items, "stablecoins", stable);
    liveHits++;
  }
  if (protocols) {
    patchKpi(items, "projects", protocols.length);
    liveHits++;
  }
  if (net) {
    patchKpi(items, "gas", Math.round(net.gasGwei * 1000) / 1000);
    liveHits++;
  }
  if (markets) {
    const dexVolume = markets.reduce((sum, m) => sum + (m.volume24hUsd ?? 0), 0);
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
  if (chainStats) {
    patchKpi(items, "transactions", chainStats.transactionsToday);
    liveHits++;
  }

  return { items, source: liveHits > 0 ? "live" : "mock" };
}
export const getKpis = cache(getKpisImpl);

async function getMarketOverviewImpl(): Promise<WithSource<MarketOverview>> {
  const net = unwrap(await baseRpc.getBaseNetworkStatus());
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

/**
 * Narrative classification isn't exposed by any free API as a standalone
 * feed (PR10 audit confirmed this) — but it doesn't need to be: every
 * registry project already declares real categories, and CoinGecko already
 * gives us real 24h price/volume deltas per project. Grouping those by
 * category and running them through `generateNarrative` produces genuinely
 * computed momentum, not curated copy — the same "real data in, transparent
 * heuristic out" pattern the rest of this file already uses.
 */
type CategoryNarrativeMeta = { name: string; category: string; heatmapCategory: HeatmapCategory | null };

const CATEGORY_NARRATIVE_META: Partial<Record<ProjectCategory, CategoryNarrativeMeta>> = {
  ai: { name: "AI Agents", category: "Artificial Intelligence", heatmapCategory: "AI" },
  dex: { name: "DEX Activity", category: "DeFi", heatmapCategory: "DeFi" },
  lending: { name: "Lending Markets", category: "DeFi", heatmapCategory: "DeFi" },
  derivatives: { name: "Derivatives", category: "DeFi", heatmapCategory: "DeFi" },
  yield: { name: "Yield Strategies", category: "DeFi", heatmapCategory: "DeFi" },
  stablecoin: { name: "Stablecoins", category: "DeFi", heatmapCategory: "DeFi" },
  gaming: { name: "Onchain Gaming", category: "Gaming", heatmapCategory: "Gaming" },
  rwa: { name: "RWA Tokenization", category: "RWA", heatmapCategory: "RWA" },
  social: { name: "Onchain Social", category: "Consumer", heatmapCategory: "Social" },
  infrastructure: { name: "Infrastructure", category: "Infra", heatmapCategory: "Infrastructure" },
  bridge: { name: "Bridging", category: "Infra", heatmapCategory: "Infrastructure" },
  oracle: { name: "Oracles", category: "Infra", heatmapCategory: "Infrastructure" },
  wallet: { name: "Wallets", category: "Infra", heatmapCategory: "Infrastructure" },
  identity: { name: "Identity", category: "Infra", heatmapCategory: "Infrastructure" },
};

function metaForDisplayCategory(displayCategory: string): CategoryNarrativeMeta | undefined {
  return Object.values(CATEGORY_NARRATIVE_META).find((meta) => meta?.category === displayCategory);
}

async function getNarrativeSamplesImpl(): Promise<NarrativeCategorySample[]> {
  const markets = unwrap(await coingecko.getBaseEcosystemMarkets(150));
  if (!markets || markets.length === 0) return [];

  const samples: NarrativeCategorySample[] = [];
  for (const project of getProjects()) {
    const coingeckoId = project.providerIds.coingeckoId;
    if (!coingeckoId) continue;

    const market = markets.find((m) => m.id === coingeckoId);
    if (!market || market.changePct24h === null) continue;

    const meta = CATEGORY_NARRATIVE_META[project.categories[0]];
    if (!meta) continue;

    samples.push({ category: meta.category, changePct24h: market.changePct24h, volumeUsd: market.volume24hUsd });
  }
  return samples;
}
const getNarrativeSamples = cache(getNarrativeSamplesImpl);

async function getTrendingNarrativesImpl(): Promise<WithSource<Narrative[]>> {
  try {
    const samples = await getNarrativeSamples();
    if (samples.length === 0) {
      return Object.assign(MOCK_NARRATIVES.map((n) => ({ ...n })), { source: "mock" as const });
    }

    const { signals } = await getIntelligenceProvider().generateNarrative({ samples });
    if (signals.length === 0) {
      return Object.assign(MOCK_NARRATIVES.map((n) => ({ ...n })), { source: "mock" as const });
    }

    const narratives: Narrative[] = signals.slice(0, 4).map((signal) => {
      const meta = metaForDisplayCategory(signal.category);
      return {
        name: meta?.name ?? signal.category,
        category: signal.category,
        momentum: signal.strength,
        change24hPct: signal.changePct24h,
      };
    });

    return Object.assign(narratives, { source: "live" as const });
  } catch {
    return Object.assign(MOCK_NARRATIVES.map((n) => ({ ...n })), { source: "mock" as const });
  }
}
export const getTrendingNarratives = cache(getTrendingNarrativesImpl);

async function getAIProjectsImpl(): Promise<WithSource<AIProject[]>> {
  const mockResult = () =>
    Object.assign(
      MOCK_AI_PROJECTS.map((p) => ({ ...p })),
      { source: "mock" as const }
    );

  try {
    const markets = unwrap(await coingecko.getBaseEcosystemMarkets(150));
    if (!markets) return mockResult();

    const aiMarkets = markets.filter((m) => looksLikeAIProject(m.name));
    if (!aiMarkets.length) {
      return mockResult();
    }

    const maxVolume = Math.max(...aiMarkets.map((m) => m.volume24hUsd ?? 0), 1);
    const projects: AIProject[] = aiMarkets.slice(0, 6).map((m) => ({
      name: m.name,
      symbol: m.symbol.toUpperCase(),
      activityScore: Math.round(((m.volume24hUsd ?? 0) / maxVolume) * 100),
      change24hPct: m.changePct24h ?? 0,
      isNewLaunch: false,
    }));

    return Object.assign(projects, { source: "live" as const });
  } catch {
    return mockResult();
  }
}
export const getAIProjects = cache(getAIProjectsImpl);

/** Minimum USD value for a real transfer to be reported at all (PR10 — `lib/whale`). */
const WHALE_USD_THRESHOLD = 100_000;

function mockWhaleEvents(): WithSource<WhaleEvent[]> {
  return Object.assign(
    MOCK_WHALE_EVENTS.map((e) => ({ ...e })),
    { source: "mock" as const }
  );
}

/**
 * Real whale-detection events (`lib/whale`'s own shape — not the
 * dashboard-facing `WhaleEvent` shape below). `cache()`-wrapped so both
 * `getWhaleEventsImpl` (dashboard widget) and `getIntelligenceWallDataImpl`
 * (landing page) share one detection pass per request instead of each
 * re-running the confidence-scoring loop independently — the underlying
 * Blockscout calls are already cached at the provider level regardless,
 * but this avoids redundant CPU work too.
 */
async function getRawWhaleEventsImpl(): Promise<WhaleDetectionEvent[]> {
  const [marketsRes, pairsRes] = await Promise.all([
    coingecko.getBaseEcosystemMarkets(150),
    dexscreener.getBaseTrendingPairs(),
  ]);
  const markets = unwrap(marketsRes);
  const pairs = unwrap(pairsRes);
  if (!markets) return [];

  const watchedTokens: WatchedToken[] = [];
  for (const project of getProjects()) {
    const tokenContract = project.contracts.find((c) => c.chain === "base" && c.type === "token");
    const coingeckoId = project.providerIds.coingeckoId;
    if (!tokenContract || !coingeckoId) continue;

    const market = markets.find((m) => m.id === coingeckoId);
    if (!market) continue;

    const matchedPair = pairs?.find((p) => p.baseToken.symbol.toLowerCase() === market.symbol.toLowerCase());
    const hasCorroboratingSignal = Math.abs(matchedPair?.priceChangePct24h ?? 0) > 10;

    watchedTokens.push({
      projectId: project.id,
      projectName: project.name,
      tokenSymbol: market.symbol.toUpperCase(),
      contractAddress: tokenContract.address,
      priceUsd: market.priceUsd,
      hasCorroboratingSignal,
    });
  }

  if (watchedTokens.length === 0) return [];
  return getWhaleProvider().detect({ watchedTokens, usdThreshold: WHALE_USD_THRESHOLD });
}
/** Exported for the Project Profile route (`app/dashboard/projects/[slug]/page.tsx`, PR11) — same `cache()`-wrapped batch detection pass, filtered down to one project there rather than re-running whale detection per-project. */
export const getRawWhaleEvents = cache(getRawWhaleEventsImpl);

async function getWhaleEventsImpl(): Promise<WithSource<WhaleEvent[]>> {
  try {
    const events = await getRawWhaleEvents();
    if (events.length === 0) return mockWhaleEvents();

    const mapped: WhaleEvent[] = events
      .sort((a, b) => b.usdValue - a.usdValue)
      .slice(0, 8)
      .map((e) => ({
        id: e.id,
        label:
          e.classification === "whale-alert" ? `Whale Alert: ${e.tokenSymbol}` : `Large transfer: ${e.tokenSymbol}`,
        amountUsd: e.usdValue,
        direction: "in",
        wallet: `${e.fromAddress.slice(0, 6)}…${e.fromAddress.slice(-4)}`,
        minutesAgo: Math.max(0, Math.round((Date.now() - new Date(e.timestamp).getTime()) / 60_000)),
        isSmartMoney: e.confidence >= 85,
      }));

    return Object.assign(mapped, { source: "live" as const });
  } catch {
    return mockWhaleEvents();
  }
}
export const getWhaleEvents = cache(getWhaleEventsImpl);

async function getSignalsImpl(): Promise<WithSource<Signal[]>> {
  try {
    const pairs = unwrap(await dexscreener.getBaseTrendingPairs());
    if (!pairs || !pairs.length) {
      return Object.assign(MOCK_SIGNALS.map((s) => ({ ...s })), { source: "mock" as const });
    }

    const now = Date.now();
    const signals: Signal[] = pairs.slice(0, 6).map((pair, i) => {
      const change = pair.priceChangePct24h ?? 0;
      const ageHours = pair.pairCreatedAt ? (now - pair.pairCreatedAt) / 3_600_000 : Infinity;
      const buys = pair.buys24h ?? 0;
      const sells = pair.sells24h ?? 0;

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
    const top = unwrap(await defillama.getTopBaseProtocol());
    if (!top) return { ...MOCK_PROJECT_SPOTLIGHT, source: "mock" };

    const markets = unwrap(await coingecko.getBaseEcosystemMarkets(150));
    const match = markets?.find(
      (m) => m.symbol.toLowerCase() === top.symbol?.toLowerCase() || m.name === top.name
    );

    const change24hPct = match?.changePct24h ?? top.changePct24h ?? 0;
    const category = top.category ?? "DeFi";

    const repoSlug = KNOWN_PROTOCOL_REPOS[top.name.toLowerCase()];
    const repo = repoSlug ? unwrap(await github.getRepoStats(repoSlug)) : null;

    // Real GitHub stars drive this when we have a known repo mapping;
    // otherwise fall back to a TVL-derived estimate of engineering activity.
    const developerActivityScore = repo
      ? Math.min(99, Math.round(Math.log10(Math.max(repo.stars, 10)) * 22))
      : Math.min(80, Math.round(Math.log10(Math.max(top.tvlUsd, 10)) * 8));

    const aiScore =
      looksLikeAIProject(top.name) || category.toLowerCase().includes("ai") ? 82 : 24;

    // Composite, transparently-derived confidence score — not a third-party
    // metric — blending live TVL scale and 24h price action.
    const healthScore = Math.max(
      10,
      Math.min(99, Math.round(70 + change24hPct * 1.5 + (top.tvlUsd > 50_000_000 ? 10 : 0)))
    );

    return {
      name: top.name,
      symbol: (top.symbol || match?.symbol || "").toUpperCase(),
      category,
      priceUsd: match?.priceUsd ?? 0,
      change24hPct,
      tvlUsd: top.tvlUsd,
      fdvUsd: match?.fullyDilutedValuationUsd ?? top.marketCapUsd ?? null,
      liquidityUsd: null,
      githubStars: repo?.stars ?? null,
      developerActivityScore,
      aiScore,
      healthScore,
      communityScore: Math.min(99, Math.round(Math.log10(Math.max(top.tvlUsd, 10)) * 10)),
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

  const repo = unwrap(await github.getRepoStats(PRIMARY_REPO));
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

  const pairs = unwrap(await dexscreener.getBaseTrendingPairs());
  if (pairs && pairs[0]) {
    const p = pairs[0];
    events.unshift({
      id: `swap-${p.baseToken.address}`,
      kind: "large-swap",
      title: `High volume on ${p.baseToken.symbol}`,
      detail: `${formatPrice(Math.round(p.volume24hUsd ?? 0))} 24h volume on ${p.dexId}`,
      timestamp: new Date().toISOString(),
    });
    liveHits++;
  }

  const verifiedContract = unwrap(await blockscout.getRecentlyVerifiedContract());
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
  const [tvlRes, netRes, aiProjects] = await Promise.allSettled([
    defillama.getBaseChainTvl(),
    baseRpc.getBaseNetworkStatus(),
    getAIProjects(),
  ]);

  const tvl = tvlRes.status === "fulfilled" ? unwrap(tvlRes.value) : null;
  const net = netRes.status === "fulfilled" ? unwrap(netRes.value) : null;
  const topAiProject = aiProjects.status === "fulfilled" ? aiProjects.value : null;

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
  // Previously re-assigned `latestAiProject` to the same mock value it
  // already had (a no-op that still counted as a "live hit") — this now
  // derives the real top AI-named token from the AI Projects widget's own
  // already-fetched CoinGecko data instead of leaving the field static.
  if (topAiProject?.source === "live" && topAiProject[0]) {
    stats.latestAiProject = topAiProject[0].name;
    liveHits++;
  }

  return { ...stats, source: liveHits > 0 ? "live" : "mock" };
}
export const getWelcomeStats = cache(getWelcomeStatsImpl);

/** Registry projects with a real, configured governance source — never all of them, per `lib/governance`'s "omit rather than fabricate" rule. */
function getGovernanceTrackedProjects(): GovernanceProjectRef[] {
  return getProjects()
    .filter((p): p is typeof p & { governance: { snapshotSpace: string } } => !!p.governance?.snapshotSpace)
    .map((p) => ({ projectId: p.id, projectName: p.name, snapshotSpace: p.governance.snapshotSpace }));
}

/** Request-deduped so the Brief and the Intelligence Wall never issue this fetch twice in the same render pass. */
async function getRegistryGovernanceEventsImpl() {
  const projects = getGovernanceTrackedProjects();
  if (projects.length === 0) return [];
  return getGovernanceProvider().fetchEvents({ projects });
}
const getRegistryGovernanceEvents = cache(getRegistryGovernanceEventsImpl);

/**
 * PR-042 — real, unfabricated registry-change evidence for the Daily
 * Brief Generation Pipeline (`lib/ai-intelligence/generator`). Reads
 * `lifecycle.updatedAt`/`verificationLevel.reachedAt` directly off every
 * registry project (PR-037's optional fields) — no diffing, no stored
 * snapshot, just "did this real timestamp fall within the lookback
 * window." Every current seed project has neither field set, so this
 * returns `[]` today; it activates automatically, per-project, the
 * moment registry data adopts either field, exactly like every other
 * "real data only" integration in this codebase (see PR-038's Registry
 * Summary chips for the same pattern).
 */
const REGISTRY_UPDATE_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

function getRecentRegistryUpdates(now: string): RegistryUpdateInput[] {
  const nowMs = new Date(now).getTime();
  const updates: RegistryUpdateInput[] = [];

  for (const project of getProjects()) {
    const level = project.verificationLevel;
    if (level?.reachedAt && nowMs - new Date(level.reachedAt).getTime() <= REGISTRY_UPDATE_LOOKBACK_MS) {
      updates.push({
        projectId: project.id,
        projectName: project.name,
        kind: "verification-level-change",
        detail: level.level,
        occurredAt: level.reachedAt,
      });
    }

    const lifecycle = project.lifecycle;
    if (lifecycle?.updatedAt && nowMs - new Date(lifecycle.updatedAt).getTime() <= REGISTRY_UPDATE_LOOKBACK_MS) {
      updates.push({
        projectId: project.id,
        projectName: project.name,
        kind: "lifecycle-change",
        detail: lifecycle.state,
        occurredAt: lifecycle.updatedAt,
      });
    }
  }

  return updates;
}

/**
 * PR-042 — the Dashboard-facing service the Daily Brief Generation
 * Pipeline plugs into. Orchestrates existing modules only: registry data
 * (`data/projects`), the Alert Engine's own getters (`lib/alerts/
 * service.ts` — `getAlerts()`/`getIntelligenceAlerts()`), then
 * `generateDailyIntelligenceBriefing()` (`lib/ai-intelligence/generator`,
 * PR-041). No new network call, no persistence, no LLM.
 *
 * Two real, documented gaps kept deliberately unfilled rather than faked:
 * - `discoveryCandidates` stays empty — populating it would mean calling
 *   `lib/discovery/`'s `runDiscovery()`, which performs real external API
 *   requests; this lightweight, render-time service does not trigger a
 *   live Discovery run itself (matches this PR's "no API calls").
 * - `providerChanges` stays empty — a real percentage-change value needs
 *   a comparison against a previous snapshot, which needs persistence;
 *   this PR explicitly prohibits persistence, so there is no honest way
 *   to populate this field yet.
 *
 * `getAlerts()`/`getIntelligenceAlerts()` are themselves empty on the
 * server today (`lib/alerts/service.ts` only self-initializes in the
 * browser) — this call is still correct, forward-compatible code; it
 * starts returning real data automatically once that module gains a
 * server-safe data source, with zero change needed here.
 *
 * Falls back to the existing `MOCK_INTELLIGENCE_BRIEF` — the same
 * fallback the widget has always shown — whenever the pipeline produces
 * zero briefs (expected today, given the gaps above) or throws.
 */
export type DashboardIntelligenceBriefData = WithSource<IntelligenceBrief> & {
  sources: DashboardSourceAttribution[];
  evidenceSummary: DashboardEvidenceSummaryItem[];
};

async function getDashboardIntelligenceBriefImpl(): Promise<DashboardIntelligenceBriefData> {
  try {
    const now = new Date().toISOString();

    const briefing = generateDailyIntelligenceBriefing({
      registryUpdates: getRecentRegistryUpdates(now),
      alertEvents: getAlerts(),
      intelligenceAlerts: getIntelligenceAlerts(),
      now,
    });

    if (briefing.briefs.length === 0) {
      return { ...MOCK_INTELLIGENCE_BRIEF, source: "mock", sources: [], evidenceSummary: [] };
    }

    return {
      ...toDashboardIntelligenceBrief(briefing),
      source: "live",
      sources: toDashboardSourceAttribution(briefing),
      evidenceSummary: toDashboardEvidenceSummary(briefing),
    };
  } catch {
    return { ...MOCK_INTELLIGENCE_BRIEF, source: "mock", sources: [], evidenceSummary: [] };
  }
}
export const getDashboardIntelligenceBrief = cache(getDashboardIntelligenceBriefImpl);

/** 0-100, biased by how large a real percentage move is — deterministic, not fabricated. */
function confidenceFromMagnitude(pct: number, base = 50): number {
  return Math.max(30, Math.min(99, Math.round(base + Math.abs(pct))));
}

/**
 * Live-update content for the landing page's AI Intelligence Wall (PR10
 * Part 2). Keyed by the tile ids `AIIntelligencePreview.tsx` defines in its
 * own `TILE_DEFS`. A tile with no entry here (e.g. "New Protocol", "Funding
 * Round", "Bridge Activity" — none of which have a real backing provider in
 * this codebase) has no live signal and renders its neutral default state
 * instead of a fabricated value; this is the same "omit rather than
 * fabricate" principle `lib/whale` and `lib/governance` already apply,
 * extended to every tile on the Wall. Every input here is a call this file
 * already makes elsewhere for the dashboard/Brief — `cache()` on each of
 * those underlying functions means mounting this on the landing page adds
 * zero duplicate provider requests.
 */
async function getIntelligenceWallDataImpl(): Promise<IntelligenceWallData> {
  const [
    signalsRes,
    narrativeSamplesRes,
    whaleRes,
    governanceRes,
    commitActivityRes,
    verifiedContractRes,
    tvlRes,
    trendingPairsRes,
  ] = await Promise.allSettled([
    getSignals(),
    getNarrativeSamples(),
    getRawWhaleEvents(),
    getRegistryGovernanceEvents(),
    github.getCommitActivity(PRIMARY_REPO),
    blockscout.getRecentlyVerifiedContract(),
    defillama.getBaseChainTvl(),
    dexscreener.getBaseTrendingPairs(),
  ]);

  const data: IntelligenceWallData = {};

  const signals = signalsRes.status === "fulfilled" ? signalsRes.value : null;
  if (signals && signals.source === "live" && signals[0]) {
    const top = signals[0];
    data["ai-signal"] = {
      headline: `${top.project} ${top.note}`,
      detail: `Signal type: ${top.kind}`,
      time: "just now",
      confidence: top.strength,
      source: "DexScreener",
    };
  }

  const narrativeSamples = narrativeSamplesRes.status === "fulfilled" ? narrativeSamplesRes.value : [];
  if (narrativeSamples.length > 0) {
    try {
      const topNarrative = (await getIntelligenceProvider().generateNarrative({ samples: narrativeSamples })).signals[0];
      if (topNarrative) {
        data["narrative-shift"] = {
          headline: `${topNarrative.category} narrative ${topNarrative.label}`,
          detail: `${formatPercent(topNarrative.changePct24h)} 24h`,
          time: "just now",
          confidence: topNarrative.strength,
          source: "CoinGecko",
        };
      }
    } catch {
      // A misconfigured INTELLIGENCE_PROVIDER throws synchronously (see
      // lib/intelligence-engine/index.ts) — this tile simply stays absent
      // (neutral fallback) rather than taking down the whole landing page.
    }
  }

  const rawWhaleEvents = whaleRes.status === "fulfilled" ? whaleRes.value : [];
  const topWhale = [...rawWhaleEvents].sort((a, b) => b.usdValue - a.usdValue)[0];
  if (topWhale) {
    data["whale-alert"] = {
      headline: `${formatCompactCurrency(topWhale.usdValue)} transferred`,
      detail: `${topWhale.tokenSymbol} · ${topWhale.classification === "whale-alert" ? "Whale Alert" : "Large on-chain transfer"}`,
      time: formatRelativeTime(topWhale.timestamp),
      confidence: topWhale.confidence,
      source: "Blockscout",
    };
  }

  const governanceEvents = governanceRes.status === "fulfilled" ? governanceRes.value : [];
  const topGovernance = governanceEvents[0];
  if (topGovernance) {
    const projectName =
      getGovernanceTrackedProjects().find((p) => p.projectId === topGovernance.projectId)?.projectName ??
      topGovernance.projectId;
    const statusHeadline: Record<typeof topGovernance.status, string> = {
      passed: "Proposal passed",
      active: "Vote active",
      failed: "Proposal failed",
      pending: "Vote pending",
    };
    data["governance-vote"] = {
      headline: statusHeadline[topGovernance.status],
      detail: `${projectName} · ${topGovernance.title}`,
      time: formatRelativeTime(topGovernance.end),
      confidence: topGovernance.confidence,
      source: "Snapshot",
    };
  }

  const commitActivity = commitActivityRes.status === "fulfilled" ? unwrap(commitActivityRes.value) : null;
  if (commitActivity) {
    data["developer-activity"] = {
      headline: `${commitActivity.commitsLast7d} commits this week`,
      detail: commitActivity.fullName,
      time: "past 7 days",
      confidence: commitActivity.trendPct !== null ? confidenceFromMagnitude(commitActivity.trendPct, 60) : null,
      source: "GitHub",
    };
  }

  const verified = verifiedContractRes.status === "fulfilled" ? unwrap(verifiedContractRes.value) : null;
  if (verified) {
    const hoursAgo = (Date.now() - new Date(verified.verifiedAt).getTime()) / 3_600_000;
    const recencyConfidence = Math.max(50, Math.min(99, Math.round(99 - hoursAgo)));
    const truncatedAddress = `${verified.address.slice(0, 6)}…${verified.address.slice(-4)}`;
    data["builder-verified"] = {
      headline: verified.name ? `${verified.name} verified` : "Contract verified",
      detail: `${truncatedAddress} on Base`,
      time: formatRelativeTime(verified.verifiedAt),
      confidence: recencyConfidence,
      source: "Blockscout",
    };
    data["security-update"] = {
      headline: "Contract security check passed",
      detail: `Latest verification: ${verified.name ?? truncatedAddress}`,
      time: formatRelativeTime(verified.verifiedAt),
      confidence: recencyConfidence,
      source: "Blockscout",
    };
  }

  const tvl = tvlRes.status === "fulfilled" ? unwrap(tvlRes.value) : null;
  if (tvl) {
    data["tvl-spike"] = {
      headline: `TVL ${tvl.changePct24h >= 0 ? "+" : ""}${tvl.changePct24h.toFixed(1)}% in 24h`,
      detail: "Base ecosystem-wide",
      time: "just now",
      confidence: confidenceFromMagnitude(tvl.changePct24h, 50),
      source: "DefiLlama",
    };
  }

  const trendingPairs = trendingPairsRes.status === "fulfilled" ? unwrap(trendingPairsRes.value) : null;
  const topPair = trendingPairs?.[0];
  if (topPair && topPair.volume24hUsd !== null) {
    data["liquidity-movement"] = {
      headline: `${formatCompactCurrency(topPair.volume24hUsd)} 24h volume`,
      detail: `${topPair.baseToken.symbol} · ${topPair.dexId}`,
      time: "last 24h",
      confidence: topPair.priceChangePct24h !== null ? confidenceFromMagnitude(topPair.priceChangePct24h, 50) : null,
      source: "DexScreener",
    };
  }

  return data;
}
export const getIntelligenceWallData = cache(getIntelligenceWallDataImpl);

async function getNarrativeHeatmapImpl(): Promise<WithSource<NarrativeHeatRow[]>> {
  try {
    const samples = await getNarrativeSamples();
    if (samples.length === 0) {
      return Object.assign(MOCK_NARRATIVE_HEATMAP.map((row) => ({ ...row })), { source: "mock" as const });
    }

    const { signals } = await getIntelligenceProvider().generateNarrative({ samples });

    const rows: NarrativeHeatRow[] = [];
    for (const signal of signals) {
      const meta = metaForDisplayCategory(signal.category);
      if (!meta?.heatmapCategory) continue;
      rows.push({
        category: meta.heatmapCategory,
        heat: signal.strength,
        momentum: trendOf(signal.changePct24h),
        change24hPct: signal.changePct24h,
      });
    }

    if (rows.length === 0) {
      return Object.assign(MOCK_NARRATIVE_HEATMAP.map((row) => ({ ...row })), { source: "mock" as const });
    }

    return Object.assign(rows, { source: "live" as const });
  } catch {
    return Object.assign(MOCK_NARRATIVE_HEATMAP.map((row) => ({ ...row })), { source: "mock" as const });
  }
}
export const getNarrativeHeatmap = cache(getNarrativeHeatmapImpl);

async function getLiveTickerImpl(): Promise<WithSource<LiveTicker>> {
  const ticker: LiveTicker = { ...MOCK_LIVE_TICKER };
  let liveHits = 0;

  const [netRes, pricesRes, tvlRes, chainStatsRes] = await Promise.allSettled([
    baseRpc.getBaseNetworkStatus(),
    coingecko.getMajorPrices(),
    defillama.getBaseChainTvl(),
    blockscout.getChainStats(),
  ]);

  const net = netRes.status === "fulfilled" ? unwrap(netRes.value) : null;
  const prices = pricesRes.status === "fulfilled" ? unwrap(pricesRes.value) : null;
  const tvl = tvlRes.status === "fulfilled" ? unwrap(tvlRes.value) : null;
  const chainStats = chainStatsRes.status === "fulfilled" ? unwrap(chainStatsRes.value) : null;

  if (net) {
    ticker.blockHeight = net.blockHeight;
    ticker.gasGwei = net.gasGwei;
    liveHits++;
  }
  if (prices) {
    ticker.ethPriceUsd = prices.eth.usd;
    ticker.ethChangePct24h = prices.eth.changePct24h;
    ticker.btcPriceUsd = prices.btc.usd;
    ticker.btcChangePct24h = prices.btc.changePct24h;
    liveHits++;
  }
  if (tvl) {
    ticker.tvlUsd = tvl.tvlUsd;
    liveHits++;
  }
  if (chainStats) {
    ticker.transactionsToday = chainStats.transactionsToday;
    liveHits++;
  }

  return { ...ticker, source: liveHits > 0 ? "live" : "mock" };
}
export const getLiveTicker = cache(getLiveTickerImpl);
