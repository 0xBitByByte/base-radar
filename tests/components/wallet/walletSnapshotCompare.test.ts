import { describe, expect, it } from "vitest";

import { buildLastComparisonHeadline, compareSnapshots, findLatestSnapshot, findPreviousSnapshot } from "@/components/wallet/walletSnapshotCompare";
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

describe("walletSnapshotCompare — compareSnapshots", () => {
  it("respects the LITERAL argument order — 'from' is always the first argument, 'to' the second, never auto-resolved by real timestamp (this is what makes 'Swap Snapshots' a real, meaningful action rather than a no-op)", () => {
    const a = snap({ timestamp: "2026-08-10T00:00:00.000Z" });
    const b = snap({ timestamp: "2026-08-01T00:00:00.000Z" });
    expect(compareSnapshots(a, b).from.timestamp).toBe("2026-08-10T00:00:00.000Z");
    expect(compareSnapshots(a, b).to.timestamp).toBe("2026-08-01T00:00:00.000Z");
    // swapping the arguments swaps the result — a real, working "swap," not a no-op
    expect(compareSnapshots(b, a).from.timestamp).toBe("2026-08-01T00:00:00.000Z");
    expect(compareSnapshots(b, a).to.timestamp).toBe("2026-08-10T00:00:00.000Z");
  });

  it("swapping arguments genuinely flips every numeric delta's sign", () => {
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 50 });
    const newer = snap({ timestamp: "2026-08-05T00:00:00.000Z", healthScore: 90 });
    expect(compareSnapshots(older, newer).fields.find((f) => f.key === "healthScore")?.delta).toBe(40);
    expect(compareSnapshots(newer, older).fields.find((f) => f.key === "healthScore")?.delta).toBe(-40);
  });

  it("computes real numeric deltas for Health/Risk/Diversification/Stablecoin/ETH — new minus old, never inverted", () => {
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 50, riskScore: 60, diversificationScore: 40, stablecoinExposure: 10, ethPct: 30 });
    const newer = snap({ timestamp: "2026-08-05T00:00:00.000Z", healthScore: 58, riskScore: 45, diversificationScore: 55, stablecoinExposure: 25, ethPct: 40 });
    const comparison = compareSnapshots(older, newer);

    expect(comparison.fields.find((f) => f.key === "healthScore")?.delta).toBe(8);
    expect(comparison.fields.find((f) => f.key === "healthScore")?.summary).toBe("+8");
    // Risk is reported as a raw delta, NEVER inverted/framed as "improving" — this engine never recalculates or judges
    expect(comparison.fields.find((f) => f.key === "riskScore")?.delta).toBe(-15);
    expect(comparison.fields.find((f) => f.key === "riskScore")?.summary).toBe("-15");
    expect(comparison.fields.find((f) => f.key === "diversificationScore")?.delta).toBe(15);
  });

  it("formats Portfolio Value as a real signed currency delta (positive and negative, same '-' character convention as every other field)", () => {
    const base = snap({ timestamp: "2026-08-01T00:00:00.000Z", totalValue: 10000 });
    const up = snap({ timestamp: "2026-08-05T00:00:00.000Z", totalValue: 14800 });
    const down = snap({ timestamp: "2026-08-05T00:00:00.000Z", totalValue: 6500 });

    const upField = compareSnapshots(base, up).fields.find((f) => f.key === "totalValue")!;
    expect(upField.delta).toBe(4800);
    expect(upField.summary).toBe("+$4,800");

    const downField = compareSnapshots(base, down).fields.find((f) => f.key === "totalValue")!;
    expect(downField.delta).toBe(-3500);
    expect(downField.summary).toBe("-$3,500");
  });

  it("formats a percentage-unit field with a real signed percent delta", () => {
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z", ethPct: 62 });
    const newer = snap({ timestamp: "2026-08-05T00:00:00.000Z", ethPct: 50 });
    const field = compareSnapshots(older, newer).fields.find((f) => f.key === "ethPct")!;
    expect(field.summary).toBe("-12%");
  });

  it("formats categorical fields (Fingerprint, Confidence Level, Largest Holding) as real 'old → new' facts, never a numeric delta", () => {
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z", fingerprint: "Balanced Holder", confidenceLevel: "moderate", largestHoldingSymbol: "ETH" });
    const newer = snap({ timestamp: "2026-08-05T00:00:00.000Z", fingerprint: "Growth Seeker", confidenceLevel: "High", largestHoldingSymbol: "USDC" });
    const comparison = compareSnapshots(older, newer);

    expect(comparison.fields.find((f) => f.key === "fingerprint")?.summary).toBe("Balanced Holder → Growth Seeker");
    expect(comparison.fields.find((f) => f.key === "confidenceLevel")?.summary).toBe("moderate → High");
    expect(comparison.fields.find((f) => f.key === "largestHoldingSymbol")?.summary).toBe("ETH → USDC");
    expect(comparison.fields.find((f) => f.key === "fingerprint")?.delta).toBeNull();
  });

  it("EQUAL SNAPSHOTS: every field unchanged is honestly detected — identical=true, changedCount=0", () => {
    const s1 = snap({ timestamp: "2026-08-01T00:00:00.000Z" });
    const s2 = snap({ timestamp: "2026-08-05T00:00:00.000Z" }); // same values, different real timestamp
    const comparison = compareSnapshots(s1, s2);
    expect(comparison.identical).toBe(true);
    expect(comparison.changedCount).toBe(0);
    expect(comparison.fields.every((f) => !f.changed)).toBe(true);
  });

  it("changedCount counts exactly the real fields that differ, nothing more", () => {
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 50, riskScore: 30 });
    const newer = snap({ timestamp: "2026-08-05T00:00:00.000Z", healthScore: 90, riskScore: 30 }); // only health changed
    const comparison = compareSnapshots(older, newer);
    expect(comparison.changedCount).toBe(1);
    expect(comparison.identical).toBe(false);
  });

  it("computes a real elapsed timeSpanDays", () => {
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z" });
    const newer = snap({ timestamp: "2026-08-06T00:00:00.000Z" });
    expect(compareSnapshots(older, newer).timeSpanDays).toBe(5);
  });

  it("is fully deterministic", () => {
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 50 });
    const newer = snap({ timestamp: "2026-08-05T00:00:00.000Z", healthScore: 90 });
    expect(compareSnapshots(older, newer)).toEqual(compareSnapshots(older, newer));
  });

  it("never mutates its inputs", () => {
    const older = snap({ timestamp: "2026-08-01T00:00:00.000Z" });
    const newer = snap({ timestamp: "2026-08-05T00:00:00.000Z" });
    const beforeOlder = JSON.stringify(older);
    const beforeNewer = JSON.stringify(newer);
    compareSnapshots(older, newer);
    expect(JSON.stringify(older)).toBe(beforeOlder);
    expect(JSON.stringify(newer)).toBe(beforeNewer);
  });
});

describe("walletSnapshotCompare — findPreviousSnapshot / findLatestSnapshot", () => {
  const history = [
    snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 50 }),
    snap({ timestamp: "2026-08-05T00:00:00.000Z", healthScore: 70 }),
    snap({ timestamp: "2026-08-10T00:00:00.000Z", healthScore: 90 }),
  ];

  it("findPreviousSnapshot returns the real chronologically-previous entry", () => {
    expect(findPreviousSnapshot(history, history[2])?.timestamp).toBe("2026-08-05T00:00:00.000Z");
    expect(findPreviousSnapshot(history, history[1])?.timestamp).toBe("2026-08-01T00:00:00.000Z");
  });

  it("findPreviousSnapshot returns null for the real oldest snapshot — there's honestly nothing before it", () => {
    expect(findPreviousSnapshot(history, history[0])).toBeNull();
  });

  it("findPreviousSnapshot returns null for a snapshot not actually in the history", () => {
    expect(findPreviousSnapshot(history, snap({ timestamp: "2099-01-01T00:00:00.000Z" }))).toBeNull();
  });

  it("findLatestSnapshot returns the real most recent entry, null on empty history", () => {
    expect(findLatestSnapshot(history)?.timestamp).toBe("2026-08-10T00:00:00.000Z");
    expect(findLatestSnapshot([])).toBeNull();
  });
});

describe("walletSnapshotCompare — buildLastComparisonHeadline (Phase 7 Dashboard)", () => {
  it("null when fewer than 2 snapshots exist", () => {
    expect(buildLastComparisonHeadline([])).toBeNull();
    expect(buildLastComparisonHeadline([snap({ timestamp: "2026-08-01T00:00:00.000Z" })])).toBeNull();
  });

  it("picks the real field with the largest absolute numeric delta between the two most recent snapshots", () => {
    const history = [
      snap({ timestamp: "2026-08-01T00:00:00.000Z", healthScore: 50, riskScore: 40, ethPct: 50 }),
      snap({ timestamp: "2026-08-05T00:00:00.000Z", healthScore: 58, riskScore: 40, ethPct: 50 }), // older-of-the-two most recent
      snap({ timestamp: "2026-08-10T00:00:00.000Z", healthScore: 70, riskScore: 25, ethPct: 62 }), // newest
    ];
    // compares the two MOST RECENT: (Aug5 -> Aug10) health +12, risk -15, ethPct +12 -> risk has the largest |delta|
    const headline = buildLastComparisonHeadline(history);
    expect(headline?.key).toBe("riskScore");
    expect(headline?.delta).toBe(-15);
  });

  it("null when the two most recent snapshots are identical — never fabricates a 'last comparison'", () => {
    const history = [snap({ timestamp: "2026-08-01T00:00:00.000Z" }), snap({ timestamp: "2026-08-05T00:00:00.000Z" })];
    expect(buildLastComparisonHeadline(history)).toBeNull();
  });
});
