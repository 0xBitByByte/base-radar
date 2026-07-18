"use client";

/**
 * React binding for `lib/brief/storage.ts`'s `getDailyBrief()` — a
 * `useSyncExternalStore` hook, same pattern every Alert Engine hook already
 * uses. There's no dedicated Brief subscribe/notify pair: the Daily Brief
 * only ever changes when `getIntelligenceAlerts()` does, so this
 * subscribes to the SAME listener set `lib/alerts/service.ts` already
 * exposes (`subscribe`) — one real change source, not a second one. Safe
 * for `useSyncExternalStore` because `getDailyBrief()` is itself cached: it
 * returns the SAME `DailyBrief` reference between calls unless the
 * underlying Intelligence Alerts actually changed.
 *
 * `getServerSnapshot` returns `null` (never a real, dated brief) — matches
 * every other Alert Engine hook's `EMPTY_*` server snapshot, avoiding a
 * hydration mismatch between the server's render and the client's first
 * paint; the client re-renders with the real cached brief immediately
 * after mount.
 */

import { useSyncExternalStore } from "react";

import { subscribe } from "@/lib/alerts/service";
import { getDailyBrief } from "@/lib/brief/storage";
import type { DailyBrief } from "@/lib/brief/types";

function getServerSnapshot(): DailyBrief | null {
  return null;
}

export function useDailyBrief(): DailyBrief | null {
  return useSyncExternalStore(subscribe, getDailyBrief, getServerSnapshot);
}
