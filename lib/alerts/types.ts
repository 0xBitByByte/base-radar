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
  version: 1;
  /** Keyed by `Alert.id`. Sparse — an alert with no entry here has never been touched by the user and renders with its mock defaults. */
  overlay: Record<string, AlertOverlay>;
};

export type AlertStatusFilter = "all" | "unread" | "pinned";
export type AlertSortOrder = "newest" | "oldest";
