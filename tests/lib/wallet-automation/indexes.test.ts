import { describe, expect, it } from "vitest";

import { buildAutomationIndexes } from "@/lib/wallet-automation/indexes";
import type { AutomationResult } from "@/lib/automation/types";

function makeResult(overrides: Partial<AutomationResult> & { id: string; triggeredAt: string }): AutomationResult {
  return {
    ruleId: "wallet-rule:health",
    notificationId: "n1",
    title: "Health Score Changed",
    summary: "s",
    status: "triggered",
    projectId: null,
    projectName: null,
    priority: "medium",
    link: null,
    metadata: {},
    ...overrides,
  };
}

describe("buildAutomationIndexes — IDENTITY (no duplicated source objects)", () => {
  it("resultByTriggeredAt returns the exact SAME object reference as the source array entry", () => {
    const result = makeResult({ id: "a1", triggeredAt: "2026-08-10T00:00:00.000Z" });
    const indexes = buildAutomationIndexes([result]);
    expect(indexes.resultByTriggeredAt.get("2026-08-10T00:00:00.000Z")).toBe(result);
  });
});

describe("buildAutomationIndexes — behavior matches Array.prototype.find()'s 'first match' semantics", () => {
  it("keeps the FIRST result when two share a triggeredAt, exactly like .find() would", () => {
    const first = makeResult({ id: "a1", triggeredAt: "2026-08-10T00:00:00.000Z" });
    const second = makeResult({ id: "a2", triggeredAt: "2026-08-10T00:00:00.000Z" });
    const indexes = buildAutomationIndexes([first, second]);
    expect(indexes.resultByTriggeredAt.get("2026-08-10T00:00:00.000Z")).toBe(first);
    expect([first, second].find((r) => r.triggeredAt === "2026-08-10T00:00:00.000Z")).toBe(first);
  });
});

describe("buildAutomationIndexes — MISSING / EMPTY", () => {
  it("genuinely empty input produces a genuinely empty (but real) map", () => {
    expect(buildAutomationIndexes([]).resultByTriggeredAt.size).toBe(0);
  });

  it("a lookup for a real timestamp that genuinely isn't indexed returns undefined, never a fabricated match", () => {
    expect(buildAutomationIndexes([]).resultByTriggeredAt.get("2026-08-10T00:00:00.000Z")).toBeUndefined();
  });
});

describe("buildAutomationIndexes — DETERMINISM", () => {
  it("identical input produces indexes with identical, deep-equal contents", () => {
    const result = makeResult({ id: "a1", triggeredAt: "2026-08-10T00:00:00.000Z" });
    const a = buildAutomationIndexes([result]);
    const b = buildAutomationIndexes([result]);
    expect(a.resultByTriggeredAt.get("2026-08-10T00:00:00.000Z")).toBe(b.resultByTriggeredAt.get("2026-08-10T00:00:00.000Z"));
  });
});
