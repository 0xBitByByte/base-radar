/**
 * Recent Searches storage — persists only query strings, never search
 * results or provider data (per the PR brief). Same versioned-localStorage
 * pattern as every other engine's storage layer this session
 * (`lib/notifications/storage.ts`, `lib/automation/rules.ts`): lazy
 * SSR-safe hydration, graceful recovery from malformed storage.
 */

import { getSearchPreferences } from "@/lib/search/preferences";

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

/**
 * Records `query` as a recent search — newest first, de-duplicated
 * case-insensitively, capped to the Maximum Recent Searches preference.
 * The Search History enabled/disabled preference is checked HERE, at the
 * storage layer, not the UI — a real kill switch, mirroring Automation's
 * pattern. Callers only ever call this after a real result was actually
 * selected from a non-empty query (see `CommandPalette.tsx`'s
 * `navigateTo`), so "only store queries that produced results" holds by
 * construction — there is no result-less code path that reaches here.
 */
export function recordSearch(query: string): void {
  ensureHydrated();
  const trimmed = query.trim();
  if (!trimmed) return;
  if (!getSearchPreferences().enableSearchHistory) return;

  const deduped = recentSearches.filter((existing) => existing.toLowerCase() !== trimmed.toLowerCase());
  const maxSize = getSearchPreferences().maxRecentSearches;
  recentSearches = [trimmed, ...deduped].slice(0, maxSize);
  persist();
  notify();
}

export function clearSearchHistory(): void {
  ensureHydrated();
  if (recentSearches.length === 0) return;
  recentSearches = [];
  persist();
  notify();
}

export function subscribeToRecentSearches(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
