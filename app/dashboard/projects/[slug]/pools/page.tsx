import type { Metadata } from "next";
import { ArrowLeft, ChevronRight, Waypoints } from "lucide-react";
import Link from "next/link";

import { getProject } from "@/data/projects/helpers";
import { pairToTradingPool } from "@/lib/intelligence/merge";
import * as dexscreener from "@/lib/providers/dexscreener/service";
import { MetricItem } from "@/components/explorer/MetricItem";
import { PoolCategoryTabs } from "@/components/explorer/PoolCategoryTabs";
import { PoolExplorerFilterBar } from "@/components/explorer/PoolExplorerFilterBar";
import { PoolExplorerList } from "@/components/explorer/PoolExplorerList";
import { PoolExplorerSortSelect } from "@/components/explorer/PoolExplorerSortSelect";
import { formatDexName, getPoolsForCategory, getPoolStatus, POOL_CATEGORIES, type PoolCategoryId } from "@/components/explorer/pairIntelligenceHelpers";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCompactCurrency, formatPercent } from "@/lib/data/format";
import { parsePoolsQueryState, type RawSearchParams } from "@/lib/pools/queryState";
import type { TradingPool } from "@/lib/intelligence/types";

type PoolExplorerPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

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
 * Deliberately lightweight: only `getProject` (registry lookup) +
 * `dexscreener.getPairsForToken` (the same cached, on-demand call the
 * project page already makes) — no `buildProjectIntelligence`, no scoring.
 * This page needs real pools and a project name, nothing else.
 */
export default async function PoolExplorerPage({ params, searchParams }: PoolExplorerPageProps) {
  const { slug } = await params;
  const project = getProject(slug);

  const projectHref = `/dashboard/projects/${slug}`;
  const breadcrumb = (
    <div className="flex flex-col gap-2">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-radar-light-muted dark:text-radar-muted">
          <li>
            <Link href="/dashboard" className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white">
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link href="/dashboard/projects" className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white">
              Projects
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link href={projectHref} className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white">
              {project?.name ?? "Project"}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="truncate font-semibold text-radar-light-text dark:text-radar-white">
            Pools
          </li>
        </ol>
      </nav>
      <Link
        href={projectHref}
        className="group inline-flex w-fit items-center gap-1.5 rounded-lg text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
      >
        <ArrowLeft className="size-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
        Back to {project?.name ?? "Project"}
      </Link>
    </div>
  );

  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <EmptyState icon={Waypoints} title="Project not found" description="This project isn't in the Base Radar registry." />
      </div>
    );
  }

  // Same eligibility check the Whale Explorer already applies (minus the
  // CoinGecko id, which Pools never needed) — a project with no registered
  // Base token contract structurally cannot have a DexScreener-matched
  // pool, no matter what this page does.
  const tokenContract = project.contracts.find((contract) => contract.chain === "base" && contract.type === "token");

  if (!tokenContract) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <h1 className="text-xl font-bold text-radar-light-text dark:text-radar-white">{project.name} Pools</h1>
        <EmptyState
          icon={Waypoints}
          title="Pool tracking isn't available for this project"
          description="Pool tracking needs a real token contract registered on Base. This project doesn't have one today, so this page can't run — not a fetch failure."
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-card px-2.5 py-1 text-[11px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-radar-muted">
              Not Eligible
            </span>
          }
        />
      </div>
    );
  }

  const richerPairsResult = await dexscreener.getPairsForToken(tokenContract.address);
  const pools: TradingPool[] = richerPairsResult.ok ? richerPairsResult.data.map(pairToTradingPool) : [];

  if (pools.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <h1 className="text-xl font-bold text-radar-light-text dark:text-radar-white">{project.name} Pools</h1>
        <EmptyState
          icon={Waypoints}
          title="No tracked pools"
          description={`No live DexScreener pairs are currently matched for ${project.name}.`}
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-success/30 bg-radar-success/10 px-2.5 py-1 text-[11px] font-medium text-radar-success">
              Registry Status: Watched
            </span>
          }
        />
      </div>
    );
  }

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

  return (
    <div className="flex flex-col gap-6">
      {breadcrumb}

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-radar-light-text dark:text-radar-white">{project.name} Pools</h1>
        <p className="text-sm text-radar-light-muted dark:text-radar-muted">
          Every real pool Base Radar has matched for {project.name}, curated by liquidity, activity, and maturity — not a raw DexScreener mirror.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricItem
          label="Best Liquidity Pool"
          value={
            bestLiquidityPool.liquidityUsd !== null
              ? `${formatCompactCurrency(bestLiquidityPool.liquidityUsd)} · ${formatDexName(bestLiquidityPool.dexId)}`
              : undefined
          }
          emphasize
        />
        <MetricItem
          label="Highest Volume Pool"
          value={
            highestVolumePool.volume24hUsd !== null
              ? `${formatCompactCurrency(highestVolumePool.volume24hUsd)} · ${formatDexName(highestVolumePool.dexId)}`
              : undefined
          }
          emphasize
        />
        <MetricItem label="Active Pools" value={`${activePoolCount} / ${pools.length}`} emphasize />
        <MetricItem
          label="Liquidity Concentration"
          value={concentrationPct !== null ? formatPercent(concentrationPct, { showSign: false }) : undefined}
          infoTooltip="Share of total tracked liquidity held by the single deepest pool."
          emphasize
        />
      </div>

      <PoolCategoryTabs state={state} counts={categoryCounts} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <PoolExplorerFilterBar state={state} availableDexes={availableDexes} />
        </div>
        <PoolExplorerSortSelect state={state} />
      </div>

      <PoolExplorerList pools={displayPools} topVolumePool={highestVolumePool} totalLiquidityUsd={totalLiquidityUsd} />
    </div>
  );
}
