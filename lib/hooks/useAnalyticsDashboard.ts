"use client";

/**
 * PR-097.03 (Observability — Analytics) — client binding for the real,
 * protected `/api/observability/analytics` route. Same shape
 * `usePerformanceDashboard`/`useAdminActivity` already established: local
 * `useState`, four honest states, the server's real authorization
 * decision is the only thing that ever determines whether real data
 * renders. Read-only — there is no mutation here.
 */

import { useCallback, useEffect, useState } from "react";

import type { AnalyticsSummary } from "@/lib/backend/sqlite/analyticsEvents";

export type AnalyticsDashboardState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; summary: AnalyticsSummary };

function isSummary(data: Partial<AnalyticsSummary>): data is AnalyticsSummary {
  return typeof data.totalPageViews === "number" && Array.isArray(data.topPaths);
}

async function fetchAnalyticsSummary(): Promise<AnalyticsDashboardState> {
  try {
    const response = await fetch("/api/observability/analytics", { credentials: "same-origin" });
    if (response.status === 401) return { status: "unauthenticated" };
    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };

    const data = (await response.json()) as Partial<AnalyticsSummary>;
    if (!isSummary(data)) return { status: "error" };
    return { status: "ready", summary: data };
  } catch {
    return { status: "error" };
  }
}

export function useAnalyticsDashboard() {
  const [state, setState] = useState<AnalyticsDashboardState>({ status: "loading" });

  const load = useCallback(async (cancelledRef: { current: boolean }) => {
    setState({ status: "loading" });
    const result = await fetchAnalyticsSummary();
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
