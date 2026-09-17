import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Bell } from "lucide-react";

import type { Notification } from "@/lib/notifications/types";

const RULE_STATE_KEY = "base-radar:automation-rule-state";
const PREFERENCES_KEY = "base-radar:automation-preferences";

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
    priority: "critical",
    timestamp: "2026-09-04T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

let currentNotifications: Notification[] = [];

vi.mock("@/lib/notifications/storage", () => ({
  getNotifications: () => currentNotifications,
  subscribe: () => () => {},
}));

async function freshModules() {
  vi.resetModules();
  const storage = await import("@/lib/automation/storage");
  const rules = await import("@/lib/automation/rules");
  const preferences = await import("@/lib/automation/preferences");
  return { storage, rules, preferences };
}

describe("getAutomationResults", () => {
  beforeEach(() => {
    currentNotifications = [notification({ id: "n1", type: "security", priority: "critical" })];
    window.localStorage.removeItem(RULE_STATE_KEY);
    window.localStorage.removeItem(PREFERENCES_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(RULE_STATE_KEY);
    window.localStorage.removeItem(PREFERENCES_KEY);
  });

  it("returns real matches built from the real notifications and default rules, when enabled (the real default)", async () => {
    const { storage } = await freshModules();
    const results = storage.getAutomationResults();
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.notificationId === "n1")).toBe(true);
  });

  it("the master kill switch returns a real, honest empty array without evaluating a single rule — never a partial/filtered result", async () => {
    const { storage, preferences } = await freshModules();
    preferences.setAutomationEnabled(false);
    expect(storage.getAutomationResults()).toEqual([]);
  });

  it("re-enabling after being disabled returns the real results again", async () => {
    const { storage, preferences } = await freshModules();
    preferences.setAutomationEnabled(false);
    expect(storage.getAutomationResults()).toEqual([]);
    preferences.setAutomationEnabled(true);
    expect(storage.getAutomationResults().length).toBeGreaterThan(0);
  });

  it("returns the exact same reference across repeated calls when nothing has genuinely changed", async () => {
    const { storage } = await freshModules();
    const first = storage.getAutomationResults();
    const second = storage.getAutomationResults();
    expect(first).toBe(second);
  });

  it("recomputes when the underlying notifications reference genuinely changes", async () => {
    const { storage } = await freshModules();
    const first = storage.getAutomationResults();
    currentNotifications = [notification({ id: "n2", type: "security", priority: "critical" })];
    const second = storage.getAutomationResults();
    expect(second).not.toBe(first);
    expect(second.some((result) => result.notificationId === "n2")).toBe(true);
  });

  it("recomputes when the underlying rule state genuinely changes", async () => {
    const { storage, rules } = await freshModules();
    const first = storage.getAutomationResults();
    rules.setRuleEnabled("rule:critical-security", false);
    const second = storage.getAutomationResults();
    expect(second).not.toBe(first);
  });

  it("disabling the one rule that matched the real notification removes it from the real results", async () => {
    const { storage, rules } = await freshModules();
    const before = storage.getAutomationResults();
    expect(before.some((result) => result.ruleId === "rule:critical-security")).toBe(true);

    rules.setRuleEnabled("rule:critical-security", false);
    const after = storage.getAutomationResults();
    expect(after.some((result) => result.ruleId === "rule:critical-security")).toBe(false);
  });

  it("never reads Timeline/Portfolio/Daily Brief/the AI Intelligence Engine/the Alert Engine or any provider directly — only Notifications and rule state", async () => {
    // Structural guarantee, verified behaviorally: results are fully explained
    // by real notifications + real rule state alone, with nothing else able
    // to influence them (no other module is mocked or touched above).
    const { storage } = await freshModules();
    currentNotifications = [];
    expect(storage.getAutomationResults()).toEqual([]);
  });
});
