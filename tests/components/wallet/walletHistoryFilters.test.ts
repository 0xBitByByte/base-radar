import { describe, expect, it } from "vitest";

import {
  DEFAULT_SNAPSHOT_FILTERS,
  buildHighlightsBySnapshotTimestamp,
  filterAndSortSnapshots,
  getDistinctFingerprints,
  groupSnapshotsByRecency,
} from "@/components/wallet/walletHistoryFilters";
import type { AnalyticsHighlight } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

function snap(overrides: Partial<AnalyticsSnapshot> & { timestamp: string }): AnalyticsSnapshot {
  return {
    analyticsVersion: 1,
    overallScore: 60,
    healthScore: 65,
    riskScore: 30,
    confidenceScore: 80,
    confidenceLevel: "High",
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

function highlight(overrides: Partial<AnalyticsHighlight> & { type: AnalyticsHighlight["type"]; dedupeKey: string }): AnalyticsHighlight {
  return {
    priority: "positive",
    stars: 3,
    title: "Test Highlight",
    reason: "Because reasons.",
    supportingMetric: null,
    topic: "health",
    ...overrides,
  };
}

describe("walletHistoryFilters — groupSnapshotsByRecency", () => {
  // Real LOCAL-time day boundaries, deliberately — "Today" should match the
  // viewer's own calendar day, not a fixed UTC cutoff (verified: this
  // sandbox runs in IST, not UTC, so hardcoding UTC-aligned timestamps here
  // would silently test the wrong thing on a non-UTC machine). Every
  // timestamp below is built via the same local `Date` mutation methods
  // `groupSnapshotsByRecency` itself uses, so this test is correct
  // regardless of which timezone it actually runs in.
  const NOW = new Date();
  NOW.setHours(12, 0, 0, 0);

  function localTime(daysAgo: number, hour: number): string {
    const d = new Date(NOW);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  it("groups a real snapshot from today into 'today'", () => {
    const groups = groupSnapshotsByRecency([snap({ timestamp: localTime(0, 7) })], NOW);
    expect(groups.today).toHaveLength(1);
    expect(groups.yesterday).toHaveLength(0);
  });

  it("groups yesterday, this week, and earlier correctly by real calendar day, not a rolling 24h window", () => {
    const groups = groupSnapshotsByRecency(
      [
        snap({ timestamp: localTime(1, 23) }), // yesterday, even though <24h before "now" in some cases
        snap({ timestamp: localTime(5, 0) }), // this week
        snap({ timestamp: localTime(45, 0) }), // earlier
      ],
      NOW
    );
    expect(groups.yesterday).toHaveLength(1);
    expect(groups.thisWeek).toHaveLength(1);
    expect(groups.earlier).toHaveLength(1);
  });

  it("PRESERVES the input's existing order — grouping only buckets, it never sorts (ordering is filterAndSortSnapshots' job alone, so a caller's chosen 'newest'/'oldest' order survives grouping unchanged)", () => {
    const newestFirst = [snap({ timestamp: localTime(0, 5) }), snap({ timestamp: localTime(0, 3) }), snap({ timestamp: localTime(0, 1) })];
    expect(groupSnapshotsByRecency(newestFirst, NOW).today.map((s) => s.timestamp)).toEqual(newestFirst.map((s) => s.timestamp));

    const oldestFirst = [...newestFirst].reverse();
    expect(groupSnapshotsByRecency(oldestFirst, NOW).today.map((s) => s.timestamp)).toEqual(oldestFirst.map((s) => s.timestamp));
  });

  it("empty history — every group is honestly empty, no crash", () => {
    const groups = groupSnapshotsByRecency([], NOW);
    expect(groups.today).toEqual([]);
    expect(groups.yesterday).toEqual([]);
    expect(groups.thisWeek).toEqual([]);
    expect(groups.earlier).toEqual([]);
  });

  it("large history (90 snapshots) groups without error", () => {
    const snapshots = Array.from({ length: 90 }, (_, i) => snap({ timestamp: new Date(NOW.getTime() - i * 6 * 60 * 60 * 1000).toISOString() }));
    expect(() => groupSnapshotsByRecency(snapshots, NOW)).not.toThrow();
    const total = Object.values(groupSnapshotsByRecency(snapshots, NOW)).reduce((sum, g) => sum + g.length, 0);
    expect(total).toBe(90);
  });
});

describe("walletHistoryFilters — filterAndSortSnapshots", () => {
  const history: AnalyticsSnapshot[] = [
    snap({ timestamp: "2026-08-01T00:00:00.000Z", fingerprint: "Balanced", healthScore: 50, confidenceScore: 60 }),
    snap({ timestamp: "2026-08-05T00:00:00.000Z", fingerprint: "Growth", healthScore: 70, confidenceScore: 80 }),
    snap({ timestamp: "2026-08-10T00:00:00.000Z", fingerprint: "Growth", healthScore: 90, confidenceScore: 95 }),
  ];

  it("no filters applied — sorts newest-first by default", () => {
    const result = filterAndSortSnapshots(history, DEFAULT_SNAPSHOT_FILTERS);
    expect(result.map((s) => s.timestamp)).toEqual(["2026-08-10T00:00:00.000Z", "2026-08-05T00:00:00.000Z", "2026-08-01T00:00:00.000Z"]);
  });

  it("sortOrder 'oldest' reverses the order", () => {
    const result = filterAndSortSnapshots(history, { ...DEFAULT_SNAPSHOT_FILTERS, sortOrder: "oldest" });
    expect(result.map((s) => s.timestamp)).toEqual(["2026-08-01T00:00:00.000Z", "2026-08-05T00:00:00.000Z", "2026-08-10T00:00:00.000Z"]);
  });

  it("filters by exact fingerprint", () => {
    const result = filterAndSortSnapshots(history, { ...DEFAULT_SNAPSHOT_FILTERS, fingerprint: "Growth" });
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.fingerprint === "Growth")).toBe(true);
  });

  it("filters by health range (inclusive)", () => {
    const result = filterAndSortSnapshots(history, { ...DEFAULT_SNAPSHOT_FILTERS, healthMin: 60, healthMax: 80 });
    expect(result).toHaveLength(1);
    expect(result[0].healthScore).toBe(70);
  });

  it("filters by confidence range (inclusive)", () => {
    const result = filterAndSortSnapshots(history, { ...DEFAULT_SNAPSHOT_FILTERS, confidenceMin: 90 });
    expect(result).toHaveLength(1);
    expect(result[0].confidenceScore).toBe(95);
  });

  it("filters by real date range, inclusive of the full 'to' day", () => {
    const result = filterAndSortSnapshots(history, { ...DEFAULT_SNAPSHOT_FILTERS, dateFrom: "2026-08-02", dateTo: "2026-08-05" });
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe("2026-08-05T00:00:00.000Z");
  });

  it("combines multiple filters (AND, not OR)", () => {
    const result = filterAndSortSnapshots(history, { ...DEFAULT_SNAPSHOT_FILTERS, fingerprint: "Growth", healthMin: 85 });
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe("2026-08-10T00:00:00.000Z");
  });

  it("empty history — returns an honestly empty array, never throws", () => {
    expect(filterAndSortSnapshots([], DEFAULT_SNAPSHOT_FILTERS)).toEqual([]);
  });

  it("never mutates the input array", () => {
    const before = [...history];
    filterAndSortSnapshots(history, { ...DEFAULT_SNAPSHOT_FILTERS, sortOrder: "oldest" });
    expect(history).toEqual(before);
  });
});

describe("walletHistoryFilters — getDistinctFingerprints", () => {
  it("returns real, distinct, sorted fingerprints — never a fixed/invented list", () => {
    const history = [snap({ timestamp: "2026-08-01T00:00:00.000Z", fingerprint: "Growth" }), snap({ timestamp: "2026-08-02T00:00:00.000Z", fingerprint: "Balanced" }), snap({ timestamp: "2026-08-03T00:00:00.000Z", fingerprint: "Growth" })];
    expect(getDistinctFingerprints(history)).toEqual(["Balanced", "Growth"]);
  });

  it("empty history — empty list", () => {
    expect(getDistinctFingerprints([])).toEqual([]);
  });
});

describe("walletHistoryFilters — buildHighlightsBySnapshotTimestamp (Phase 6)", () => {
  it("cross-references a real recovery highlight to its real recoveryDate, never recomputing", () => {
    const highlights = [highlight({ type: "recovery", dedupeKey: "recovery:risk:2026-08-05T00:00:00.000Z", title: "Recovered from High Risk" })];
    const map = buildHighlightsBySnapshotTimestamp(highlights);
    expect(map.get("2026-08-05T00:00:00.000Z")).toHaveLength(1);
    expect(map.get("2026-08-05T00:00:00.000Z")?.[0].title).toBe("Recovered from High Risk");
  });

  it("cross-references newPersonalBest and milestone highlights by their real date suffix", () => {
    const highlights = [
      highlight({ type: "newPersonalBest", dedupeKey: "newPersonalBest:health:2026-08-10T00:00:00.000Z" }),
      highlight({ type: "milestone", dedupeKey: "milestone:ethAllocation:2026-08-10T00:00:00.000Z" }),
    ];
    const map = buildHighlightsBySnapshotTimestamp(highlights);
    expect(map.get("2026-08-10T00:00:00.000Z")).toHaveLength(2);
  });

  it("NEVER attributes a biggestImprovement/biggestDecline/stabilityChange highlight to one snapshot — their dedupeKey suffix isn't a real date, and this refuses to guess", () => {
    const highlights = [
      highlight({ type: "biggestImprovement", dedupeKey: "biggestImprovement:health:biggest" }),
      highlight({ type: "stabilityChange", dedupeKey: "stabilityChange:stability:very-stable" }),
    ];
    const map = buildHighlightsBySnapshotTimestamp(highlights);
    expect(map.size).toBe(0);
  });

  it("empty highlights — empty map, never throws", () => {
    expect(buildHighlightsBySnapshotTimestamp([]).size).toBe(0);
  });

  it("multiple highlights on the same real timestamp all survive", () => {
    const highlights = [
      highlight({ type: "recovery", dedupeKey: "recovery:risk:2026-08-05T00:00:00.000Z" }),
      highlight({ type: "recovery", dedupeKey: "recovery:unknownAssets:2026-08-05T00:00:00.000Z" }),
    ];
    const map = buildHighlightsBySnapshotTimestamp(highlights);
    expect(map.get("2026-08-05T00:00:00.000Z")).toHaveLength(2);
  });
});
