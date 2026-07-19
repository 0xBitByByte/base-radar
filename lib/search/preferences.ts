/**
 * Global Search preferences — production-readiness layer (PR21 Part 3).
 * Mirrors `lib/notifications/preferences.ts` / `lib/automation/preferences.ts`
 * exactly: a versioned localStorage envelope, lazy SSR-safe hydration, and
 * graceful recovery from malformed or missing storage (falls back to
 * `DEFAULT_SEARCH_PREFERENCES`, never throws).
 */

export type SearchPreferences = {
  /** Whether the Command Palette shows a "Recent Searches" section at all. */
  enableRecentSearches: boolean;
  /** Cap on how many recent queries are kept, clamped to [1, 50]. */
  maxRecentSearches: number;
  /** Whether new queries get recorded into Recent Searches storage. Checked at the storage layer (`lib/search/storage.ts`), not the UI — a real kill switch. */
  enableSearchHistory: boolean;
  /** Master toggle for the ⌘K / Ctrl+K shortcut. The Topbar's mouse trigger always works regardless of this setting. */
  enableKeyboardShortcut: boolean;
};

export const DEFAULT_SEARCH_PREFERENCES: SearchPreferences = {
  enableRecentSearches: true,
  maxRecentSearches: 10,
  enableSearchHistory: true,
  enableKeyboardShortcut: true,
};

const MIN_MAX_RECENT_SEARCHES = 1;
const MAX_MAX_RECENT_SEARCHES = 50;

const SEARCH_PREFERENCES_STORAGE_KEY = "base-radar:search-preferences";
const SEARCH_PREFERENCES_VERSION = 1;

type PersistedSearchPreferences = {
  version: number;
  preferences: SearchPreferences;
};

function isValidPreferences(value: unknown): value is SearchPreferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SearchPreferences>;
  return (
    typeof candidate.enableRecentSearches === "boolean" &&
    typeof candidate.maxRecentSearches === "number" &&
    Number.isFinite(candidate.maxRecentSearches) &&
    candidate.maxRecentSearches >= MIN_MAX_RECENT_SEARCHES &&
    candidate.maxRecentSearches <= MAX_MAX_RECENT_SEARCHES &&
    typeof candidate.enableSearchHistory === "boolean" &&
    typeof candidate.enableKeyboardShortcut === "boolean"
  );
}

function isValidPersisted(value: unknown): value is PersistedSearchPreferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedSearchPreferences>;
  return candidate.version === SEARCH_PREFERENCES_VERSION && isValidPreferences(candidate.preferences);
}

let preferences: SearchPreferences = DEFAULT_SEARCH_PREFERENCES;
let hydrated = false;

/** SSR-safe and resilient to a corrupted/foreign value under this key — runs once per session, the first time anything actually needs the preferences. */
function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(SEARCH_PREFERENCES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!isValidPersisted(parsed)) return;
    preferences = parsed.preferences;
  } catch {
    // Intentionally swallowed — a corrupted value just means starting from defaults.
  }
}

/** Best-effort — `localStorage.setItem` can throw (quota exceeded, private browsing); the in-memory value stays correct for the rest of this tab's session even if it won't survive a refresh. */
function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SEARCH_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ version: SEARCH_PREFERENCES_VERSION, preferences })
    );
  } catch {
    // Intentionally swallowed.
  }
}

const listeners = new Set<() => void>();
function notify(): void {
  for (const listener of listeners) listener();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The one public entry point for reading preferences — same reference returned until a real change happens, satisfying `useSyncExternalStore`. */
export function getSearchPreferences(): SearchPreferences {
  ensureHydrated();
  return preferences;
}

export function setSearchPreferences(patch: Partial<SearchPreferences>): void {
  ensureHydrated();
  const next: SearchPreferences = { ...preferences, ...patch };
  if (typeof patch.maxRecentSearches === "number") {
    next.maxRecentSearches = clamp(Math.round(patch.maxRecentSearches), MIN_MAX_RECENT_SEARCHES, MAX_MAX_RECENT_SEARCHES);
  }
  preferences = next;
  persist();
  notify();
}

export function resetSearchPreferences(): void {
  ensureHydrated();
  preferences = DEFAULT_SEARCH_PREFERENCES;
  persist();
  notify();
}

export function subscribeToSearchPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
