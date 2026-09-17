"use client";

/**
 * PR-095.01 (Admin Dashboard) — client binding for the real, protected
 * `/api/admin/overview` route. Local `useState`, the same shape
 * `useLinkedWallets` already established: this is a single-consumer read
 * (`AdminOverviewPage`), so there's no cross-component cache to justify
 * `useSyncExternalStore`'s shared-store machinery.
 *
 * Four honest states, never collapsed into a boolean "loading"/"data": a
 * Guest sees `"unauthenticated"`, a signed-in non-admin sees
 * `"forbidden"`, a genuine network/server failure sees `"error"` — real
 * metrics only ever render for `"ready"`. The real authorization decision
 * always happens server-side (`resolveAdminAccess`); this hook only ever
 * reflects what the server actually decided, never a client-side guess.
 */

import { useCallback, useEffect, useState } from "react";

import type { AdminOverviewMetrics } from "@/lib/backend/sqlite/adminMetrics";

export type AdminOverviewState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; metrics: AdminOverviewMetrics };

async function fetchAdminOverview(): Promise<AdminOverviewState> {
  try {
    const response = await fetch("/api/admin/overview", { credentials: "same-origin" });
    if (response.status === 401) return { status: "unauthenticated" };
    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };

    const data = (await response.json()) as { metrics?: AdminOverviewMetrics };
    if (!data.metrics) return { status: "error" };
    return { status: "ready", metrics: data.metrics };
  } catch {
    return { status: "error" };
  }
}

export function useAdminOverview() {
  const [state, setState] = useState<AdminOverviewState>({ status: "loading" });

  const load = useCallback(async (cancelledRef: { current: boolean }) => {
    setState({ status: "loading" });
    const result = await fetchAdminOverview();
    if (!cancelledRef.current) setState(result);
  }, []);

  useEffect(() => {
    const cancelledRef = { current: false };
    // Deferred via `queueMicrotask` — the same "never a same-tick setState
    // at the top of an effect" shape `useLinkedWallets`/`usePortfolio`
    // already established.
    queueMicrotask(() => void load(cancelledRef));
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  const retry = useCallback(() => {
    const cancelledRef = { current: false };
    void load(cancelledRef);
  }, [load]);

  return { state, retry };
}
