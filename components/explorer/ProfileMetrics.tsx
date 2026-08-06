import { Suspense } from "react";
import { Globe } from "lucide-react";

import { ChainStatsFallback, ProfileNetworkChainStatsAsync } from "@/components/explorer/ProfileNetworkChainStatsAsync";
import { ProfileNetworkLive, VerifiedContractsFallback } from "@/components/explorer/ProfileNetworkLive";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { ProfileTransfersAsync } from "@/components/explorer/ProfileTransfersAsync";
import { ProfileVerifiedContractsStatAsync } from "@/components/explorer/ProfileVerifiedContractsStatAsync";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import { getExplorerLink } from "@/lib/branding/explorerLink";
import { formatPercent } from "@/lib/data/format";
import type { ChainInfo, Contracts, Identity } from "@/lib/intelligence/types";
import type { TokenTransfer, ContractDetailEntry, ChainStats } from "@/lib/providers/blockscout/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileMetricsProps = {
  identity: Identity;
  contracts: Contracts;
  chain: ChainInfo;
  /** Recent transfers for this project's token contract (PR12.1c Req 5.5), passed unresolved — Blockscout's transfer-history endpoint has been observed taking 5-6s and feeds nothing else on first paint. */
  transfersPromise: Promise<ProviderResult<TokenTransfer[]> | null>;
  tokenSymbol: string | null;
  /** PR13.7 Goal 14 — real finality lag, already resolved by `page.tsx` (Base RPC is fast enough not to defer behind Suspense — see `base.getFinality`'s own doc comment). `null` when the fetch failed. */
  finality: number | null;
  /** PR-074 REVIEW #6 — same real per-address Blockscout verification lookup the Contracts section and Trust Center already use (`contractDetailsPromise`), threaded here so the "Verified Contracts" stat agrees with them instead of relying on the stale registry-merge field. */
  contractDetailsPromise: Promise<ContractDetailEntry[]>;
  /** PR-078 §5 — real Base-chain-wide gas trend + network utilization from Blockscout's `/stats` (already implemented, previously never rendered — see `ProfileNetworkChainStatsAsync`). */
  chainStatsPromise: Promise<ProviderResult<ChainStats>>;
};

/**
 * Live Metrics — PR11 Part 3, tightened in PR11.1. Price/Token were pulled
 * into `ProfileTokenAndPrice` (PR12.1c Req 5.4). PR-079 moved "TVL &
 * Liquidity" into the Overview metric cards (`ProfileTokenAndPrice`'s
 * TVL/Liquidity/Volume `ExpandableMetricCard`s) and "Engineering Health"
 * into `ProfileCommunityMetrics` (merged there into "Project Intelligence")
 * — both to stop the same data (GitHub stars/forks, TVL) from rendering in
 * two places. This component now covers Network only. Section id
 * (`network`) is the `ProfileSectionNav` scroll target.
 *
 * PR13.6 (Goals 8-11) — Network is a single equal-width row of four real,
 * already-computed fields (Chain / Gas / Block Height / Est. TPS) instead
 * of a denser wrapping grid.
 */
export function ProfileMetrics({
  identity,
  contracts,
  chain,
  transfersPromise,
  tokenSymbol,
  finality,
  contractDetailsPromise,
  chainStatsPromise,
}: ProfileMetricsProps) {
  const verifiedPct = contracts.count > 0 ? (contracts.items.filter((c) => c.verified === true).length / contracts.count) * 100 : null;
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

  return (
    <div className="flex flex-col gap-5">
      <ProfileSectionCard id="network" title="Network" icon={Globe} sourceLink={networkSourceLink} className="gap-3">
        {/* PR-074 FINAL POLISH — Verified Contracts now joins this same
            divided strip as a seventh cell (via `children`) instead of
            sitting in its own separately-bordered box below it — one
            cohesive "Network Overview" strip instead of two stacked pieces
            with a visible gap between them. */}
        <ProfileNetworkLive
          chainLabel={chainLabel}
          gasGwei={networkAvailable ? chain.network.gasGwei : null}
          blockHeight={networkAvailable ? chain.network.blockHeight : null}
          estimatedTps={networkAvailable ? chain.network.estimatedTps : null}
          finality={finality}
        >
          {/* PR-074 FINAL UX POLISH — same real-value-can-flip issue as the
              Trust Center's Contracts tile: this fallback's `verifiedPct` is
              derived from the stale registry `verified` field, while the
              resolved async version below prefers real per-address
              Blockscout verification and can land on a different number.
              Marked `data-loading-skeleton` so the splash waits for the real
              value instead of completing while this cell can still change. */}
          <Suspense
            fallback={
              <span data-loading-skeleton="true" className="contents">
                <VerifiedContractsFallback
                  value={verifiedPct !== null ? formatPercent(verifiedPct, { showSign: false }) : "Not Tracked"}
                  unavailable={verifiedPct === null}
                />
              </span>
            }
          >
            <ProfileVerifiedContractsStatAsync contracts={contracts} contractDetailsPromise={contractDetailsPromise} />
          </Suspense>

          {/* PR-078 §5 — real Base-chain-wide gas trend + utilization from
              Blockscout's `/stats`, joining the same strip. No fast-path
              equivalent exists for these two (unlike Verified Contracts
              above), so the fallback while loading is just "Not Tracked",
              matching every other genuinely-not-yet-known cell on this
              page rather than a stale placeholder value. */}
          <Suspense
            fallback={
              <span data-loading-skeleton="true" className="contents">
                <ChainStatsFallback />
              </span>
            }
          >
            <ProfileNetworkChainStatsAsync chainStatsPromise={chainStatsPromise} />
          </Suspense>
        </ProfileNetworkLive>

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
    </div>
  );
}
