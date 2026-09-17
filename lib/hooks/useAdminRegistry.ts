"use client";

/**
 * PR-095.02/PR-095.03 (Project Registry / Project Editor) — client
 * binding for the real, protected `/api/admin/registry` routes. Same
 * shape `useAdminOverview` already established (PR-095.01): local
 * `useState`, four honest states, the server's real authorization
 * decision is the only thing that ever determines whether real data
 * renders.
 *
 * `saveEdit`/`revertEdit` (PR-095.03) call the real, protected
 * `PATCH`/`DELETE` handlers at `/api/admin/registry/[projectId]`
 * (`resolveAdminAccess`, same boundary as every other admin request) —
 * on a genuine success, the snapshot those routes return (already
 * reflecting the real, persisted change) replaces local state directly,
 * so the UI updates immediately without a second round trip; on a
 * rejection (validation failure, disallowed field, not found), local
 * state is left completely untouched and the real server error is
 * returned to the caller to display — never silently swallowed, never
 * an optimistic update that could show something that didn't actually
 * persist.
 *
 * PR-095.05 (Activity Logs) — both mutators also send a real
 * `X-Client-Timezone` header: this browser's own genuine
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` (e.g.
 * "Asia/Kolkata"), the same real value every JS runtime already knows
 * about itself — contextual metadata for the Activity Log entry the
 * server records, never an identity claim (the acting admin is always
 * resolved server-side from the session, exactly as before).
 */

import { useCallback, useEffect, useState } from "react";

import type { AdminRegistrySnapshot } from "@/lib/admin/registry";
import type { ValidationIssue } from "@/data/projects/validation";

export type AdminRegistryState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; snapshot: AdminRegistrySnapshot };

export type SaveProjectEditResult =
  | { ok: true }
  | { ok: false; error: string; validationErrors?: ValidationIssue[] };

function isSnapshot(data: Partial<AdminRegistrySnapshot>): data is AdminRegistrySnapshot {
  return Boolean(data.metrics && data.validation && data.coverage && data.projects && data.edits);
}

/** This browser's own real IANA time zone — a standard, always-available runtime value, never fabricated. Falls back to `undefined` (the header is simply omitted) only in the near-impossible case `Intl` itself throws. */
function clientTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

async function fetchAdminRegistry(): Promise<AdminRegistryState> {
  try {
    const response = await fetch("/api/admin/registry", { credentials: "same-origin" });
    if (response.status === 401) return { status: "unauthenticated" };
    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };

    const data = (await response.json()) as Partial<AdminRegistrySnapshot>;
    if (!isSnapshot(data)) return { status: "error" };
    return { status: "ready", snapshot: data };
  } catch {
    return { status: "error" };
  }
}

export function useAdminRegistry() {
  const [state, setState] = useState<AdminRegistryState>({ status: "loading" });

  const load = useCallback(async (cancelledRef: { current: boolean }) => {
    setState({ status: "loading" });
    const result = await fetchAdminRegistry();
    if (!cancelledRef.current) setState(result);
  }, []);

  useEffect(() => {
    const cancelledRef = { current: false };
    // Deferred via `queueMicrotask` — the same "never a same-tick setState
    // at the top of an effect" shape `useAdminOverview`/`useLinkedWallets`
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

  const saveEdit = useCallback(async (projectId: string, patch: Record<string, unknown>): Promise<SaveProjectEditResult> => {
    try {
      const timeZone = clientTimeZone();
      const response = await fetch(`/api/admin/registry/${encodeURIComponent(projectId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", ...(timeZone ? { "x-client-timezone": timeZone } : {}) },
        credentials: "same-origin",
        body: JSON.stringify(patch),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; validationErrors?: ValidationIssue[]; snapshot?: AdminRegistrySnapshot };

      if (!response.ok) {
        return { ok: false, error: body.error ?? "Something went wrong saving this edit.", validationErrors: body.validationErrors };
      }
      if (body.snapshot && isSnapshot(body.snapshot)) setState({ status: "ready", snapshot: body.snapshot });
      return { ok: true };
    } catch {
      return { ok: false, error: "Something went wrong saving this edit." };
    }
  }, []);

  const revertEdit = useCallback(async (projectId: string): Promise<SaveProjectEditResult> => {
    try {
      const timeZone = clientTimeZone();
      const response = await fetch(`/api/admin/registry/${encodeURIComponent(projectId)}`, {
        method: "DELETE",
        headers: timeZone ? { "x-client-timezone": timeZone } : undefined,
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; snapshot?: AdminRegistrySnapshot };

      if (!response.ok) {
        return { ok: false, error: body.error ?? "Something went wrong reverting this edit." };
      }
      if (body.snapshot && isSnapshot(body.snapshot)) setState({ status: "ready", snapshot: body.snapshot });
      return { ok: true };
    } catch {
      return { ok: false, error: "Something went wrong reverting this edit." };
    }
  }, []);

  return { state, retry, saveEdit, revertEdit };
}
