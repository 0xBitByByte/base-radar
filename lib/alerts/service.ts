/**
 * Alert Engine's provider-agnostic service layer. Owns one in-memory cache
 * (the already-merged, pinned-first/newest-first sorted `Alert[]`) as the
 * sole source of truth for every read, recomputed only on a real mutation
 * or a real content refresh — never on every call — so repeated calls to
 * `getAlerts()` return the SAME array reference between changes, required
 * for `useSyncExternalStore` (`lib/hooks/useAlerts.ts`) to avoid
 * re-rendering (or infinite-looping) on every call.
 *
 * PR15.2 — Live Provider Alerts. Alert CONTENT (title, summary, category,
 * severity, timestamp, source) now comes from `lib/alerts/providers`
 * (GitHub, Snapshot, CoinGecko, DefiLlama, Blockscout) instead of
 * `lib/alerts/mock.ts`'s `MOCK_ALERTS`. This file is the ONLY place that
 * knows that — every UI component, every hook, and every other function
 * in this module keeps working against the same `Alert[]` shape whether
 * that content is mock or live. `mock.ts` itself is untouched and still
 * exported for tests/demos; it's simply no longer read by
 * `computeAlerts()` below.
 *
 * There is no polling, no websocket, no cron, and no backend: `refreshAlerts()`
 * runs the five providers (via `fetchAllProviderAlerts()`, itself a
 * `Promise.allSettled` over each provider so one failing source never
 * blocks the others) exactly ONCE, kicked off automatically the first
 * time this module loads. The page's very first render still shows
 * whatever the synchronous cache holds (empty, until that fetch resolves)
 * — never a fabricated placeholder — and swaps to real content silently,
 * through the exact same `persist`/`notify` path a mutation already uses.
 * A future PR wanting a manual "Refresh" affordance only needs to call
 * the already-exported `refreshAlerts()` again; the machinery below
 * doesn't change.
 *
 * Per-alert user state (read/pinned/dismissed) lives in a separate sparse
 * overlay keyed by alert id (`lib/alerts/storage.ts`), merged onto
 * whatever the current content is on every read — unchanged from PR15.0.
 * Because every provider gives a stable, deterministic `id` to the same
 * real-world fact (see `lib/alerts/providers/shared.ts`), a user's read/
 * pinned/dismissed state survives a `refreshAlerts()` re-fetch exactly
 * like it would survive any other recomputation.
 */

import { fetchAllProviderAlerts } from "@/lib/alerts/providers";
import { ALERTS_VERSION } from "@/lib/alerts/constants";
import { readAlertsState, writeAlertsState } from "@/lib/alerts/storage";
import type {
  Alert,
  AlertCategory,
  AlertOverlay,
  AlertsState,
  AlertSeverity,
  AlertSortOrder,
  AlertStatusFilter,
} from "@/lib/alerts/types";

function mergeOverlay(base: Alert, overlay: AlertOverlay | undefined): Alert {
  if (!overlay) return base;
  return {
    ...base,
    read: overlay.read ?? base.read,
    pinned: overlay.pinned ?? base.pinned,
  };
}

/** Pinned first, then newest first — the one baseline ordering every filter/sort in the UI starts from. */
function computeAlerts(content: Alert[], state: AlertsState): Alert[] {
  return content
    .filter((alert) => state.overlay[alert.id]?.dismissed !== true)
    .map((alert) => mergeOverlay(alert, state.overlay[alert.id]))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}

/** The real alert content this service currently knows about — empty until `refreshAlerts()` first resolves, then whatever the five providers most recently returned. Never `MOCK_ALERTS`. */
let liveAlertContent: Alert[] = [];
let overlayState: AlertsState = readAlertsState();
let cachedAlerts: Alert[] = computeAlerts(liveAlertContent, overlayState);
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function persist(next: AlertsState): void {
  overlayState = next;
  cachedAlerts = computeAlerts(liveAlertContent, next);
  writeAlertsState(next);
  notify();
}

function setOverlay(id: string, patch: AlertOverlay): void {
  const current = overlayState.overlay[id] ?? {};
  persist({
    version: ALERTS_VERSION,
    overlay: { ...overlayState.overlay, [id]: { ...current, ...patch } },
  });
}

/**
 * Fetches live alerts from every provider and replaces this service's
 * content — a one-time (per call) content refresh, never a poll. Safe to
 * call again in the future (e.g. from a manual "Refresh" control); each
 * call simply re-runs the same `Promise.allSettled` pass and re-notifies.
 */
export async function refreshAlerts(): Promise<void> {
  const alerts = await fetchAllProviderAlerts();
  liveAlertContent = alerts;
  cachedAlerts = computeAlerts(liveAlertContent, overlayState);
  notify();
}

// Kicked off once, automatically, the first time this module is imported
// (i.e. the first time any component calls a hook built on this service).
// Fire-and-forget: a rejected promise here would mean every provider
// failed AND `fetchAllProviderAlerts`'s own `Promise.allSettled` somehow
// still threw, which shouldn't happen; the `catch` is defensive only.
if (typeof window !== "undefined") {
  void refreshAlerts().catch(() => {
    // Intentionally swallowed — a failed refresh just leaves
    // `liveAlertContent` empty; the UI's existing empty state handles that
    // honestly, never a fabricated fallback.
  });
}

/** The current snapshot — same array reference until the next mutation or refresh. */
export function getAlerts(): Alert[] {
  return cachedAlerts;
}

export function markRead(id: string): void {
  setOverlay(id, { read: true });
}

export function markUnread(id: string): void {
  setOverlay(id, { read: false });
}

export function markAllRead(): void {
  const nextOverlay: Record<string, AlertOverlay> = { ...overlayState.overlay };
  for (const alert of cachedAlerts) {
    nextOverlay[alert.id] = { ...nextOverlay[alert.id], read: true };
  }
  persist({ version: ALERTS_VERSION, overlay: nextOverlay });
}

export function pin(id: string): void {
  setOverlay(id, { pinned: true });
}

export function unpin(id: string): void {
  setOverlay(id, { pinned: false });
}

export function togglePin(id: string): void {
  const alert = cachedAlerts.find((item) => item.id === id);
  if (!alert) return;
  setOverlay(id, { pinned: !alert.pinned });
}

/** Removes an alert from every feed without deleting it from `liveAlertContent` — reversible in principle (clearing the overlay key would restore it), matching "Dismissed state" in the persistence spec. */
export function dismiss(id: string): void {
  setOverlay(id, { dismissed: true });
}

/** Registers `listener` to be called after every mutation or content refresh; returns the unsubscribe function — the exact shape `useSyncExternalStore` expects. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type AlertFilterOptions = {
  status?: AlertStatusFilter;
  severity?: AlertSeverity | "all";
  category?: AlertCategory | "all";
  projectId?: string | "all";
};

/** Pure — never mutates or reorders beyond removing non-matching entries; sorting is a separate step (`sortAlerts`). */
export function filterAlerts(alerts: Alert[], options: AlertFilterOptions): Alert[] {
  return alerts.filter((alert) => {
    if (options.status === "unread" && alert.read) return false;
    if (options.status === "pinned" && !alert.pinned) return false;
    if (options.severity && options.severity !== "all" && alert.severity !== options.severity) return false;
    if (options.category && options.category !== "all" && alert.category !== options.category) return false;
    if (options.projectId && options.projectId !== "all" && alert.projectId !== options.projectId) return false;
    return true;
  });
}

/** Pure. Pinned alerts stay first regardless of sort order — matches `computeAlerts`'s own baseline ordering, `sortAlerts` only changes the direction within each group. */
export function sortAlerts(alerts: Alert[], order: AlertSortOrder): Alert[] {
  const byTimestamp = [...alerts].sort((a, b) => {
    const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    return order === "newest" ? -diff : diff;
  });
  return byTimestamp.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
}
