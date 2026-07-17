/**
 * The Watchlist's public API — framework-agnostic (no React import), so
 * `lib/hooks/useWatchlist.ts` is the only place that knows this is backed
 * by React at all. Owns one in-memory `cached` snapshot as the source of
 * truth for every read; every mutation updates it optimistically (before
 * `writeWatchlist` even runs) and notifies subscribers synchronously, so a
 * `WatchButton` click is reflected everywhere in the app on the same tick —
 * no round trip, no router refresh.
 *
 * Swapping `storage.ts` for a real API later doesn't change anything here:
 * `addProject`/`removeProject`/`toggleProject`/`clear` are already `async`
 * (today resolving immediately over a synchronous `localStorage` write),
 * exactly the shape a network-backed implementation would need.
 */

import { WATCHLIST_VERSION } from "@/lib/watchlist/constants";
import { readWatchlist, writeWatchlist } from "@/lib/watchlist/storage";
import type { Watchlist } from "@/lib/watchlist/types";

let cached: Watchlist = readWatchlist();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function persist(next: Watchlist): void {
  cached = next;
  writeWatchlist(next);
  notify();
}

/** The current snapshot — same object reference until the next mutation, so `useSyncExternalStore` never re-renders on an unrelated call. */
export function getWatchlist(): Watchlist {
  return cached;
}

export function isWatching(projectId: string): boolean {
  return cached.items.some((item) => item.projectId === projectId);
}

export function count(): number {
  return cached.items.length;
}

export async function addProject(projectId: string): Promise<void> {
  if (isWatching(projectId)) return; // duplicate-safe
  persist({
    version: WATCHLIST_VERSION,
    items: [...cached.items, { projectId, addedAt: new Date().toISOString() }],
  });
}

export async function removeProject(projectId: string): Promise<void> {
  if (!isWatching(projectId)) return;
  persist({
    version: WATCHLIST_VERSION,
    items: cached.items.filter((item) => item.projectId !== projectId),
  });
}

export async function toggleProject(projectId: string): Promise<void> {
  return isWatching(projectId) ? removeProject(projectId) : addProject(projectId);
}

export async function clear(): Promise<void> {
  persist({ version: WATCHLIST_VERSION, items: [] });
}

/** Registers `listener` to be called after every mutation; returns the unsubscribe function — the exact shape `useSyncExternalStore` expects. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
