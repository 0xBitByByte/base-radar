"use client";

/**
 * PR-097.03 (Observability — Performance Dashboards) — client binding for
 * the real, protected `/api/observability/performance` route. Same shape
 * `useAdminActivity`/`useAdminOverview` already established: local
 * `useState`, four honest states, the server's real authorization decision
 * is the only thing that ever determines whether real data renders.
 * Read-only — there is no mutation here.
 */

import { useCallback, useEffect, useState } from "react";

import type { PerformanceMetricSummary } from "@/lib/backend/sqlite/performanceMetrics";

export type PerformanceDashboardState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; summary: PerformanceMetricSummary[] };

async function fetchPerformanceSummary(): Promise<PerformanceDashboardState> {
  try {
    const response = await fetch("/api/observability/performance", { credentials: "same-origin" });
    if (response.status === 401) return { status: "unauthenticated" };
    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };

    const data = (await response.json()) as { summary?: PerformanceMetricSummary[] };
    if (!Array.isArray(data.summary)) return { status: "error" };
    return { status: "ready", summary: data.summary };
  } catch {
    return { status: "error" };
  }
}

export function usePerformanceDashboard() {
  const [state, setState] = useState<PerformanceDashboardState>({ status: "loading" });

  const load = useCallback(async (cancelledRef: { current: boolean }) => {
    setState({ status: "loading" });
    const result = await fetchPerformanceSummary();
    if (!cancelledRef.current) setState(result);
  }, []);

  useEffect(() => {
    const cancelledRef = { current: false };
    // Deferred via `queueMicrotask` — the same "never a same-tick setState
    // at the top of an effect" shape every other admin-style hook already
    // established.
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
