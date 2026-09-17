import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import type { Timeline, TimelineEvent } from "@/lib/timeline/types";

const RULE_STATE_KEY = "base-radar:automation-rule-state";
const PREFERENCES_KEY = "base-radar:automation-preferences";
const READ_STATE_KEY = "base-radar:notification-read-state";

// Same real-Timeline-mock technique tests/lib/notifications/storage.test.ts
// already establishes — the ONE upstream boundary Notifications derive
// from, letting the real lib/notifications/storage.ts,
// lib/automation/rules.ts, lib/automation/preferences.ts, and
// lib/automation/storage.ts all run genuinely underneath this hook.
//
// Every test uses `vi.resetModules()` + a fresh dynamic `import()` (the
// exact convention tests/lib/automation/storage.test.ts and
// tests/lib/automation/rules.test.ts already establish), because
// lib/notifications/storage.ts, lib/automation/rules.ts, and
// lib/automation/preferences.ts all cache state at module scope. This is
// not just hygiene here: reusing one module instance across tests that
// change `currentTimeline` between them surfaces a REAL, confirmed defect
// in lib/notifications/storage.ts's `getNotifications()` — its overlay
// cache invalidates only on `overlayVersion` (read-state) changes, never
// on the underlying raw-notifications identity changing from a genuine
// Timeline change, contradicting that function's own documented contract
// ("Same reference returned until either the underlying Timeline or the
// read-state overlay actually changes"). That defect is reported in this
// turn's implementation report, not fixed here (out of this task's scope,
// per its own instruction to stop and report rather than fix). Each test
// below sets its Timeline state once, before the first render, and never
// reassigns it to a different Timeline object mid-test — the one
// reliable way to get genuinely correct results without either masking
// or accidentally depending on that bug.
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

async function freshUseAutomation() {
  vi.resetModules();
  return import("@/lib/hooks/useAutomation");
}

describe("useAutomation", () => {
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

  it("starts with an honest empty result list and automation enabled by real default, when nothing has ever happened", async () => {
    const { useAutomation } = await freshUseAutomation();
    const { result } = renderHook(() => useAutomation());
    expect(result.current.results).toEqual([]);
    expect(result.current.enabled).toBe(true);
  });

  it("surfaces a real AutomationResult end-to-end, from a real Timeline event through Notifications through rule-matching", async () => {
    currentTimeline = timeline([event({ id: "timeline:security:1", eventType: "security" })]);
    const { useAutomation } = await freshUseAutomation();
    const { result } = renderHook(() => useAutomation());

    expect(result.current.results.some((r) => r.ruleId === "rule:critical-security")).toBe(true);
  });

  it("the master kill switch: enabled reflects the real preference, and results become genuinely empty while disabled, even with a real match on file", async () => {
    currentTimeline = timeline([event({ id: "timeline:security:1", eventType: "security" })]);
    const { useAutomation } = await freshUseAutomation();
    const { setAutomationEnabled } = await import("@/lib/automation/preferences");
    const { result } = renderHook(() => useAutomation());

    expect(result.current.results.length).toBeGreaterThan(0);

    act(() => setAutomationEnabled(false));
    expect(result.current.enabled).toBe(false);
    expect(result.current.results).toEqual([]);

    act(() => setAutomationEnabled(true));
    expect(result.current.enabled).toBe(true);
    expect(result.current.results.length).toBeGreaterThan(0);
  });

  it("reacts to a real rule being disabled — the matching result disappears on the next render, without remounting", async () => {
    currentTimeline = timeline([event({ id: "timeline:security:1", eventType: "security" })]);
    const { useAutomation } = await freshUseAutomation();
    const { setRuleEnabled } = await import("@/lib/automation/rules");
    const { result } = renderHook(() => useAutomation());

    expect(result.current.results.some((r) => r.ruleId === "rule:critical-security")).toBe(true);

    act(() => setRuleEnabled("rule:critical-security", false));
    expect(result.current.results.some((r) => r.ruleId === "rule:critical-security")).toBe(false);

    act(() => setRuleEnabled("rule:critical-security", true));
    expect(result.current.results.some((r) => r.ruleId === "rule:critical-security")).toBe(true);
  });

  it("reacts to a real notification read-state change — a rule conditioned on isRead stops matching once the notification is marked read", async () => {
    currentTimeline = timeline([event({ id: "timeline:critical-unread:1", eventType: "security" })]);
    const { useAutomation } = await freshUseAutomation();
    const { markNotificationRead } = await import("@/lib/notifications/storage");
    const { result } = renderHook(() => useAutomation());

    // rule:unread-critical fires on a critical-notification trigger with an isRead:false condition.
    expect(result.current.results.some((r) => r.ruleId === "rule:unread-critical")).toBe(true);

    act(() => markNotificationRead("notification:timeline:critical-unread:1"));
    expect(result.current.results.some((r) => r.ruleId === "rule:unread-critical")).toBe(false);
  });

  it("results stays the exact same reference across an unrelated re-render — real caching, not rebuilt on every call", async () => {
    currentTimeline = timeline([event({ id: "timeline:security:1", eventType: "security" })]);
    const { useAutomation } = await freshUseAutomation();
    const { result, rerender } = renderHook(() => useAutomation());

    const before = result.current.results;
    rerender();
    expect(result.current.results).toBe(before);
  });

  it("subscribes to all 5 real documented sources on mount, and unsubscribes from every one of them on unmount", async () => {
    vi.resetModules();
    const alertsService = await import("@/lib/alerts/service");
    const personalizationStorage = await import("@/lib/personalization/storage");
    const notificationsStorage = await import("@/lib/notifications/storage");
    const automationRules = await import("@/lib/automation/rules");
    const automationPreferences = await import("@/lib/automation/preferences");

    const unsubscribeAlerts = vi.fn();
    const unsubscribeWatchlist = vi.fn();
    const unsubscribeNotifications = vi.fn();
    const unsubscribeRules = vi.fn();
    const unsubscribePreferences = vi.fn();

    const alertsSpy = vi.spyOn(alertsService, "subscribe").mockReturnValue(unsubscribeAlerts);
    const watchlistSpy = vi.spyOn(personalizationStorage, "subscribe").mockReturnValue(unsubscribeWatchlist);
    const notificationsSpy = vi.spyOn(notificationsStorage, "subscribe").mockReturnValue(unsubscribeNotifications);
    const rulesSpy = vi.spyOn(automationRules, "subscribeToAutomationRules").mockReturnValue(unsubscribeRules);
    const preferencesSpy = vi.spyOn(automationPreferences, "subscribeToAutomationPreferences").mockReturnValue(unsubscribePreferences);

    const { useAutomation } = await import("@/lib/hooks/useAutomation");
    const { unmount } = renderHook(() => useAutomation());

    expect(alertsSpy).toHaveBeenCalled();
    expect(watchlistSpy).toHaveBeenCalled();
    expect(notificationsSpy).toHaveBeenCalled();
    expect(rulesSpy).toHaveBeenCalled();
    // preferences is subscribed to twice: once inside useAutomation's own
    // composed subscribe(), and once directly for the hook's second,
    // independent useSyncExternalStore call for `enabled` — both real.
    expect(preferencesSpy).toHaveBeenCalled();

    unmount();

    expect(unsubscribeAlerts).toHaveBeenCalledOnce();
    expect(unsubscribeWatchlist).toHaveBeenCalledOnce();
    expect(unsubscribeNotifications).toHaveBeenCalledOnce();
    expect(unsubscribeRules).toHaveBeenCalledOnce();
    expect(unsubscribePreferences).toHaveBeenCalled();
  });

  it("PR-096.03 hydration safety: the server-rendered snapshot is the real, honest empty/enabled default — never a real client-side result or preference, even when real matching data already exists", async () => {
    currentTimeline = timeline([event({ id: "timeline:security:1", eventType: "security" })]);
    const { useAutomation } = await freshUseAutomation();
    const { setAutomationEnabled } = await import("@/lib/automation/preferences");
    setAutomationEnabled(false); // a real, non-default client-side preference

    function Probe() {
      const { results, enabled } = useAutomation();
      return (
        <span>
          {results.length} results, automation {enabled ? "enabled" : "disabled"}
        </span>
      );
    }

    const html = renderToString(<Probe />);
    expect(html.replace(/<!--\s*-->/g, "")).toContain("0 results, automation enabled");
  });
});
