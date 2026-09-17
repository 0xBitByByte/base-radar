"use client";

/**
 * V3-WALLET-002 — the one shared hook every wallet-holdings UI reads
 * through (Dashboard's `PortfolioWidget`, the `/dashboard/wallet` page) —
 * no component fetches holdings directly, matching this codebase's
 * established "components never call the underlying layer directly, only
 * via a hook" rule (`useWatchlists.ts`/`useAutomationRules.ts`).
 *
 * Deliberately NOT built on `usePolling` — that hook exists for things that
 * genuinely change on their own every tick (ETH price, chain TVL); wallet
 * holdings don't, and this feature's explicit requirement is "refresh only
 * when necessary": on mount, on the connected address or chain changing
 * (reconnect / account switch / network switch, all visible as `address`/
 * `chainId` changing from `useWallet()`), and on an explicit manual
 * `refresh()` call — never on an interval timer.
 *
 * Reads `address`/`chainId`/`isConnected` from `useWallet()` — never
 * `wagmi`'s `useAccount` directly, the same rule that hook's own doc
 * comment already establishes.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useWallet } from "@/lib/hooks/useWallet";
import { fetchHoldings, fetchHoldingsFresh } from "@/lib/hooks/holdingsActions";
import { isHoldingsSupportedChain } from "@/lib/holdings/chains";
import type { HoldingAsset, Holdings } from "@/lib/holdings/types";

export type UsePortfolioResult = {
  assets: HoldingAsset[];
  totalValue: number;
  /** True only while the very first fetch for the currently-connected address/chain is in flight — never true again for that same address/chain, including on manual refresh (see `refreshing`). */
  loading: boolean;
  /** True while a fetch is in flight for an address/chain this hook already has data for (a background reconnect/chain-change re-fetch, or an explicit manual `refresh()`) — lets the UI show a subtle "updating" state instead of blanking already-real data. */
  refreshing: boolean;
  error: string | null;
  /** Whether the connected chain is one holdings discovery actually supports today (Base Mainnet only — see `lib/holdings/service.ts`'s own doc comment on why Base Sepolia isn't, yet). `true` while disconnected — there's honestly nothing to say no to yet. */
  chainSupported: boolean;
  /** `Holdings.partial` from the last successful fetch — true when at least one real data source failed, so `assets` may be incomplete. `false` while disconnected/never fetched. */
  partial: boolean;
  lastUpdated: string | null;
  refresh: () => void;
};

const EMPTY_RESULT: Pick<UsePortfolioResult, "assets" | "totalValue" | "partial"> = { assets: [], totalValue: 0, partial: false };

export function usePortfolio(): UsePortfolioResult {
  const { address, chainId, isConnected } = useWallet();

  const [holdings, setHoldings] = useState<Holdings | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Identifies which (address, chainId) pair `holdings`/an in-flight fetch
  // belongs to, so a fetch that resolves after the user has since
  // disconnected or switched accounts never overwrites newer state with a
  // stale result — the same "ignore a late response for state that's since
  // moved on" guard a manual `useEffect` fetch always needs.
  const requestKeyRef = useRef<string | null>(null);

  // `load` is intentionally memoized with an empty dependency array (see its
  // own comment) so it's never recreated — but that means a `holdings` value
  // closed over directly would go stale the moment `load` first runs,
  // permanently seeing whatever `holdings` was on the render `load` was
  // created (`null`). Confirmed live: without this ref, every manual
  // `refresh()` read the stale closed-over `null` and showed the full
  // loading skeleton instead of the lighter "refreshing" state, even with
  // real data already on screen. Kept in sync by the effect right below.
  const holdingsRef = useRef<Holdings | null>(null);

  // V3-WALLET-002A (Post-Implementation Review) — confirmed live: a real
  // rapid-fire burst (5 synchronous `refresh()` calls in the same tick, the
  // same failure mode a fast double-click or a broken input device can
  // produce) fired 5 independent server-action calls, each invalidating and
  // re-fetching, before React had ever re-rendered `disabled` onto the
  // button — a `disabled` attribute alone can't prevent this, since it only
  // takes effect after a render, not synchronously within the click that
  // caused it. This ref is checked synchronously, before either `setState`
  // call, so it closes that gap regardless of how many renders have
  // happened. Keyed by request key (not a bare boolean) so a genuinely
  // different target — a real account/chain switch arriving mid-fetch —
  // still starts immediately rather than being blocked by an unrelated
  // request's in-flight guard.
  const inFlightKeyRef = useRef<string | null>(null);

  const load = useCallback(
    async (targetAddress: string, targetChainId: number, isManualRefresh: boolean) => {
      const requestKey = `${targetAddress}:${targetChainId}`;
      if (inFlightKeyRef.current === requestKey) return;
      inFlightKeyRef.current = requestKey;
      requestKeyRef.current = requestKey;

      const currentHoldings = holdingsRef.current;
      const isFirstLoadForThisTarget =
        currentHoldings === null || currentHoldings.address.toLowerCase() !== targetAddress.toLowerCase() || currentHoldings.chainId !== targetChainId;
      if (isFirstLoadForThisTarget) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const result = isManualRefresh
          ? await fetchHoldingsFresh(targetAddress, targetChainId)
          : await fetchHoldings(targetAddress, targetChainId);
        if (requestKeyRef.current !== requestKey) return; // superseded by a newer request
        holdingsRef.current = result;
        setHoldings(result);
      } catch {
        if (requestKeyRef.current !== requestKey) return;
        setError("Couldn't load your holdings. Please try again.");
      } finally {
        if (inFlightKeyRef.current === requestKey) inFlightKeyRef.current = null;
        if (requestKeyRef.current === requestKey) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!address || !isConnected) {
      // Cancels any in-flight request via the ref check inside `load` —
      // no `setState` needed here: the public `return` below already
      // ignores `holdings`/`error` state entirely while disconnected, so
      // there's nothing stale for a lingering value to leak into view.
      requestKeyRef.current = null;
      return;
    }
    // `load` itself sets `loading`/`refreshing` synchronously before its own
    // first `await` (so a caller can tell a fetch has started in the same
    // tick it's requested) — calling it directly here would make this
    // effect body itself synchronously trigger a `setState`. `queueMicrotask`
    // defers that to the next microtask, the same "never a same-tick
    // setState at the top of an effect" rule `SplashScreen.tsx` already
    // established for this exact class of problem.
    queueMicrotask(() => load(address, chainId ?? 0, false));
    // Re-fetches exactly when the connected address or chain changes (reconnect / account switch / network switch) — never on an interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is stable (see its own comment); only `address`/`chainId`/`isConnected` should trigger a re-fetch.
  }, [address, chainId, isConnected]);

  const refresh = useCallback(() => {
    if (!address) return;
    load(address, chainId ?? 0, true);
  }, [address, chainId, load]);

  if (!isConnected || !address) {
    return { ...EMPTY_RESULT, loading: false, refreshing: false, error: null, chainSupported: true, lastUpdated: null, refresh };
  }

  return {
    assets: holdings?.assets ?? EMPTY_RESULT.assets,
    totalValue: holdings?.totalUsdValue ?? EMPTY_RESULT.totalValue,
    loading,
    refreshing,
    error,
    chainSupported: chainId !== undefined ? isHoldingsSupportedChain(chainId) : true,
    partial: holdings?.partial ?? EMPTY_RESULT.partial,
    lastUpdated: holdings?.fetchedAt ?? null,
    refresh,
  };
}
