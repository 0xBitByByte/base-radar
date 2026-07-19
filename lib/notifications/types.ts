/**
 * Notification Engine (PR19 Part 1) — a presentation-ready aggregation
 * layer on top of the Intelligence Timeline, not a fifth intelligence
 * engine. A `Notification` is built entirely by reshaping an already-built
 * `TimelineEvent` (`lib/timeline/types.ts`) — it never re-derives scoring,
 * severity, or narrative detection, and never talks to a provider or any
 * engine below Timeline directly.
 */

import type { AlertSeverity } from "@/lib/alerts/types";
import type { TimelineEventType } from "@/lib/timeline/types";
import type { LucideIcon } from "lucide-react";

/**
 * Deliberately the exact same union as `TimelineEventType` — Notifications
 * never introduce a type Timeline doesn't already have, so this is a type
 * alias (single source of truth), not a parallel enum that could drift.
 */
export type NotificationType = TimelineEventType;

export const NOTIFICATION_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

/**
 * One user-facing notification. `projectId`/`projectName`/`severity` are
 * `null` for the same aggregate-level notification types where
 * `TimelineEvent` already carries `null` (Narrative, Recommendation,
 * Portfolio, Daily Brief) — never a fabricated placeholder.
 *
 * `createdAt`/`updatedAt`/`timestamp` are all sourced from the underlying
 * `TimelineEvent.timestamp` (the real moment the signal occurred) rather
 * than `Date.now()`: `buildNotifications` is a pure function with no
 * persisted notification history yet, so "when was this notification
 * created" has no truer answer than "when the event it represents
 * happened." `updatedAt` will diverge from `createdAt` once a later PR
 * introduces real mutation (e.g. marking read updates `updatedAt`); for
 * now they match by construction.
 */
export type Notification = {
  /** Deterministic — `notification:${event.id}`, so re-running `buildNotifications` on the same Timeline always yields the same ids. */
  id: string;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
  isRead: boolean;
  title: string;
  summary: string;
  type: NotificationType;
  severity: AlertSeverity | null;
  /** Short attribution, carried over from `TimelineEvent.source` unchanged (e.g. "AI Intelligence Engine", "Daily Brief", "Portfolio Intelligence"). */
  source: string;
  projectId: string | null;
  projectName: string | null;
  /** Carried over from `TimelineEvent.link` unchanged — the Notification Engine never computes its own routes. */
  link: string | null;
  icon: LucideIcon;
  priority: NotificationPriority;
  timestamp: string;
  /** Passed through from `TimelineEvent.metadata` unchanged — never a place to stash a fabricated value. */
  metadata: Record<string, unknown>;
};
