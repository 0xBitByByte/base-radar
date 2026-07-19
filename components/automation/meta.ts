/**
 * Trigger and action display metadata for the Automation Center — icons,
 * labels, and Tailwind color classes in one place, the same
 * `components/alerts/meta.ts`/`components/notifications/meta.ts`
 * convention, so `AutomationBadge` never duplicates a mapping.
 */

import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  CalendarClock,
  CalendarDays,
  CircleDot,
  Flag,
  Star,
  type LucideIcon,
} from "lucide-react";

import { TIMELINE_EVENT_ICON } from "@/components/timeline/TimelineEventBadge";
import { TIMELINE_FILTER_LABEL } from "@/components/timeline/filters";
import type { AutomationAction, AutomationTriggerType } from "@/lib/automation/types";
import type { NotificationType } from "@/lib/notifications/types";

/**
 * The 10 real notification types reuse Timeline's own icon/label maps
 * directly (never redefined); the 3 meta-triggers get their own entries
 * since they qualify by a notification's already-computed field rather
 * than its type.
 */
export const AUTOMATION_TRIGGER_ICON: Record<AutomationTriggerType, LucideIcon> = {
  ...TIMELINE_EVENT_ICON,
  "unread-notification": CircleDot,
  "high-priority-notification": AlertTriangle,
  "critical-notification": AlertOctagon,
};

export const AUTOMATION_TRIGGER_LABEL: Record<AutomationTriggerType, string> = {
  ...(TIMELINE_FILTER_LABEL as Record<NotificationType, string>),
  "unread-notification": "Unread",
  "high-priority-notification": "High Priority",
  "critical-notification": "Critical",
};

const NEUTRAL_BADGE_CLASS =
  "border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-muted";
const PRIMARY_BADGE_CLASS =
  "border-radar-primary/30 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/30 dark:bg-radar-accent/10 dark:text-radar-accent";
const WARNING_BADGE_CLASS = "border-radar-warning/30 bg-radar-warning/10 text-radar-warning";
const DANGER_BADGE_CLASS = "border-radar-danger/30 bg-radar-danger/10 text-radar-danger";

export const AUTOMATION_TRIGGER_BADGE_CLASS: Record<AutomationTriggerType, string> = {
  alert: PRIMARY_BADGE_CLASS,
  opportunity: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  security: DANGER_BADGE_CLASS,
  governance: PRIMARY_BADGE_CLASS,
  development: PRIMARY_BADGE_CLASS,
  tvl: NEUTRAL_BADGE_CLASS,
  narrative: NEUTRAL_BADGE_CLASS,
  recommendation: "border-radar-purple/30 bg-radar-purple/10 text-radar-purple",
  portfolio: "border-radar-purple/30 bg-radar-purple/10 text-radar-purple",
  "daily-brief": "border-radar-purple/30 bg-radar-purple/10 text-radar-purple",
  "unread-notification": NEUTRAL_BADGE_CLASS,
  "high-priority-notification": WARNING_BADGE_CLASS,
  "critical-notification": DANGER_BADGE_CLASS,
};

/**
 * Action badge metadata — genuinely new iconography (nothing in the app
 * already represents "flag the dashboard" or "queue a digest"). Colors
 * reuse the same 3-tier semantic palette plus `radar-purple` for the two
 * queue actions, matching the "AI-generated roll-up" accent convention
 * `IntelligenceBadge`/`BriefWidget`/`PortfolioWidget`/`TimelineEventBadge`
 * already use for aggregate/scheduled output.
 */
export const AUTOMATION_ACTION_ICON: Record<AutomationAction, LucideIcon> = {
  "flag-dashboard": Flag,
  "create-notification-entry": Bell,
  "queue-daily-digest": CalendarClock,
  "queue-weekly-digest": CalendarDays,
  "mark-important": Star,
};

export const AUTOMATION_ACTION_LABEL: Record<AutomationAction, string> = {
  "flag-dashboard": "Flag Dashboard",
  "create-notification-entry": "Create Notification Entry",
  "queue-daily-digest": "Queue Daily Digest",
  "queue-weekly-digest": "Queue Weekly Digest",
  "mark-important": "Mark Important",
};

/** Deliberately shorter than `AUTOMATION_ACTION_LABEL` — the filter dropdown's own vocabulary, matching the same badge-text/filter-text split `NARRATIVE_LABEL`/`NARRATIVE_SUMMARY_LABEL` already establish. */
export const AUTOMATION_ACTION_FILTER_LABEL: Record<AutomationAction, string> = {
  "flag-dashboard": "Flag Dashboard",
  "create-notification-entry": "Create Notification",
  "queue-daily-digest": "Daily Digest",
  "queue-weekly-digest": "Weekly Digest",
  "mark-important": "Mark Important",
};

export const AUTOMATION_ACTION_BADGE_CLASS: Record<AutomationAction, string> = {
  "flag-dashboard": DANGER_BADGE_CLASS,
  "create-notification-entry": PRIMARY_BADGE_CLASS,
  "queue-daily-digest": "border-radar-purple/30 bg-radar-purple/10 text-radar-purple",
  "queue-weekly-digest": "border-radar-purple/30 bg-radar-purple/10 text-radar-purple",
  "mark-important": WARNING_BADGE_CLASS,
};
