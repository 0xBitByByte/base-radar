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
 * on `lib/hooks/useAlerts.ts` (or any of PR15.1's new hooks) would need to
 * change. UI never knows whether an `Alert` came from `MOCK_ALERTS` or a
 * real provider — it only ever sees the `Alert` shape.
 *
 * PR15.1 — Watchlist integration. `getAlerts()`/`getWatchlist()` are two
 * independent, pre-existing systems; this file is the one place that
 * combines them. `computeVisibleAlerts` filters `MOCK_ALERTS` down to
 * projects the user is actually watching AND hasn't muted via
 * `alertEnabledByProject` — every UI surface that should honor "only
 * watched projects" (the Alerts page, the Sidebar badge, the Topbar bell)
 * reads from `getVisibleAlerts()`/`useVisibleAlerts()`, never `getAlerts()`
 * directly. `getAlerts()` itself is UNCHANGED — still every mock alert,
 * overlay-merged, regardless of Watchlist state — kept for any future
 * caller that genuinely wants the unfiltered set. Because visibility now
 * depends on the Watchlist too, this module subscribes to
 * `watchlistService.subscribe` once at load time so watching/unwatching a
 * project anywhere in the app immediately recomputes and re-notifies,
 * exactly like a local mutation would.
 */

import { getProject } from "@/data/projects/helpers";
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
  WatchlistProjectAlertInfo,
} from "@/lib/alerts/types";
import * as watchlistService from "@/lib/watchlist/service";

function mergeOverlay(base: Alert, overlay: AlertOverlay | undefined): Alert {
  if (!overlay) return base;
  return {
    ...base,
    read: overlay.read ?? base.read,
    pinned: overlay.pinned ?? base.pinned,
  };
}

function pinnedThenNewestFirst(a: Alert, b: Alert): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
}

/** Pinned first, then newest first — the one baseline ordering every filter/sort in the UI starts from. Unfiltered by Watchlist membership — this is `getAlerts()`'s cache, unchanged in meaning from PR15.0. */
function computeAllAlerts(state: AlertsState): Alert[] {
  return MOCK_ALERTS.filter((alert) => state.overlay[alert.id]?.dismissed !== true)
    .map((alert) => mergeOverlay(alert, state.overlay[alert.id]))
    .sort(pinnedThenNewestFirst);
}

/** Alerts belonging to a currently-watched project — ignores each project's `alertEnabledByProject` mute toggle, so `getWatchlistProjectsWithAlerts()` can still report a real `alertCount` for a project the user has muted. */
function computeAlertsForWatchlist(state: AlertsState): Alert[] {
  const watchedIds = new Set(watchlistService.getWatchlist().items.map((item) => item.projectId));
  return MOCK_ALERTS.filter((alert) => watchedIds.has(alert.projectId))
    .filter((alert) => state.overlay[alert.id]?.dismissed !== true)
    .map((alert) => mergeOverlay(alert, state.overlay[alert.id]))
    .sort(pinnedThenNewestFirst);
}

/** The one list every visibility-sensitive UI surface reads from: watched AND not muted. "If a project is watched: show alerts. If not: hide alerts. No exceptions." */
function computeVisibleAlerts(state: AlertsState, alertsForWatchlist: Alert[]): Alert[] {
  return alertsForWatchlist.filter((alert) => state.alertEnabledByProject[alert.projectId] !== false);
}

function computeWatchlistProjectsWithAlerts(
  state: AlertsState,
  alertsForWatchlist: Alert[]
): WatchlistProjectAlertInfo[] {
  const countByProject = new Map<string, number>();
  for (const alert of alertsForWatchlist) {
    countByProject.set(alert.projectId, (countByProject.get(alert.projectId) ?? 0) + 1);
  }

  return watchlistService.getWatchlist().items.map((item) => ({
    projectId: item.projectId,
    projectName: getProject(item.projectId)?.name ?? item.projectId,
    alertsEnabled: state.alertEnabledByProject[item.projectId] !== false,
    alertCount: countByProject.get(item.projectId) ?? 0,
  }));
}

let overlayState: AlertsState = readAlertsState();
let cachedAllAlerts: Alert[] = computeAllAlerts(overlayState);
let cachedAlertsForWatchlist: Alert[] = computeAlertsForWatchlist(overlayState);
let cachedVisibleAlerts: Alert[] = computeVisibleAlerts(overlayState, cachedAlertsForWatchlist);
let cachedWatchlistProjectsWithAlerts: WatchlistProjectAlertInfo[] = computeWatchlistProjectsWithAlerts(
  overlayState,
  cachedAlertsForWatchlist
);

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Recomputes every cached derived view from the current overlay state — called after either a local mutation (`persist`) or an external Watchlist change, so both triggers stay in sync through one code path. */
function recomputeDerived(): void {
  cachedAllAlerts = computeAllAlerts(overlayState);
  cachedAlertsForWatchlist = computeAlertsForWatchlist(overlayState);
  cachedVisibleAlerts = computeVisibleAlerts(overlayState, cachedAlertsForWatchlist);
  cachedWatchlistProjectsWithAlerts = computeWatchlistProjectsWithAlerts(overlayState, cachedAlertsForWatchlist);
}

function persist(next: AlertsState): void {
  overlayState = next;
  recomputeDerived();
  writeAlertsState(next);
  notify();
}

// Watching/unwatching a project anywhere in the app changes what's
// visible here even though nothing in THIS module's own state changed —
// subscribed once, for this module's lifetime (same singleton-for-the-
// app's-life assumption `listeners` above already makes).
watchlistService.subscribe(() => {
  recomputeDerived();
  notify();
});

function setOverlay(id: string, patch: AlertOverlay): void {
  const current = overlayState.overlay[id] ?? {};
  persist({
    version: ALERTS_VERSION,
    overlay: { ...overlayState.overlay, [id]: { ...current, ...patch } },
    alertEnabledByProject: overlayState.alertEnabledByProject,
  });
}

/** Every mock alert, overlay-merged — NOT filtered by Watchlist membership. Unchanged from PR15.0; kept for any future caller that genuinely wants the unfiltered set. UI that should respect "only watched projects" must use `getVisibleAlerts()` instead. */
export function getAlerts(): Alert[] {
  return cachedAllAlerts;
}

/** Watched AND not muted — the filtered feed every visibility-sensitive surface (Alerts page, Sidebar badge, Topbar bell) reads from. Same array reference until the next relevant mutation (alert state OR Watchlist change). */
export function getVisibleAlerts(): Alert[] {
  return cachedVisibleAlerts;
}

/** Alerts for watched projects, ignoring each project's mute toggle — e.g. "this muted project still has 2 alerts waiting." */
export function getAlertsForWatchlist(): Alert[] {
  return cachedAlertsForWatchlist;
}

/** Absent (never toggled) and `true` are equivalent — a newly-watched project starts with alerts enabled. */
export function isAlertEnabled(projectId: string): boolean {
  return overlayState.alertEnabledByProject[projectId] !== false;
}

export function toggleProjectAlerts(projectId: string): void {
  const nextEnabled = !isAlertEnabled(projectId);
  persist({
    version: ALERTS_VERSION,
    overlay: overlayState.overlay,
    alertEnabledByProject: { ...overlayState.alertEnabledByProject, [projectId]: nextEnabled },
  });
}

/** One row per watched project — its resolved name (from the Project Registry, a pure sync lookup), current alert preference, and how many alerts are waiting for it regardless of that preference. What the Watchlist page's `AlertToggle` and the Alerts page's project filter both need. */
export function getWatchlistProjectsWithAlerts(): WatchlistProjectAlertInfo[] {
  return cachedWatchlistProjectsWithAlerts;
}

export function markRead(id: string): void {
  setOverlay(id, { read: true });
}

export function markUnread(id: string): void {
  setOverlay(id, { read: false });
}

/**
 * Marks only the currently VISIBLE alerts read — not every mock alert.
 * Marking an alert the user was never shown (an unwatched or muted
 * project) would be a silent side effect: watch that project later and
 * its alerts would already read as "read" without the user ever having
 * seen them.
 */
export function markAllRead(): void {
  const nextOverlay: Record<string, AlertOverlay> = { ...overlayState.overlay };
  for (const alert of cachedVisibleAlerts) {
    nextOverlay[alert.id] = { ...nextOverlay[alert.id], read: true };
  }
  persist({ version: ALERTS_VERSION, overlay: nextOverlay, alertEnabledByProject: overlayState.alertEnabledByProject });
}

export function pin(id: string): void {
  setOverlay(id, { pinned: true });
}

export function unpin(id: string): void {
  setOverlay(id, { pinned: false });
}

export function togglePin(id: string): void {
  const alert = cachedAllAlerts.find((item) => item.id === id);
  if (!alert) return;
  setOverlay(id, { pinned: !alert.pinned });
}

/** Removes an alert from every feed without deleting its mock content — reversible in principle (clearing the overlay key would restore it), matching "Dismissed state" in the persistence spec. */
export function dismiss(id: string): void {
  setOverlay(id, { dismissed: true });
}

/** Registers `listener` to be called after every mutation (local, or an external Watchlist change); returns the unsubscribe function — the exact shape `useSyncExternalStore` expects. */
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

/** Pure. Pinned alerts stay first regardless of sort order — matches every cached list's own baseline ordering; `sortAlerts` only changes the direction within each group. */
export function sortAlerts(alerts: Alert[], order: AlertSortOrder): Alert[] {
  const byTimestamp = [...alerts].sort((a, b) => {
    const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    return order === "newest" ? -diff : diff;
  });
  return byTimestamp.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
}
