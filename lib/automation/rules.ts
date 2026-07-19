/**
 * Rule definitions and rule-evaluation logic for the Automation Engine —
 * the ONE place a `Notification` is checked against an `AutomationRule`, so
 * `lib/automation/engine.ts` never re-implements this matching switch
 * itself ("no duplicated switch statements," per the PR brief). Matching
 * itself stays pure; nothing here calls `getNotifications()` or any
 * provider.
 *
 * PR20 Part 3 adds one thing beyond Part 1: a `localStorage`-backed
 * enabled/disabled overlay per rule, mirroring
 * `lib/notifications/storage.ts`'s own read-state overlay exactly (a
 * `Map<ruleId, enabled>` layered on top of the pure `DEFAULT_AUTOMATION_RULES`
 * array, never mutating the defaults themselves). Rule *logic* (trigger,
 * conditions, actions) stays fixed in this PR — only the `enabled` flag is
 * user-configurable, per the brief's "Do NOT allow editing rule logic."
 */

import type { Notification } from "@/lib/notifications/types";
import type { AutomationCondition, AutomationRule, AutomationTriggerType } from "@/lib/automation/types";

/** A static seed timestamp for the default rules below — these are configuration, not real user-created records, so a fixed illustrative date is honest here (never `Date.now()`, never implying the user just created them). */
const DEFAULT_RULE_TIMESTAMP = "2025-01-01T00:00:00.000Z";

function matchesTrigger(notification: Notification, trigger: AutomationTriggerType): boolean {
  switch (trigger) {
    case "unread-notification":
      return !notification.isRead;
    case "high-priority-notification":
      return notification.priority === "high" || notification.priority === "critical";
    case "critical-notification":
      return notification.priority === "critical";
    default:
      return notification.type === trigger;
  }
}

function matchesCondition(notification: Notification, condition: AutomationCondition): boolean {
  switch (condition.field) {
    case "priority":
      return notification.priority === condition.equals;
    case "isRead":
      return notification.isRead === condition.equals;
    case "type":
      return notification.type === condition.equals;
  }
}

/** The one entry point every caller (`engine.ts`) uses to check a notification against a rule — enabled check, trigger check, then every condition must hold. */
export function matchesRule(notification: Notification, rule: AutomationRule): boolean {
  if (!rule.enabled) return false;
  if (!matchesTrigger(notification, rule.trigger)) return false;
  return rule.conditions.every((condition) => matchesCondition(notification, condition));
}

/**
 * Sensible defaults covering the PR brief's own worked examples. Every
 * default rule is `enabled: true` — a user can disable one via
 * `setRuleEnabled` below without this array itself ever changing; it is
 * the one static source of truth for rule *logic*.
 */
export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "rule:critical-security",
    name: "Critical Security Notification",
    description: "Flags the Dashboard whenever a Security notification reaches critical priority.",
    enabled: true,
    trigger: "security",
    conditions: [{ field: "priority", equals: "critical" }],
    actions: ["flag-dashboard"],
    priority: "critical",
    createdAt: DEFAULT_RULE_TIMESTAMP,
    updatedAt: DEFAULT_RULE_TIMESTAMP,
    metadata: {},
  },
  {
    id: "rule:high-priority-alert",
    name: "High Priority Alert",
    description: "Creates a notification entry whenever an Alert reaches high priority.",
    enabled: true,
    trigger: "alert",
    conditions: [{ field: "priority", equals: "high" }],
    actions: ["create-notification-entry"],
    priority: "high",
    createdAt: DEFAULT_RULE_TIMESTAMP,
    updatedAt: DEFAULT_RULE_TIMESTAMP,
    metadata: {},
  },
  {
    id: "rule:portfolio-update",
    name: "Portfolio Update",
    description: "Queues a Portfolio Intelligence roll-up into the daily digest.",
    enabled: true,
    trigger: "portfolio",
    conditions: [],
    actions: ["queue-daily-digest"],
    priority: "low",
    createdAt: DEFAULT_RULE_TIMESTAMP,
    updatedAt: DEFAULT_RULE_TIMESTAMP,
    metadata: {},
  },
  {
    id: "rule:daily-brief",
    name: "Daily Brief",
    description: "Queues the day's Daily Brief roll-up into the daily digest.",
    enabled: true,
    trigger: "daily-brief",
    conditions: [],
    actions: ["queue-daily-digest"],
    priority: "low",
    createdAt: DEFAULT_RULE_TIMESTAMP,
    updatedAt: DEFAULT_RULE_TIMESTAMP,
    metadata: {},
  },
  {
    id: "rule:unread-critical",
    name: "Unread Critical Notification",
    description: "Marks a critical notification important while it's still unread.",
    enabled: true,
    trigger: "critical-notification",
    conditions: [{ field: "isRead", equals: false }],
    actions: ["mark-important"],
    priority: "critical",
    createdAt: DEFAULT_RULE_TIMESTAMP,
    updatedAt: DEFAULT_RULE_TIMESTAMP,
    metadata: {},
  },
];

const DEFAULT_RULE_IDS = new Set(DEFAULT_AUTOMATION_RULES.map((rule) => rule.id));

const AUTOMATION_RULE_STATE_STORAGE_KEY = "base-radar:automation-rule-state";
const AUTOMATION_RULE_STATE_VERSION = 1;

type PersistedRuleState = {
  version: number;
  /** ruleId → enabled override. A rule id absent here just uses `DEFAULT_AUTOMATION_RULES`'s own `enabled: true`. */
  enabledByRuleId: Record<string, boolean>;
};

function isValidPersistedRuleState(value: unknown): value is PersistedRuleState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedRuleState>;
  if (candidate.version !== AUTOMATION_RULE_STATE_VERSION) return false;
  if (typeof candidate.enabledByRuleId !== "object" || candidate.enabledByRuleId === null) return false;
  return Object.entries(candidate.enabledByRuleId).every(
    ([ruleId, enabled]) => DEFAULT_RULE_IDS.has(ruleId) && typeof enabled === "boolean"
  );
}

const ruleOverrides = new Map<string, boolean>();
let hydrated = false;

/** SSR-safe and resilient to a corrupted/foreign value under this key — runs once per session, the first time anything actually needs the overlay. */
function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(AUTOMATION_RULE_STATE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!isValidPersistedRuleState(parsed)) return;
    for (const [ruleId, enabled] of Object.entries(parsed.enabledByRuleId)) {
      ruleOverrides.set(ruleId, enabled);
    }
  } catch {
    // Intentionally swallowed — a corrupted value just means starting from an empty overlay (every rule at its own default), same as `lib/notifications/storage.ts`'s `ensureHydrated`.
  }
}

/** Best-effort — `localStorage.setItem` can throw (quota exceeded, private browsing), in which case the in-memory overlay is still correct for the rest of this tab's session even though it won't survive a refresh. */
function persistRuleState(): void {
  if (typeof window === "undefined") return;

  try {
    const enabledByRuleId = Object.fromEntries(ruleOverrides);
    window.localStorage.setItem(
      AUTOMATION_RULE_STATE_STORAGE_KEY,
      JSON.stringify({ version: AUTOMATION_RULE_STATE_VERSION, enabledByRuleId })
    );
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}

/** Bumped on every rule-state mutation so `getAutomationRules()` knows to recompute the merged array; left alone otherwise so a stable overlay never forces a redundant recompute (and so `lib/automation/storage.ts`'s own `!==` reference check on this array actually works). */
let rulesVersion = 0;
let cachedMergedRulesVersion = -1;
let cachedMergedRules: AutomationRule[] | null = null;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** The one public entry point for reading rules — same reference returned until a real enable/disable/reset happens. Rule *logic* always comes from `DEFAULT_AUTOMATION_RULES`; only `enabled` is ever overridden. */
export function getAutomationRules(): AutomationRule[] {
  ensureHydrated();
  if (!cachedMergedRules || cachedMergedRulesVersion !== rulesVersion) {
    cachedMergedRules = DEFAULT_AUTOMATION_RULES.map((rule) => {
      const override = ruleOverrides.get(rule.id);
      return override === undefined ? rule : { ...rule, enabled: override };
    });
    cachedMergedRulesVersion = rulesVersion;
  }
  return cachedMergedRules;
}

export function setRuleEnabled(ruleId: string, enabled: boolean): void {
  ensureHydrated();
  if (!DEFAULT_RULE_IDS.has(ruleId)) return;
  if (ruleOverrides.get(ruleId) === enabled) return;

  ruleOverrides.set(ruleId, enabled);
  rulesVersion += 1;
  persistRuleState();
  notify();
}

/** Reverts every rule to its own `DEFAULT_AUTOMATION_RULES` enabled state — forgets the overlay entirely, it does not force every rule to `true` (a rule already `enabled: true` by default just has nothing to revert). */
export function resetAutomationRules(): void {
  ensureHydrated();
  if (ruleOverrides.size === 0) return;

  ruleOverrides.clear();
  rulesVersion += 1;
  persistRuleState();
  notify();
}

/** Registers `listener` to be called after a rule-state mutation — the exact shape `useSyncExternalStore` expects. */
export function subscribeToAutomationRules(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
