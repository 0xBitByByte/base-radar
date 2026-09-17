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
import { attributionFromProviderResult, resolveMetric, type MetricResolution } from "@/lib/providers/common/resolution";
import { getWhaleProvider, type WatchedToken, type WhaleEvent as WhaleDetectionEvent } from "@/lib/whale";
import { getGovernanceProvider, type GovernanceEvent, type GovernanceProjectRef } from "@/lib/governance";
import type { VerifiedContract } from "@/lib/providers/blockscout/service";
import type { RepoStats } from "@/lib/providers/github/service";
import { findTopTvlMover } from "@/lib/intelligence/sources";
import { getIntelligenceProvider, type NarrativeCategorySample } from "@/lib/intelligence-engine";
import {
  getProject,
  getProjects,
  type DiscoverySource,
  type ProjectCategory,
  type RegistryLifecycleState,
  type VerificationLevel,
} from "@/data/projects";
import { computeRegistryMetrics, type RegistryMetrics } from "@/data/projects/metrics";
import { countActiveProposals } from "@/lib/governance/helpers";
import { getAlerts, getIntelligenceAlerts } from "@/lib/alerts/service";
import { generateDailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator";
import type { RegistryUpdateInput } from "@/lib/ai-intelligence/generator/types";
import type { AIIntelligenceBrief } from "@/lib/ai-intelligence/types";
import type { DailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator/briefing";
import {
  toDashboardEvidenceSummary,
  toDashboardIntelligenceBrief,
  toDashboardSourceAttribution,
  type DashboardEvidenceSummaryItem,
  type DashboardSourceAttribution,
} from "@/lib/ai-intelligence/dashboard-adapter";
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
  MOCK_WELCOME_STATS,
  MOCK_WHALE_EVENTS,
} from "@/lib/data/mock";
import type {
  ActivityEvent,
  AIProject,
  DataSource,
  HeatmapCategory,
  IntelligenceBrief,
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

function patchKpi(items: Kpi[], id: KpiId, value: number, deltaPct?: number, resolution?: MetricResolution<number>) {
  const idx = items.findIndex((k) => k.id === id);
  if (idx === -1) return;
  items[idx] = {
    ...items[idx],
    value,
    deltaPct: deltaPct ?? items[idx].deltaPct,
    trend: deltaPct === undefined ? items[idx].trend : trendOf(deltaPct),
    resolution: resolution ?? items[idx].resolution,
  };
}

async function getKpisImpl(): Promise<WithSource<{ items: Kpi[] }>> {
  const items = MOCK_KPIS.map((k) => ({ ...k }));
  let liveHits = 0;

  const [tvlRes, stableRes, protocolsRes, netRes, marketsRes, chainStatsRes, pairsRes] =
    await Promise.allSettled([
      defillama.getBaseChainTvl(),
      defillama.getBaseStablecoinMcap(),
      defillama.getBaseProtocols(),
      baseRpc.getBaseNetworkStatus(),
      coingecko.getBaseEcosystemMarkets(100),
      blockscout.getChainStats(),
      dexscreener.getBaseTrendingPairs(),
    ]);

  const marketsResult = marketsRes.status === "fulfilled" ? marketsRes.value : null;
  const pairsResult = pairsRes.status === "fulfilled" ? pairsRes.value : null;

  const tvl = tvlRes.status === "fulfilled" ? unwrap(tvlRes.value) : null;
  const stable = stableRes.status === "fulfilled" ? unwrap(stableRes.value) : null;
  const protocols = protocolsRes.status === "fulfilled" ? unwrap(protocolsRes.value) : null;
  const net = netRes.status === "fulfilled" ? unwrap(netRes.value) : null;
  const markets = marketsResult ? unwrap(marketsResult) : null;
  const chainStats = chainStatsRes.status === "fulfilled" ? unwrap(chainStatsRes.value) : null;
  const pairs = pairsResult ? unwrap(pairsResult) : null;

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
    // PR-052 — Provider Resolution Engine, not a bare `??`: CoinGecko's
    // Base-ecosystem markets sum is the primary candidate, DexScreener's
    // own trending-pairs sum (already fetched for `getSignalsImpl`/
    // `getActivityFeedImpl` elsewhere in this file) is a real, if
    // narrower-scoped, fallback — the same `resolveMetric` engine
    // `lib/intelligence/merge.ts` uses for a single project's volume,
    // applied here at the ecosystem level.
    const coingeckoVolume = markets.reduce((sum, m) => sum + (m.volume24hUsd ?? 0), 0);
    const dexscreenerVolume = pairs ? pairs.reduce((sum, p) => sum + (p.volume24hUsd ?? 0), 0) : null;
    const dexVolumeResolution = resolveMetric<number>([
      {
        provider: "coingecko",
        value: coingeckoVolume > 0 ? coingeckoVolume : null,
        attribution: attributionFromProviderResult("coingecko", marketsResult),
      },
      {
        provider: "dexscreener",
        value: dexscreenerVolume && dexscreenerVolume > 0 ? dexscreenerVolume : null,
        attribution: attributionFromProviderResult("dexscreener", pairsResult),
        confidence: "medium",
      },
    ]);
    if (dexVolumeResolution.value !== null) {
      patchKpi(items, "dexVolume24h", dexVolumeResolution.value, undefined, dexVolumeResolution);
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

  // Both already integrated elsewhere (`getKpisImpl` calls the same two
  // functions) — `getOrSet`'s single-flight cache means this never doubles
  // the actual network request, it just reuses/repopulates the same cache
  // entry for this widget's own shape.
  const [tvlRes, chainStatsRes] = await Promise.allSettled([
    defillama.getBaseChainTvl(),
    blockscout.getChainStats(),
  ]);
  const tvl = tvlRes.status === "fulfilled" ? unwrap(tvlRes.value) : null;
  const chainStats = chainStatsRes.status === "fulfilled" ? unwrap(chainStatsRes.value) : null;

  return {
    gasGwei: net.gasGwei,
    gasTrend: trendOf(net.gasGwei - MOCK_MARKET_OVERVIEW.gasGwei),
    blockHeight: net.blockHeight,
    txCountLatestBlock: net.txCountLatestBlock,
    estimatedTps: net.estimatedTps,
    chainId: net.chainId,
    chainName: "Base",
    tvlUsd: tvl ? tvl.tvlUsd : null,
    transactionsToday: chainStats ? chainStats.transactionsToday : null,
    totalAddresses: chainStats ? chainStats.totalAddresses : null,
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
 * dashboard-facing `WhaleEvent` shape below). `cache()`-wrapped so every
 * caller of `getWhaleEventsImpl` (dashboard widget) shares one detection
 * pass per request instead of each re-running the confidence-scoring loop
 * independently — the underlying Blockscout calls are already cached at
 * the provider level regardless, but this avoids redundant CPU work too.
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

    // DexScreener's free-tier search endpoint (`?q=base`, not a chain-scoped
    // "trending" feed — see `dexscreener/client.ts`) can surface several
    // distinct real contracts that all happen to share the literal token
    // name/symbol "BASE". Deduping by name here keeps every displayed
    // project name unique — showing fewer than 6 signals when fewer unique
    // real names exist, never padding with repeats.
    const seenNames = new Set<string>();
    const uniquePairs = pairs.filter((pair) => {
      const name = (pair.baseToken.name || pair.baseToken.symbol).trim().toLowerCase();
      if (seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    });

    if (!uniquePairs.length) {
      return Object.assign(MOCK_SIGNALS.map((s) => ({ ...s })), { source: "mock" as const });
    }

    const now = Date.now();
    const signals: Signal[] = uniquePairs.slice(0, 6).map((pair, i) => {
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
    const topResult = await defillama.getTopBaseProtocol();
    const top = unwrap(topResult);
    if (!top) return { ...MOCK_PROJECT_SPOTLIGHT, source: "mock" };

    const marketsResult = await coingecko.getBaseEcosystemMarkets(150);
    const markets = unwrap(marketsResult);
    const match = markets?.find(
      (m) => m.symbol.toLowerCase() === top.symbol?.toLowerCase() || m.name === top.name
    );

    // PR-052 — this was a bare, unattributed `match?.changePct24h ?? top.changePct24h ?? 0`
    // fallback chain — the exact "duplicated fallback logic" the Provider
    // Resolution Engine exists to replace. CoinGecko's matched-market
    // change is the primary candidate (asset-specific, high confidence);
    // DefiLlama's own protocol-level change is a real fallback for a
    // protocol CoinGecko didn't match, at medium confidence since it's a
    // coarser, non-token-specific figure.
    const changeResolution = resolveMetric<number>([
      {
        provider: "coingecko",
        value: match?.changePct24h ?? null,
        attribution: attributionFromProviderResult("coingecko", marketsResult),
      },
      {
        provider: "defillama",
        value: top.changePct24h ?? null,
        attribution: attributionFromProviderResult("defillama", topResult),
        confidence: "medium",
      },
    ]);
    const change24hPct = changeResolution.value ?? 0;
    const category = top.category ?? "DeFi";

    const repoSlug = KNOWN_PROTOCOL_REPOS[top.name.toLowerCase()];
    const repo = repoSlug ? unwrap(await github.getRepoStats(repoSlug)) : null;

    // PR-102 — this widget's own literal "TVL" field, and every TVL-scale
    // heuristic derived from it, must be this protocol's real BASE-chain
    // TVL, never its (potentially much larger) global total — the exact
    // Priority 6 finding from the V2 audit (Aave V3: ~$16.9B global vs.
    // ~$506M on Base). `baseTvl` stays `null`, never silently substituted
    // with `top.globalTvlUsd`, when DefiLlama has no Base-specific
    // breakdown for this protocol — the heuristics below then honestly
    // read as if there's no TVL evidence (the log10 floor), not as if a
    // different, larger number were this protocol's real Base TVL.
    const baseTvl = top.baseTvlUsd;

    // Real GitHub stars drive this when we have a known repo mapping;
    // otherwise fall back to a TVL-derived estimate of engineering activity.
    const developerActivityScore = repo
      ? Math.min(99, Math.round(Math.log10(Math.max(repo.stars, 10)) * 22))
      : Math.min(80, Math.round(Math.log10(Math.max(baseTvl ?? 0, 10)) * 8));

    const aiScore =
      looksLikeAIProject(top.name) || category.toLowerCase().includes("ai") ? 82 : 24;

    // Composite, transparently-derived confidence score — not a third-party
    // metric — blending live TVL scale and 24h price action.
    const healthScore = Math.max(
      10,
      Math.min(99, Math.round(70 + change24hPct * 1.5 + ((baseTvl ?? 0) > 50_000_000 ? 10 : 0)))
    );

    return {
      name: top.name,
      symbol: (top.symbol || match?.symbol || "").toUpperCase(),
      category,
      priceUsd: match?.priceUsd ?? 0,
      change24hPct,
      tvlUsd: baseTvl,
      fdvUsd: match?.fullyDilutedValuationUsd ?? top.marketCapUsd ?? null,
      liquidityUsd: null,
      githubStars: repo?.stars ?? null,
      developerActivityScore,
      aiScore,
      healthScore,
      communityScore: Math.min(99, Math.round(Math.log10(Math.max(baseTvl ?? 0, 10)) * 10)),
      changeResolution,
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

/**
 * Request-deduped so the Brief and the Intelligence Wall never issue this
 * fetch twice in the same render pass. Exported (PR-091.04, Governance
 * Compare) for `app/dashboard/compare/page.tsx` to reuse directly, the same
 * way it already reuses `getRawWhaleEvents()` — real, ecosystem-wide
 * governance events, never a second fetch path.
 */
async function getRegistryGovernanceEventsImpl() {
  const projects = getGovernanceTrackedProjects();
  if (projects.length === 0) return [];
  return getGovernanceProvider().fetchEvents({ projects });
}
export const getRegistryGovernanceEvents = cache(getRegistryGovernanceEventsImpl);

export type ExecutiveSnapshot = {
  /** `computeRegistryMetrics()` (`data/projects/metrics.ts`) — a real, pure, already-existing function with no prior caller anywhere in the app; this is its first real use, not a new computation. Its own `verified`/`intelligenceReady` fields read `project.verificationLevel` — a *pipeline-staging* concept confirmed unset on every current project (see that file's own comment) — so this snapshot's `verifiedCount` below deliberately reads a different, populated field instead; `registryMetrics` is kept for `discovered`/`indexed`/`newThisMonth`/`updatedToday`, which don't have that gap. */
  registryMetrics: RegistryMetrics;
  /**
   * PR-085.02 (live-verified fix) — `registryMetrics.verified` reads the
   * empty `verificationLevel` pipeline field (confirmed live: read 0 of 756
   * real projects). `project.verification.status` is the actual editorial
   * trust field this app already surfaces everywhere else (the "Verified"
   * badge on every Project Profile header, `LiveProject.verification` in
   * `lib/projects/build.ts`) — real, populated, not a new concept, just the
   * correct existing field for "how many tracked projects are verified."
   */
  verifiedCount: number;
  /** Same `countActiveProposals()` helper `lib/intelligence/scorecard.ts`/`ProfileKeySignals.tsx` already share (PR-085.01) — reused again here, not re-derived, over the same real ecosystem-wide governance events `getRegistryGovernanceEvents()` already fetches for the landing page. */
  governanceActiveCount: number;
  /** The real, unmocked, untruncated count from `getRawWhaleEvents()` — not `getWhaleEvents()`'s display-oriented top-8/mock-fallback list, since a snapshot count needs to be honest even when the display list would mock-fill. */
  whaleEventCount: number;
  /**
   * V1-FIX-006 — the raw events behind `governanceActiveCount`/
   * `whaleEventCount` above, exposed rather than discarded after counting,
   * so `lib/dashboard/executiveSummary.ts`'s `buildExecutiveHighlights()`
   * can name the real project/proposal/amount instead of a bare number.
   * Same already-`cache()`-wrapped calls this function already made for the
   * counts — not a second fetch.
   */
  governanceEvents: GovernanceEvent[];
  whaleEvents: WhaleDetectionEvent[];
  /** Real, already fetched by `getActivityFeedImpl()` for its own Contract Verification slot — reused here via the same `getOrSet`-cached provider call, not a duplicate network request. `null` when Blockscout has nothing recently verified to report. */
  verifiedContract: VerifiedContract | null;
  /** Real, already fetched by `getActivityFeedImpl()` for its own Developer Activity slot (`PRIMARY_REPO`) — same reasoning as `verifiedContract` above. `null` on a genuine provider miss. */
  repoStats: RepoStats | null;
  /**
   * V1-FIX-006A — the tracked project with the largest real 24h DefiLlama
   * TVL move, resolved via `lib/intelligence/sources.ts`'s `findTopTvlMover`
   * (the same real name/parent-tag protocol matching Project Profile pages
   * use, so a split protocol like Aerodrome or Uniswap still resolves
   * correctly) against `getBaseProtocols()` — the exact same `getOrSet`-cached
   * bulk DefiLlama call `getKpisImpl()` already makes for the "Projects" KPI
   * count, here read for its per-protocol `changePct24h` instead of just its
   * length. Not a second network request. `null` when no tracked project has
   * a real 24h change to compare.
   */
  topTvlMover: { projectId: string; projectName: string; changePct24h: number } | null;
};

/**
 * PR-085.02 — the Executive Dashboard's ecosystem-wide "Market Snapshot"
 * numbers beyond what `getKpis()` already covers (Projects/TVL/Volume/Gas/
 * Stablecoins). Every field here is either a first real caller of an
 * existing pure function (`computeRegistryMetrics`), a plain filter over
 * data `getProjects()` (a pure, synchronous, already-loaded registry read)
 * already provides, or a count over data another already-`cache()`-wrapped
 * function in this file fetches — zero new provider calls:
 * `getRegistryGovernanceEvents()`/`getRawWhaleEvents()` are both deduped
 * against their other call sites in this same file within one render pass.
 */
async function getExecutiveSnapshotImpl(): Promise<ExecutiveSnapshot> {
  // V1-FIX-006 — `verifiedContractResult`/`repoStatsResult` reuse the exact
  // same `getOrSet`-cached provider calls `getActivityFeedImpl()` already
  // makes (`blockscout.getRecentlyVerifiedContract()`, `github.getRepoStats(PRIMARY_REPO)`)
  // — not a second network round-trip, just a second logical caller within
  // this same request. Like every other provider call in this file, a miss
  // resolves to `null` (via `unwrap`) rather than throwing.
  const [governanceEvents, whaleEvents, verifiedContractResult, repoStatsResult, protocolsResult] = await Promise.all([
    getRegistryGovernanceEvents(),
    getRawWhaleEvents(),
    blockscout.getRecentlyVerifiedContract(),
    github.getRepoStats(PRIMARY_REPO),
    defillama.getBaseProtocols(),
  ]);
  const projects = getProjects();
  const topTvlMoverMatch = findTopTvlMover(projects, unwrap(protocolsResult) ?? []);
  const topTvlMover =
    topTvlMoverMatch && topTvlMoverMatch.protocol.changePct24h !== null
      ? {
          projectId: topTvlMoverMatch.project.id,
          projectName: topTvlMoverMatch.project.name,
          changePct24h: topTvlMoverMatch.protocol.changePct24h,
        }
      : null;
  return {
    registryMetrics: computeRegistryMetrics(projects),
    verifiedCount: projects.filter((project) => project.verification.status === "verified").length,
    governanceActiveCount: countActiveProposals(governanceEvents) ?? 0,
    whaleEventCount: whaleEvents.length,
    governanceEvents,
    whaleEvents,
    verifiedContract: unwrap(verifiedContractResult),
    repoStats: unwrap(repoStatsResult),
    topTvlMover,
  };
}
export const getExecutiveSnapshot = cache(getExecutiveSnapshotImpl);

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
 * PR-042 — orchestrates existing modules only: registry data
 * (`data/projects`), the Alert Engine's own getters (`lib/alerts/
 * service.ts` — `getAlerts()`/`getIntelligenceAlerts()`), then
 * `generateDailyIntelligenceBriefing()` (`lib/ai-intelligence/generator`,
 * PR-041). No new network call, no persistence, no LLM. `cache()`-wrapped
 * so a single request never runs the generator more than once, no matter
 * how many callers ask for it — PR-043's `getProjectAIIntelligence()`
 * shares this exact same cached call rather than re-running generation
 * itself (per that PR's "do not trigger duplicate Daily Brief
 * generation").
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
 */
async function getCurrentDailyIntelligenceBriefingImpl(): Promise<DailyIntelligenceBriefing> {
  const now = new Date().toISOString();
  return generateDailyIntelligenceBriefing({
    registryUpdates: getRecentRegistryUpdates(now),
    alertEvents: getAlerts(),
    intelligenceAlerts: getIntelligenceAlerts(),
    now,
  });
}
export const getCurrentDailyIntelligenceBriefing = cache(getCurrentDailyIntelligenceBriefingImpl);

/**
 * The Dashboard-facing service the Daily Brief Generation Pipeline plugs
 * into. Falls back to the existing `MOCK_INTELLIGENCE_BRIEF` — the same
 * fallback the widget has always shown — whenever the pipeline produces
 * zero briefs (expected today, given the two gaps documented above) or
 * throws.
 */
export type DashboardIntelligenceBriefData = WithSource<IntelligenceBrief> & {
  sources: DashboardSourceAttribution[];
  evidenceSummary: DashboardEvidenceSummaryItem[];
};

async function getDashboardIntelligenceBriefImpl(): Promise<DashboardIntelligenceBriefData> {
  try {
    const briefing = await getCurrentDailyIntelligenceBriefing();

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

/**
 * PR-043 — the per-project counterpart to `getDashboardIntelligenceBrief()`.
 * Named `getProjectAIIntelligence`, not `getProjectIntelligence` — that
 * name is already taken by `lib/intelligence/engine.ts`'s
 * `getProjectIntelligence(idOrSlug)`, an unrelated, much larger per-project
 * bundle (identity/market/trading/tvl/contracts/github/chain/community/
 * health/confidence/freshness/summary/narrative/risk/governance). This
 * function only ever surfaces PR-040/041's `AIIntelligenceBrief` model
 * plus PR-037's registry metadata — a narrower, different concept that
 * happens to share the word "intelligence."
 *
 * Reuses `getCurrentDailyIntelligenceBriefing()` (the same cached call
 * `getDashboardIntelligenceBrief()` uses) rather than running the
 * generator again, then filters its real, already-ranked `briefs` down to
 * the ones whose `affectedProjects` names this project — including
 * ecosystem-wide briefs (e.g. "3 projects reached Verified status") that
 * mention several projects at once, not just single-project ones. Reuses
 * `lib/ai-intelligence/dashboard-adapter.ts`'s evidence/source functions
 * unchanged — never a duplicate formatter.
 */
export type ProjectAIIntelligence = {
  registry: {
    verificationLevel: VerificationLevel | undefined;
    lifecycleState: RegistryLifecycleState | undefined;
    discoverySource: DiscoverySource | undefined;
    qualityScore: number | undefined;
  };
  /** Already ranked (highest-priority first) — see `lib/ai-intelligence/generator/ranking.ts`. Empty when nothing currently mentions this project. */
  briefs: AIIntelligenceBrief[];
  evidenceSummary: DashboardEvidenceSummaryItem[];
  sources: DashboardSourceAttribution[];
};

async function getProjectAIIntelligenceImpl(projectId: string): Promise<ProjectAIIntelligence | null> {
  const project = getProject(projectId);
  if (!project) return null;

  const briefing = await getCurrentDailyIntelligenceBriefing();
  const briefs = briefing.briefs.filter((brief) => brief.affectedProjects.includes(project.id));
  const scoped = { ...briefing, briefs };

  return {
    registry: {
      verificationLevel: project.verificationLevel?.level,
      lifecycleState: project.lifecycle?.state,
      discoverySource: project.lifecycle?.discoverySource,
      qualityScore: project.qualityScore?.total,
    },
    briefs,
    evidenceSummary: briefs.length > 0 ? toDashboardEvidenceSummary(scoped) : [],
    sources: briefs.length > 0 ? toDashboardSourceAttribution(scoped) : [],
  };
}
export const getProjectAIIntelligence = cache(getProjectAIIntelligenceImpl);


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

  const pricesResult = pricesRes.status === "fulfilled" ? pricesRes.value : null;
  const chainStatsResult = chainStatsRes.status === "fulfilled" ? chainStatsRes.value : null;

  const net = netRes.status === "fulfilled" ? unwrap(netRes.value) : null;
  const prices = pricesResult ? unwrap(pricesResult) : null;
  const tvl = tvlRes.status === "fulfilled" ? unwrap(tvlRes.value) : null;
  const chainStats = chainStatsResult ? unwrap(chainStatsResult) : null;

  if (net) {
    ticker.blockHeight = net.blockHeight;
    ticker.gasGwei = net.gasGwei;
    liveHits++;
  }

  // PR-052 — CoinGecko is the primary ETH price candidate (also supplies
  // the 24h change, which Blockscout doesn't); Blockscout's own
  // `ChainStats.ethPriceUsd` is a real, already-fetched-for-this-function
  // fallback that was previously discarded entirely (see
  // docs/PROVIDER_DATA_COVERAGE_AUDIT.md §6). BTC has no second candidate
  // in this codebase's Provider Layer, so it stays a plain CoinGecko-only
  // read, same as before.
  const ethPriceResolution = resolveMetric<number>([
    { provider: "coingecko", value: prices?.eth.usd ?? null, attribution: attributionFromProviderResult("coingecko", pricesResult) },
    {
      provider: "blockscout",
      value: chainStats?.ethPriceUsd ?? null,
      attribution: attributionFromProviderResult("blockscout", chainStatsResult),
      confidence: "medium",
    },
  ]);
  if (ethPriceResolution.value !== null) {
    ticker.ethPriceUsd = ethPriceResolution.value;
    ticker.ethPriceResolution = ethPriceResolution;
    liveHits++;
  }
  if (prices) {
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
