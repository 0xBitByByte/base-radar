import { describe, expect, it } from "vitest";

import { buildWalletHistoryIndexes } from "@/lib/wallet-history/indexes";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

function makeSnapshot(overrides: Partial<AnalyticsSnapshot> & { timestamp: string }): AnalyticsSnapshot {
  return {
    analyticsVersion: 1,
    overallScore: 60,
    healthScore: 60,
    riskScore: 40,
    confidenceScore: 75,
    confidenceLevel: "moderate",
    fingerprint: "Balanced",
    largestHoldingSymbol: null,
    largestProtocolName: null,
    primaryRecommendationId: null,
    topWarningId: null,
    totalValue: 10000,
    stablecoinExposure: 20,
    ethPct: 50,
    diversificationScore: 65,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    warningIds: [],
    topHoldings: [],
    ...overrides,
  };
}

describe("buildWalletHistoryIndexes — real position lookup", () => {
  it("indexByTimestamp resolves to the exact array position — history[index] is that real snapshot", () => {
    const a = makeSnapshot({ timestamp: "2026-08-01T00:00:00.000Z" });
    const b = makeSnapshot({ timestamp: "2026-08-10T00:00:00.000Z" });
    const history = [a, b];
    const indexes = buildWalletHistoryIndexes(history);
    expect(indexes.indexByTimestamp.get("2026-08-01T00:00:00.000Z")).toBe(0);
    expect(indexes.indexByTimestamp.get("2026-08-10T00:00:00.000Z")).toBe(1);
    expect(history[indexes.indexByTimestamp.get("2026-08-10T00:00:00.000Z")!]).toBe(b);
  });
});

describe("buildWalletHistoryIndexes — behavior matches Array.prototype.findIndex()'s 'first match' semantics", () => {
  it("keeps the FIRST index when two snapshots share a timestamp, exactly like .findIndex() would", () => {
    const first = makeSnapshot({ timestamp: "2026-08-10T00:00:00.000Z", totalValue: 1 });
    const second = makeSnapshot({ timestamp: "2026-08-10T00:00:00.000Z", totalValue: 2 });
    const history = [first, second];
    const indexes = buildWalletHistoryIndexes(history);
    expect(indexes.indexByTimestamp.get("2026-08-10T00:00:00.000Z")).toBe(0);
    expect(history.findIndex((s) => s.timestamp === "2026-08-10T00:00:00.000Z")).toBe(0);
  });
});

describe("buildWalletHistoryIndexes — MISSING / EMPTY", () => {
  it("genuinely empty history produces a genuinely empty map", () => {
    expect(buildWalletHistoryIndexes([]).indexByTimestamp.size).toBe(0);
  });

  it("a lookup for a real timestamp that genuinely isn't in history returns undefined, never a fabricated index", () => {
    expect(buildWalletHistoryIndexes([]).indexByTimestamp.get("2026-08-10T00:00:00.000Z")).toBeUndefined();
  });
});

describe("buildWalletHistoryIndexes — DETERMINISM", () => {
  it("identical input produces an identical index", () => {
    const history = [makeSnapshot({ timestamp: "2026-08-01T00:00:00.000Z" })];
    expect(buildWalletHistoryIndexes(history).indexByTimestamp.get("2026-08-01T00:00:00.000Z")).toBe(buildWalletHistoryIndexes(history).indexByTimestamp.get("2026-08-01T00:00:00.000Z"));
  });
});
