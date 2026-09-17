"use client";

/**
 * PR-095.06 (Roles & Permissions) — client binding for the real,
 * protected `/api/admin/roles*` routes. Same shape `useAdminRegistry`
 * already established: local `useState`, four honest states, a real
 * mutation that replaces local state with the server's own real returned
 * snapshot on success and leaves it untouched on rejection — never an
 * optimistic update, never a fabricated role change shown before the
 * server actually confirmed it.
 */

import { useCallback, useEffect, useState } from "react";

import type { EffectiveAccountRole } from "@/lib/admin/roles";

export type AdminRolesState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; accounts: EffectiveAccountRole[] };

export type ChangeRoleResult = { ok: true } | { ok: false; error: string };

function isSnapshot(data: Partial<{ accounts: EffectiveAccountRole[] }>): data is { accounts: EffectiveAccountRole[] } {
  return Array.isArray(data.accounts);
}

/** This browser's own real IANA time zone — same real, standard runtime value `useAdminRegistry` already reports for its own mutations. */
function clientTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

async function fetchAdminRoles(): Promise<AdminRolesState> {
  try {
    const response = await fetch("/api/admin/roles", { credentials: "same-origin" });
    if (response.status === 401) return { status: "unauthenticated" };
    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };

    const data = (await response.json()) as Partial<{ accounts: EffectiveAccountRole[] }>;
    if (!isSnapshot(data)) return { status: "error" };
    return { status: "ready", accounts: data.accounts };
  } catch {
    return { status: "error" };
  }
}

export function useAdminRoles() {
  const [state, setState] = useState<AdminRolesState>({ status: "loading" });

  const load = useCallback(async (cancelledRef: { current: boolean }) => {
    setState({ status: "loading" });
    const result = await fetchAdminRoles();
    if (!cancelledRef.current) setState(result);
  }, []);

  useEffect(() => {
    const cancelledRef = { current: false };
    // Deferred via `queueMicrotask` — the same "never a same-tick setState
    // at the top of an effect" shape every other admin hook already
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

  const changeRole = useCallback(async (accountId: string, role: string): Promise<ChangeRoleResult> => {
    try {
      const timeZone = clientTimeZone();
      const response = await fetch(`/api/admin/roles/${encodeURIComponent(accountId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", ...(timeZone ? { "x-client-timezone": timeZone } : {}) },
        credentials: "same-origin",
        body: JSON.stringify({ role }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; snapshot?: { accounts: EffectiveAccountRole[] } };

      if (!response.ok) {
        return { ok: false, error: body.error ?? "Something went wrong changing this role." };
      }
      if (body.snapshot && isSnapshot(body.snapshot)) setState({ status: "ready", accounts: body.snapshot.accounts });
      return { ok: true };
    } catch {
      return { ok: false, error: "Something went wrong changing this role." };
    }
  }, []);

  return { state, retry, changeRole };
}
