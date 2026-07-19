/**
 * Automation preferences — a single master on/off switch for the whole
 * Automation System, `localStorage`-backed with the same
 * read/write-with-a-version-guard shape `lib/notifications/preferences.ts`
 * uses (SSR-safe, falls back to `DEFAULT_AUTOMATION_PREFERENCES` rather
 * than throwing on a corrupted or foreign value under this key), plus a
 * small in-memory cache and listener set so
 * `lib/hooks/useAutomationPreferences.ts` can bind to it with
 * `useSyncExternalStore`.
 */

export type AutomationPreferences = {
  /** When `false`, `lib/automation/storage.ts`'s `getAutomationResults()` returns an empty array without evaluating any rule — a real kill switch, not a decorative one. */
  enabled: boolean;
};

export const DEFAULT_AUTOMATION_PREFERENCES: AutomationPreferences = { enabled: true };

const AUTOMATION_PREFERENCES_STORAGE_KEY = "base-radar:automation-preferences";
const AUTOMATION_PREFERENCES_VERSION = 1;

type PersistedAutomationPreferences = {
  version: number;
  preferences: AutomationPreferences;
};

function isValidAutomationPreferences(value: unknown): value is PersistedAutomationPreferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedAutomationPreferences>;
  if (candidate.version !== AUTOMATION_PREFERENCES_VERSION) return false;
  if (typeof candidate.preferences !== "object" || candidate.preferences === null) return false;
  return typeof (candidate.preferences as AutomationPreferences).enabled === "boolean";
}

/** SSR-safe and resilient to a corrupted/foreign value under this key — either case falls back to the defaults rather than throwing. */
function readPersistedPreferences(): AutomationPreferences {
  if (typeof window === "undefined") return DEFAULT_AUTOMATION_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(AUTOMATION_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_AUTOMATION_PREFERENCES;
    const parsed = JSON.parse(raw);
    return isValidAutomationPreferences(parsed) ? parsed.preferences : DEFAULT_AUTOMATION_PREFERENCES;
  } catch {
    return DEFAULT_AUTOMATION_PREFERENCES;
  }
}

/** Best-effort — `localStorage.setItem` can throw (quota exceeded, private browsing), in which case the in-memory cache is still correct for the rest of this tab's session even though it won't survive a refresh. */
function writePersistedPreferences(preferences: AutomationPreferences): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      AUTOMATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ version: AUTOMATION_PREFERENCES_VERSION, preferences })
    );
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}

let cachedPreferences: AutomationPreferences | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** The one public entry point — same reference returned until a real preference change happens. */
export function getAutomationPreferences(): AutomationPreferences {
  if (!cachedPreferences) {
    cachedPreferences = readPersistedPreferences();
  }
  return cachedPreferences;
}

export function setAutomationEnabled(enabled: boolean): void {
  const current = getAutomationPreferences();
  if (current.enabled === enabled) return;

  const next = { ...current, enabled };
  cachedPreferences = next;
  writePersistedPreferences(next);
  notify();
}

/** Registers `listener` to be called after a preference change — the exact shape `useSyncExternalStore` expects. */
export function subscribeToAutomationPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
