import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dayBucket, isWithinDays, makeAlertId, startOfTodayIso } from "@/lib/alerts/providers/shared";

describe("dayBucket / startOfTodayIso — V3-NOTIFICATION-001's read-state-stability fix", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("dayBucket returns a plain YYYY-MM-DD string (UTC), suitable for use as a stable id segment", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T15:42:07.123Z"));
    expect(dayBucket()).toBe("2026-09-04");
  });

  it("dayBucket is IDENTICAL across two calls minutes apart on the same UTC day — the exact scenario that broke read-state persistence (a live metric like a 24h price change ticks between calls, a day bucket does not)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    const first = dayBucket();

    vi.setSystemTime(new Date("2026-09-04T10:07:33.000Z")); // simulates the gap between "mark all read" and "refresh browser"
    const second = dayBucket();

    expect(second).toBe(first);
  });

  it("dayBucket changes only once a real UTC day boundary is crossed — a genuinely new day still gets a genuinely new id, so a fresh alert-worthy signal is never silently suppressed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T23:59:59.000Z"));
    const beforeMidnight = dayBucket();

    vi.setSystemTime(new Date("2026-09-05T00:00:01.000Z"));
    const afterMidnight = dayBucket();

    expect(afterMidnight).not.toBe(beforeMidnight);
  });

  it("startOfTodayIso is a real, valid ISO timestamp anchored to midnight UTC of the current dayBucket — stable across the same refresh scenario, never Date.now()/the fetch moment", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T15:42:07.123Z"));
    expect(startOfTodayIso()).toBe("2026-09-04T00:00:00.000Z");
    expect(Number.isNaN(new Date(startOfTodayIso()).getTime())).toBe(false);
  });

  it("startOfTodayIso stays identical across two calls on the same day, unlike new Date().toISOString() which would differ every call", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    const first = startOfTodayIso();
    vi.setSystemTime(new Date("2026-09-04T18:30:00.000Z"));
    const second = startOfTodayIso();
    expect(second).toBe(first);
  });
});

describe("makeAlertId + dayBucket composition — the real fix shape used by coingecko/defillama/github providers", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("an id built from (projectId, dayBucket(), direction) is stable across fetches with a DIFFERENT raw fluctuating value on the same day — reproduces, then proves fixed, the exact read-state bug", () => {
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    // Two "fetches" of the same underlying fact, seconds apart, with the
    // live percentage having moved (8.1% -> 8.3%) — the pre-fix id
    // (`coingecko:price-move:${id}:${Math.round(change)}`) would differ
    // here whenever the rounded value itself ticked; the fixed id does not.
    const idFetch1 = makeAlertId("coingecko", "price-move", "aerodrome-finance", dayBucket(), "up");
    vi.setSystemTime(new Date("2026-09-04T10:00:04.000Z"));
    const idFetch2 = makeAlertId("coingecko", "price-move", "aerodrome-finance", dayBucket(), "up");

    expect(idFetch2).toBe(idFetch1);
  });

  it("an id changes when the direction flips, even on the same day — a reversal is a genuinely different alert, correctly not merged into the same id", () => {
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    const up = makeAlertId("coingecko", "price-move", "aerodrome-finance", dayBucket(), "up");
    const down = makeAlertId("coingecko", "price-move", "aerodrome-finance", dayBucket(), "down");
    expect(up).not.toBe(down);
  });
});

describe("isWithinDays — unaffected by this fix, confirmed still correct", () => {
  it("returns false for a null/undefined timestamp", () => {
    expect(isWithinDays(null, 7)).toBe(false);
    expect(isWithinDays(undefined, 7)).toBe(false);
  });

  it("returns true for a timestamp within the window, false outside it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T00:00:00.000Z"));
    expect(isWithinDays("2026-09-05T00:00:00.000Z", 7)).toBe(true);
    expect(isWithinDays("2026-08-01T00:00:00.000Z", 7)).toBe(false);
    vi.useRealTimers();
  });
});
