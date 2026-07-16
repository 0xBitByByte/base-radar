import { Coins, ExternalLink } from "lucide-react";

import { TokenLogo } from "@/components/branding/TokenLogo";
import { ChangeValue } from "@/components/explorer/ChangeValue";
import { MetricItem } from "@/components/explorer/MetricItem";
import { ProfilePriceChart } from "@/components/explorer/ProfilePriceChart";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import { formatCompactCurrency, formatCompactNumber, formatDate, formatPrice } from "@/lib/data/format";
import type { ChainInfo, Contracts, Identity, Market, Trading } from "@/lib/intelligence/types";
import type { SparklinePoint } from "@/lib/data/types";

type ProfileTokenAndPriceProps = {
  identity: Identity;
  market: Market;
  trading: Trading;
  contracts: Contracts;
  chain: ChainInfo;
  priceHistory: SparklinePoint[] | null;
  coingeckoId: string | null;
};

/** Bare label/value pair for the identity column's supply/contract/launch rows — same visual weight as `MetricItem bare`, just a 2-column key/value layout instead of a stacked tile. */
function IdentityRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-radar-light-text dark:text-radar-white">{children}</span>
    </div>
  );
}

/**
 * PR12.1c Req 5.4 — Token Information and Price were two separate cards
 * users read as one topic; merged into a single section with identity/
 * supply/contract/launch on the left and price/chart/period-filters on the
 * right, both above the fold. Every field is the exact same
 * `ProjectIntelligence.market`/`.trading`/`.contracts` data the two
 * predecessor components already rendered — no new fetch, no new field.
 */
export function ProfileTokenAndPrice({ identity, market, trading, contracts, chain, priceHistory, coingeckoId }: ProfileTokenAndPriceProps) {
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

  return (
    <ProfileSectionCard
      id="price"
      title="Token & Price"
      icon={Coins}
      sourceLink={coingeckoId ? { href: `https://www.coingecko.com/en/coins/${coingeckoId}`, label: "CoinGecko" } : undefined}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <TokenLogo logoUrl={market.imageUrl} symbol={market.symbol} size={40} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">
                {market.symbol ?? identity.name}
              </span>
              <span className="truncate text-xs text-radar-light-muted dark:text-radar-muted">{identity.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
            <MetricItem
              bare
              label="Market Rank"
              value={market.marketCapRank !== null ? `#${market.marketCapRank}` : undefined}
              unavailable={market.marketCapRank === null}
            />
            <MetricItem
              bare
              label="Circulating Supply"
              value={market.circulatingSupply !== null ? formatCompactNumber(market.circulatingSupply) : undefined}
              unavailable={market.circulatingSupply === null}
            />
            <MetricItem
              bare
              label="Total Supply"
              value={market.totalSupply !== null ? formatCompactNumber(market.totalSupply) : undefined}
              unavailable={market.totalSupply === null}
            />
            <MetricItem
              bare
              label="Max Supply"
              value={market.maxSupply !== null ? formatCompactNumber(market.maxSupply) : undefined}
              unavailable={market.maxSupply === null}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
                Token Contract
              </span>
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
            </div>
            <div className="flex flex-col gap-1 border-t border-radar-light-border pt-2 dark:border-white/10">
              <IdentityRow label="Launch Date">
                {market.genesisDate ? formatDate(market.genesisDate) : "Not on record with CoinGecko"}
              </IdentityRow>
              <IdentityRow label="ATH Date">{market.athDate ? formatDate(market.athDate) : "Not on record with CoinGecko"}</IdentityRow>
              <IdentityRow label="ATL Date">{market.atlDate ? formatDate(market.atlDate) : "Not on record with CoinGecko"}</IdentityRow>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-radar-light-text dark:text-radar-white">
              {market.priceUsd !== null ? formatPrice(market.priceUsd) : "—"}
            </span>
            <ChangeValue value={market.changePct24h} className="text-sm" />
          </div>

          {priceHistory && priceHistory.length > 1 ? (
            <ProfilePriceChart coingeckoId={coingeckoId} initialData={priceHistory} />
          ) : (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">No price history returned by CoinGecko for this token yet.</p>
          )}

          <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02] sm:grid-cols-3">
            <MetricItem bare label="7d Change" changeValue={market.changePct7d} />
            <MetricItem bare label="30d Change" changeValue={market.changePct30d} />
            <MetricItem
              bare
              label="Market Cap"
              value={market.marketCapUsd !== null ? formatCompactCurrency(market.marketCapUsd) : undefined}
              unavailable={market.marketCapUsd === null}
            />
            <MetricItem
              bare
              label="Fully Diluted Valuation"
              value={market.fullyDilutedValuationUsd !== null ? formatCompactCurrency(market.fullyDilutedValuationUsd) : undefined}
              unavailable={market.fullyDilutedValuationUsd === null}
            />
            <MetricItem
              bare
              label="24h Volume"
              value={volumeAvailable ? formatCompactCurrency(trading.volume24hUsd as number) : undefined}
              unavailable={!volumeAvailable}
            />
            <MetricItem
              bare
              label="All-Time High"
              value={market.athUsd !== null ? formatPrice(market.athUsd) : undefined}
              unavailable={market.athUsd === null}
            />
            <MetricItem
              bare
              label="All-Time Low"
              value={market.atlUsd !== null ? formatPrice(market.atlUsd) : undefined}
              unavailable={market.atlUsd === null}
            />
          </div>
        </div>
      </div>
    </ProfileSectionCard>
  );
}
