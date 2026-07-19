/**
 * Automation Engine (PR20 Part 1) — evaluates already-built Notifications
 * against user-defined rules, not an intelligence engine. An
 * `AutomationResult` is produced only when a real `Notification` matches a
 * real, enabled `AutomationRule` — it never generates a notification,
 * never talks to a provider, and never reads Timeline/Portfolio
 * Intelligence/Daily Brief/the AI Intelligence Engine/the Alert Engine
 * directly.
 */

import type { NotificationPriority, NotificationType } from "@/lib/notifications/types";

/**
 * The 10 real notification types (reused directly — never redefined) plus
 * 3 meta-triggers that qualify a notification by its own already-computed
 * fields rather than its type. Composing a meta-trigger with a `condition`
 * (e.g. `critical-notification` + `{ field: "isRead", equals: false }` for
 * "Unread Critical Notification") covers every default rule without a
 * second type-plus-priority combinator field.
 */
export const AUTOMATION_META_TRIGGERS = ["unread-notification", "high-priority-notification", "critical-notification"] as const;
export type AutomationMetaTrigger = (typeof AUTOMATION_META_TRIGGERS)[number];

export type AutomationTriggerType = NotificationType | AutomationMetaTrigger;

/**
 * A small, closed set of extra qualifiers layered on top of `trigger` —
 * deliberately not a general query DSL: every default rule this PR ships
 * is expressible with zero or one condition, so a bigger expression
 * language would be speculative machinery with nothing real to exercise it
 * yet.
 */
export type AutomationCondition =
  | { field: "priority"; equals: NotificationPriority }
  | { field: "isRead"; equals: boolean }
  | { field: "type"; equals: NotificationType };

export const AUTOMATION_ACTIONS = [
  "create-notification-entry",
  "queue-daily-digest",
  "queue-weekly-digest",
  "flag-dashboard",
  "mark-important",
] as const;
export type AutomationAction = (typeof AUTOMATION_ACTIONS)[number];

/**
 * A user-defined rule: "when a notification matches `trigger` and every
 * `condition`, take these `actions`." Actions are data only in Part 1 — no
 * email, no push, no webhooks; recording that an action *should* happen is
 * the entire scope here.
 */
export type AutomationRule = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTriggerType;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  /** Reused directly from `NotificationPriority` — a rule's own configured urgency, not a derived value. */
  priority: NotificationPriority;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
};

/**
 * One real, deterministic match between a `Notification` and an
 * `AutomationRule`. `triggeredAt` is the matched notification's own
 * `timestamp` (never `Date.now()` — `buildAutomationResults` is pure).
 * `projectId`/`projectName`/`link` are carried over from the notification
 * unchanged, so an aggregate-level match (where the notification itself
 * has no project) never fabricates one, and a real notification's deep
 * link is never reconstructed.
 */
export type AutomationResult = {
  /** Deterministic — `automation:${ruleId}:${notificationId}`, so re-running `buildAutomationResults` on the same inputs always yields the same ids. */
  id: string;
  ruleId: string;
  notificationId: string;
  title: string;
  summary: string;
  status: AutomationResultStatus;
  triggeredAt: string;
  projectId: string | null;
  projectName: string | null;
  priority: NotificationPriority;
  link: string | null;
  metadata: Record<string, unknown>;
};

/**
 * A single real state today — "this rule matched this notification."
 * Richer lifecycle states (`queued`, `completed`, `dismissed`) would
 * require a real execution/queue layer this PR deliberately doesn't build
 * (actions are data only); adding those states now would be unearned
 * fabrication, not a genuine status a Part 1 engine can honestly report.
 */
export const AUTOMATION_RESULT_STATUSES = ["triggered"] as const;
export type AutomationResultStatus = (typeof AUTOMATION_RESULT_STATUSES)[number];
