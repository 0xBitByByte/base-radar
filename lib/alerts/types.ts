/**
 * Alert Engine Foundation (PR15.0) — the shared alert model every future
 * PR (live generation, provider wiring, notification delivery) builds on.
 * This PR only ever produces `Alert`s from local mock data
 * (`lib/alerts/mock.ts`); nothing here assumes or requires a live source.
 *
 * Categories and severities follow this codebase's established
 * `as const` tuple + derived union convention (see `data/projects/enums.ts`)
 * rather than the TypeScript `enum` keyword — the values stay plain,
 * JSON-serializable strings (no runtime import needed to compare against a
 * persisted value) and the tuple itself can be iterated directly to build
 * filter option lists, exactly like every other enum-shaped value already
 * in this codebase.
 */

export const ALERT_CATEGORIES = [
  "governance",
  "release",
  "tvl",
  "liquidity",
  "whale",
  "security",
  "partnership",
  "listing",
  "upgrade",
  "ecosystem",
  "price",
  "community",
] as const;
export type AlertCategory = (typeof ALERT_CATEGORIES)[number];

export const ALERT_SEVERITIES = ["info", "success", "warning", "critical"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export type Alert = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  summary: string;
  category: AlertCategory;
  severity: AlertSeverity;
  /** ISO timestamp. */
  timestamp: string;
  read: boolean;
  pinned: boolean;
  /** Short attribution string (e.g. "GitHub", "Snapshot", "Registry") — display-only, never a live fetch target in this PR. */
  source: string;
  /** Internal route the card links to, e.g. the alert's project profile. Omitted when there's nowhere meaningful to send the reader. */
  actionUrl?: string;
};

/**
 * Per-alert user state, kept separate from the alert's own content
 * (`lib/alerts/mock.ts`) and merged on read — mirrors
 * `lib/watchlist`'s storage/service split. Only the fields a user can
 * actually change are here; everything else about an alert is immutable
 * content.
 */
export type AlertOverlay = {
  read?: boolean;
  pinned?: boolean;
  dismissed?: boolean;
};

export type AlertsState = {
  /** Bumped from `1` (PR15.0) to `2` (PR15.1) — old persisted blobs lack `alertEnabledByProject` and are discarded by `storage.ts` rather than silently treated as "everything enabled," which would be a guess, not a recovery. */
  version: 2;
  /** Keyed by `Alert.id`. Sparse — an alert with no entry here has never been touched by the user and renders with its mock defaults. */
  overlay: Record<string, AlertOverlay>;
  /**
   * Per-project alert preference (PR15.1) — keyed by `projectId`. Sparse:
   * a project with no entry here is enabled by default (`isAlertEnabled`
   * treats "absent" and "true" identically; only an explicit `false`
   * hides that project's alerts). Independent of Watchlist membership —
   * this only ever matters for a project that's also watched.
   */
  alertEnabledByProject: Record<string, boolean>;
};

export type AlertStatusFilter = "all" | "unread" | "pinned";
export type AlertSortOrder = "newest" | "oldest";

/** One watched project's alert-preference summary — what the Watchlist page's `AlertToggle` and the Alerts page's project filter both need, without either re-deriving it themselves. */
export type WatchlistProjectAlertInfo = {
  projectId: string;
  projectName: string;
  alertsEnabled: boolean;
  /** Count of non-dismissed mock alerts for this project, regardless of `alertsEnabled` — lets the Watchlist page show "3 alerts" even while toggled off. */
  alertCount: number;
};
