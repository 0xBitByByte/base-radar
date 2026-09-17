// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createDatabase } from "@/lib/backend/sqlite/db";
import { getAnalyticsSummary, isKnownAnalyticsEventName, recordAnalyticsEvent } from "@/lib/backend/sqlite/analyticsEvents";

describe("isKnownAnalyticsEventName", () => {
  it("accepts the real, known event name", () => {
    expect(isKnownAnalyticsEventName("page_view")).toBe(true);
  });

  it("rejects an unrecognized or non-string name", () => {
    expect(isKnownAnalyticsEventName("made-up-event")).toBe(false);
    expect(isKnownAnalyticsEventName(123)).toBe(false);
    expect(isKnownAnalyticsEventName(null)).toBe(false);
  });
});

describe("recordAnalyticsEvent / getAnalyticsSummary", () => {
  it("a genuinely empty event log returns an honest zero total and empty path list", () => {
    const db = createDatabase(":memory:");
    expect(getAnalyticsSummary(db)).toEqual({ totalPageViews: 0, topPaths: [] });
    db.close();
  });

  it("aggregates real page_view events into a real, correct total and per-path count", () => {
    const db = createDatabase(":memory:");
    recordAnalyticsEvent(db, { eventName: "page_view", path: "/dashboard", recordedAt: "2026-09-11T00:00:00.000Z" });
    recordAnalyticsEvent(db, { eventName: "page_view", path: "/dashboard", recordedAt: "2026-09-11T00:01:00.000Z" });
    recordAnalyticsEvent(db, { eventName: "page_view", path: "/dashboard/projects", recordedAt: "2026-09-11T00:02:00.000Z" });

    const summary = getAnalyticsSummary(db);
    expect(summary.totalPageViews).toBe(3);
    expect(summary.topPaths).toEqual([
      { path: "/dashboard", eventCount: 2 },
      { path: "/dashboard/projects", eventCount: 1 },
    ]);
    db.close();
  });

  it("orders paths by real, genuine popularity — most-visited first, never insertion order", () => {
    const db = createDatabase(":memory:");
    recordAnalyticsEvent(db, { eventName: "page_view", path: "/rare", recordedAt: "2026-09-11T00:00:00.000Z" });
    recordAnalyticsEvent(db, { eventName: "page_view", path: "/popular", recordedAt: "2026-09-11T00:01:00.000Z" });
    recordAnalyticsEvent(db, { eventName: "page_view", path: "/popular", recordedAt: "2026-09-11T00:02:00.000Z" });
    recordAnalyticsEvent(db, { eventName: "page_view", path: "/popular", recordedAt: "2026-09-11T00:03:00.000Z" });

    const summary = getAnalyticsSummary(db);
    expect(summary.topPaths[0]).toEqual({ path: "/popular", eventCount: 3 });
    expect(summary.topPaths[1]).toEqual({ path: "/rare", eventCount: 1 });
    db.close();
  });

  it("real limit bounds the number of returned paths without affecting the real total", () => {
    const db = createDatabase(":memory:");
    for (let i = 0; i < 5; i++) {
      recordAnalyticsEvent(db, { eventName: "page_view", path: `/page-${i}`, recordedAt: "2026-09-11T00:00:00.000Z" });
    }

    const summary = getAnalyticsSummary(db, 2);
    expect(summary.totalPageViews).toBe(5);
    expect(summary.topPaths).toHaveLength(2);
    db.close();
  });

  it("records no account/session/visitor identity of any kind — anonymous by construction", () => {
    const db = createDatabase(":memory:");
    recordAnalyticsEvent(db, { eventName: "page_view", path: "/dashboard", recordedAt: "2026-09-11T00:00:00.000Z" });

    const row = db.prepare("SELECT * FROM analytics_events").get() as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual(["event_name", "id", "path", "recorded_at"].sort());
    db.close();
  });
});
