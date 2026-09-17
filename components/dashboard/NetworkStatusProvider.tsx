"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

import { useLiveNetworkStatus, type LiveNetworkStatus } from "@/lib/hooks/useLiveNetworkStatus";

/**
 * PR-107 — Base RPC polling consolidation. Before this file existed,
 * `Topbar` (mounted once per `/dashboard/*` page via `DashboardLayout`),
 * `ProfileNetworkLive` (Project Profile), and `MarketWidgetLive`
 * (`/dashboard`'s Market widget) each called `useLiveNetworkStatus()`
 * directly — three independent `usePolling` instances, each with its own
 * 45s `setInterval` and its own immediate on-mount poll, all hitting the
 * exact same `getBaseNetworkStatus()` call. On `/dashboard/projects/[slug]`
 * specifically (Topbar + ProfileNetworkLive both mounted) this meant 2
 * separate Base RPC requests every 45s from one browser tab where 1 would
 * do — confirmed live in the PR-106/106.1 audits.
 *
 * This Provider is the ONE remaining caller of `useLiveNetworkStatus` —
 * that hook itself is untouched, still fully valid, just no longer called
 * from more than one place. Every existing consumer now reads the shared
 * result via `useSharedNetworkStatus()` instead of polling independently.
 * `usePolling`'s own tab-visibility pause/resume and null-on-failure
 * (never fabricated, never thrown) behavior is inherited unchanged, since
 * it's the same hook, called once.
 *
 * Deliberately no `initial` seed here (unlike the old per-consumer calls,
 * two of which passed one): every current consumer already falls back to
 * its own real SSR-rendered props whenever `status` is `null` (see
 * `ProfileNetworkLive`'s `status?.gasGwei ?? gasGwei` and
 * `MarketWidgetLive`'s `status ? {...data, ...status} : data`) — so the
 * first paint is identical either way, and this Provider doesn't need to
 * know any one page's particular SSR shape to seed correctly. This also
 * means exactly one immediate poll fires on mount (matching the old
 * Topbar's own always-unseeded behavior), not the confusing mix of
 * seeded/unseeded first polls the three separate call sites used to have.
 */

export type NetworkStatusContextValue = {
  status: LiveNetworkStatus | null;
  updatedAt: number | null;
};

const NO_PROVIDER_VALUE: NetworkStatusContextValue = { status: null, updatedAt: null };

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);

/** Dev-only guard (requirement: "prevent accidental nested providers from creating multiple pollers") — a second mount would mean a second `usePolling` timer, silently reintroducing the exact duplication this file exists to remove. Never throws (a thrown error here would be worse than the duplication it's warning about) and is a no-op in production. */
let mountedProviderCount = 0;

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const warnedRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    mountedProviderCount += 1;
    if (mountedProviderCount > 1 && !warnedRef.current) {
      warnedRef.current = true;
      console.warn(
        "<NetworkStatusProvider> is mounted more than once in this tree — each instance starts its own Base RPC polling loop, exactly the duplication PR-107 removed. Mount it once, at the dashboard layout."
      );
    }
    return () => {
      mountedProviderCount -= 1;
    };
  }, []);

  const { status, updatedAt } = useLiveNetworkStatus();
  const value = useMemo<NetworkStatusContextValue>(() => ({ status, updatedAt }), [status, updatedAt]);

  return <NetworkStatusContext.Provider value={value}>{children}</NetworkStatusContext.Provider>;
}

/**
 * Graceful, never-throwing accessor — unlike `useWalletData()`'s "throw if
 * missing" contract (right for wallet data, where showing stale/wrong data
 * would be actively misleading), a consumer rendered outside
 * `<NetworkStatusProvider>` (an isolated test, e.g.) simply sees
 * `{status: null, updatedAt: null}` — precisely the same shape
 * `usePolling` already returns before its first successful poll, so every
 * existing consumer's already-built "Reconnecting"/SSR-fallback rendering
 * handles it with no new code path.
 */
export function useSharedNetworkStatus(): NetworkStatusContextValue {
  return useContext(NetworkStatusContext) ?? NO_PROVIDER_VALUE;
}
