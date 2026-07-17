import { BarChart3, Coins, DollarSign, Droplets, ExternalLink, Landmark, Layers, Wallet } from "lucide-react";

import { TokenLogo } from "@/components/branding/TokenLogo";
import { ChangeValue } from "@/components/explorer/ChangeValue";
import { MetricItem } from "@/components/explorer/MetricItem";
import { ProfilePriceChart } from "@/components/explorer/ProfilePriceChart";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import { formatCompactCurrency, formatCompactNumber, formatDate, formatPrice } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { ChainInfo, Contracts, Identity, Market, Trading, Tvl } from "@/lib/intelligence/types";
import type { SparklinePoint } from "@/lib/data/types";

type ProfileTokenAndPriceProps = {
  identity: Identity;
  market: Market;
  trading: Trading;
  tvl: Tvl;
  contracts: Contracts;
  chain: ChainInfo;
  priceHistory: SparklinePoint[] | null;
  coingeckoId: string | null;
};

/** Bare label/value pair for the secondary details panel — same visual weight as `MetricItem bare`, just a 2-column key/value layout instead of a stacked tile. */
function IdentityRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-radar-light-text dark:text-radar-white">{children}</span>
    </div>
  );
}

/** One primary stat tile in the card's 6-metric grid (Market Cap / FDV / TVL / Liquidity / Volume / Supply) — the same icon-bg + label + value recipe the Header/Scorecard use, for Goal 5 card consistency. */
function PriceStat({
  icon: Icon,
  label,
  value,
  helper,
  unavailable,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  helper?: string;
  unavailable?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-radar-light-card hover:shadow-md motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary dark:bg-radar-accent/10 dark:text-radar-accent">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
        <span
          className={cn(
            "truncate text-sm font-bold tabular-nums text-radar-light-text dark:text-radar-white",
            unavailable && "text-radar-light-muted font-medium normal-case dark:text-radar-muted"
          )}
        >
          {value}
        </span>
        {helper && <span className="truncate text-[10.5px] text-radar-light-muted dark:text-radar-muted">{helper}</span>}
      </div>
    </div>
  );
}

/**
 * PR12.1c Req 5.4 merged Token Information and Price into one section;
 * PR13.4 Goal 4 gives it a stronger visual identity: identity + large price
 * + chart up top, then one scannable 6-tile grid (Market Cap / FDV / TVL /
 * Liquidity / Volume / Supply — TVL now included via the same `Tvl` prop
 * `ProfileMetrics`/`ProfileQuickStats` already receive, no new fetch), with
 * supply breakdown, contract, and date details demoted to a secondary panel
 * beneath it. Every field is still the exact same `ProjectIntelligence.
 * market`/`.trading`/`.tvl`/`.contracts` data this section always rendered.
 */
export function ProfileTokenAndPrice({ identity, market, trading, tvl, contracts, chain, priceHistory, coingeckoId }: ProfileTokenAndPriceProps) {
  if (!market.available) {
    return (
      <ProfileSectionCard id="price" title="Token & Price" icon={Coins}>
        <EmptyState
          icon={Coins}
          title="No token data available"
          description="This project has no CoinGecko token configured in the Base Radar registry, or CoinGecko's API didn't return market data for it just now. This section updates automatically once live data is available."
          className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
        />
      </ProfileSectionCard>
    );
  }

  const tokenContract = contracts.items.find((c) => c.chain === chain.primaryChain && c.type === "token");
  const explorerUrl = tokenContract ? CHAIN_BRANDING[tokenContract.chain]?.explorerUrl : null;
  const tokenContractHref = tokenContract && explorerUrl ? `${explorerUrl}/token/${tokenContract.address}` : null;
  const volumeAvailable = trading.available && trading.volume24hUsd !== null;
  const liquidityAvailable = trading.available && trading.liquidityUsd !== null;
  const tvlAvailable = tvl.available && tvl.tvlUsd !== null;

  return (
    <ProfileSectionCard
      id="price"
      title="Token & Price"
      icon={Coins}
      sourceLink={coingeckoId ? { href: `https://www.coingecko.com/en/coins/${coingeckoId}`, label: "CoinGecko" } : undefined}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <TokenLogo logoUrl={market.imageUrl} symbol={market.symbol} size={44} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-base font-semibold text-radar-light-text dark:text-radar-white">
                {market.symbol ?? identity.name}
              </span>
              <span className="truncate text-xs text-radar-light-muted dark:text-radar-muted">{identity.name}</span>
            </div>
          </div>
          {market.marketCapRank !== null && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-surface px-3 py-1 text-xs font-semibold text-radar-light-text dark:border-white/10 dark:bg-white/[0.02] dark:text-radar-white">
              <span className="relative flex size-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-radar-success opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-1.5 rounded-full bg-radar-success" />
              </span>
              Rank #{market.marketCapRank}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-extrabold tracking-tight tabular-nums text-radar-light-text dark:text-radar-white">
              {market.priceUsd !== null ? formatPrice(market.priceUsd) : "—"}
            </span>
            <ChangeValue value={market.changePct24h} className="text-base font-semibold" />
          </div>

          {priceHistory && priceHistory.length > 1 ? (
            <ProfilePriceChart coingeckoId={coingeckoId} initialData={priceHistory} />
          ) : (
            <div className="flex h-[130px] items-center justify-center rounded-xl border border-dashed border-radar-light-border text-xs text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
              No price history returned by CoinGecko for this token yet.
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <PriceStat
            icon={BarChart3}
            label="Market Cap"
            value={market.marketCapUsd !== null ? formatCompactCurrency(market.marketCapUsd) : "Not Tracked"}
            unavailable={market.marketCapUsd === null}
          />
          <PriceStat
            icon={DollarSign}
            label="FDV"
            value={market.fullyDilutedValuationUsd !== null ? formatCompactCurrency(market.fullyDilutedValuationUsd) : "Not Tracked"}
            unavailable={market.fullyDilutedValuationUsd === null}
          />
          <PriceStat icon={Wallet} label="TVL" value={tvlAvailable ? formatCompactCurrency(tvl.tvlUsd as number) : "Not Tracked"} unavailable={!tvlAvailable} />
          <PriceStat
            icon={Droplets}
            label="Liquidity"
            value={liquidityAvailable ? formatCompactCurrency(trading.liquidityUsd as number) : "Not Tracked"}
            unavailable={!liquidityAvailable}
          />
          <PriceStat
            icon={Landmark}
            label="Volume 24h"
            value={volumeAvailable ? formatCompactCurrency(trading.volume24hUsd as number) : "Not Tracked"}
            unavailable={!volumeAvailable}
          />
          <PriceStat
            icon={Layers}
            label="Supply"
            value={market.circulatingSupply !== null ? formatCompactNumber(market.circulatingSupply) : "Not Tracked"}
            helper={market.totalSupply !== null ? `of ${formatCompactNumber(market.totalSupply)} total` : undefined}
            unavailable={market.circulatingSupply === null}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-radar-light-border pt-4 sm:grid-cols-2 dark:border-white/10">
          <div className="flex flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
            <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Token Contract</span>
            {tokenContract ? (
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 truncate text-xs text-radar-light-text dark:text-radar-white">{tokenContract.address}</span>
                <CopyButton value={tokenContract.address} label="token contract address" />
                {tokenContractHref && (
                  <a
                    href={tokenContractHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View token contract on block explorer"
                    className="shrink-0 text-radar-light-muted/70 outline-none transition-colors hover:text-radar-light-muted focus-visible:text-radar-light-muted dark:text-radar-muted/60 dark:hover:text-radar-muted dark:focus-visible:text-radar-muted"
                  >
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            ) : (
              <span className="text-xs text-radar-light-text dark:text-radar-white">
                No token contract registered on {CHAIN_BRANDING[chain.primaryChain]?.label ?? chain.primaryChain}.
              </span>
            )}
            <div className="flex flex-col gap-1 border-t border-radar-light-border pt-2 dark:border-white/10">
              <IdentityRow label="Launch Date">
                {market.genesisDate ? formatDate(market.genesisDate) : "Not on record with CoinGecko"}
              </IdentityRow>
              <IdentityRow label="Max Supply">{market.maxSupply !== null ? formatCompactNumber(market.maxSupply) : "Not on record"}</IdentityRow>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 sm:grid-cols-3 dark:border-white/10 dark:bg-white/[0.02]">
            <MetricItem bare label="7d Change" changeValue={market.changePct7d} />
            <MetricItem bare label="30d Change" changeValue={market.changePct30d} />
            <MetricItem bare label="All-Time High" value={market.athUsd !== null ? formatPrice(market.athUsd) : undefined} unavailable={market.athUsd === null} />
            <MetricItem bare label="ATH Date" value={market.athDate ? formatDate(market.athDate) : undefined} unavailable={!market.athDate} />
            <MetricItem bare label="All-Time Low" value={market.atlUsd !== null ? formatPrice(market.atlUsd) : undefined} unavailable={market.atlUsd === null} />
            <MetricItem bare label="ATL Date" value={market.atlDate ? formatDate(market.atlDate) : undefined} unavailable={!market.atlDate} />
          </div>
        </div>
      </div>
    </ProfileSectionCard>
  );
}
