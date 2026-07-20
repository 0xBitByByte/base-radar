/**
 * Personalization preferences — the settings surface for the whole
 * Personalization Layer (PR22 Part 3), covering both PR22 Part 2's
 * Dashboard-filtering flag and three newer, presentation-only toggles:
 * whether Global Search prioritizes active-watchlist projects, whether the
 * active watchlist is remembered across sessions, and whether the
 * `WatchlistSelector` shows in the Topbar at all. None of these flags
 * change engine behavior or search scoring — they only gate whether
 * already-built PR22 Part 2 features (dashboard filtering, search
 * prioritization, the Topbar selector) are active, exactly the same "kill
 * switch over a feature that already works" shape Automation's master
 * preference (PR20 Part 3) established.
 *
 * Same versioned-localStorage envelope, lazy SSR-safe hydration shape as
 * every other preferences module — but recovery is field-by-field rather
 * than all-or-nothing: a persisted object from an older version (missing
 * the three new fields) or a partially-corrupted object (one bad field)
 * still recovers every field it can validate, falling back to the default
 * only for what's missing or invalid, rather than discarding the whole
 * record. Missing storage and unparsable JSON both fall back to defaults
 * entirely — there's nothing to salvage there.
 */

export type PersonalizationPreferences = {
  /** Scopes the Dashboard and every intelligence page to the active watchlist (PR22 Part 2). */
  filterDashboardByActiveWatchlist: boolean;
  /** Lets Global Search break score ties in favor of active-watchlist projects (PR22 Part 2) — never hides non-watchlist results, and never changes scoring itself. */
  enableSearchPrioritization: boolean;
  /** Persists the active watchlist selection across page loads. When off, the app starts each session with no active watchlist rather than restoring the last one. */
  rememberActiveWatchlist: boolean;
  /** Shows the `WatchlistSelector` in the Topbar. Dashboard personalization keeps working when this is off — the selector is just a convenience, not the only way to change the active watchlist (`/dashboard/watchlists` always has one). */
  showWatchlistSelectorInTopbar: boolean;
};

export const DEFAULT_PERSONALIZATION_PREFERENCES: PersonalizationPreferences = {
  filterDashboardByActiveWatchlist: true,
  enableSearchPrioritization: true,
  rememberActiveWatchlist: true,
  showWatchlistSelectorInTopbar: true,
};

const PERSONALIZATION_PREFERENCES_STORAGE_KEY = "base-radar:personalization-preferences";
const PERSONALIZATION_PREFERENCES_VERSION = 2;

type PersistedPersonalizationPreferences = {
  version: number;
  preferences: Partial<PersonalizationPreferences>;
};

/** Recovers whatever individual boolean fields are present and valid, defaulting every other field — never rejects the whole record over one bad or missing field. */
function sanitizePreferences(value: unknown): PersonalizationPreferences {
  if (typeof value !== "object" || value === null) return DEFAULT_PERSONALIZATION_PREFERENCES;
  const candidate = value as Partial<Record<keyof PersonalizationPreferences, unknown>>;
  const sanitized = { ...DEFAULT_PERSONALIZATION_PREFERENCES };
  for (const key of Object.keys(DEFAULT_PERSONALIZATION_PREFERENCES) as (keyof PersonalizationPreferences)[]) {
    if (typeof candidate[key] === "boolean") sanitized[key] = candidate[key] as boolean;
  }
  return sanitized;
}

let preferences: PersonalizationPreferences = DEFAULT_PERSONALIZATION_PREFERENCES;
let hydrated = false;

function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(PERSONALIZATION_PREFERENCES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<PersistedPersonalizationPreferences> | null;
    if (typeof parsed !== "object" || parsed === null) return;
    preferences = sanitizePreferences(parsed.preferences);
  } catch {
    // Intentionally swallowed — a corrupted value just means starting from defaults.
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PERSONALIZATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ version: PERSONALIZATION_PREFERENCES_VERSION, preferences })
    );
  } catch {
    // Intentionally swallowed.
  }
}

const listeners = new Set<() => void>();
function notify(): void {
  for (const listener of listeners) listener();
}

export function getPersonalizationPreferences(): PersonalizationPreferences {
  ensureHydrated();
  return preferences;
}

export function setPersonalizationPreferences(patch: Partial<PersonalizationPreferences>): void {
  ensureHydrated();
  preferences = { ...preferences, ...patch };
  persist();
  notify();
}

export function resetPersonalizationPreferences(): void {
  ensureHydrated();
  preferences = DEFAULT_PERSONALIZATION_PREFERENCES;
  persist();
  notify();
}

export function subscribeToPersonalizationPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
