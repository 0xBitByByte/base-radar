import { describe, expect, it } from "vitest";

import { deserializeAnalyticsSnapshot, serializeAnalyticsSnapshot } from "@/lib/wallet-analytics/serialization";
import { CURRENT_ANALYTICS_SNAPSHOT_VERSION } from "@/lib/wallet-automation/types";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

function snapshot(overrides: Partial<AutomationSnapshot> = {}): AutomationSnapshot {
  return {
    timestamp: "2026-01-01T00:00:00.000Z",
    analyticsVersion: CURRENT_ANALYTICS_SNAPSHOT_VERSION,
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
    warningIds: ["concentration"],
    topHoldings: [{ symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 }],
    ...overrides,
  };
}

describe("serialization.ts — serializeAnalyticsSnapshot / deserializeAnalyticsSnapshot", () => {
  it("round-trips a real snapshot with zero data loss", () => {
    const original = snapshot();
    const restored = deserializeAnalyticsSnapshot(serializeAnalyticsSnapshot(original));
    expect(restored).toEqual(original);
  });

  it("round-trips every field type correctly, including nested arrays/objects", () => {
    const original = snapshot({
      warningIds: ["a", "b", "c"],
      topHoldings: [
        { symbol: "ETH", name: "Ethereum", address: null, usdValue: 5000, allocationPct: 50 },
        { symbol: "USDC", name: "USD Coin", address: "0xusdc", usdValue: 2000, allocationPct: 20 },
      ],
      largestProtocolName: null,
    });
    const restored = deserializeAnalyticsSnapshot(serializeAnalyticsSnapshot(original));
    expect(restored?.warningIds).toEqual(["a", "b", "c"]);
    expect(restored?.topHoldings).toHaveLength(2);
    expect(restored?.largestProtocolName).toBeNull();
  });

  it("serialize is fully deterministic — identical input produces byte-identical output", () => {
    const original = snapshot();
    expect(serializeAnalyticsSnapshot(original)).toBe(serializeAnalyticsSnapshot(original));
  });

  it("serialize produces genuinely valid, parseable JSON", () => {
    expect(() => JSON.parse(serializeAnalyticsSnapshot(snapshot()))).not.toThrow();
  });

  it("deserialize rejects malformed JSON — returns null, never throws", () => {
    expect(deserializeAnalyticsSnapshot("{not valid json")).toBeNull();
    expect(() => deserializeAnalyticsSnapshot("{not valid json")).not.toThrow();
  });

  it("deserialize rejects non-object JSON values (array, string, number, null)", () => {
    expect(deserializeAnalyticsSnapshot("[]")).toBeNull();
    expect(deserializeAnalyticsSnapshot('"just a string"')).toBeNull();
    expect(deserializeAnalyticsSnapshot("42")).toBeNull();
    expect(deserializeAnalyticsSnapshot("null")).toBeNull();
  });

  it("deserialize rejects an object missing a required field", () => {
    const broken = JSON.stringify({ ...snapshot(), healthScore: undefined });
    // JSON.stringify drops undefined-valued keys entirely, so 'healthScore' is genuinely absent here
    expect(deserializeAnalyticsSnapshot(broken)).toBeNull();
  });

  it("VERSION-AWARE: pre-versioning data with no analyticsVersion at all is treated as real, valid version 0 and upgraded losslessly to the current version", () => {
    const { analyticsVersion: _unused, ...preVersioningData } = snapshot();
    void _unused;
    const restored = deserializeAnalyticsSnapshot(JSON.stringify(preVersioningData));
    expect(restored).not.toBeNull();
    expect(restored?.analyticsVersion).toBe(CURRENT_ANALYTICS_SNAPSHOT_VERSION);
    expect(restored?.healthScore).toBe(preVersioningData.healthScore);
    expect(restored?.topHoldings).toEqual(preVersioningData.topHoldings);
  });

  it("BACKWARD COMPATIBLE: rejects a version NEWER than this build understands, rather than silently misreading it", () => {
    const future = JSON.stringify({ ...snapshot(), analyticsVersion: CURRENT_ANALYTICS_SNAPSHOT_VERSION + 1 });
    expect(deserializeAnalyticsSnapshot(future)).toBeNull();
  });

  it("rejects a corrupted analyticsVersion (wrong type, negative, non-integer)", () => {
    expect(deserializeAnalyticsSnapshot(JSON.stringify({ ...snapshot(), analyticsVersion: "1" }))).toBeNull();
    expect(deserializeAnalyticsSnapshot(JSON.stringify({ ...snapshot(), analyticsVersion: -1 }))).toBeNull();
    expect(deserializeAnalyticsSnapshot(JSON.stringify({ ...snapshot(), analyticsVersion: 1.5 }))).toBeNull();
  });

  it("accepts the current version explicitly stamped, unchanged", () => {
    const restored = deserializeAnalyticsSnapshot(serializeAnalyticsSnapshot(snapshot({ analyticsVersion: CURRENT_ANALYTICS_SNAPSHOT_VERSION })));
    expect(restored?.analyticsVersion).toBe(CURRENT_ANALYTICS_SNAPSHOT_VERSION);
  });

  it("deserialize is fully deterministic", () => {
    const raw = serializeAnalyticsSnapshot(snapshot());
    expect(deserializeAnalyticsSnapshot(raw)).toEqual(deserializeAnalyticsSnapshot(raw));
  });

  it("never mutates its input", () => {
    const original = snapshot();
    const before = JSON.stringify(original);
    serializeAnalyticsSnapshot(original);
    expect(JSON.stringify(original)).toBe(before);
  });
});
