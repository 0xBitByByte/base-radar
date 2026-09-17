import { describe, expect, it } from "vitest";

import { replayFirst, replayJumpToDate, replayLatest, replayNext, replayPrevious, resolveReplayPosition } from "@/components/wallet/walletReplayController";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

function snap(overrides: Partial<AnalyticsSnapshot> & { timestamp: string }): AnalyticsSnapshot {
  return {
    analyticsVersion: 1,
    overallScore: 60,
    healthScore: 65,
    riskScore: 30,
    confidenceScore: 80,
    confidenceLevel: "moderate",
    fingerprint: "Mixed",
    largestHoldingSymbol: "ETH",
    largestProtocolName: null,
    primaryRecommendationId: null,
    topWarningId: null,
    totalValue: 10000,
    stablecoinExposure: 20,
    ethPct: 50,
    diversificationScore: 70,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    warningIds: [],
    topHoldings: [],
    ...overrides,
  };
}

const history: AnalyticsSnapshot[] = [
  snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 50 }),
  snap({ timestamp: "2026-08-05T00:00:00.000Z", healthScore: 60 }),
  snap({ timestamp: "2026-08-10T00:00:00.000Z", healthScore: 70 }),
  snap({ timestamp: "2026-08-15T00:00:00.000Z", healthScore: 80 }),
];

describe("walletReplayController — resolveReplayPosition", () => {
  it("empty history: null", () => {
    expect(resolveReplayPosition([], null)).toBeNull();
  });

  it("single snapshot: index 1 of 1, both first and latest", () => {
    const single = [history[0]];
    const position = resolveReplayPosition(single, single[0].timestamp);
    expect(position).toEqual({ snapshot: single[0], index: 1, total: 1, isFirst: true, isLatest: true });
  });

  it("first snapshot: isFirst true, isLatest false", () => {
    const position = resolveReplayPosition(history, history[0].timestamp);
    expect(position?.index).toBe(1);
    expect(position?.isFirst).toBe(true);
    expect(position?.isLatest).toBe(false);
  });

  it("last snapshot: isLatest true, isFirst false", () => {
    const position = resolveReplayPosition(history, history[3].timestamp);
    expect(position?.index).toBe(4);
    expect(position?.isLatest).toBe(true);
    expect(position?.isFirst).toBe(false);
  });

  it("middle snapshot: neither first nor latest, real index", () => {
    const position = resolveReplayPosition(history, history[1].timestamp);
    expect(position?.index).toBe(2);
    expect(position?.total).toBe(4);
    expect(position?.isFirst).toBe(false);
    expect(position?.isLatest).toBe(false);
    expect(position?.snapshot.healthScore).toBe(60);
  });

  it("null timestamp falls back to the real latest snapshot, never a blank replay", () => {
    const position = resolveReplayPosition(history, null);
    expect(position?.snapshot.timestamp).toBe("2026-08-15T00:00:00.000Z");
    expect(position?.isLatest).toBe(true);
  });

  it("a timestamp no longer present (e.g. aged out of the real history cap) falls back to latest", () => {
    const position = resolveReplayPosition(history, "2020-01-01T00:00:00.000Z");
    expect(position?.snapshot.timestamp).toBe("2026-08-15T00:00:00.000Z");
  });
});

describe("walletReplayController — navigation", () => {
  it("replayFirst returns the real oldest timestamp; null on empty history", () => {
    expect(replayFirst(history)).toBe("2026-08-01T00:00:00.000Z");
    expect(replayFirst([])).toBeNull();
  });

  it("replayLatest returns the real newest timestamp; null on empty history", () => {
    expect(replayLatest(history)).toBe("2026-08-15T00:00:00.000Z");
    expect(replayLatest([])).toBeNull();
  });

  it("replayNext steps forward one real snapshot", () => {
    expect(replayNext(history, history[0].timestamp)).toBe("2026-08-05T00:00:00.000Z");
    expect(replayNext(history, history[1].timestamp)).toBe("2026-08-10T00:00:00.000Z");
  });

  it("replayNext clamps at the real latest snapshot — a real no-op, never wraps", () => {
    expect(replayNext(history, history[3].timestamp)).toBe(history[3].timestamp);
  });

  it("replayPrevious steps backward one real snapshot (reuses findPreviousSnapshot exactly as implemented)", () => {
    expect(replayPrevious(history, history[3].timestamp)).toBe("2026-08-10T00:00:00.000Z");
    expect(replayPrevious(history, history[1].timestamp)).toBe("2026-08-01T00:00:00.000Z");
  });

  it("replayPrevious clamps at the real first snapshot — a real no-op, never throws", () => {
    expect(replayPrevious(history, history[0].timestamp)).toBe(history[0].timestamp);
  });

  it("navigation with an unknown timestamp is a real no-op, not a crash", () => {
    expect(replayNext(history, "2099-01-01T00:00:00.000Z")).toBe("2099-01-01T00:00:00.000Z");
    expect(replayPrevious(history, "2099-01-01T00:00:00.000Z")).toBe("2099-01-01T00:00:00.000Z");
  });

  it("single-snapshot history: previous and next are both real no-ops", () => {
    const single = [history[0]];
    expect(replayPrevious(single, single[0].timestamp)).toBe(single[0].timestamp);
    expect(replayNext(single, single[0].timestamp)).toBe(single[0].timestamp);
    expect(replayFirst(single)).toBe(single[0].timestamp);
    expect(replayLatest(single)).toBe(single[0].timestamp);
  });
});

describe("walletReplayController — replayJumpToDate", () => {
  it("jumps to the real latest snapshot at or before the given date", () => {
    expect(replayJumpToDate(history, "2026-08-07")).toBe("2026-08-05T00:00:00.000Z");
  });

  it("jumping exactly on a real snapshot's date resolves to that same snapshot", () => {
    expect(replayJumpToDate(history, "2026-08-10")).toBe("2026-08-10T00:00:00.000Z");
  });

  it("jumping past the real latest snapshot resolves to the latest", () => {
    expect(replayJumpToDate(history, "2026-12-31")).toBe("2026-08-15T00:00:00.000Z");
  });

  it("jumping before every real snapshot returns null — honestly nothing to show, never clamped", () => {
    expect(replayJumpToDate(history, "2020-01-01")).toBeNull();
  });

  it("empty history: always null", () => {
    expect(replayJumpToDate([], "2026-08-10")).toBeNull();
  });
});
