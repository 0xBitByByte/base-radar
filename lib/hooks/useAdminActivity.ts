"use client";

/**
 * PR-095.05 (Activity Logs) — client binding for the real, protected
 * `/api/admin/activity` route. Same shape `useAdminOverview`/
 * `useAdminRegistry` already established (PR-095.01/PR-095.02): local
 * `useState`, four honest states, the server's real authorization
 * decision is the only thing that ever determines whether real activity
 * data renders. Read-only — there is no mutation here, matching the
 * Activity Log's own append-only-by-construction backend.
 */

import { useCallback, useEffect, useState } from "react";

import type { ActivityLogEntry } from "@/lib/backend/sqlite/activityLog";

export type AdminActivityState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; activity: ActivityLogEntry[] };

async function fetchAdminActivity(): Promise<AdminActivityState> {
  try {
    const response = await fetch("/api/admin/activity", { credentials: "same-origin" });
    if (response.status === 401) return { status: "unauthenticated" };
    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };

    const data = (await response.json()) as { activity?: ActivityLogEntry[] };
    if (!Array.isArray(data.activity)) return { status: "error" };
    return { status: "ready", activity: data.activity };
  } catch {
    return { status: "error" };
  }
}

export function useAdminActivity() {
  const [state, setState] = useState<AdminActivityState>({ status: "loading" });

  const load = useCallback(async (cancelledRef: { current: boolean }) => {
    setState({ status: "loading" });
    const result = await fetchAdminActivity();
    if (!cancelledRef.current) setState(result);
  }, []);

  useEffect(() => {
    const cancelledRef = { current: false };
    // Deferred via `queueMicrotask` — the same "never a same-tick setState
    // at the top of an effect" shape `useAdminOverview`/`useAdminRegistry`
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
