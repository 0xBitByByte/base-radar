"use client";

/**
 * Client-poll refresh for a single project's current TVL/24h change on the
 * Project Profile page (PR12.2) — same "UI -> Hooks -> Services ->
 * Providers" shape as `useLiveNetworkStatus`/`useLiveTicker`, built on
 * `usePolling`. Wraps DefiLlama's bulk `getBaseProtocols()` (the same call
 * `sources.ts`'s `matchTvl()` already makes for this page's first paint,
 * via `fetchProviderBulkData()`) and matches by `slugify(protocol.name) ===
 * defillamaSlug` — replicating `matchTvl`'s exact comparison, since
 * `defillamaSlug` in the registry is a pre-slugified *name*, not a real
 * DefiLlama API slug field.
 *
 * Deliberately scoped to `tvlUsd`/`changePct24h` only: DefiLlama's bulk
 * `Protocol` type has no 7d/30d change — that only exists via the slower
 * per-protocol history endpoint (`getProtocolTvlHistory`), which stays
 * one-shot-streamed (`ProfileTvlChangeTilesAsync`) and out of scope here.
 */

import * as defillama from "@/lib/providers/defillama/service";
import { usePolling } from "@/lib/hooks/usePolling";
import { slugify } from "@/lib/intelligence/helpers";

export type LiveTvl = {
  tvlUsd: number;
  changePct24h: number | null;
};

const DEFAULT_POLL_MS = 120_000;

export function useLiveTvl(defillamaSlug: string | null, pollMs: number = DEFAULT_POLL_MS, initial?: LiveTvl) {
  const { data, updatedAt } = usePolling<LiveTvl>(
    async () => {
      if (!defillamaSlug) return null;
      const result = await defillama.getBaseProtocols();
      if (!result.ok) return null;
      const match = result.data.find((protocol) => slugify(protocol.name) === defillamaSlug);
      return match ? { tvlUsd: match.tvlUsd, changePct24h: match.changePct24h } : null;
    },
    pollMs,
    { initial }
  );

  return { tvl: data, updatedAt };
}
