import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Bell } from "lucide-react";

import type { Notification } from "@/lib/notifications/types";

const STORAGE_KEY = "base-radar:automation-rule-state";

async function freshModule() {
  vi.resetModules();
  return import("@/lib/automation/rules");
}

function notification(overrides: Partial<Notification> & { id: string }): Notification {
  return {
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    readAt: null,
    isRead: false,
    title: "Test notification",
    summary: "Test summary",
    type: "security",
    severity: null,
    source: "Test",
    projectId: null,
    projectName: null,
    link: null,
    icon: Bell,
    priority: "medium",
    timestamp: "2026-09-04T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

describe("matchesRule / matchesTrigger / matchesCondition", () => {
  it("a disabled rule never matches, even with a real matching trigger and no conditions", async () => {
    const { matchesRule, DEFAULT_AUTOMATION_RULES } = await freshModule();
    const rule = { ...DEFAULT_AUTOMATION_RULES[0], enabled: false, conditions: [] };
    const match = notification({ id: "n1", type: rule.trigger as Notification["type"] });
    expect(matchesRule(match, rule)).toBe(false);
  });

  it("the unread-notification meta-trigger matches only an unread notification", async () => {
    const { matchesRule, DEFAULT_AUTOMATION_RULES } = await freshModule();
    const rule = { ...DEFAULT_AUTOMATION_RULES[0], trigger: "unread-notification" as const, conditions: [] };
    expect(matchesRule(notification({ id: "n1", isRead: false }), rule)).toBe(true);
    expect(matchesRule(notification({ id: "n2", isRead: true }), rule)).toBe(false);
  });

  it("the high-priority-notification meta-trigger matches high and critical, never medium/low", async () => {
    const { matchesRule, DEFAULT_AUTOMATION_RULES } = await freshModule();
    const rule = { ...DEFAULT_AUTOMATION_RULES[0], trigger: "high-priority-notification" as const, conditions: [] };
    expect(matchesRule(notification({ id: "n1", priority: "high" }), rule)).toBe(true);
    expect(matchesRule(notification({ id: "n2", priority: "critical" }), rule)).toBe(true);
    expect(matchesRule(notification({ id: "n3", priority: "medium" }), rule)).toBe(false);
    expect(matchesRule(notification({ id: "n4", priority: "low" }), rule)).toBe(false);
  });

  it("the critical-notification meta-trigger matches only critical priority", async () => {
    const { matchesRule, DEFAULT_AUTOMATION_RULES } = await freshModule();
    const rule = { ...DEFAULT_AUTOMATION_RULES[0], trigger: "critical-notification" as const, conditions: [] };
    expect(matchesRule(notification({ id: "n1", priority: "critical" }), rule)).toBe(true);
    expect(matchesRule(notification({ id: "n2", priority: "high" }), rule)).toBe(false);
  });

  it("a real NotificationType trigger matches by exact type equality (the default switch case)", async () => {
    const { matchesRule, DEFAULT_AUTOMATION_RULES } = await freshModule();
    const rule = { ...DEFAULT_AUTOMATION_RULES[0], trigger: "security" as const, conditions: [] };
    expect(matchesRule(notification({ id: "n1", type: "security" }), rule)).toBe(true);
    expect(matchesRule(notification({ id: "n2", type: "alert" }), rule)).toBe(false);
  });

  it("every condition must hold — one mismatched condition rejects the whole rule", async () => {
    const { matchesRule, DEFAULT_AUTOMATION_RULES } = await freshModule();
    const rule = {
      ...DEFAULT_AUTOMATION_RULES[0],
      trigger: "security" as const,
      conditions: [
        { field: "priority" as const, equals: "critical" as const },
        { field: "isRead" as const, equals: false },
      ],
    };
    expect(matchesRule(notification({ id: "n1", type: "security", priority: "critical", isRead: false }), rule)).toBe(true);
    expect(matchesRule(notification({ id: "n2", type: "security", priority: "critical", isRead: true }), rule)).toBe(false);
    expect(matchesRule(notification({ id: "n3", type: "security", priority: "high", isRead: false }), rule)).toBe(false);
  });

  it("zero conditions matches whenever the trigger alone matches", async () => {
    const { matchesRule, DEFAULT_AUTOMATION_RULES } = await freshModule();
    const rule = { ...DEFAULT_AUTOMATION_RULES[0], trigger: "security" as const, conditions: [] };
    expect(matchesRule(notification({ id: "n1", type: "security", priority: "low", isRead: true }), rule)).toBe(true);
  });

  it("a 'type' condition matches by exact NotificationType equality", async () => {
    const { matchesRule, DEFAULT_AUTOMATION_RULES } = await freshModule();
    const rule = {
      ...DEFAULT_AUTOMATION_RULES[0],
      trigger: "unread-notification" as const,
      conditions: [{ field: "type" as const, equals: "alert" as const }],
    };
    expect(matchesRule(notification({ id: "n1", isRead: false, type: "alert" }), rule)).toBe(true);
    expect(matchesRule(notification({ id: "n2", isRead: false, type: "security" }), rule)).toBe(false);
  });
});

describe("DEFAULT_AUTOMATION_RULES", () => {
  it("has exactly the 5 real, documented default rules, every one enabled", async () => {
    const { DEFAULT_AUTOMATION_RULES } = await freshModule();
    expect(DEFAULT_AUTOMATION_RULES).toHaveLength(5);
    expect(DEFAULT_AUTOMATION_RULES.every((rule) => rule.enabled)).toBe(true);
    expect(DEFAULT_AUTOMATION_RULES.map((rule) => rule.id).sort()).toEqual(
      [
        "rule:critical-security",
        "rule:high-priority-alert",
        "rule:portfolio-update",
        "rule:daily-brief",
        "rule:unread-critical",
      ].sort()
    );
  });
});

describe("getAutomationRules / setRuleEnabled / resetAutomationRules", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it("returns the real defaults, all enabled, when no override exists", async () => {
    const { getAutomationRules, DEFAULT_AUTOMATION_RULES } = await freshModule();
    expect(getAutomationRules()).toEqual(DEFAULT_AUTOMATION_RULES);
  });

  it("returns the same reference across repeated calls until a real mutation happens", async () => {
    const { getAutomationRules } = await freshModule();
    expect(getAutomationRules()).toBe(getAutomationRules());
  });

  it("setRuleEnabled(false) disables exactly the targeted rule, leaving every other rule's own default untouched", async () => {
    const { getAutomationRules, setRuleEnabled } = await freshModule();
    setRuleEnabled("rule:critical-security", false);
    const rules = getAutomationRules();
    const target = rules.find((rule) => rule.id === "rule:critical-security")!;
    expect(target.enabled).toBe(false);
    expect(rules.filter((rule) => rule.id !== "rule:critical-security").every((rule) => rule.enabled)).toBe(true);
  });

  it("setRuleEnabled changes the returned reference (a real recompute), and rule *logic* is never altered — only enabled", async () => {
    const { getAutomationRules, setRuleEnabled, DEFAULT_AUTOMATION_RULES } = await freshModule();
    const before = getAutomationRules();
    setRuleEnabled("rule:critical-security", false);
    const after = getAutomationRules();
    expect(after).not.toBe(before);
    const target = after.find((rule) => rule.id === "rule:critical-security")!;
    const defaultRule = DEFAULT_AUTOMATION_RULES.find((rule) => rule.id === "rule:critical-security")!;
    expect(target.trigger).toBe(defaultRule.trigger);
    expect(target.conditions).toEqual(defaultRule.conditions);
    expect(target.actions).toEqual(defaultRule.actions);
  });

  it("an unknown rule id is silently ignored — no throw, no mutation, no notify", async () => {
    const { getAutomationRules, setRuleEnabled, subscribeToAutomationRules } = await freshModule();
    const listener = vi.fn();
    subscribeToAutomationRules(listener);
    const before = getAutomationRules();
    expect(() => setRuleEnabled("rule:does-not-exist", false)).not.toThrow();
    expect(getAutomationRules()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("setting a rule to its current real overlay value is a no-op — never a spurious notify or recompute", async () => {
    const { getAutomationRules, setRuleEnabled, subscribeToAutomationRules } = await freshModule();
    setRuleEnabled("rule:critical-security", false); // establishes a real, explicit override first
    const listener = vi.fn();
    subscribeToAutomationRules(listener);
    const before = getAutomationRules();
    setRuleEnabled("rule:critical-security", false); // same value as the current override — a genuine no-op
    expect(getAutomationRules()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("notifies every subscribed listener on a real enabled change", async () => {
    const { setRuleEnabled, subscribeToAutomationRules } = await freshModule();
    const listener = vi.fn();
    subscribeToAutomationRules(listener);
    setRuleEnabled("rule:critical-security", false);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("subscribeToAutomationRules's returned unsubscribe genuinely stops further notifications", async () => {
    const { setRuleEnabled, subscribeToAutomationRules } = await freshModule();
    const listener = vi.fn();
    const unsubscribe = subscribeToAutomationRules(listener);
    unsubscribe();
    setRuleEnabled("rule:critical-security", false);
    expect(listener).not.toHaveBeenCalled();
  });

  it("persists a real override across a simulated refresh", async () => {
    const first = await freshModule();
    first.setRuleEnabled("rule:critical-security", false);
    const second = await freshModule();
    const target = second.getAutomationRules().find((rule) => rule.id === "rule:critical-security")!;
    expect(target.enabled).toBe(false);
  });

  it("resetAutomationRules forgets the overlay entirely, restoring every rule to its own default", async () => {
    const { getAutomationRules, setRuleEnabled, resetAutomationRules } = await freshModule();
    setRuleEnabled("rule:critical-security", false);
    setRuleEnabled("rule:daily-brief", false);
    resetAutomationRules();
    expect(getAutomationRules().every((rule) => rule.enabled)).toBe(true);
  });

  it("resetAutomationRules persists the cleared overlay across a simulated refresh", async () => {
    const first = await freshModule();
    first.setRuleEnabled("rule:critical-security", false);
    first.resetAutomationRules();
    const second = await freshModule();
    expect(second.getAutomationRules().every((rule) => rule.enabled)).toBe(true);
  });

  it("resetAutomationRules is a genuine no-op (no notify) when there is no overlay to clear", async () => {
    const { resetAutomationRules, subscribeToAutomationRules } = await freshModule();
    const listener = vi.fn();
    subscribeToAutomationRules(listener);
    resetAutomationRules();
    expect(listener).not.toHaveBeenCalled();
  });

  it("a corrupted stored value falls back to the honest defaults rather than throwing", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    const { getAutomationRules, DEFAULT_AUTOMATION_RULES } = await freshModule();
    expect(() => getAutomationRules()).not.toThrow();
    expect(getAutomationRules()).toEqual(DEFAULT_AUTOMATION_RULES);
  });

  it("a mismatched real version falls back to the honest defaults rather than trusting stale data", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, enabledByRuleId: { "rule:critical-security": false } })
    );
    const { getAutomationRules, DEFAULT_AUTOMATION_RULES } = await freshModule();
    expect(getAutomationRules()).toEqual(DEFAULT_AUTOMATION_RULES);
  });

  it("a stored override referencing an unknown rule id is rejected wholesale, never partially trusted", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, enabledByRuleId: { "rule:critical-security": false, "rule:does-not-exist": true } })
    );
    const { getAutomationRules, DEFAULT_AUTOMATION_RULES } = await freshModule();
    expect(getAutomationRules()).toEqual(DEFAULT_AUTOMATION_RULES);
  });
});
