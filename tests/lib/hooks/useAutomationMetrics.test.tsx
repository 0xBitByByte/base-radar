import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import type { Timeline, TimelineEvent } from "@/lib/timeline/types";

const RULE_STATE_KEY = "base-radar:automation-rule-state";
const PREFERENCES_KEY = "base-radar:automation-preferences";
const READ_STATE_KEY = "base-radar:notification-read-state";

// useAutomationMetrics is a pure useMemo derivation over useAutomation()'s
// `results` and useAutomationRules()'s `rules` — it owns no subscription
// of its own (reactivity is entirely delegated to those two already-
// coverage-closed hooks: tests/lib/hooks/useAutomation.test.tsx and
// useAutomationRules.test.tsx). Per this turn's own instruction to use
// real implementations rather than mocking away the behavior under test,
// this file renders useAutomationMetrics for real, driving genuine
// results/rules through the same real Timeline-mock technique
// useAutomation.test.tsx already establishes — the untested surface this
// file actually closes is useAutomationMetrics's OWN derivation logic
// (activeCount formatting, the triggeredToday date-boundary, lastRun
// selection, the conditional "last-run" item, and its own memoization),
// never lib/automation/*'s already-tested matching/rule-state behavior.
function event(overrides: Partial<TimelineEvent> & { id: string }): TimelineEvent {
  return {
    timestamp: "2026-09-04T00:00:00.000Z",
    projectId: null,
    projectName: null,
    title: "Test event",
    summary: "Test summary",
    eventType: "alert",
    source: "Test",
    severity: null,
    confidence: null,
    score: null,
    narrative: null,
    category: null,
    link: null,
    metadata: {},
    ...overrides,
  };
}

function timeline(events: TimelineEvent[]): Timeline {
  return {
    id: "timeline:test",
    generatedAt: "2026-09-04T00:00:00.000Z",
    headline: "",
    summary: "",
    events,
    totalEvents: events.length,
    highestSeverity: null,
    averageConfidence: 0,
    averageScore: 0,
    eventCounts: {} as Timeline["eventCounts"],
  };
}

let currentTimeline: Timeline = timeline([]);

vi.mock("@/lib/timeline/storage", () => ({
  getTimeline: () => currentTimeline,
}));

async function freshUseAutomationMetrics() {
  vi.resetModules();
  return import("@/lib/hooks/useAutomationMetrics");
}

/** A real ISO timestamp a few hours into "today" (real wall-clock, so this test is never date-flaky). */
function todayIso(): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
  return startOfToday.toISOString();
}

/** A real ISO timestamp from "yesterday" — genuinely before the metric's own `startOfToday` boundary, regardless of when this test actually runs. */
function yesterdayIso(): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(startOfToday.getTime() - 60 * 60 * 1000).toISOString();
}

describe("useAutomationMetrics", () => {
  beforeEach(() => {
    currentTimeline = timeline([]);
    window.localStorage.removeItem(RULE_STATE_KEY);
    window.localStorage.removeItem(PREFERENCES_KEY);
    window.localStorage.removeItem(READ_STATE_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(RULE_STATE_KEY);
    window.localStorage.removeItem(PREFERENCES_KEY);
    window.localStorage.removeItem(READ_STATE_KEY);
  });

  it("with no real results and every rule at its default, returns the honest zero/all-enabled metrics and no 'last-run' item", async () => {
    const { useAutomationMetrics } = await freshUseAutomationMetrics();
    const { result } = renderHook(() => useAutomationMetrics());

    expect(result.current).toEqual([
      { key: "active", label: "Active Automations", value: "5/5" },
      { key: "triggered-today", label: "Triggered Today", value: 0 },
      { key: "all-time", label: "All-Time Triggers", value: 0 },
    ]);
  });

  it("activeCount reflects a real disabled rule — '4/5', never recomputed independently of the real rule state", async () => {
    const { useAutomationMetrics } = await freshUseAutomationMetrics();
    const { setRuleEnabled } = await import("@/lib/automation/rules");
    const { result, rerender } = renderHook(() => useAutomationMetrics());

    setRuleEnabled("rule:critical-security", false);
    rerender();

    const active = result.current.find((item) => item.key === "active")!;
    expect(active.value).toBe("4/5");
  });

  it("a real result triggered today counts toward both triggeredToday and all-time, and produces a real 'last-run' item", async () => {
    currentTimeline = timeline([event({ id: "timeline:security:1", eventType: "security", timestamp: todayIso() })]);
    const { useAutomationMetrics } = await freshUseAutomationMetrics();
    const { result } = renderHook(() => useAutomationMetrics());

    // A critical, unread security notification genuinely matches two real
    // default rules at once (rule:critical-security's own trigger+condition,
    // and rule:unread-critical's critical-notification meta-trigger) — both
    // real transitions share this one event's timestamp.
    expect(result.current.find((item) => item.key === "triggered-today")!.value).toBe(2);
    expect(result.current.find((item) => item.key === "all-time")!.value).toBe(2);

    const lastRun = result.current.find((item) => item.key === "last-run")!;
    expect(lastRun).toBeDefined();
    expect(lastRun.isTimestamp).toBe(true);
    expect(lastRun.value).toBe(todayIso());
  });

  it("a real result triggered yesterday counts toward all-time but NOT toward triggeredToday — the real date-boundary logic", async () => {
    currentTimeline = timeline([event({ id: "timeline:security:1", eventType: "security", timestamp: yesterdayIso() })]);
    const { useAutomationMetrics } = await freshUseAutomationMetrics();
    const { result } = renderHook(() => useAutomationMetrics());

    // Same real two-rule match as above (rule:critical-security +
    // rule:unread-critical), both sharing yesterday's timestamp.
    expect(result.current.find((item) => item.key === "triggered-today")!.value).toBe(0);
    expect(result.current.find((item) => item.key === "all-time")!.value).toBe(2);
    // Still a real last-run item, even though it's not "today".
    expect(result.current.find((item) => item.key === "last-run")!.value).toBe(yesterdayIso());
  });

  it("lastRun reports the real newest result when multiple real results exist, not just any one", async () => {
    currentTimeline = timeline([
      event({ id: "timeline:security:older", eventType: "security", timestamp: yesterdayIso() }),
      event({ id: "timeline:security:newer", eventType: "security", timestamp: todayIso() }),
    ]);
    const { useAutomationMetrics } = await freshUseAutomationMetrics();
    const { result } = renderHook(() => useAutomationMetrics());

    // Each real event genuinely matches two default rules (see above) — 2 events × 2 matching rules = 4 real results.
    expect(result.current.find((item) => item.key === "all-time")!.value).toBe(4);
    expect(result.current.find((item) => item.key === "last-run")!.value).toBe(todayIso());
  });

  it("the 'last-run' item is genuinely absent (not a fabricated zero-value entry) when there are no real results", async () => {
    const { useAutomationMetrics } = await freshUseAutomationMetrics();
    const { result } = renderHook(() => useAutomationMetrics());
    expect(result.current.some((item) => item.key === "last-run")).toBe(false);
  });

  it("returns the exact same array reference across an unrelated re-render — real memoization, not rebuilt on every call", async () => {
    currentTimeline = timeline([event({ id: "timeline:security:1", eventType: "security", timestamp: todayIso() })]);
    const { useAutomationMetrics } = await freshUseAutomationMetrics();
    const { result, rerender } = renderHook(() => useAutomationMetrics());

    const before = result.current;
    rerender();
    expect(result.current).toBe(before);
  });

  it("recomputes to a real new reference when the underlying real rules genuinely change", async () => {
    const { useAutomationMetrics } = await freshUseAutomationMetrics();
    const { setRuleEnabled } = await import("@/lib/automation/rules");
    const { result, rerender } = renderHook(() => useAutomationMetrics());

    const before = result.current;
    setRuleEnabled("rule:critical-security", false);
    rerender();

    expect(result.current).not.toBe(before);
    expect(result.current.find((item) => item.key === "active")!.value).toBe("4/5");
  });
});
