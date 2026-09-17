/**
 * Dashboard widget visibility — PR-093.04 (Dashboard Customization). Same
 * `localStorage` read/write-with-a-version-guard shape every other
 * preference module in this app uses (`lib/notifications/preferences.ts`
 * is the closest sibling): SSR-safe, falls back to the honest default
 * (nothing hidden) on any corrupted/foreign/unknown-id value rather than
 * throwing, plus a small in-memory cache and listener set so
 * `lib/hooks/useDashboardLayoutPreferences.ts` can bind to it with
 * `useSyncExternalStore`.
 *
 * Deliberately a hidden-id *set*, not a full layout/order record — this
 * slice is show/hide only, never drag-reorder: `app/dashboard/page.tsx`'s
 * three tiers ("Your Intelligence" / "Market Signals" / "Ecosystem
 * Overview") are a deliberate, documented editorial grouping (see that
 * file's own tier comments), not a flat, freely-reorderable list, so
 * reordering is out of scope for this slice.
 */

import { DASHBOARD_WIDGET_IDS, type DashboardWidgetId } from "@/lib/dashboard-layout/types";

function isDashboardWidgetId(value: unknown): value is DashboardWidgetId {
  return typeof value === "string" && (DASHBOARD_WIDGET_IDS as string[]).includes(value);
}

const DASHBOARD_LAYOUT_STORAGE_KEY = "base-radar:dashboard-layout-preferences";
const DASHBOARD_LAYOUT_VERSION = 1;

type PersistedDashboardLayoutPreferences = {
  version: number;
  hiddenWidgetIds: DashboardWidgetId[];
};

/**
 * Deliberately only checks the envelope shape (real version, real array of
 * strings) — never that every id is still a currently-known widget. A
 * future release retiring one widget shouldn't cost a user every other
 * real customization they made; `readPersistedHiddenWidgetIds()` below
 * filters out any now-unknown id afterward, one entry at a time, rather
 * than this function rejecting the whole stored value over it.
 */
function isValidPersistedPreferencesEnvelope(value: unknown): value is { version: number; hiddenWidgetIds: string[] } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedDashboardLayoutPreferences>;
  if (candidate.version !== DASHBOARD_LAYOUT_VERSION) return false;
  return Array.isArray(candidate.hiddenWidgetIds) && candidate.hiddenWidgetIds.every((id) => typeof id === "string");
}

/** SSR-safe and resilient to a corrupted/foreign value, or one naming a widget id that no longer exists, under this key — every failure mode falls back to the honest "nothing hidden" default rather than throwing or hiding a widget it can't identify. */
function readPersistedHiddenWidgetIds(): DashboardWidgetId[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!isValidPersistedPreferencesEnvelope(parsed)) return [];
    // Drop any stored id for a widget that no longer exists, rather than trusting stale data forever.
    return parsed.hiddenWidgetIds.filter(isDashboardWidgetId);
  } catch {
    return [];
  }
}

/** Best-effort — `localStorage.setItem` can throw (quota exceeded, private browsing); the in-memory cache stays correct for the rest of this tab's session even if it won't survive a refresh. */
function writePersistedHiddenWidgetIds(hiddenWidgetIds: DashboardWidgetId[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({ version: DASHBOARD_LAYOUT_VERSION, hiddenWidgetIds })
    );
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}

let cachedHiddenWidgetIds: DashboardWidgetId[] | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** The current hidden-id list — same array reference until a real change happens, so `useSyncExternalStore` never re-renders on an unrelated call. */
export function getHiddenWidgetIds(): DashboardWidgetId[] {
  if (!cachedHiddenWidgetIds) {
    cachedHiddenWidgetIds = readPersistedHiddenWidgetIds();
  }
  return cachedHiddenWidgetIds;
}

export function isWidgetHidden(id: DashboardWidgetId): boolean {
  return getHiddenWidgetIds().includes(id);
}

export function setWidgetHidden(id: DashboardWidgetId, hidden: boolean): void {
  const current = getHiddenWidgetIds();
  const currentlyHidden = current.includes(id);
  if (currentlyHidden === hidden) return;

  const next = hidden ? [...current, id] : current.filter((existing) => existing !== id);
  cachedHiddenWidgetIds = next;
  writePersistedHiddenWidgetIds(next);
  notify();
}

/** Registers `listener` to be called after a real visibility change — the exact shape `useSyncExternalStore` expects. */
export function subscribeToDashboardLayoutPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
