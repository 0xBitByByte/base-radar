import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Bell } from "lucide-react";

import type { Notification } from "@/lib/notifications/types";

const STORAGE_KEY = "base-radar:notification-preferences";

async function freshModule() {
  vi.resetModules();
  return import("@/lib/notifications/preferences");
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    readAt: null,
    isRead: false,
    title: "t",
    summary: "s",
    type: "alert",
    severity: null,
    source: "Alert Engine",
    projectId: null,
    projectName: null,
    link: null,
    icon: Bell,
    priority: "medium",
    timestamp: "2026-01-01T00:00:00.000Z",
    metadata: null,
    ...overrides,
  } as Notification;
}

describe("Notification preferences", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it("every real notification type starts enabled — nothing muted until the user says so", async () => {
    const { getNotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } = await freshModule();
    expect(getNotificationPreferences()).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(Object.values(getNotificationPreferences()).every((v) => v === true)).toBe(true);
  });

  it("setNotificationTypeEnabled toggles exactly one real type, persists, and notifies", async () => {
    const { setNotificationTypeEnabled, getNotificationPreferences, subscribeToNotificationPreferences } = await freshModule();
    const listener = vi.fn();
    subscribeToNotificationPreferences(listener);
    setNotificationTypeEnabled("security", false);
    expect(getNotificationPreferences().security).toBe(false);
    expect(getNotificationPreferences().alert).toBe(true); // untouched type stays real
    expect(listener).toHaveBeenCalledOnce();
  });

  it("setting a type to its current real value is a no-op — never a spurious notify", async () => {
    const { setNotificationTypeEnabled, subscribeToNotificationPreferences } = await freshModule();
    const listener = vi.fn();
    subscribeToNotificationPreferences(listener);
    setNotificationTypeEnabled("alert", true); // already true by default
    expect(listener).not.toHaveBeenCalled();
  });

  it("persists across a simulated refresh", async () => {
    const first = await freshModule();
    first.setNotificationTypeEnabled("governance", false);
    const second = await freshModule();
    expect(second.getNotificationPreferences().governance).toBe(false);
  });

  it("a corrupted or foreign stored value falls back to the honest all-enabled default", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    const { getNotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } = await freshModule();
    expect(() => getNotificationPreferences()).not.toThrow();
    expect(getNotificationPreferences()).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("a mismatched real version falls back to the honest default rather than trusting stale data", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, preferences: { alert: false } }));
    const { getNotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } = await freshModule();
    expect(getNotificationPreferences()).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  describe("isNotificationTypeEnabled / filterNotificationsByPreferences", () => {
    it("filters out exactly the real, disabled-type notifications, never a false positive/negative", async () => {
      const { filterNotificationsByPreferences, DEFAULT_NOTIFICATION_PREFERENCES } = await freshModule();
      const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, security: false };
      const notifications = [makeNotification({ id: "a", type: "alert" }), makeNotification({ id: "b", type: "security" })];
      const filtered = filterNotificationsByPreferences(notifications, prefs);
      expect(filtered.map((n) => n.id)).toEqual(["a"]);
    });
  });
});
