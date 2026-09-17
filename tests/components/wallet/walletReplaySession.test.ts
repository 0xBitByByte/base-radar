import { afterEach, describe, expect, it, vi } from "vitest";

import { getActiveReplayTimestamp, isReplayingSnapshot, setActiveReplayTimestamp, subscribeToReplaySession } from "@/components/wallet/walletReplaySession";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

function snap(timestamp: string): AnalyticsSnapshot {
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
    timestamp,
  };
}

afterEach(() => {
  setActiveReplayTimestamp(null); // real cleanup — this is genuine module-scope state shared across tests
});

describe("walletReplaySession", () => {
  it("starts with no active replay", () => {
    expect(getActiveReplayTimestamp()).toBeNull();
  });

  it("setActiveReplayTimestamp sets and clears the real active timestamp", () => {
    setActiveReplayTimestamp("2026-08-10T00:00:00.000Z");
    expect(getActiveReplayTimestamp()).toBe("2026-08-10T00:00:00.000Z");
    setActiveReplayTimestamp(null);
    expect(getActiveReplayTimestamp()).toBeNull();
  });

  it("notifies real subscribers only when the value actually changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToReplaySession(listener);

    setActiveReplayTimestamp("2026-08-10T00:00:00.000Z");
    expect(listener).toHaveBeenCalledTimes(1);

    setActiveReplayTimestamp("2026-08-10T00:00:00.000Z"); // same value — no real change, no notify
    expect(listener).toHaveBeenCalledTimes(1);

    setActiveReplayTimestamp(null);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setActiveReplayTimestamp("2026-08-11T00:00:00.000Z");
    expect(listener).toHaveBeenCalledTimes(2); // unsubscribed — no further calls
  });

  it("isReplayingSnapshot: true only for the exact real snapshot currently active", () => {
    const a = snap("2026-08-01T00:00:00.000Z");
    const b = snap("2026-08-05T00:00:00.000Z");

    expect(isReplayingSnapshot(a)).toBe(false);
    expect(isReplayingSnapshot(null)).toBe(false);

    setActiveReplayTimestamp(a.timestamp);
    expect(isReplayingSnapshot(a)).toBe(true);
    expect(isReplayingSnapshot(b)).toBe(false);
  });
});
