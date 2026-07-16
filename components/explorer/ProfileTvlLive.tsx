"use client";

import { MetricItem } from "@/components/explorer/MetricItem";
import { useLiveTvl } from "@/lib/hooks/useLiveTvl";
import { formatCompactCurrency } from "@/lib/data/format";

type ProfileTvlLiveProps = {
  defillamaSlug: string | null;
  tvlUsd: number | null;
  changePct24h: number | null;
};

const POLL_MS = 120_000;

/**
 * Live-polling wrapper around the TVL & Liquidity group's "TVL" tile
 * (PR12.2) — reuses `useLiveTvl`, itself wrapping the exact same bulk
 * `defillama.getBaseProtocols()` call `sources.ts`'s `matchTvl()` already
 * made for this page's first paint, matched the same way (`slugify`).
 * Seeded from the already-fast `tvl.tvlUsd`/`tvl.changePct24h` (unlike TVL
 * 7d/30d change or the history chart, these come from DefiLlama's bulk
 * snapshot, not the slower per-protocol history endpoint, so they're real
 * and available on first paint already) — the first poll is deferred a
 * full interval rather than firing immediately.
 */
export function ProfileTvlLive({ defillamaSlug, tvlUsd, changePct24h }: ProfileTvlLiveProps) {
  const { tvl } = useLiveTvl(
    defillamaSlug,
    POLL_MS,
    tvlUsd !== null ? { tvlUsd, changePct24h } : undefined
  );

  const liveTvlUsd = tvl?.tvlUsd ?? tvlUsd;

  return (
    <MetricItem
      bare
      emphasize
      label="TVL"
      value={liveTvlUsd !== null ? formatCompactCurrency(liveTvlUsd) : undefined}
      unavailable={liveTvlUsd === null}
    />
  );
}
