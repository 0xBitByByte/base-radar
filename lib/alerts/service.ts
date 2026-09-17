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
import { fetchAllProviderAlertsAction } from "@/lib/alerts/actions";
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
/**
 * PR-085.02 — the ecosystem-wide counterpart to `cachedIntelligenceAlerts`
 * above: the exact same pure `buildIntelligenceAlerts()`, just fed
 * `cachedAllAlerts` (every registry project, unfiltered by Watchlist —
 * `fetchAllProviderAlerts()`'s own providers already scan the whole
 * registry, e.g. `lib/alerts/providers/coingecko.ts`'s bulk
 * `getBaseEcosystemMarkets()` call) instead of `cachedVisibleAlerts`. No
 * new provider call, no new scoring — one more cached derived view of data
 * this module already fetches once. Powers the Executive Dashboard's
 * ecosystem-wide Opportunities/Risks widgets (`getEcosystemIntelligenceAlerts()`
 * below), which need "what's happening across all of Base," not "what the
 * viewer happens to be watching."
 */
let cachedEcosystemIntelligenceAlerts: IntelligenceAlert[] = buildIntelligenceAlerts(cachedAllAlerts);

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
  cachedEcosystemIntelligenceAlerts = buildIntelligenceAlerts(cachedAllAlerts);
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
 * V1-FIX-003 — the real state this module was missing: every reader could
 * already tell "empty" apart from nothing (`liveAlertContent.length === 0`),
 * but never "empty because still loading" apart from "empty because the
 * fetch genuinely failed" apart from "empty because there's genuinely
 * nothing today." `"loading"` is the correct default on both the server and
 * the client's first render (`getServerSnapshot()`, `useAlertRefreshStatus.ts`
 * mirrors this) — real content only ever replaces it once `refreshAlerts()`
 * actually resolves, one way or the other, never optimistically.
 */
export type AlertRefreshStatus = "loading" | "ready" | "error";
let refreshStatus: AlertRefreshStatus = "loading";

/** Read by `lib/hooks/useAlertRefreshStatus.ts` so a UI (the AI Command Center) can render a skeleton/error state instead of guessing from empty data alone. */
export function getAlertRefreshStatus(): AlertRefreshStatus {
  return refreshStatus;
}

/**
 * Fetches live alerts from every provider and replaces this service's
 * content — a one-time (per call) content refresh, never a poll. Safe to
 * call again in the future (e.g. a manual "Refresh"/"Retry" control); each
 * call simply re-runs the same `Promise.allSettled` pass, recomputes every
 * derived view (including the Watchlist-filtered ones), and re-notifies.
 *
 * V1-FIX-003 — sets and notifies `refreshStatus` at every stage (`"loading"`
 * immediately, so a Retry call re-shows a skeleton; `"ready"` or `"error"`
 * once the real result is known).
 *
 * V1-FIX-006B — in-flight de-duplication: real, instrumented measurement
 * (not assumption) showed this module gets re-instantiated by Turbopack's
 * dev-mode HMR mid-page-load, and separately that a plain page reload
 * before a prior slow refresh finished left multiple real 12-26s
 * `fetchAllProviderAlertsAction()` Server Action calls running concurrently
 * on the same dev-server process — the direct cause of observed 100+ second
 * page loads. `refreshPromiseInFlight` makes the "only one refresh at a
 * time" behavior this function's own docs already assumed, actually true:
 * any caller arriving while one is already running gets the SAME promise
 * instead of starting a second one. This does not (and cannot) prevent a
 * dev-only HMR module re-instantiation from starting a fresh attempt — that
 * creates a genuinely new module instance with its own fresh state, which
 * is expected Turbopack dev behavior, not an application bug — but it does
 * eliminate the same-instance double-call cases (the Retry button firing
 * while an auto-triggered refresh is still pending, for one) and needs
 * pairing with the provider-level timeout below, which bounds how long
 * ANY single attempt — HMR-restarted or not — can run.
 */
let refreshPromiseInFlight: Promise<void> | null = null;

function refreshAlertsOnce(): Promise<void> {
  return (async () => {
    refreshStatus = "loading";
    notify();
    try {
      const alerts = await fetchAllProviderAlertsAction();
      liveAlertContent = alerts;
      refreshStatus = "ready";
      recomputeDerived();
    } catch {
      // A rejected promise here means every provider failed AND
      // `fetchAllProviderAlerts`'s own `Promise.allSettled` somehow still
      // threw, which shouldn't happen in practice — but if it does, this is
      // a real, honest failure, not a silently-empty "nothing to show" state.
      refreshStatus = "error";
    }
    notify();
  })();
}

export function refreshAlerts(): Promise<void> {
  if (refreshPromiseInFlight) return refreshPromiseInFlight;
  const promise = refreshAlertsOnce().finally(() => {
    refreshPromiseInFlight = null;
  });
  refreshPromiseInFlight = promise;
  return promise;
}

// Kicked off once, automatically, the first time this module is imported
// (i.e. the first time any component calls a hook built on this service).
// `refreshAlerts()` no longer rejects (see its own doc comment above), so
// there is nothing left for a `.catch()` here to actually catch — kept
// only as a defensive no-op in case that ever changes.
//
// Deferred rather than starting synchronously here: module evaluation
// happens during the page's initial hydration, and a fast Server Action
// round trip (common in dev) could resolve `refreshAlerts()`'s internal
// `notify()` call while React is still mid-hydration — a real, confirmed
// console warning ("Can't perform a React state update on a component that
// hasn't mounted yet"), since a subscriber's fiber can be rendered but not
// yet committed at that exact moment. A single macrotask (`setTimeout(0)`)
// was tried first and confirmed, live, NOT sufficient — React's own
// scheduler yields hydration work across multiple macrotasks too for a page
// this size, so a bare `setTimeout(0)` can still land inside one of those
// gaps. A double `requestAnimationFrame` is the standard, verifiable
// "the browser has actually painted a frame" signal (unlike a timer, which
// only measures elapsed ticks) — by the time the *second* rAF callback
// runs, every pending synchronous and scheduler-queued render/commit from
// the first paint has necessarily already flushed to the DOM, so starting
// the fetch here can no longer race the initial mount. Confirmed live:
// console is clean across repeated fresh reloads after this change. Same
// "once, automatically, on first load" behavior either way — just no
// longer timed by guesswork.
//
// PR-090.05 defect fix — `requestAnimationFrame` never fires while the
// document is hidden (a backgrounded/minimized tab, or a page opened in a
// background tab), which left `refreshStatus` permanently stuck at its
// initial `"loading"` value for the entire life of that page load: this
// double-rAF chain would simply never run, so nothing ever called
// `refreshAlerts()` at all — not a slow fetch, a fetch that never started.
// Confirmed live: `useExecutiveReports`'s status gate
// (`alertRefreshStatus === "loading" ? "checking" : ...`) is the one real
// consumer that hard-blocks its entire UI on this ever resolving, which is
// what surfaced it — `/dashboard/alerts`/`/dashboard/ai-workspace` don't
// gate on this flag, so they rendered fine regardless. Fix: run the exact
// same, already-verified double-rAF trigger immediately when the document
// is already visible (100% unchanged behavior for the common case), and
// otherwise wait for the real `visibilitychange` event that fires when a
// hidden document becomes visible before running it — never relying on
// rAF alone to ever fire.
if (typeof window !== "undefined") {
  const startDoubleRafRefresh = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void refreshAlerts().catch(() => {
          // Intentionally swallowed — see `refreshAlerts()`'s own doc comment.
        });
      });
    });
  };

  if (document.visibilityState === "visible") {
    startDoubleRafRefresh();
  } else {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onVisible);
      startDoubleRafRefresh();
    };
    document.addEventListener("visibilitychange", onVisible);
  }
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

/**
 * PR-085.02 — the ecosystem-wide counterpart to `getIntelligenceAlerts()`
 * above, for the Executive Dashboard's Opportunities/Risks widgets. Same
 * array-reference-stability contract for `useSyncExternalStore`
 * (`lib/hooks/useEcosystemIntelligenceAlerts.ts`).
 */
export function getEcosystemIntelligenceAlerts(): IntelligenceAlert[] {
  return cachedEcosystemIntelligenceAlerts;
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
