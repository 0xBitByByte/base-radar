import { describe, expect, it } from "vitest";
import { Bell } from "lucide-react";

import { buildAutomationResults } from "@/lib/automation/engine";
import { DEFAULT_AUTOMATION_RULES } from "@/lib/automation/rules";
import type { AutomationRule } from "@/lib/automation/types";
import type { Notification } from "@/lib/notifications/types";

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

function rule(overrides: Partial<AutomationRule> & { id: string }): AutomationRule {
  return {
    name: "Test rule",
    description: "A test rule.",
    enabled: true,
    trigger: "security",
    conditions: [],
    actions: ["flag-dashboard"],
    priority: "medium",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

describe("buildAutomationResults", () => {
  it("returns a real, honest empty list for empty inputs", () => {
    expect(buildAutomationResults([], [])).toEqual([]);
    expect(buildAutomationResults([notification({ id: "n1" })], [])).toEqual([]);
    expect(buildAutomationResults([], [rule({ id: "r1" })])).toEqual([]);
  });

  it("produces one real result for a genuine (rule, notification) match, with the deterministic id", () => {
    const results = buildAutomationResults(
      [notification({ id: "n1", type: "security" })],
      [rule({ id: "r1", trigger: "security" })]
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("automation:r1:n1");
    expect(results[0].ruleId).toBe("r1");
    expect(results[0].notificationId).toBe("n1");
  });

  it("a disabled rule never produces a result, even with an otherwise-matching notification", () => {
    const results = buildAutomationResults(
      [notification({ id: "n1", type: "security" })],
      [rule({ id: "r1", trigger: "security", enabled: false })]
    );
    expect(results).toEqual([]);
  });

  it("maps every real field correctly: title from rule.name, summary interpolates description + notification title, priority from the RULE not the notification, project fields and link passed through unchanged", () => {
    const results = buildAutomationResults(
      [
        notification({
          id: "n1",
          type: "security",
          title: "Suspicious contract call",
          priority: "low",
          projectId: "aerodrome-finance",
          projectName: "Aerodrome Finance",
          link: "/dashboard/projects/aerodrome-finance",
          timestamp: "2026-05-01T12:00:00.000Z",
        }),
      ],
      [rule({ id: "r1", trigger: "security", name: "Critical Security Notification", description: "Flags security events.", priority: "critical" })]
    );

    expect(results[0].title).toBe("Critical Security Notification");
    expect(results[0].summary).toBe('Flags security events. Matched "Suspicious contract call".');
    expect(results[0].priority).toBe("critical"); // the rule's own priority, never the notification's
    expect(results[0].projectId).toBe("aerodrome-finance");
    expect(results[0].projectName).toBe("Aerodrome Finance");
    expect(results[0].link).toBe("/dashboard/projects/aerodrome-finance");
    expect(results[0].triggeredAt).toBe("2026-05-01T12:00:00.000Z"); // the notification's own timestamp
    expect(results[0].status).toBe("triggered");
    expect(results[0].metadata).toEqual({ trigger: "security", actions: ["flag-dashboard"] });
  });

  it("an aggregate-level notification's real null project fields are never fabricated into a value", () => {
    const results = buildAutomationResults(
      [notification({ id: "n1", type: "security", projectId: null, projectName: null, link: null })],
      [rule({ id: "r1", trigger: "security" })]
    );
    expect(results[0].projectId).toBeNull();
    expect(results[0].projectName).toBeNull();
    expect(results[0].link).toBeNull();
  });

  it("multiple rules matching multiple notifications produce every real cross-product match, never one fewer or one fabricated", () => {
    const notifications = [
      notification({ id: "n1", type: "security", priority: "critical" }),
      notification({ id: "n2", type: "alert", priority: "high" }),
    ];
    const rules = [
      rule({ id: "r-security", trigger: "security" }),
      rule({ id: "r-critical", trigger: "critical-notification" }), // matches n1 only (priority critical)
    ];
    const results = buildAutomationResults(notifications, rules);
    const ids = results.map((result) => result.id).sort();
    expect(ids).toEqual(["automation:r-critical:n1", "automation:r-security:n1"].sort());
  });

  it("de-duplicates by id — the same notification object appearing twice in the input never produces two results", () => {
    const same = notification({ id: "n1", type: "security" });
    const results = buildAutomationResults([same, same], [rule({ id: "r1", trigger: "security" })]);
    expect(results).toHaveLength(1);
  });

  it("sorts results by triggeredAt descending", () => {
    const results = buildAutomationResults(
      [
        notification({ id: "n1", type: "security", timestamp: "2026-01-01T00:00:00.000Z" }),
        notification({ id: "n2", type: "security", timestamp: "2026-03-01T00:00:00.000Z" }),
        notification({ id: "n3", type: "security", timestamp: "2026-02-01T00:00:00.000Z" }),
      ],
      [rule({ id: "r1", trigger: "security" })]
    );
    expect(results.map((result) => result.notificationId)).toEqual(["n2", "n3", "n1"]);
  });

  it("sort is stable — results sharing an identical triggeredAt keep their original relative (rule-then-notification) order", () => {
    const sameTimestamp = "2026-01-01T00:00:00.000Z";
    const results = buildAutomationResults(
      [
        notification({ id: "n1", type: "security", timestamp: sameTimestamp }),
        notification({ id: "n2", type: "security", timestamp: sameTimestamp }),
      ],
      [rule({ id: "r1", trigger: "security" })]
    );
    expect(results.map((result) => result.notificationId)).toEqual(["n1", "n2"]);
  });

  it("a rule with real conditions only matches notifications satisfying every condition", () => {
    const results = buildAutomationResults(
      [
        notification({ id: "n1", type: "security", priority: "critical" }),
        notification({ id: "n2", type: "security", priority: "low" }),
      ],
      [rule({ id: "r1", trigger: "security", conditions: [{ field: "priority", equals: "critical" }] })]
    );
    expect(results.map((result) => result.notificationId)).toEqual(["n1"]);
  });

  it("is a pure function — never mutates its input arrays", () => {
    const notifications = [notification({ id: "n1", type: "security" })];
    const rules = [rule({ id: "r1", trigger: "security" })];
    const notificationsCopy = [...notifications];
    const rulesCopy = [...rules];
    buildAutomationResults(notifications, rules);
    expect(notifications).toEqual(notificationsCopy);
    expect(rules).toEqual(rulesCopy);
  });

  it("real DEFAULT_AUTOMATION_RULES correctly match their own worked-example notification shapes", () => {
    const criticalSecurity = notification({ id: "n1", type: "security", priority: "critical" });
    const results = buildAutomationResults([criticalSecurity], DEFAULT_AUTOMATION_RULES);
    expect(results.map((result) => result.ruleId)).toContain("rule:critical-security");
  });
});
