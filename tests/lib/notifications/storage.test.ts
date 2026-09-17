import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Timeline, TimelineEvent } from "@/lib/timeline/types";

const STORAGE_KEY = "base-radar:notification-read-state";

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

let currentTimeline: Timeline = timeline([event({ id: "timeline:alert:1" }), event({ id: "timeline:alert:2" })]);

vi.mock("@/lib/timeline/storage", () => ({
  getTimeline: () => currentTimeline,
}));

/**
 * V3-NOTIFICATION-001 — every real production repro in the bug report is a
 * FULL BROWSER REFRESH, which re-evaluates every JS module from scratch
 * (fresh in-memory state) while `localStorage` survives. `vi.resetModules()`
 * + a fresh dynamic `import()` is the accurate unit-test equivalent of that
 * exact scenario — it resets `lib/notifications/storage.ts`'s module-scope
 * `readOverlay`/`hydrated`/caches while leaving `window.localStorage` (a
 * real jsdom global) untouched, exactly like a real page reload.
 */
async function freshStorageModule() {
  vi.resetModules();
  return import("@/lib/notifications/storage");
}

describe("Notification read-state persistence across a simulated browser refresh", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    currentTimeline = timeline([event({ id: "timeline:alert:1" }), event({ id: "timeline:alert:2" })]);
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("scenario 1 — mark all read, then a simulated refresh: unread remains 0, not reset to the original count", async () => {
    const first = await freshStorageModule();
    expect(first.getNotifications().filter((n) => !n.isRead)).toHaveLength(2);

    first.markAllNotificationsRead();
    expect(first.getNotifications().filter((n) => !n.isRead)).toHaveLength(0);

    // Simulated browser refresh — fresh module instance, same localStorage, same underlying Timeline (nothing regenerated).
    const second = await freshStorageModule();
    expect(second.getNotifications().filter((n) => !n.isRead)).toHaveLength(0);
  });

  it("scenario 2 — a genuinely new notification appears after refresh: unread becomes 1, and the two already-read ones stay read", async () => {
    const first = await freshStorageModule();
    first.markAllNotificationsRead();
    expect(first.getNotifications().filter((n) => !n.isRead)).toHaveLength(0);

    // A real new event, plus the same two from before (same ids — the honest case where nothing about the old two regenerated).
    currentTimeline = timeline([
      event({ id: "timeline:alert:1" }),
      event({ id: "timeline:alert:2" }),
      event({ id: "timeline:alert:3", timestamp: "2026-09-04T01:00:00.000Z" }),
    ]);

    const second = await freshStorageModule();
    const unread = second.getNotifications().filter((n) => !n.isRead);
    expect(unread).toHaveLength(1);
    expect(unread[0].id).toBe("notification:timeline:alert:3");
  });

  it("scenario 4 — an individually-marked-read notification stays read across a refresh", async () => {
    const first = await freshStorageModule();
    const [target] = first.getNotifications();
    first.markNotificationRead(target.id);

    const second = await freshStorageModule();
    const restored = second.getNotifications().find((n) => n.id === target.id);
    expect(restored?.isRead).toBe(true);
    expect(restored?.readAt).not.toBeNull();
  });

  it("does not fabricate a readAt for a notification that was never marked read", async () => {
    const mod = await freshStorageModule();
    const [, second] = mod.getNotifications();
    expect(second.isRead).toBe(false);
    expect(second.readAt).toBeNull();
  });

  it("markNotificationUnread reverses a read marker and persists that reversal across a refresh", async () => {
    const first = await freshStorageModule();
    const [target] = first.getNotifications();
    first.markNotificationRead(target.id);
    first.markNotificationUnread(target.id);

    const second = await freshStorageModule();
    expect(second.getNotifications().find((n) => n.id === target.id)?.isRead).toBe(false);
  });

  it("clearAllReadState reverts every notification to unread and persists that across a refresh", async () => {
    const first = await freshStorageModule();
    first.markAllNotificationsRead();
    first.clearAllReadState();

    const second = await freshStorageModule();
    expect(second.getNotifications().every((n) => !n.isRead)).toBe(true);
  });

  it("existing notifications are never deleted by a refresh — only the read flag changes", async () => {
    const first = await freshStorageModule();
    first.markAllNotificationsRead();

    const second = await freshStorageModule();
    expect(second.getNotifications()).toHaveLength(2);
    expect(second.getNotifications().map((n) => n.id).sort()).toEqual(["notification:timeline:alert:1", "notification:timeline:alert:2"]);
  });

  it("a corrupted localStorage value falls back to an empty overlay rather than throwing", async () => {
    window.localStorage.setItem(STORAGE_KEY, "not valid json{{{");
    const mod = await freshStorageModule();
    expect(() => mod.getNotifications()).not.toThrow();
    expect(mod.getNotifications().every((n) => !n.isRead)).toBe(true);
  });
});
