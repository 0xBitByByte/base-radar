/**
 * Alert Engine's local, provider-agnostic service layer — the mock/local
 * analog of `lib/watchlist/service.ts`, same shape deliberately. Owns one
 * in-memory cache (the already-merged, pinned-first/newest-first sorted
 * `Alert[]`) as the sole source of truth for every read, recomputed only
 * on a real mutation (mark read/unread, pin/unpin, dismiss) so repeated
 * calls to `getAlerts()` return the SAME array reference between
 * mutations — required for `useSyncExternalStore`
 * (`lib/hooks/useAlerts.ts`) to avoid re-rendering (or infinite-looping)
 * on every call.
 *
 * `MOCK_ALERTS` (`lib/alerts/mock.ts`) is the alert CONTENT (title,
 * summary, category, severity, timestamp, source) — immutable, never
 * written back to. Per-alert user state (read/pinned/dismissed) lives in a
 * separate sparse overlay keyed by alert id (`lib/alerts/storage.ts`),
 * merged onto the mock content on every read. This mirrors the
 * Watchlist's storage/service split and keeps persisted payloads tiny
 * even as the mock alert list grows.
 *
 * A future PR replacing mock data with a real provider only needs to
 * change what `MOCK_ALERTS` resolves to (or add an async `refresh()` that
 * re-fetches and calls `persist`) — the overlay/merge/subscribe/filter/
 * sort machinery below is already shaped for that; no UI component built
 * on `lib/hooks/useAlerts.ts` would need to change.
 */

import { ALERTS_VERSION } from "@/lib/alerts/constants";
import { MOCK_ALERTS } from "@/lib/alerts/mock";
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
function computeAlerts(state: AlertsState): Alert[] {
  return MOCK_ALERTS.filter((alert) => state.overlay[alert.id]?.dismissed !== true)
    .map((alert) => mergeOverlay(alert, state.overlay[alert.id]))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}

let overlayState: AlertsState = readAlertsState();
let cachedAlerts: Alert[] = computeAlerts(overlayState);
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function persist(next: AlertsState): void {
  overlayState = next;
  cachedAlerts = computeAlerts(next);
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

/** The current snapshot — same array reference until the next mutation. */
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

/** Removes an alert from every feed without deleting its mock content — reversible in principle (clearing the overlay key would restore it), matching "Dismissed state" in the persistence spec. */
export function dismiss(id: string): void {
  setOverlay(id, { dismissed: true });
}

/** Registers `listener` to be called after every mutation; returns the unsubscribe function — the exact shape `useSyncExternalStore` expects. */
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
