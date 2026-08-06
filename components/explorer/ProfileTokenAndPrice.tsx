import { Suspense } from "react";
import { BarChart3, Coins, DollarSign, Droplets, Landmark, Wallet } from "lucide-react";

import { TokenLogo } from "@/components/branding/TokenLogo";
import { ChangeValue } from "@/components/explorer/ChangeValue";
import { MetricItem } from "@/components/explorer/MetricItem";
import { ProfilePriceChart } from "@/components/explorer/ProfilePriceChart";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { ProfileTvlChangeTilesAsync } from "@/components/explorer/ProfileTvlChangeTilesAsync";
import { ProfileTvlChartAsync } from "@/components/explorer/ProfileTvlChartAsync";
import { ProfileVolumeTrendPanel } from "@/components/explorer/ProfileVolumeTrendPanel";
import { MetricCardGroup, type MetricTile } from "@/components/ui/MetricCardGroup";
import { EmptyState } from "@/components/ui/EmptyState";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { formatCompactCurrency, formatCompactNumber, formatDate, formatPercent, formatPrice } from "@/lib/data/format";
import { PROVIDER_DISPLAY_NAME } from "@/lib/intelligence/scorecard";
import { cn } from "@/lib/utils";
import type { Identity, Market, Trading, Tvl } from "@/lib/intelligence/types";
import type { SparklinePoint } from "@/lib/data/types";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileTokenAndPriceProps = {
  identity: Identity;
  market: Market;
  trading: Trading;
  tvl: Tvl;
  priceHistory: SparklinePoint[] | null;
  coingeckoId: string | null;
  /** PR-079 Section 2/3 — moved here from `ProfileMetrics.tsx`'s old "TVL & Liquidity" section so TVL history lives in exactly one place (the TVL card's expanded state) instead of two. */
  tvlHistoryPromise: Promise<ProviderResult<SparklinePoint[]> | null>;
};

/** Bare label/value pair used inside expanded card content — same visual weight as `MetricItem bare`. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-radar-light-text dark:text-radar-white">{children}</span>
    </div>
  );
}

/** Pool/Exchange Distribution share bars — module-scope (not defined inside `ProfileTokenAndPrice`) so it isn't recreated every render. */
function DistributionBars({ rows, valueLabel }: { rows: { dexId: string; sharePct: number }[]; valueLabel: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{valueLabel}</span>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.dexId} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 truncate text-radar-light-text dark:text-radar-white">{row.dexId}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-radar-light-border dark:bg-white/10">
              <div className="h-full rounded-full bg-radar-primary dark:bg-radar-accent" style={{ width: `${row.sharePct}%` }} />
            </div>
            <span className="w-12 shrink-0 text-right tabular-nums text-radar-light-muted dark:text-radar-muted">{row.sharePct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * PR12.1c Req 5.4 merged Token Information and Price into one section;
 * PR-079 Section 2 makes every metric card interactive — collapsed shows
 * today's summary, expanded reveals richer detail that used to be scattered
 * across this card's old "secondary panel" and `ProfileMetrics.tsx`'s old
 * "TVL & Liquidity" section (Pool/Exchange Distribution, TVL history). No
 * field is duplicated: Price's expanded state deliberately has no second
 * chart (the interactive `ProfilePriceChart` above already shows it) — only
 * TVL's expanded state gets a chart, since TVL history has no other visible
 * home on this page after this change. Max/Circulating Supply moved to the
 * Header's new Token Info row (PR-079 Section 1); this card no longer
 * repeats them as a standalone "Supply" tile.
 */
export function ProfileTokenAndPrice({
  identity,
  market,
  trading,
  tvl,
  priceHistory,
  coingeckoId,
  tvlHistoryPromise,
}: ProfileTokenAndPriceProps) {
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

  const volumeAvailable = trading.available && trading.volume24hUsd !== null;
  const liquidityAvailable = trading.available && trading.liquidityUsd !== null;
  const tvlAvailable = tvl.available && tvl.tvlUsd !== null;

  // Moved here from `ProfileMetrics.tsx` (PR-079 Section 3) — same
  // computation, now feeding the Liquidity/Volume cards' expanded states
  // instead of a separate always-visible section.
  const totalPoolLiquidity = trading.pools.reduce((sum, pool) => sum + (pool.liquidityUsd ?? 0), 0);
  const poolDistribution =
    trading.available && trading.pools.length > 1 && totalPoolLiquidity > 0
      ? trading.pools
          .slice(0, 5)
          .map((pool) => ({ dexId: pool.dexId, liquidityUsd: pool.liquidityUsd, sharePct: pool.liquidityUsd !== null ? (pool.liquidityUsd / totalPoolLiquidity) * 100 : 0 }))
      : [];

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

  // PR-080 Task 2/7 — a permanent, array-driven two-row architecture instead
  // of one 6-tile row: `overviewRows` is `MetricTile[][]`, rendered below via
  // `.map()` into one `MetricCardGroup` per row. Each `MetricCardGroup`
  // instance owns its own selection state, so this is also what makes the
  // rows independent (selecting a tile in Row 1 can never affect Row 2) with
  // zero changes to `MetricCardGroup` itself. Every row always renders on a
  // fixed 4-column grid regardless of how many real tiles it holds — Row 2
  // below intentionally has only 2 real tiles today (Liquidity, FDV), and
  // its other 2 grid slots are the real, empty, reserved capacity for a
  // future PR's metrics (Holders, Rank, ATH, ATL, ...). No card is ever
  // stretched/resized to fill unused space — a future metric is added by
  // pushing another tile onto `row2Tiles` (or a `row3Tiles` onto
  // `overviewRows`), never by restructuring this layout.
  const row1Tiles: MetricTile[] = [
    {
      id: "overview-price",
      icon: <DollarSign className="size-3 shrink-0" aria-hidden="true" />,
      label: "Price",
      value: market.priceUsd !== null ? formatPrice(market.priceUsd) : "Not Tracked",
      helper: <ChangeValue value={market.changePct24h} className="text-xs font-semibold" />,
      unavailable: market.priceUsd === null,
      sourceLabel: "CoinGecko",
      expandedContent: (
        <>
          {priceHistory && priceHistory.length > 1 ? (
            <ProfilePriceChart coingeckoId={coingeckoId} initialData={priceHistory} />
          ) : (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">No price history returned by CoinGecko for this token yet.</p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricItem bare label="7d Change" changeValue={market.changePct7d} />
            <MetricItem bare label="30d Change" changeValue={market.changePct30d} />
            <MetricItem
              bare
              label="All-Time High"
              value={market.athUsd !== null ? `${formatPrice(market.athUsd)}${market.athDate ? ` (${formatDate(market.athDate)})` : ""}` : undefined}
              unavailable={market.athUsd === null}
            />
            <MetricItem
              bare
              label="All-Time Low"
              value={market.atlUsd !== null ? `${formatPrice(market.atlUsd)}${market.atlDate ? ` (${formatDate(market.atlDate)})` : ""}` : undefined}
              unavailable={market.atlUsd === null}
            />
          </div>
        </>
      ),
    },
    {
      id: "overview-market-cap",
      icon: <BarChart3 className="size-3 shrink-0" aria-hidden="true" />,
      label: "Market Cap",
      value: market.marketCapUsd !== null ? formatCompactCurrency(market.marketCapUsd) : "Not Tracked",
      unavailable: market.marketCapUsd === null,
      sourceLabel: "CoinGecko",
      expandedContent: (
        <>
          <DetailRow label="Fully Diluted Valuation">
            {market.fullyDilutedValuationUsd !== null ? formatCompactCurrency(market.fullyDilutedValuationUsd) : "Not Tracked"}
          </DetailRow>
          {market.marketCapUsd !== null && market.fullyDilutedValuationUsd !== null && market.fullyDilutedValuationUsd > 0 && (
            <DetailRow label="Market Cap / FDV">
              {formatPercent((market.marketCapUsd / market.fullyDilutedValuationUsd) * 100, { showSign: false })}
            </DetailRow>
          )}
          {market.marketCapRank !== null && <DetailRow label="Global Rank">#{market.marketCapRank}</DetailRow>}
        </>
      ),
    },
    {
      id: "overview-tvl",
      icon: <Wallet className="size-3 shrink-0" aria-hidden="true" />,
      label: "TVL",
      value: tvlAvailable ? formatCompactCurrency(tvl.tvlUsd as number) : "Not Tracked",
      helper: tvl.changePct24h !== null ? <ChangeValue value={tvl.changePct24h} className="text-xs font-semibold" /> : undefined,
      unavailable: !tvlAvailable,
      sourceLabel: "DefiLlama",
      expandedContent: tvlAvailable ? (
        <>
          <Suspense fallback={<WidgetSkeleton className="h-12 rounded-xl" />}>
            <ProfileTvlChartAsync resultPromise={tvlHistoryPromise} tvlAvailable={tvlAvailable} compact />
          </Suspense>
          <div className="grid grid-cols-2 gap-2">
            <Suspense
              fallback={
                <>
                  <MetricItem bare label="TVL 7d Change" />
                  <MetricItem bare label="TVL 30d Change" />
                </>
              }
            >
              <ProfileTvlChangeTilesAsync resultPromise={tvlHistoryPromise} />
            </Suspense>
          </div>
          {liquidityAvailable && <DetailRow label="DEX Liquidity">{formatCompactCurrency(trading.liquidityUsd as number)}</DetailRow>}
        </>
      ) : (
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">
          {tvl.tvlResolution.failureReason ?? "DefiLlama has no TVL on record for this protocol."}
        </p>
      ),
    },
    {
      id: "overview-volume",
      icon: <Landmark className="size-3 shrink-0" aria-hidden="true" />,
      label: "Volume 24h",
      value: volumeAvailable ? formatCompactCurrency(trading.volume24hUsd as number) : "Not Tracked",
      unavailable: !volumeAvailable,
      sourceLabel: trading.volumeResolution.provider ? PROVIDER_DISPLAY_NAME[trading.volumeResolution.provider] : "DexScreener",
      expandedContent: (
        <>
          <ProfileVolumeTrendPanel coingeckoId={coingeckoId} />
          {exchangeDistribution.length > 0 ? (
            <DistributionBars rows={exchangeDistribution} valueLabel="Exchange Distribution (24h)" />
          ) : (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">Only one exchange tracked — no distribution to show.</p>
          )}
        </>
      ),
    },
  ];

  const row2Tiles: MetricTile[] = [
    {
      id: "overview-liquidity",
      icon: <Droplets className="size-3 shrink-0" aria-hidden="true" />,
      label: "Liquidity",
      value: liquidityAvailable ? formatCompactCurrency(trading.liquidityUsd as number) : "Not Tracked",
      helper: trading.available ? `${formatCompactNumber(trading.pairCount)} tracked pools` : undefined,
      unavailable: !liquidityAvailable,
      sourceLabel: "DexScreener",
      expandedContent: trading.available ? (
        <>
          <DetailRow label="Largest Pool">
            {trading.largestPool ? `${trading.largestPool.dexId} (${formatCompactCurrency(trading.largestPool.liquidityUsd ?? 0)})` : "Not Tracked"}
          </DetailRow>
          {poolDistribution.length > 0 ? (
            <DistributionBars rows={poolDistribution} valueLabel="Pool Distribution" />
          ) : (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">Only one tracked pool — no distribution to show.</p>
          )}
        </>
      ) : (
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">
          {trading.liquidityResolution.failureReason ?? "No live DexScreener trading data for this project."}
        </p>
      ),
    },
    {
      id: "overview-fdv",
      icon: <Coins className="size-3 shrink-0" aria-hidden="true" />,
      label: "FDV",
      value: market.fullyDilutedValuationUsd !== null ? formatCompactCurrency(market.fullyDilutedValuationUsd) : "Not Tracked",
      unavailable: market.fullyDilutedValuationUsd === null,
      sourceLabel: "CoinGecko",
      expandedContent: (
        <>
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">
            Fully Diluted Valuation = current price × max supply — what market cap would be if every token were in circulation.
          </p>
          {market.maxSupply !== null && market.circulatingSupply !== null && market.maxSupply > 0 && (
            <DetailRow label="Circulating of Max">
              {formatPercent((market.circulatingSupply / market.maxSupply) * 100, { showSign: false })}
            </DetailRow>
          )}
        </>
      ),
    },
    // Future PR — push more tiles here (Holders, Rank, ATH, ATL, ...); the
    // row's `grid-cols-4` already reserves the space, no layout change needed.
  ];

  const overviewRows: MetricTile[][] = [row1Tiles, row2Tiles];

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

        {/* PR-080 Task 2 — the Overview metric tiles render as two independent, permanent 4-column rows (`overviewRows.map`), each with its own `MetricCardGroup` instance and its own shared detail panel. See the `overviewRows` doc comment above for the array-driven scalability rationale. */}
        {overviewRows.map((tiles, index) => (
          <MetricCardGroup key={index} tiles={tiles} gridClassName="grid-cols-2 sm:grid-cols-4" />
        ))}

        {market.genesisDate && (
          <p className={cn("text-[10.5px] text-radar-light-muted dark:text-radar-muted")}>
            Launched <span className="font-medium text-radar-light-text dark:text-radar-white">{formatDate(market.genesisDate)}</span>
          </p>
        )}
      </div>
    </ProfileSectionCard>
  );
}
