import { ChainBadge } from "@/components/branding/ChainBadge";
import { ChainBadgeGroup } from "@/components/branding/ChainBadgeGroup";
import { TokenLogo } from "@/components/branding/TokenLogo";
import { MetricItem } from "@/components/explorer/MetricItem";
import { QuickViewSectionLabel } from "@/components/explorer/QuickViewSectionLabel";
import { formatLabel } from "@/components/explorer/format";
import { cn } from "@/lib/utils";
import { formatCompactCurrency, formatGwei, formatNumber, formatPercent } from "@/lib/data/format";
import type { ChainInfo, Contracts, Market, Trading, Tvl } from "@/lib/intelligence/types";

type QuickViewMetricsProps = {
  market: Market;
  trading: Trading;
  tvl: Tvl;
  chain: ChainInfo;
  contracts: Contracts;
};

/** One shared card per related group of stats, instead of one bordered box per number — same data, lighter chrome. */
const METRIC_GROUP_CLASS =
  "grid grid-cols-2 gap-4 rounded-xl border border-radar-light-border bg-radar-light-surface p-4 dark:border-white/10 dark:bg-white/[0.02]";

/**
 * The full Market/Trading/TVL/Chain/Contracts breakdown behind the
 * Summary's headline metric — docs/explorer/03 §14, item 3. Every field
 * renders through `MetricItem`, gracefully unavailable where the Engine has
 * no value; nothing here is computed, only displayed. Related stats within
 * a group share one card (`MetricItem`'s `bare` variant) rather than each
 * getting its own border — same information, fewer boxes.
 *
 * The `TokenLogo` beside "Market" is deliberate: a Token Logo is a
 * different asset from the Project Logo already shown in `QuickViewHeader`,
 * and this codebase's data model has no token-logo field yet, so it always
 * renders its reserved-slot empty state here. Never substitutes the
 * project logo or invents a fake image.
 */
export function QuickViewMetrics({ market, trading, tvl, chain, contracts }: QuickViewMetricsProps) {
  const marketCapAvailable = market.available && market.marketCapUsd !== null;
  const fdvAvailable = market.available && market.fullyDilutedValuationUsd !== null;
  const changeAvailable = market.available && market.changePct24h !== null;
  const volumeAvailable = trading.available && trading.volume24hUsd !== null;
  const tvlAvailable = tvl.available && tvl.tvlUsd !== null;
  const tvlChangeAvailable = tvl.available && tvl.changePct24h !== null;
  const gasAvailable = chain.network.available && chain.network.gasGwei !== null;
  const blockHeightAvailable = chain.network.available && chain.network.blockHeight !== null;

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <TokenLogo size={20} />
          <QuickViewSectionLabel>Market</QuickViewSectionLabel>
        </div>
        <div className={METRIC_GROUP_CLASS}>
          <MetricItem
            bare
            label="Market Cap"
            value={marketCapAvailable ? formatCompactCurrency(market.marketCapUsd as number) : undefined}
            unavailable={!marketCapAvailable}
          />
          <MetricItem
            bare
            label="Fully Diluted Valuation"
            value={fdvAvailable ? formatCompactCurrency(market.fullyDilutedValuationUsd as number) : undefined}
            unavailable={!fdvAvailable}
          />
          <MetricItem
            bare
            label="24h Change"
            value={changeAvailable ? formatPercent(market.changePct24h as number) : undefined}
            unavailable={!changeAvailable}
          />
          <MetricItem
            bare
            label="24h Volume"
            value={volumeAvailable ? formatCompactCurrency(trading.volume24hUsd as number) : undefined}
            unavailable={!volumeAvailable}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <QuickViewSectionLabel>TVL</QuickViewSectionLabel>
        <div className={METRIC_GROUP_CLASS}>
          <MetricItem
            bare
            label="Total Value Locked"
            value={tvlAvailable ? formatCompactCurrency(tvl.tvlUsd as number) : undefined}
            unavailable={!tvlAvailable}
          />
          <MetricItem
            bare
            label="TVL 24h Change"
            value={tvlChangeAvailable ? formatPercent(tvl.changePct24h as number) : undefined}
            unavailable={!tvlChangeAvailable}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <QuickViewSectionLabel>Chain</QuickViewSectionLabel>
        <ChainBadgeGroup chains={chain.chains} size="sm" />
        <div className={METRIC_GROUP_CLASS}>
          <MetricItem
            bare
            label="Gas"
            value={gasAvailable ? formatGwei(chain.network.gasGwei as number) : undefined}
            unavailable={!gasAvailable}
          />
          <MetricItem
            bare
            label="Block Height"
            value={blockHeightAvailable ? formatNumber(chain.network.blockHeight as number) : undefined}
            unavailable={!blockHeightAvailable}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <QuickViewSectionLabel>Contracts</QuickViewSectionLabel>
        {contracts.count > 0 ? (
          <ul className="flex flex-col gap-2">
            {contracts.items.map((contract) => (
              <li
                key={`${contract.chain}-${contract.address}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-radar-light-text dark:text-radar-white">
                      {contract.label ?? formatLabel(contract.type)}
                    </span>
                    <ChainBadge chain={contract.chain} size="sm" className="shrink-0" />
                  </div>
                  <div className="truncate text-[11px] text-radar-light-muted dark:text-radar-muted">
                    {contract.address}
                  </div>
                </div>
                {/* `verified` is `boolean | null` — `null` means unknown, never a
                    definite non-match, so it must read "Unknown," not "Not
                    Verified" (docs/explorer/05 §14). */}
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium",
                    contract.verified === true ? "text-radar-success" : "text-radar-light-muted dark:text-radar-muted"
                  )}
                >
                  {contract.verified === true ? "Verified" : "Unknown"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No contracts listed for this project.</p>
        )}
      </section>
    </div>
  );
}
