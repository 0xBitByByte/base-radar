import type { Metadata } from "next";
import { Waypoints } from "lucide-react";

import { getProject } from "@/data/projects/helpers";
import { ProjectSubpageBreadcrumb } from "@/components/explorer/ProjectSubpageBreadcrumb";
import { pairToTradingPool } from "@/lib/intelligence/merge";
import * as dexscreener from "@/lib/providers/dexscreener/service";
import * as coingecko from "@/lib/providers/coingecko/service";
import { resolveTokenLogosForPools } from "@/lib/branding/resolveTokenLogo";
import { resolveLogoUrl } from "@/lib/projects/build";
import { resolveTradingDiscoveryStrategies } from "@/lib/trading/discoveryStrategy";
import { paginateLiveProjects } from "@/lib/projects/pagination";
import { MetricItem } from "@/components/explorer/MetricItem";
import { PoolCategoryTabs } from "@/components/explorer/PoolCategoryTabs";
import { PoolExplorerFilterBar } from "@/components/explorer/PoolExplorerFilterBar";
import { PoolExplorerList } from "@/components/explorer/PoolExplorerList";
import { PoolExplorerPagination } from "@/components/explorer/PoolExplorerPagination";
import { PoolExplorerSortSelect } from "@/components/explorer/PoolExplorerSortSelect";
import { formatDexName, getPoolsForCategory, getPoolStatus, POOL_CATEGORIES, type PoolCategoryId } from "@/components/explorer/pairIntelligenceHelpers";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCompactCurrency, formatPercent } from "@/lib/data/format";
import { parsePoolsQueryState, type RawSearchParams } from "@/lib/pools/queryState";
import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_TITLE_CLASS, PAGE_HEADER_SUBTITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import type { TradingPool } from "@/lib/intelligence/types";

type PoolExplorerPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

/**
 * PR-097.01 (Performance — C1) — same real gap and same fix already
 * applied to the Whale/Governance/Contracts Explorers: this page
 * previously rendered every real matching pool in one unbounded list.
 */
const POOLS_PAGE_SIZE = 25;

export async function generateMetadata({ params }: PoolExplorerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  // Matches `[slug]/page.tsx`'s exact convention — the root layout's title
  // template already appends " — Base Radar", so this only ever supplies
  // the page-specific part.
  return { title: project ? `${project.name} — Pool Explorer` : "Pool Explorer" };
}

/**
 * PR-084.02 — the destination behind PR-084.01's "View All Pools (N)" CTA.
 * Deliberately lightweight: `getProject` (registry lookup) +
 * `dexscreener.getPairsForToken` (the same cached, on-demand call the
 * project page already makes) — no `buildProjectIntelligence`, no scoring.
 *
 * Token Logo System — this page now also resolves real token logos: the
 * project's own token via a small, direct `coingecko.getMarketsByIds` call
 * (not the full intelligence engine — this page still doesn't need scoring
 * or any of the engine's other data), and every pool's base/quote tokens
 * via the shared `resolveTokenLogosForPools()`. Both run in parallel with
 * each other, after the pools themselves are resolved.
 */
export default async function PoolExplorerPage({ params, searchParams }: PoolExplorerPageProps) {
  const { slug } = await params;
  const project = getProject(slug);

  const projectHref = `/dashboard/projects/${slug}`;
  const breadcrumb = <ProjectSubpageBreadcrumb projectName={project?.name ?? null} projectHref={projectHref} currentPageLabel="Pools" />;

  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <EmptyState icon={Waypoints} title="Project not found" description="This project isn't in the Base Radar registry." />
      </div>
    );
  }

  // Trading Discovery Strategy — routed through the one centralized
  // resolver (`lib/trading/discoveryStrategy.ts`), not a hardcoded
  // "does this project have its own Base token contract" gate. That old
  // gate was correct for an asset-type project (a lending governance
  // token) but wrong for a DEX: Uniswap has no Base token deployment at
  // all yet has hundreds of real, active Base pools — its real Base
  // footprint is the exchange it hosts, not a single token address. A new
  // DEX project reaches the `"dex"` branch automatically once its registry
  // entry sets `categories: ["dex", ...]` and configures
  // `providerIds.dexscreenerDexIds` — no per-project special case here.
  //
  // The resolver returns an ORDERED list, not one verdict, so a project
  // satisfying more than one real signal (Curve is both a real DEX and has
  // its own real Base token) tries `"dex"` first and falls through to
  // `"token"` if the dex-identity search comes back empty — DexScreener's
  // trending-only search can legitimately miss a real DEX's real pools
  // (confirmed live for Curve during this audit) without that meaning the
  // project has no pools at all.
  const strategies = resolveTradingDiscoveryStrategies(project);
  let richerPairsResult: Awaited<ReturnType<typeof dexscreener.getPairsForToken>> | null = null;
  for (const strategy of strategies) {
    if (strategy.kind === "token") {
      richerPairsResult = await dexscreener.getPairsForToken(strategy.tokenAddress);
    } else if (strategy.kind === "dex") {
      richerPairsResult = await dexscreener.getPairsByDexId(strategy.dexIds);
    } else {
      continue;
    }
    if (richerPairsResult.ok && richerPairsResult.data.length > 0) break;
  }

  if (!richerPairsResult) {
    // Only reachable when every strategy in the list is
    // `"bridge_unimplemented"` or `"not_applicable"` — those are always
    // single-entry lists (see the resolver), so this is the sole strategy.
    const soleStrategy = strategies[0];
    const reason =
      soleStrategy.kind === "bridge_unimplemented"
        ? "Bridge relay/liquidity activity isn't the same data shape as an AMM pool, and no bridge-activity provider is integrated yet — not a fetch failure."
        : soleStrategy.kind === "not_applicable"
          ? `${soleStrategy.reason} Not a fetch failure — this project's category genuinely has no Base pool to track.`
          : "Pool tracking isn't available for this project.";
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <h1 className={PAGE_HEADER_TITLE_CLASS}>{project.name} Pools</h1>
        <EmptyState
          icon={Waypoints}
          title="Pool tracking doesn't apply to this project"
          description={reason}
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-card px-2.5 py-1 text-[11px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-radar-muted">
              Not Applicable
            </span>
          }
        />
      </div>
    );
  }

  const pools: TradingPool[] = richerPairsResult.ok ? richerPairsResult.data.map(pairToTradingPool) : [];
  const attemptedDexStrategy = strategies.some((s) => s.kind === "dex");

  if (pools.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <h1 className={PAGE_HEADER_TITLE_CLASS}>{project.name} Pools</h1>
        <EmptyState
          icon={Waypoints}
          title="No tracked pools"
          description={
            attemptedDexStrategy
              ? `No currently-trending Base pools were found for ${project.name}'s exchange. DexScreener's search only surfaces trending pairs, not every pool this DEX hosts — a real provider limitation, not a fetch failure.`
              : `No live DexScreener pairs are currently matched for ${project.name}.`
          }
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-success/30 bg-radar-success/10 px-2.5 py-1 text-[11px] font-medium text-radar-success">
              Registry Status: Watched
            </span>
          }
        />
      </div>
    );
  }

  // Token Logo System — this page previously never fetched CoinGecko data at
  // all (see this file's git history), which is why the project's own token
  // showed the generic initials badge here while Project Details, fetching
  // the same data, showed the real logo. Both fetches below are small and
  // independent of each other and of the pools already resolved above, so
  // they run in parallel rather than serially.
  const coingeckoId = project.providerIds?.coingeckoId ?? null;
  const [primaryMarketResult, tokenLogos] = await Promise.all([
    coingeckoId ? coingecko.getMarketsByIds([coingeckoId]) : Promise.resolve({ ok: true as const, data: [] }),
    resolveTokenLogosForPools(
      pools.flatMap((pool) => [
        { symbol: pool.baseTokenSymbol, address: pool.baseTokenAddress },
        { symbol: pool.quoteTokenSymbol, address: pool.quoteTokenAddress },
      ])
    ),
  ]);
  // Token Logo System — routed through the one shared `resolveLogoUrl()`
  // priority function (registry -> CoinGecko -> ...), not a locally
  // reimplemented `??` chain. The previous version here checked CoinGecko
  // before the registry — the opposite order from every other page's
  // `resolveLogoUrl()` call — which could show a different logo here than
  // on Project Details for the same project if a registry `logoUrl` were
  // ever configured. This page still deliberately skips DefiLlama/GitHub
  // (no full intelligence build here — see this file's own doc comment),
  // but the two tiers it does check now agree with the canonical order.
  const { logoUrl: tokenLogoUrl } = resolveLogoUrl([project.logoUrl ?? null, primaryMarketResult.ok ? (primaryMarketResult.data[0]?.imageUrl ?? null) : null]);

  const resolvedSearchParams = await searchParams;
  const state = parsePoolsQueryState(resolvedSearchParams);

  // Headline stats always reflect every real pool, regardless of the active
  // category/search/filter — "what's true about this project's liquidity
  // overall," matching PR-084.01's Featured Pools section exactly.
  const bestLiquidityPool = pools[0];
  const highestVolumePool = [...pools].sort((a, b) => (b.volume24hUsd ?? 0) - (a.volume24hUsd ?? 0))[0];
  const totalLiquidityUsd = pools.reduce((sum, pool) => sum + (pool.liquidityUsd ?? 0), 0);
  const concentrationPct =
    totalLiquidityUsd > 0 && bestLiquidityPool.liquidityUsd !== null ? (bestLiquidityPool.liquidityUsd / totalLiquidityUsd) * 100 : null;
  const activePoolCount = pools.filter((pool) => getPoolStatus(pool).label !== "Inactive").length;

  // Real, per-category counts over the full unfiltered set — drives which
  // tabs are clickable and their visible counts; computed once, not
  // recomputed per render of each tab.
  const categoryCounts = Object.fromEntries(
    POOL_CATEGORIES.map((category) => [category.id, getPoolsForCategory(pools, category.id).length])
  ) as Record<PoolCategoryId, number>;

  const availableDexes = [...new Set(pools.map((pool) => pool.dexId))].sort((a, b) => formatDexName(a).localeCompare(formatDexName(b)));

  // Resolution pipeline: category → search → DEX filter → sort. Only the
  // sort step is conditional — an explicit `?sortField=` always wins over
  // the category's own natural order; otherwise the category's own order
  // (already liquidity-sorted, or already the category's own meaningful
  // order — e.g. Highest Volume is already volume-sorted) stands.
  let displayPools = getPoolsForCategory(pools, state.category);

  if (state.search) {
    const query = state.search.toLowerCase();
    displayPools = displayPools.filter(
      (pool) => `${pool.baseTokenSymbol ?? ""}/${pool.quoteTokenSymbol ?? ""}`.toLowerCase().includes(query) || formatDexName(pool.dexId).toLowerCase().includes(query)
    );
  }

  if (state.dex.length > 0) {
    displayPools = displayPools.filter((pool) => state.dex.includes(pool.dexId));
  }

  if (state.sortExplicit) {
    const direction = state.sortOrder === "desc" ? -1 : 1;
    displayPools = [...displayPools].sort((a, b) => {
      const fieldValue = (pool: TradingPool) =>
        state.sortField === "liquidity" ? (pool.liquidityUsd ?? 0) : state.sortField === "volume" ? (pool.volume24hUsd ?? 0) : (pool.pairCreatedAt ?? 0);
      return direction * (fieldValue(a) - fieldValue(b));
    });
  }

  const paginated = paginateLiveProjects(displayPools, { page: state.page, pageSize: POOLS_PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      {breadcrumb}

      <div className={PAGE_HEADER_GROUP_CLASS}>
        <h1 className={PAGE_HEADER_TITLE_CLASS}>{project.name} Pools</h1>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>
          Every real pool Base Radar has matched for {project.name}, curated by liquidity, activity, and maturity — not a raw DexScreener mirror.
        </p>
      </div>

      {/* PR-086.03 — the stat overview and category tabs stay in one
          "overview" band (gap-4, tighter — they're read together at a
          glance); a border-t + extra top padding marks the transition into
          the "browse" band below (filter/sort + list), so the page reads
          as two organized zones instead of one continuous gap-6 list. */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricItem
            label="Best Liquidity Pool"
            value={
              bestLiquidityPool.liquidityUsd !== null
                ? `${formatCompactCurrency(bestLiquidityPool.liquidityUsd)} · ${formatDexName(bestLiquidityPool.dexId)}`
                : undefined
            }
            emphasize
            glass
          />
          <MetricItem
            label="Highest Volume Pool"
            value={
              highestVolumePool.volume24hUsd !== null
                ? `${formatCompactCurrency(highestVolumePool.volume24hUsd)} · ${formatDexName(highestVolumePool.dexId)}`
                : undefined
            }
            emphasize
            glass
          />
          <MetricItem label="Active Pools" value={`${activePoolCount} / ${pools.length}`} emphasize glass />
          <MetricItem
            label="Liquidity Concentration"
            value={concentrationPct !== null ? formatPercent(concentrationPct, { showSign: false }) : undefined}
            infoTooltip="Share of total tracked liquidity held by the single deepest pool."
            emphasize
            glass
          />
        </div>

        <PoolCategoryTabs state={state} counts={categoryCounts} />
      </div>

      <div className="flex flex-col gap-4 border-t border-radar-light-border/60 pt-6 dark:border-white/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <PoolExplorerFilterBar state={state} availableDexes={availableDexes} />
          </div>
          <PoolExplorerSortSelect state={state} />
        </div>

        <PoolExplorerList
          pools={paginated.items}
          topVolumePool={highestVolumePool}
          totalLiquidityUsd={totalLiquidityUsd}
          tokenLogoUrl={tokenLogoUrl}
          tokenLogos={tokenLogos}
        />
        <PoolExplorerPagination
          basePath={`${projectHref}/pools`}
          state={state}
          currentPage={paginated.page}
          totalPages={paginated.totalPages}
          hasPreviousPage={paginated.hasPreviousPage}
          hasNextPage={paginated.hasNextPage}
        />
      </div>
    </div>
  );
}
