"use client";

/**
 * Client-poll refresh for a single project's current TVL/24h change on the
 * Project Profile page (PR12.2) — same "UI -> Hooks -> Services ->
 * Providers" shape as `useLiveNetworkStatus`/`useLiveTicker`, built on
 * `usePolling`. Each poll calls `pollLiveTvl` (`lib/hooks/liveActions.ts`),
 * a Server Action wrapping DefiLlama's bulk `getBaseProtocols()` (the same
 * call `sources.ts`'s `matchTvl()` already makes for this page's first
 * paint, via `fetchProviderBulkData()`) and matching by
 * `slugify(protocol.name) === defillamaSlug` — replicating `matchTvl`'s
 * exact comparison, since `defillamaSlug` in the registry is a
 * pre-slugified *name*, not a real DefiLlama API slug field. Run
 * server-side (Final Production Readiness PR), not imported into this
 * `"use client"` hook directly: DefiLlama's REST API doesn't permit
 * cross-origin browser requests, so the previous direct import meant every
 * poll failed silently in the browser (confirmed live via a CORS console
 * error) and this page's live TVL never actually refreshed past its first
 * SSR paint.
 *
 * Deliberately scoped to `tvlUsd`/`changePct24h` only: DefiLlama's bulk
 * `Protocol` type has no 7d/30d change — that only exists via the slower
 * per-protocol history endpoint (`getProtocolTvlHistory`), which stays
 * one-shot-streamed (`ProfileTvlChangeTilesAsync`) and out of scope here.
 */

import { pollLiveTvl, type LiveTvlPoll } from "@/lib/hooks/liveActions";
import { usePolling } from "@/lib/hooks/usePolling";

export type LiveTvl = LiveTvlPoll;

const DEFAULT_POLL_MS = 120_000;

export function useLiveTvl(defillamaSlug: string | null, pollMs: number = DEFAULT_POLL_MS, initial?: LiveTvl) {
  const { data, updatedAt } = usePolling<LiveTvl>(
    async () => {
      if (!defillamaSlug) return null;
      return pollLiveTvl(defillamaSlug);
    },
    pollMs,
    { initial }
  );

  return { tvl: data, updatedAt };
}
