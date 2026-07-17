import { Suspense } from "react";
import { Code2, GitBranch, Globe, Layers, Wallet } from "lucide-react";

import { MetricItem } from "@/components/explorer/MetricItem";
import { MetricItemSkeleton } from "@/components/explorer/MetricItemSkeleton";
import { ProfileCommitsAsync } from "@/components/explorer/ProfileCommitsAsync";
import { ProfileNetworkLive } from "@/components/explorer/ProfileNetworkLive";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { ProfileTvlLive } from "@/components/explorer/ProfileTvlLive";
import { ProfileTransfersAsync } from "@/components/explorer/ProfileTransfersAsync";
import { ProfileTvlChangeTilesAsync } from "@/components/explorer/ProfileTvlChangeTilesAsync";
import { ProfileTvlChartAsync } from "@/components/explorer/ProfileTvlChartAsync";
import { GITHUB_STARS_INFO_TOOLTIP } from "@/components/explorer/metricTooltips";
import { EmptyState } from "@/components/ui/EmptyState";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import { getExplorerLink } from "@/lib/branding/explorerLink";
import { formatCompactCurrency, formatCompactNumber, formatDate, formatNumber, formatPercent, formatRelativeTime } from "@/lib/data/format";
import type { ChainInfo, Contracts, GithubIntel, Identity, Trading, Tvl } from "@/lib/intelligence/types";
import type { SparklinePoint } from "@/lib/data/types";
import type { CommitActivity } from "@/lib/providers/github/service";
import type { TokenTransfer } from "@/lib/providers/blockscout/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileMetricsProps = {
  identity: Identity;
  trading: Trading;
  tvl: Tvl;
  /** First-paint `GithubIntel` — real stars/forks/release fields; `commitsLast7d` is always `null` here (streamed separately via `commitActivityPromise`, never re-merged into this object). */
  github: GithubIntel;
  contracts: Contracts;
  chain: ChainInfo;
  /**
   * Real per-protocol TVL history from DefiLlama (PR11), passed unresolved
   * (Streaming Architecture pass) — DefiLlama's per-protocol endpoint has
   * been observed taking 4-25s for long-running, multi-chain protocols, so
   * neither the sparkline chart nor the 7d/30d change tiles that derive from
   * it block first paint anymore; only the two `Suspense`-wrapped async
   * tiles below suspend on it.
   */
  tvlHistoryPromise: Promise<ProviderResult<SparklinePoint[]> | null>;
  /** `null` when this project has no DefiLlama slug configured — disables the "View on DefiLlama" source link (PR12.1 Req 7). */
  defillamaSlug: string | null;
  /** GitHub's commit-activity endpoint, passed unresolved for the same reason as `tvlHistoryPromise` — it's computed asynchronously server-side by GitHub itself and has been observed taking several seconds on a cold repo. */
  commitActivityPromise: Promise<ProviderResult<CommitActivity> | null>;
  /** Recent transfers for this project's token contract (PR12.1c Req 5.5), passed unresolved — Blockscout's transfer-history endpoint has been observed taking 5-6s and feeds nothing else on first paint. */
  transfersPromise: Promise<ProviderResult<TokenTransfer[]> | null>;
  tokenSymbol: string | null;
  /** PR13.7 Goal 14 — real finality lag, already resolved by `page.tsx` (Base RPC is fast enough not to defer behind Suspense — see `base.getFinality`'s own doc comment). `null` when the fetch failed. */
  finality: number | null;
};

/** One shared tile per related group of stats — same recipe `QuickViewMetrics` already uses, tightened further in PR11.2 Part 5 for a denser, less padded read. */
const METRIC_GROUP_CLASS =
  "grid grid-cols-2 gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02] sm:grid-cols-3";

/**
 * Live Metrics — PR11 Part 3, tightened in PR11.1. Price/Token were pulled
 * into `ProfileTokenAndPrice` (PR12.1c Req 5.4); this component now covers
 * TVL & Liquidity, Network, and Engineering Health. Section ids
 * (`tvl`/`network`/`developer`) are the `ProfileSectionNav` scroll targets.
 *
 * PR13.6 (Goals 8-11) — individual metrics with genuinely no data source
 * (DEX liquidity for a project with no tracked trading pairs, GitHub
 * contributor counts no provider in this codebase exposes) are hidden
 * gracefully instead of rendering an "Unavailable"/"—" placeholder; Network
 * is a single equal-width row of four real, already-computed fields
 * (Chain / Gas / Block Height / Est. TPS) instead of a denser wrapping grid.
 *
 * Streaming Architecture pass — the three genuinely slow provider calls
 * (DefiLlama's per-protocol TVL history, GitHub's commit-activity endpoint,
 * Blockscout's token-transfer history) are passed down as unresolved
 * promises instead of already-awaited values, each unwrapped by its own
 * small `"use client"` `use()` component behind its own `<Suspense>` —
 * the exact same pattern `DashboardLayout`/`LiveStatusBarAsync` already use
 * for the live ticker. Everything else in this component (current TVL,
 * DEX liquidity, network stats, GitHub stars/forks/release metadata)
 * comes from fast provider calls and renders synchronously, unaffected.
 */
export function ProfileMetrics({
  identity,
  trading,
  tvl,
  github,
  contracts,
  chain,
  tvlHistoryPromise,
  defillamaSlug,
  commitActivityPromise,
  transfersPromise,
  tokenSymbol,
  finality,
}: ProfileMetricsProps) {
  const starsAvailable = github.available && github.stars !== null;
  const forksAvailable = github.available && github.forks !== null;
  const issuesAvailable = github.available && github.openIssues !== null;
  const releaseAvailable = github.available && github.latestReleaseTag !== null;
  const verifiedPct = contracts.count > 0 ? (contracts.items.filter((c) => c.verified === true).length / contracts.count) * 100 : null;
  const developerActivityAvailable = starsAvailable || forksAvailable || issuesAvailable || releaseAvailable;
  const networkAvailable = chain.network.available;
  const explorerUrl = CHAIN_BRANDING[chain.primaryChain]?.explorerUrl ?? null;
  const chainLabel = CHAIN_BRANDING[chain.primaryChain]?.label ?? chain.primaryChain;

  // Goal 3 — the Network section's source-attribution link only ever points
  // at a real on-chain address view, never the bare explorer homepage.
  const explorerLink = getExplorerLink(chain, contracts, identity);
  const networkSourceLink =
    explorerLink && (explorerLink.tier === "contract" || explorerLink.tier === "token") && explorerLink.serviceName
      ? { href: explorerLink.href, label: explorerLink.serviceName }
      : undefined;

  const tokenContract = contracts.items.find((item) => item.chain === chain.primaryChain && item.type === "token");

  // Real per-pool liquidity share, sorted by size — Goal 9's "Pool
  // Distribution," derived entirely from `trading.pools` (already fetched
  // for the "Largest Pool" tile below, never a new provider call).
  const totalPoolLiquidity = trading.pools.reduce((sum, pool) => sum + (pool.liquidityUsd ?? 0), 0);
  const poolDistribution =
    trading.available && trading.pools.length > 1 && totalPoolLiquidity > 0
      ? trading.pools.slice(0, 5).map((pool) => ({
          dexId: pool.dexId,
          liquidityUsd: pool.liquidityUsd,
          sharePct: pool.liquidityUsd !== null ? (pool.liquidityUsd / totalPoolLiquidity) * 100 : 0,
        }))
      : [];

  // Goal 9 — "Exchange Distribution," 24h volume grouped by DEX (not by
  // individual pool, unlike Pool Distribution above) — same `trading.pools`
  // data, a different grouping. "Top DEX" is whichever DEX leads this by
  // cumulative volume, which can differ from "Largest Pool" (a single pool's
  // liquidity) when a DEX's volume is spread across several smaller pools.
  const volumeByDex = new Map<string, number>();
  for (const pool of trading.pools) {
    volumeByDex.set(pool.dexId, (volumeByDex.get(pool.dexId) ?? 0) + (pool.volume24hUsd ?? 0));
  }
  const totalPoolVolume = [...volumeByDex.values()].reduce((sum, v) => sum + v, 0);
  const exchangeDistribution =
    trading.available && volumeByDex.size > 1 && totalPoolVolume > 0
      ? [...volumeByDex.entries()]
          .map(([dexId, volumeUsd]) => ({ dexId, volumeUsd, sharePct: (volumeUsd / totalPoolVolume) * 100 }))
          .sort((a, b) => b.volumeUsd - a.volumeUsd)
          .slice(0, 5)
      : [];
  const topDexId = exchangeDistribution[0]?.dexId ?? trading.largestPool?.dexId ?? null;

  return (
    <div className="flex flex-col gap-5">
      <ProfileSectionCard
        id="tvl"
        title="TVL & Liquidity"
        icon={Wallet}
        sourceLink={defillamaSlug ? { href: `https://defillama.com/protocol/${defillamaSlug}`, label: "DefiLlama" } : undefined}
      >
        {tvl.available || trading.available ? (
          <>
            {tvl.available && tvl.tvlUsd !== null && (
              <div className={METRIC_GROUP_CLASS}>
                <ProfileTvlLive defillamaSlug={defillamaSlug} tvlUsd={tvl.tvlUsd} changePct24h={tvl.changePct24h} />
                <Suspense fallback={<><MetricItemSkeleton emphasize /><MetricItemSkeleton emphasize /></>}>
                  <ProfileTvlChangeTilesAsync resultPromise={tvlHistoryPromise} />
                </Suspense>
              </div>
            )}

            {trading.available ? (
              <div className={METRIC_GROUP_CLASS}>
                <MetricItem
                  bare
                  emphasize
                  label="DEX Liquidity"
                  value={trading.liquidityUsd !== null ? formatCompactCurrency(trading.liquidityUsd) : undefined}
                  unavailable={trading.liquidityUsd === null}
                />
                <MetricItem bare emphasize label="Tracked Pools" value={formatNumber(trading.pairCount)} />
                <MetricItem
                  bare
                  emphasize
                  label="Largest Pool"
                  value={trading.largestPool ? `${trading.largestPool.dexId} (${formatCompactCurrency(trading.largestPool.liquidityUsd ?? 0)})` : undefined}
                  unavailable={!trading.largestPool}
                />
                <MetricItem bare label="Top DEX" value={topDexId ?? undefined} unavailable={!topDexId} />
                <MetricItem bare label="Liquidity Source" value="DexScreener" />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-radar-light-border p-3 text-xs text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
                <span className="font-semibold text-radar-light-text dark:text-radar-white">Not Tracked —</span> no
                DexScreener trading pair is configured for this project in the Base Radar registry yet.
              </p>
            )}

            {poolDistribution.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
                  Pool Distribution
                </span>
                <ul className="flex flex-col gap-1.5">
                  {poolDistribution.map((pool) => (
                    <li key={pool.dexId} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 truncate text-radar-light-text dark:text-radar-white">{pool.dexId}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-radar-light-border dark:bg-white/10">
                        <div className="h-full rounded-full bg-radar-primary dark:bg-radar-accent" style={{ width: `${pool.sharePct}%` }} />
                      </div>
                      <span className="w-12 shrink-0 text-right tabular-nums text-radar-light-muted dark:text-radar-muted">
                        {pool.sharePct.toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Goal 9 — Exchange Distribution: 24h volume grouped by DEX, distinct from Pool Distribution's per-pool liquidity grouping above. */}
            {exchangeDistribution.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
                  Exchange Distribution
                </span>
                <ul className="flex flex-col gap-1.5">
                  {exchangeDistribution.map((dex) => (
                    <li key={dex.dexId} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 truncate text-radar-light-text dark:text-radar-white">{dex.dexId}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-radar-light-border dark:bg-white/10">
                        <div className="h-full rounded-full bg-radar-primary dark:bg-radar-accent" style={{ width: `${dex.sharePct}%` }} />
                      </div>
                      <span className="w-12 shrink-0 text-right tabular-nums text-radar-light-muted dark:text-radar-muted">
                        {dex.sharePct.toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Suspense fallback={<WidgetSkeleton className="h-[130px] rounded-xl" />}>
              <ProfileTvlChartAsync resultPromise={tvlHistoryPromise} tvlAvailable={tvl.available && tvl.tvlUsd !== null} />
            </Suspense>
          </>
        ) : (
          <EmptyState
            icon={Layers}
            title="No TVL or liquidity data available"
            description="This project has no DefiLlama protocol or trending DexScreener pair configured in the Base Radar registry yet. Checked just now — this section updates automatically once one is added."
            className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
          />
        )}
      </ProfileSectionCard>

      <ProfileSectionCard id="network" title="Network" icon={Globe} sourceLink={networkSourceLink}>
        {/* PR13.7 Goal 14 — one equal-width, live-polling row of all six real fields (Network/Status/Block Height/Gas/TPS/Finality), instead of splitting TPS into a separate secondary row. */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <ProfileNetworkLive
            chainLabel={chainLabel}
            gasGwei={networkAvailable ? chain.network.gasGwei : null}
            blockHeight={networkAvailable ? chain.network.blockHeight : null}
            estimatedTps={networkAvailable ? chain.network.estimatedTps : null}
            finality={finality}
          />
        </div>

        {/* Secondary — Verified Contracts stays a real, supporting metric rather than forced into the primary row. */}
        <div className={METRIC_GROUP_CLASS}>
          <MetricItem
            bare
            label="Verified Contracts"
            value={verifiedPct !== null ? formatPercent(verifiedPct, { showSign: false }) : undefined}
            unavailable={verifiedPct === null}
          />
        </div>

        <Suspense fallback={<WidgetSkeleton className="h-16 rounded-xl" />}>
          <ProfileTransfersAsync
            resultPromise={transfersPromise}
            hasTokenContract={Boolean(tokenContract)}
            isPrimaryChainBase={chain.primaryChain === "base"}
            tokenSymbol={tokenSymbol}
            explorerUrl={explorerUrl}
          />
        </Suspense>
      </ProfileSectionCard>

      <ProfileSectionCard
        id="developer"
        title="Engineering Health"
        icon={Code2}
        sourceLink={github.available && github.fullName ? { href: `https://github.com/${github.fullName}`, label: "GitHub" } : undefined}
      >
        {developerActivityAvailable ? (
          <>
            {/* Primary — real activity-volume numbers, large emphasized typography (PR12.1f Req 6). */}
            <div className={METRIC_GROUP_CLASS}>
              <MetricItem bare emphasize label="GitHub Stars" value={starsAvailable ? formatCompactNumber(github.stars as number) : undefined} unavailable={!starsAvailable} infoTooltip={GITHUB_STARS_INFO_TOOLTIP} />
              <MetricItem bare emphasize label="Forks" value={forksAvailable ? formatNumber(github.forks as number) : undefined} unavailable={!forksAvailable} />
              <MetricItem bare emphasize label="Open Issues" value={issuesAvailable ? formatNumber(github.openIssues as number) : undefined} unavailable={!issuesAvailable} />
              <Suspense fallback={<MetricItemSkeleton emphasize />}>
                <ProfileCommitsAsync resultPromise={commitActivityPromise} />
              </Suspense>
            </div>

            {/* Secondary — real repo metadata, smaller supporting typography, never `emphasize`. Only rendered when at least one field is real, so this row never becomes an all-"Unavailable" wall (Goal 17). */}
            {(releaseAvailable || github.language || github.license || github.createdAt || github.pushedAt) && (
              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02] sm:grid-cols-3">
                {releaseAvailable && <MetricItem bare label="Latest Release" value={github.latestReleaseTag as string} />}
                {github.language && <MetricItem bare label="Language" value={github.language} />}
                {github.license && <MetricItem bare label="License" value={github.license} />}
                {github.createdAt && <MetricItem bare label="Repo Age" value={formatDate(github.createdAt)} />}
                {github.pushedAt && <MetricItem bare label="Last Push" value={formatRelativeTime(github.pushedAt)} />}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={GitBranch}
            title="No engineering health data"
            description="This project's GitHub repository isn't linked in the Base Radar registry, or GitHub returned no public activity for it. Last checked just now — this section will populate automatically once a repository is configured."
            className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
          />
        )}
      </ProfileSectionCard>
    </div>
  );
}
