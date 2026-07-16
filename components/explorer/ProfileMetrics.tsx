import { Code2, GitBranch, Globe, Layers, Wallet } from "lucide-react";

import { ProfileChart } from "@/components/explorer/ProfileChart";
import { MetricItem } from "@/components/explorer/MetricItem";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { RecentTransactions } from "@/components/explorer/RecentTransactions";
import { GITHUB_STARS_INFO_TOOLTIP } from "@/components/explorer/metricTooltips";
import { EmptyState } from "@/components/ui/EmptyState";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import { formatCompactCurrency, formatCompactNumber, formatDate, formatGwei, formatNumber, formatPercent, formatRelativeTime } from "@/lib/data/format";
import type { ChainInfo, Contracts, GithubIntel, Trading, Tvl } from "@/lib/intelligence/types";
import type { SparklinePoint } from "@/lib/data/types";
import type { TokenTransfer } from "@/lib/providers/blockscout/service";

type ProfileMetricsProps = {
  trading: Trading;
  tvl: Tvl;
  github: GithubIntel;
  contracts: Contracts;
  chain: ChainInfo;
  /** Real per-protocol TVL history from DefiLlama (PR11). `null` when the project has no `defillamaSlug` configured or the provider returned nothing. */
  tvlHistory: SparklinePoint[] | null;
  /** `null` when this project has no DefiLlama slug configured — disables the "View on DefiLlama" source link (PR12.1 Req 7). */
  defillamaSlug: string | null;
  /** Recent transfers for this project's token contract (PR12.1c Req 5.5) — `null` when no token contract is configured on the primary chain or the provider call failed. */
  recentTransfers: TokenTransfer[] | null;
  recentTransfersUnavailableReason: string;
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
 */
export function ProfileMetrics({
  trading,
  tvl,
  github,
  contracts,
  chain,
  tvlHistory,
  defillamaSlug,
  recentTransfers,
  recentTransfersUnavailableReason,
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
              <MetricItem bare emphasize label="TVL 7d Change" changeValue={tvl.changePct7d} />
              <MetricItem bare emphasize label="TVL 30d Change" changeValue={tvl.changePct30d} />
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
            {tvlHistory && tvlHistory.length > 1 ? (
              <ProfileChart data={tvlHistory} variant="currency" color="var(--color-radar-accent)" height={130} />
            ) : tvlAvailable ? (
              <p className="text-xs text-radar-light-muted dark:text-radar-muted">No historical TVL series returned by DefiLlama for this protocol yet.</p>
            ) : null}
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
        <RecentTransactions
          transfers={recentTransfers}
          tokenSymbol={tokenSymbol}
          explorerUrl={explorerUrl}
          unavailableReason={recentTransfersUnavailableReason}
        />
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
              <MetricItem bare emphasize label="Commits (7d)" value={github.commitsLast7d !== null ? formatNumber(github.commitsLast7d) : undefined} unavailable={github.commitsLast7d === null} />
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
            {github.commitsLast7d === null && (
              <p className="text-xs text-radar-light-muted dark:text-radar-muted">
                GitHub is still computing this repo&apos;s commit history — commit trend will appear once it&apos;s ready.
              </p>
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
