/**
 * Alert Engine's provider-agnostic service layer. Owns one in-memory cache
 * per derived view (all four are already-merged, pinned-first/newest-first
 * sorted `Alert[]`/`WatchlistProjectAlertInfo[]`) as the sole source of
 * truth for every read, recomputed only on a real mutation, a real content
 * refresh, or a Watchlist change — never on every call — so repeated calls
 * to `getAlerts()`/`getVisibleAlerts()`/etc. return the SAME array
 * reference between changes, required for `useSyncExternalStore`
 * (`lib/hooks/useAlerts.ts`, `useVisibleAlerts.ts`, ...) to avoid
 * re-rendering (or infinite-looping) on every call.
 *
 * PR15.2 — Live Provider Alerts. Alert CONTENT (title, summary, category,
 * severity, timestamp, source) comes from `lib/alerts/providers` (GitHub,
 * Snapshot, CoinGecko, DefiLlama, Blockscout) via `fetchAllProviderAlerts()`,
 * not `lib/alerts/mock.ts`'s `MOCK_ALERTS`. This file is the ONLY place
 * that knows that — every UI component, every hook, and every other
 * function in this module keeps working against the same `Alert[]` shape
 * whether that content is mock or live. `mock.ts` itself is untouched and
 * still exported for tests/demos; it's simply not read by
 * `computeAllAlerts()`/`computeAlertsForWatchlist()` below. There is no
 * polling, no websocket, no cron, and no backend: `refreshAlerts()` runs
 * the five providers (via `fetchAllProviderAlerts()`, itself a
 * `Promise.allSettled` over each provider so one failing source never
 * blocks the others) exactly ONCE, kicked off automatically the first
 * time this module loads. The page's very first render still shows
 * whatever the synchronous cache holds (empty, until that fetch resolves)
 * — never a fabricated placeholder — and swaps to real content silently,
 * through the exact same `recomputeDerived`/`notify` path a mutation or a
 * Watchlist change already uses. A future PR wanting a manual "Refresh"
 * affordance only needs to call the already-exported `refreshAlerts()`
 * again; the machinery below doesn't change.
 *
 * PR15.1 — Watchlist integration. `computeVisibleAlerts` filters the
 * current live content down to projects the user is actually watching AND
 * hasn't muted via `alertEnabledByProject` — every UI surface that should
 * honor "only watched projects" (the Alerts page, the Sidebar badge, the
 * Topbar bell) reads from `getVisibleAlerts()`/`useVisibleAlerts()`, never
 * `getAlerts()` directly. `getAlerts()` itself stays the unfiltered set —
 * every current alert, overlay-merged, regardless of Watchlist state —
 * kept for any future caller that genuinely wants that. Because
 * visibility depends on the Watchlist too, this module subscribes to
 * `watchlistService.subscribe` once at load time so watching/unwatching a
 * project anywhere in the app immediately recomputes and re-notifies,
 * exactly like a local mutation or a provider refresh would.
 *
 * Per-alert user state (read/pinned/dismissed) and per-project alert
 * preference (`alertEnabledByProject`) both live in a separate sparse
 * overlay (`lib/alerts/storage.ts`), merged onto whatever the current
 * content is on every read. Because every provider gives a stable,
 * deterministic `id` to the same real-world fact (see
 * `lib/alerts/providers/shared.ts`), a user's read/pinned/dismissed state
 * survives a `refreshAlerts()` re-fetch exactly like it would survive any
 * other recomputation.
 */

import { getProject } from "@/data/projects/helpers";
import { fetchAllProviderAlerts } from "@/lib/alerts/providers";
import { ALERTS_VERSION } from "@/lib/alerts/constants";
import { buildIntelligenceAlerts, SEVERITY_RANK } from "@/lib/alerts/intelligence/engine";
import type { IntelligenceAlert, NarrativeType } from "@/lib/alerts/intelligence/types";
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
import * as personalizationStorage from "@/lib/personalization/storage";

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

/** Pinned first, then newest first — the one baseline ordering every filter/sort in the UI starts from. Unfiltered by Watchlist membership — this is `getAlerts()`'s cache. `content` is whatever `liveAlertContent` currently holds (live provider alerts), never `MOCK_ALERTS`. */
function computeAllAlerts(content: Alert[], state: AlertsState): Alert[] {
  return content
    .filter((alert) => state.overlay[alert.id]?.dismissed !== true)
    .map((alert) => mergeOverlay(alert, state.overlay[alert.id]))
    .sort(pinnedThenNewestFirst);
}

/** Alerts belonging to a currently-watched project — ignores each project's `alertEnabledByProject` mute toggle, so `getWatchlistProjectsWithAlerts()` can still report a real `alertCount` for a project the user has muted. */
function computeAlertsForWatchlist(content: Alert[], state: AlertsState): Alert[] {
  const watchedIds = new Set(personalizationStorage.getMembershipProjectIds());
  return content
    .filter((alert) => watchedIds.has(alert.projectId))
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

  return personalizationStorage.getMembershipProjectIds().map((projectId) => ({
    projectId,
    projectName: getProject(projectId)?.name ?? projectId,
    alertsEnabled: state.alertEnabledByProject[projectId] !== false,
    alertCount: countByProject.get(projectId) ?? 0,
  }));
}

/** The real alert content this service currently knows about — empty until `refreshAlerts()` first resolves, then whatever the five providers most recently returned. Never `MOCK_ALERTS`. */
let liveAlertContent: Alert[] = [];
let overlayState: AlertsState = readAlertsState();
let cachedAllAlerts: Alert[] = computeAllAlerts(liveAlertContent, overlayState);
let cachedAlertsForWatchlist: Alert[] = computeAlertsForWatchlist(liveAlertContent, overlayState);
let cachedVisibleAlerts: Alert[] = computeVisibleAlerts(overlayState, cachedAlertsForWatchlist);
let cachedWatchlistProjectsWithAlerts: WatchlistProjectAlertInfo[] = computeWatchlistProjectsWithAlerts(
  overlayState,
  cachedAlertsForWatchlist
);
/**
 * PR15.3 Part 1 — AI Alert Intelligence. Built from `cachedVisibleAlerts`
 * (Watchlist-visible, not-muted alerts), never the unfiltered set: the
 * whole point is fewer, smarter signals for what the user actually
 * watches, not a summary of alerts they'd never see anyway. Purely
 * derived — `lib/alerts/intelligence/engine.ts`'s `buildIntelligenceAlerts`
 * is a pure function, so this is just another cached view recomputed
 * alongside the other four in `recomputeDerived()`.
 */
let cachedIntelligenceAlerts: IntelligenceAlert[] = buildIntelligenceAlerts(cachedVisibleAlerts);

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Recomputes every cached derived view from the current overlay state + live content — called after a local mutation (`persist`), a content refresh (`refreshAlerts`), or an external Watchlist change, so all three triggers stay in sync through one code path. */
function recomputeDerived(): void {
  cachedAllAlerts = computeAllAlerts(liveAlertContent, overlayState);
  cachedAlertsForWatchlist = computeAlertsForWatchlist(liveAlertContent, overlayState);
  cachedVisibleAlerts = computeVisibleAlerts(overlayState, cachedAlertsForWatchlist);
  cachedWatchlistProjectsWithAlerts = computeWatchlistProjectsWithAlerts(overlayState, cachedAlertsForWatchlist);
  cachedIntelligenceAlerts = buildIntelligenceAlerts(cachedVisibleAlerts);
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
personalizationStorage.subscribe(() => {
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

/**
 * Fetches live alerts from every provider and replaces this service's
 * content — a one-time (per call) content refresh, never a poll. Safe to
 * call again in the future (e.g. from a manual "Refresh" control); each
 * call simply re-runs the same `Promise.allSettled` pass, recomputes every
 * derived view (including the Watchlist-filtered ones), and re-notifies.
 */
export async function refreshAlerts(): Promise<void> {
  const alerts = await fetchAllProviderAlerts();
  liveAlertContent = alerts;
  recomputeDerived();
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

/** Every current alert, overlay-merged — NOT filtered by Watchlist membership. Kept for any future caller that genuinely wants the unfiltered set. UI that should respect "only watched projects" must use `getVisibleAlerts()` instead. */
export function getAlerts(): Alert[] {
  return cachedAllAlerts;
}

/** Watched AND not muted — the filtered feed every visibility-sensitive surface (Alerts page, Sidebar badge, Topbar bell) reads from. Same array reference until the next relevant mutation (alert state, content refresh, OR Watchlist change). */
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

/**
 * PR15.3 — one rolled-up, deterministic executive summary per watched
 * project, built from `getVisibleAlerts()`'s current alert set. Same array
 * reference until the next relevant recomputation. Read by
 * `lib/hooks/useIntelligenceAlerts.ts` (Part 2's UI layer) and, in turn, by
 * the Alerts page, Dashboard widget, and Sidebar sparkle indicator.
 */
export function getIntelligenceAlerts(): IntelligenceAlert[] {
  return cachedIntelligenceAlerts;
}

export function markRead(id: string): void {
  setOverlay(id, { read: true });
}

export function markUnread(id: string): void {
  setOverlay(id, { read: false });
}

/**
 * Marks only the currently VISIBLE alerts read — not every alert. Marking
 * an alert the user was never shown (an unwatched or muted project) would
 * be a silent side effect: watch that project later and its alerts would
 * already read as "read" without the user ever having seen them.
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

/** Removes an alert from every feed without deleting it from `liveAlertContent` — reversible in principle (clearing the overlay key would restore it), matching "Dismissed state" in the persistence spec. */
export function dismiss(id: string): void {
  setOverlay(id, { dismissed: true });
}

/** Registers `listener` to be called after every mutation, content refresh, or Watchlist change; returns the unsubscribe function — the exact shape `useSyncExternalStore` expects. */
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

/**
 * PR15.3 Part 3 — the filter/search layer for the Alerts page's Intelligence
 * section. Both `filterIntelligenceAlerts` and `sortIntelligenceAlerts`
 * mirror `filterAlerts`/`sortAlerts` above exactly: pure functions over an
 * already-built `IntelligenceAlert[]`, never touching
 * `buildIntelligenceAlerts`/`cachedIntelligenceAlerts` — filtering an
 * already-scored list is not the same operation as rescoring one, and this
 * module keeps them separate on purpose.
 *
 * `severityTier` reuses each alert's own real `severity` field (the exact
 * value its `SeverityBadge` already renders) rather than inventing a
 * separate numeric threshold — filtering by a value the user can already
 * see on the card is more honest than filtering by a hidden derived tier
 * that doesn't visibly correspond to anything. The UI layer
 * (`components/alerts/meta.ts`'s `SEVERITY_FILTER_LABEL`) is the only place
 * that relabels `warning`/`success`/`info` as "High"/"Medium"/"Low" for
 * display; the underlying value never changes.
 */
export type IntelligenceFilterOptions = {
  severityTier?: AlertSeverity | "all";
  narrative?: NarrativeType | "all";
  projectId?: string | "all";
  /** Case-insensitive substring match against project name, headline, summary, and narrative label. Empty/undefined matches everything. */
  search?: string;
};

function matchesIntelligenceSearch(alert: IntelligenceAlert, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const haystack = `${alert.projectName} ${alert.headline} ${alert.summary} ${alert.narrative}`.toLowerCase();
  return haystack.includes(normalizedQuery);
}

/** Pure — never mutates, never reorders beyond removing non-matching entries. */
export function filterIntelligenceAlerts(
  alerts: IntelligenceAlert[],
  options: IntelligenceFilterOptions
): IntelligenceAlert[] {
  const normalizedQuery = options.search?.trim().toLowerCase() ?? "";

  return alerts.filter((alert) => {
    if (options.severityTier && options.severityTier !== "all" && alert.severity !== options.severityTier) {
      return false;
    }
    if (options.narrative && options.narrative !== "all" && alert.narrative !== options.narrative) return false;
    if (options.projectId && options.projectId !== "all" && alert.projectId !== options.projectId) return false;
    if (!matchesIntelligenceSearch(alert, normalizedQuery)) return false;
    return true;
  });
}

export type IntelligenceSortOrder = "newest" | "confidence" | "score" | "severity";

/** Pure — `buildIntelligenceAlerts` already sorts by score, so `"score"` here is a no-op re-sort for the common case; kept explicit rather than assumed so the other three orders have a real counterpart to reset to. */
export function sortIntelligenceAlerts(alerts: IntelligenceAlert[], order: IntelligenceSortOrder): IntelligenceAlert[] {
  const sorted = [...alerts];
  switch (order) {
    case "newest":
      return sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    case "confidence":
      return sorted.sort((a, b) => b.confidence - a.confidence);
    case "severity":
      return sorted.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
    case "score":
    default:
      return sorted.sort((a, b) => b.score - a.score);
  }
}
