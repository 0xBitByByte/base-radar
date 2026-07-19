/**
 * Priority display metadata for the Notification Center — icons, labels,
 * and Tailwind color classes in one place, the same
 * `components/alerts/meta.ts` convention, so `NotificationBadge` never
 * duplicates a mapping. Colors reuse the existing 3-tier semantic palette
 * (`radar-danger`/`radar-warning`/`radar-primary`+`radar-accent`) plus a
 * neutral tier for "low" — the exact same icon/color choices
 * `SEVERITY_ICON`/`SEVERITY_BADGE_CLASS` already use for their own
 * four-tier scale, so a `critical` notification and a `critical` alert
 * read identically at a glance.
 */

import { AlertOctagon, AlertTriangle, Info, Minus, type LucideIcon } from "lucide-react";

import type { NotificationPriority } from "@/lib/notifications/types";

export const NOTIFICATION_PRIORITY_ICON: Record<NotificationPriority, LucideIcon> = {
  critical: AlertOctagon,
  high: AlertTriangle,
  medium: Info,
  low: Minus,
};

export const NOTIFICATION_PRIORITY_LABEL: Record<NotificationPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const NOTIFICATION_PRIORITY_BADGE_CLASS: Record<NotificationPriority, string> = {
  critical: "border-radar-danger/30 bg-radar-danger/10 text-radar-danger",
  high: "border-radar-warning/30 bg-radar-warning/10 text-radar-warning",
  medium:
    "border-radar-primary/30 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/30 dark:bg-radar-accent/10 dark:text-radar-accent",
  low: "border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-muted",
};

/** PR19 Part 3 — the one ranking `components/notifications/filters.ts`'s "Highest Priority" sort reads, the same `SEVERITY_RANK` (`lib/alerts/intelligence/engine.ts`)-style convention: centralized here beside the rest of the priority metadata, never redefined at the call site. */
export const NOTIFICATION_PRIORITY_RANK: Record<NotificationPriority, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};
