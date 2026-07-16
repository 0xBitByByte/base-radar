import { Suspense } from "react";
import { Code2, GitBranch, Globe, Layers, Wallet } from "lucide-react";

import { MetricItem } from "@/components/explorer/MetricItem";
import { MetricItemSkeleton } from "@/components/explorer/MetricItemSkeleton";
import { ProfileCommitsAsync } from "@/components/explorer/ProfileCommitsAsync";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { ProfileTransfersAsync } from "@/components/explorer/ProfileTransfersAsync";
import { ProfileTvlChangeTilesAsync } from "@/components/explorer/ProfileTvlChangeTilesAsync";
import { ProfileTvlChartAsync } from "@/components/explorer/ProfileTvlChartAsync";
import { GITHUB_STARS_INFO_TOOLTIP } from "@/components/explorer/metricTooltips";
import { EmptyState } from "@/components/ui/EmptyState";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import { formatCompactCurrency, formatCompactNumber, formatDate, formatGwei, formatNumber, formatPercent, formatRelativeTime } from "@/lib/data/format";
import type { ChainInfo, Contracts, GithubIntel, Trading, Tvl } from "@/lib/intelligence/types";
import type { SparklinePoint } from "@/lib/data/types";
import type { CommitActivity } from "@/lib/providers/github/service";
import type { TokenTransfer } from "@/lib/providers/blockscout/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileMetricsProps = {
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
};

/** One shared tile per related group of stats — same recipe `QuickViewMetrics` already uses, tightened further in PR11.2 Part 5 for a denser, less padded read. */
const METRIC_GROUP_CLASS =
  "grid grid-cols-2 gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02] sm:grid-cols-3";

/**
 * Live Metrics — PR11 Part 3, tightened in PR11.1. Price/Token were pulled
 * into `ProfileTokenAndPrice` (PR12.1c Req 5.4); this component now covers
 * TVL & Liquidity, Network, and Engineering Health. Every field renders
 * through `MetricItem` with `emphasize` so values read as the dominant
 * element and labels stay subdued, gracefully "Unavailable" where no real
 * provider data exists — Holders and per-project Transaction *counts* have
 * no real data source anywhere in this codebase's provider set (confirmed:
 * Blockscout exposes neither), so they render unavailable rather than a
 * synthesized number; real individual token transfers, where a token
 * contract is configured, render via `RecentTransactions` instead. Section
 * ids (`tvl`/`network`/`developer`) are the `ProfileSectionNav` scroll
 * targets.
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
}: ProfileMetricsProps) {
  const liquidityAvailable = trading.available && trading.liquidityUsd !== null;
  const tvlAvailable = tvl.available && tvl.tvlUsd !== null;
  const starsAvailable = github.available && github.stars !== null;
  const forksAvailable = github.available && github.forks !== null;
  const issuesAvailable = github.available && github.openIssues !== null;
  const releaseAvailable = github.available && github.latestReleaseTag !== null;
  const verifiedPct = contracts.count > 0 ? (contracts.items.filter((c) => c.verified === true).length / contracts.count) * 100 : null;
  const developerActivityAvailable = starsAvailable || forksAvailable || issuesAvailable || releaseAvailable;
  const networkAvailable = chain.network.available;
  const explorerUrl = CHAIN_BRANDING[chain.primaryChain]?.explorerUrl ?? null;

  const tokenContract = contracts.items.find((item) => item.chain === chain.primaryChain && item.type === "token");

  return (
    <div className="flex flex-col gap-5">
      <ProfileSectionCard
        id="tvl"
        title="TVL & Liquidity"
        icon={Wallet}
        sourceLink={defillamaSlug ? { href: `https://defillama.com/protocol/${defillamaSlug}`, label: "DefiLlama" } : undefined}
      >
        {tvlAvailable || trading.available ? (
          <>
            <div className={METRIC_GROUP_CLASS}>
              <MetricItem bare emphasize label="TVL" value={tvlAvailable ? formatCompactCurrency(tvl.tvlUsd as number) : undefined} unavailable={!tvlAvailable} />
              <Suspense fallback={<><MetricItemSkeleton emphasize /><MetricItemSkeleton emphasize /></>}>
                <ProfileTvlChangeTilesAsync resultPromise={tvlHistoryPromise} />
              </Suspense>
              <MetricItem bare emphasize label="DEX Liquidity" value={liquidityAvailable ? formatCompactCurrency(trading.liquidityUsd as number) : undefined} unavailable={!liquidityAvailable} />
              <MetricItem bare emphasize label="Tracked Pools" value={trading.available ? formatNumber(trading.pairCount) : undefined} unavailable={!trading.available} />
              <MetricItem
                bare
                emphasize
                label="Largest Pool"
                value={trading.largestPool ? `${trading.largestPool.dexId} (${formatCompactCurrency(trading.largestPool.liquidityUsd ?? 0)})` : undefined}
                unavailable={!trading.largestPool}
              />
            </div>
            <Suspense fallback={<WidgetSkeleton className="h-[130px] rounded-xl" />}>
              <ProfileTvlChartAsync resultPromise={tvlHistoryPromise} tvlAvailable={tvlAvailable} />
            </Suspense>
            {tvlAvailable && (
              <p className="text-xs text-radar-light-muted dark:text-radar-muted">
                Protocol revenue/fees aren&apos;t available from any connected provider yet.
              </p>
            )}
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

      <ProfileSectionCard
        id="network"
        title="Network"
        icon={Globe}
        sourceLink={explorerUrl ? { href: explorerUrl, label: CHAIN_BRANDING[chain.primaryChain].label } : undefined}
      >
        {/* Network figures read as informative, not urgent — deliberately not `emphasize` (the bold treatment Price/TVL/Engineering use), per PR12.1e Req 6. */}
        <div className={METRIC_GROUP_CLASS}>
          <MetricItem bare label="Gas Price" value={networkAvailable && chain.network.gasGwei !== null ? formatGwei(chain.network.gasGwei) : undefined} unavailable={!networkAvailable || chain.network.gasGwei === null} />
          <MetricItem bare label="Block Height" value={networkAvailable && chain.network.blockHeight !== null ? formatNumber(chain.network.blockHeight) : undefined} unavailable={!networkAvailable || chain.network.blockHeight === null} />
          <MetricItem bare label="Est. TPS" value={networkAvailable && chain.network.estimatedTps !== null ? formatNumber(chain.network.estimatedTps) : undefined} unavailable={!networkAvailable || chain.network.estimatedTps === null} />
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
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">
          Per-project transaction counts, wallet counts, and unique users aren&apos;t shown — Blockscout&apos;s public API only exposes
          chain-wide totals, not per-contract figures, for any project in this registry.
        </p>
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

            {/* Secondary — real repo metadata, smaller supporting typography, never `emphasize`. */}
            <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02] sm:grid-cols-3 md:grid-cols-6">
              <MetricItem bare label="Latest Release" value={releaseAvailable ? (github.latestReleaseTag as string) : undefined} unavailable={!releaseAvailable} />
              <MetricItem bare label="Language" value={github.language ?? undefined} unavailable={!github.language} />
              <MetricItem bare label="License" value={github.license ?? undefined} unavailable={!github.license} />
              <MetricItem bare label="Repo Age" value={github.createdAt ? formatDate(github.createdAt) : undefined} unavailable={!github.createdAt} />
              <MetricItem bare label="Last Push" value={github.pushedAt ? formatRelativeTime(github.pushedAt) : undefined} unavailable={!github.pushedAt} />
              <MetricItem bare label="Contributors" unavailable infoTooltip="GitHub's contributor-count endpoint isn't wired yet — this codebase currently reads repo/release/commit-activity data only." />
            </div>
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
