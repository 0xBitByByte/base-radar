/**
 * Recent Searches storage — persists only query strings, never search
 * results or provider data (per the PR brief). Same versioned-localStorage
 * pattern as every other engine's storage layer this session
 * (`lib/notifications/storage.ts`, `lib/automation/rules.ts`): lazy
 * SSR-safe hydration, graceful recovery from malformed storage.
 *
 * PR-094.01 (Recent Searches Cross-Device Sync) — `recordSearch()`/
 * `clearSearchHistory()` now optionally enqueue a real Sync operation when
 * the caller supplies the real, authenticated account id, the exact same
 * `authAccountId`-parameter shape `lib/account/service.ts`'s
 * `updateAccount()` already established — never enqueued when the caller
 * doesn't, which keeps every existing Guest-only caller's behavior
 * completely unchanged. `applyRemoteRecentSearches()` applies a real
 * pulled remote list directly, the same bypass-the-queue shape
 * `applyRemoteAccountFields()` already established, so a pull can never
 * re-trigger a push of the state it just received.
 */

import { getSearchPreferences } from "@/lib/search/preferences";
import { searchSyncAdapter, RECENT_SEARCHES_ENTITY_ID } from "@/lib/sync/adapters/search";
import { enqueueOperation, performSync } from "@/lib/sync/service";

const RECENT_SEARCHES_STORAGE_KEY = "base-radar:search-recent";
const RECENT_SEARCHES_VERSION = 1;

type PersistedRecentSearches = {
  version: number;
  queries: string[];
};

function isValidPersisted(value: unknown): value is PersistedRecentSearches {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedRecentSearches>;
  return (
    candidate.version === RECENT_SEARCHES_VERSION &&
    Array.isArray(candidate.queries) &&
    candidate.queries.every((query) => typeof query === "string")
  );
}

let recentSearches: string[] = [];
let hydrated = false;

function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!isValidPersisted(parsed)) return;
    recentSearches = parsed.queries;
  } catch {
    // Intentionally swallowed — a corrupted value just means starting empty.
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RECENT_SEARCHES_STORAGE_KEY,
      JSON.stringify({ version: RECENT_SEARCHES_VERSION, queries: recentSearches })
    );
  } catch {
    // Intentionally swallowed.
  }
}

const listeners = new Set<() => void>();
function notify(): void {
  for (const listener of listeners) listener();
}

/** Same reference returned until a real mutation happens — satisfies `useSyncExternalStore`. */
export function getRecentSearches(): string[] {
  ensureHydrated();
  return recentSearches;
}

/** The Sync Queue/Engine don't need to know *which* account — only the caller (gated on a real `authAccountId` being present) decides whether to call this at all. */
function enqueueRecentSearchesSync(): void {
  enqueueOperation(searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: recentSearches }));
  void performSync();
}

/**
 * Records `query` as a recent search — newest first, de-duplicated
 * case-insensitively, capped to the Maximum Recent Searches preference.
 * The Search History enabled/disabled preference is checked HERE, at the
 * storage layer, not the UI — a real kill switch, mirroring Automation's
 * pattern. Callers only ever call this after a real result was actually
 * selected from a non-empty query (see `CommandPalette.tsx`'s
 * `navigateTo`), so "only store queries that produced results" holds by
 * construction — there is no result-less code path that reaches here.
 *
 * `authAccountId`, when supplied, is the real, session-derived server
 * account id (never this file's own anonymous local list, which carries
 * no id at all) — when present, the updated list is also queued for real
 * Cloud Sync and an immediate push is attempted, the exact same pattern
 * `lib/account/service.ts`'s `updateAccount()` already established.
 */
export function recordSearch(query: string, authAccountId?: string): void {
  ensureHydrated();
  const trimmed = query.trim();
  if (!trimmed) return;
  if (!getSearchPreferences().enableSearchHistory) return;

  const deduped = recentSearches.filter((existing) => existing.toLowerCase() !== trimmed.toLowerCase());
  const maxSize = getSearchPreferences().maxRecentSearches;
  recentSearches = [trimmed, ...deduped].slice(0, maxSize);
  persist();
  notify();

  if (authAccountId) enqueueRecentSearchesSync();
}

export function clearSearchHistory(authAccountId?: string): void {
  ensureHydrated();
  if (recentSearches.length === 0) return;
  recentSearches = [];
  persist();
  notify();

  if (authAccountId) enqueueRecentSearchesSync();
}

/**
 * PR-094.01 — applies a real pulled remote Recent Searches list directly,
 * bypassing the Sync Queue entirely. Never called for a local edit — only
 * by `lib/hooks/useCloudSyncActivation.ts`, after `performPull()` has
 * already confirmed no unsynced local change conflicts with it. The list
 * is trusted as already-valid (query strings only, already capped
 * server-side to what was actually pushed) — this never re-applies the
 * maximum-history clamp itself, since the remote list already reflects a
 * real, previously-enforced cap from whichever device pushed it.
 */
export function applyRemoteRecentSearches(queries: string[]): void {
  ensureHydrated();
  recentSearches = queries;
  persist();
  notify();
}

export function subscribeToRecentSearches(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
