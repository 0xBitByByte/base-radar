/**
 * Notification Engine — the pipeline entry point (PR19 Part 1).
 * `buildNotifications` is a pure function: same `Timeline` in, same
 * `Notification[]` out, every time — no fetching, no caching, no
 * `Date.now()` (exactly like `lib/timeline/engine.ts`'s `buildTimeline`).
 * `storage.ts` is the only place that actually calls `getTimeline()`.
 *
 * This is NOT a fourth data-generating engine — every notification is a
 * direct reshape of one already-built `TimelineEvent`, never a recompute of
 * Timeline, Portfolio Intelligence, Daily Brief, AI Intelligence, or the
 * Alert Engine.
 *
 * The pipeline:
 *   1. Map every `TimelineEvent` to a `Notification` (type/priority/icon
 *      lookups, deep link and metadata carried over unchanged).
 *   2. De-duplicate by id.
 *   3. Stable sort descending by timestamp (newest first).
 */

import { TIMELINE_EVENT_ICON } from "@/components/timeline/TimelineEventBadge";
import type { Notification, NotificationPriority, NotificationType } from "@/lib/notifications/types";
import type { Timeline, TimelineEvent } from "@/lib/timeline/types";

/**
 * Centralized type → priority mapping, per the PR brief's own table.
 * Security is the one type promoted to `"critical"` (a real security risk
 * warrants standing out above everything else); Alert and Opportunity are
 * `"high"` (the two most actionable per-project signal types); Governance/
 * Development/TVL are `"medium"` (informational per-project activity);
 * every aggregate-level roll-up type (Narrative, Recommendation,
 * Portfolio, Daily Brief) is `"low"` (a summary the user can catch up on
 * later, not an event demanding immediate attention).
 */
export const NOTIFICATION_PRIORITY_BY_TYPE: Record<NotificationType, NotificationPriority> = {
  security: "critical",
  alert: "high",
  opportunity: "high",
  governance: "medium",
  development: "medium",
  tvl: "medium",
  narrative: "low",
  recommendation: "low",
  portfolio: "low",
  "daily-brief": "low",
};

/**
 * Reuses the Intelligence Timeline's own `TIMELINE_EVENT_ICON` directly
 * (`components/timeline/TimelineEventBadge.tsx`) rather than defining a
 * second icon map — Notification types are the exact same union as
 * Timeline event types, so this is the one centralized source, never
 * duplicated iconography.
 */
export const NOTIFICATION_ICON_BY_TYPE = TIMELINE_EVENT_ICON;

function toNotification(event: TimelineEvent): Notification {
  return {
    id: `notification:${event.id}`,
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
    readAt: null,
    isRead: false,
    title: event.title,
    summary: event.summary,
    type: event.eventType,
    severity: event.severity,
    source: event.source,
    projectId: event.projectId,
    projectName: event.projectName,
    link: event.link,
    icon: NOTIFICATION_ICON_BY_TYPE[event.eventType],
    priority: NOTIFICATION_PRIORITY_BY_TYPE[event.eventType],
    timestamp: event.timestamp,
    metadata: event.metadata,
  };
}

/**
 * Defensive de-duplication by `id` — `Timeline.events` is already deduped
 * by `dedupeEventsById`, and namespacing every id with `notification:`
 * preserves that uniqueness, but "no duplicate ids" is enforced directly
 * here rather than only assumed. First occurrence wins.
 */
function dedupeNotificationsById(notifications: Notification[]): Notification[] {
  const seen = new Set<string>();
  const deduped: Notification[] = [];
  for (const notification of notifications) {
    if (seen.has(notification.id)) continue;
    seen.add(notification.id);
    deduped.push(notification);
  }
  return deduped;
}

/** Stable — notifications with an identical timestamp keep their original relative order rather than being shuffled. */
function sortNotificationsByTimestampDescending(notifications: Notification[]): Notification[] {
  return [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** The one public entry point for turning a `Timeline` into `Notification[]`. Pure — never calls `getTimeline()` itself; `storage.ts` supplies it. */
export function buildNotifications(timeline: Timeline): Notification[] {
  const notifications = timeline.events.map(toNotification);
  const deduped = dedupeNotificationsById(notifications);
  return sortNotificationsByTimestampDescending(deduped);
}
