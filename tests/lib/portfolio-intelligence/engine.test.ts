import { describe, expect, it } from "vitest";

import type { HoldingAsset } from "@/lib/holdings/types";
import { buildPortfolioIntelligence } from "@/lib/portfolio-intelligence/engine";
import { diversificationScore } from "@/lib/portfolio-intelligence/diversification";
import { diversificationRating } from "@/lib/portfolio-intelligence/diversification";
import { riskScore, buildWarnings } from "@/lib/portfolio-intelligence/risk";
import {
  buildAllocationBreakdown,
  defiExposure,
  ethExposure,
  largestHolding,
  largestProtocol,
  protocolConcentration,
  stablecoinExposure,
  topHoldings,
} from "@/lib/portfolio-intelligence/allocation";
import { buildHealthBreakdown, healthScoreFromBreakdown } from "@/lib/portfolio-intelligence/health";
import { buildPortfolioQuality } from "@/lib/portfolio-intelligence/quality";
import { buildRecommendations } from "@/lib/portfolio-intelligence/recommendations";
import { buildOpportunities } from "@/lib/portfolio-intelligence/opportunities";
import { buildSummary } from "@/lib/portfolio-intelligence/summary";
import type { PortfolioRecommendation } from "@/lib/portfolio-intelligence/types";

const NOW = "2026-09-04T00:00:00.000Z";

function holding(overrides: Partial<HoldingAsset> & { symbol: string }): HoldingAsset {
  return {
    address: `0x${overrides.symbol.toLowerCase()}`,
    name: overrides.symbol,
    logo: null,
    balance: BigInt("1000000000000000000"),
    decimals: 18,
    formattedBalance: "1.0",
    usdPrice: 1,
    usdValue: 1,
    allocationPct: 100,
    chain: "base",
    verified: null,
    tokenType: "erc20",
    ...overrides,
  };
}

function eth(overrides: Partial<HoldingAsset> = {}): HoldingAsset {
  return holding({ symbol: "ETH", address: null, tokenType: "native", ...overrides });
}

/** 82% ETH / 4% stablecoin / rest — the brief's own worked example. */
function ethHeavyWallet(): HoldingAsset[] {
  return [
    eth({ usdValue: 8200, allocationPct: 82 }),
    holding({ symbol: "USDC", usdValue: 400, allocationPct: 4 }),
    holding({ symbol: "AERO", usdValue: 1400, allocationPct: 14 }),
  ];
}

const TOTAL_ETH_HEAVY = 10000;

/** Every recommendation's title+explanation+reason concatenated, for substring assertions without caring which field the text lives in. */
function recText(rec: PortfolioRecommendation): string {
  return `${rec.title} ${rec.explanation} ${rec.reason}`;
}

describe("allocation.ts", () => {
  it("largestHolding — picks the highest-value priced asset, ignoring unpriced ones", () => {
    const assets = [holding({ symbol: "A", usdValue: 10, allocationPct: 10 }), holding({ symbol: "B", usdValue: 90, allocationPct: 90 }), holding({ symbol: "C", usdValue: null, allocationPct: null })];
    expect(largestHolding(assets)?.symbol).toBe("B");
  });

  it("largestHolding — null for an empty or fully-unpriced wallet", () => {
    expect(largestHolding([])).toBeNull();
    expect(largestHolding([holding({ symbol: "X", usdValue: null, allocationPct: null })])).toBeNull();
  });

  it("largestProtocol — matches a known symbol and attributes the real project name", () => {
    const assets = [holding({ symbol: "AERO", usdValue: 500, allocationPct: 50 }), holding({ symbol: "RANDOMTOKEN", usdValue: 500, allocationPct: 50 })];
    expect(largestProtocol(assets)).toEqual({ symbol: "AERO", name: "Aerodrome Finance", address: "0xaero", usdValue: 500, allocationPct: 50 });
  });

  it("largestProtocol — honestly null when nothing held matches the known-symbol list, never a guess", () => {
    expect(largestProtocol([holding({ symbol: "RANDOMTOKEN", usdValue: 500, allocationPct: 100 })])).toBeNull();
  });

  it("stablecoinExposure and defiExposure sum sensibly against the brief's own worked example", () => {
    const assets = ethHeavyWallet();
    expect(stablecoinExposure(assets, TOTAL_ETH_HEAVY)).toBeCloseTo(4, 5);
    expect(defiExposure(assets, TOTAL_ETH_HEAVY)).toBeCloseTo(14, 5);
  });

  it("stablecoinExposure/defiExposure — 0, not NaN, when totalUsdValue is 0", () => {
    expect(stablecoinExposure([], 0)).toBe(0);
    expect(defiExposure([], 0)).toBe(0);
  });

  it("ethExposure — the one category stablecoin/defi exposure don't cover between them", () => {
    const assets = ethHeavyWallet();
    expect(ethExposure(assets, TOTAL_ETH_HEAVY)).toBeCloseTo(82, 5);
    expect(stablecoinExposure(assets, TOTAL_ETH_HEAVY) + ethExposure(assets, TOTAL_ETH_HEAVY) + defiExposure(assets, TOTAL_ETH_HEAVY)).toBeCloseTo(100, 0);
  });

  it("ethExposure — 0 when totalUsdValue is 0", () => {
    expect(ethExposure([], 0)).toBe(0);
  });

  it("topHoldings — top N priced assets by value, descending, unpriced excluded", () => {
    const assets = [
      holding({ symbol: "A", usdValue: 10, allocationPct: 1 }),
      holding({ symbol: "B", usdValue: 900, allocationPct: 90 }),
      holding({ symbol: "C", usdValue: 90, allocationPct: 9 }),
      holding({ symbol: "D", usdValue: null, allocationPct: null }),
    ];
    const top2 = topHoldings(assets, 2);
    expect(top2.map((h) => h.symbol)).toEqual(["B", "C"]);
  });

  describe("protocolConcentration", () => {
    it("attributes value to the real protocol name, grouped by protocol not by symbol", () => {
      const assets = [holding({ symbol: "AERO", usdValue: 6000, allocationPct: 60 }), eth({ usdValue: 4000, allocationPct: 40 })];
      const result = protocolConcentration(assets, 10000);
      expect(result.protocolsDetected).toBe(1);
      expect(result.largestProtocolName).toBe("Aerodrome Finance");
      expect(result.largestProtocolValue).toBe(6000);
      expect(result.largestProtocolPct).toBeCloseTo(60, 5);
    });

    it("counts multiple distinct known protocols separately", () => {
      const assets = [holding({ symbol: "AERO", usdValue: 3000, allocationPct: 30 }), holding({ symbol: "COMP", usdValue: 2000, allocationPct: 20 }), eth({ usdValue: 5000, allocationPct: 50 })];
      const result = protocolConcentration(assets, 10000);
      expect(result.protocolsDetected).toBe(2);
      expect(result.largestProtocolName).toBe("Aerodrome Finance");
    });

    it("honestly reports null/0 when nothing held matches a known protocol", () => {
      const result = protocolConcentration([holding({ symbol: "RANDOMTOKEN", usdValue: 1000, allocationPct: 100 })], 1000);
      expect(result.protocolsDetected).toBe(0);
      expect(result.largestProtocolName).toBeNull();
      expect(result.largestProtocolPct).toBe(0);
    });
  });

  describe("buildAllocationBreakdown", () => {
    it("splits known value into stablecoin/eth/other, and unknown by asset COUNT (not fabricated value)", () => {
      const assets = [...ethHeavyWallet(), holding({ symbol: "MYSTERY", usdValue: null, allocationPct: null })];
      const breakdown = buildAllocationBreakdown(assets, TOTAL_ETH_HEAVY);
      expect(breakdown.stablecoinPct).toBeCloseTo(4, 5);
      expect(breakdown.ethPct).toBeCloseTo(82, 5);
      expect(breakdown.otherPct).toBeCloseTo(14, 5);
      // 1 unpriced out of 4 assets total = 25%, by count — never a $ value for something with none.
      expect(breakdown.unknownAssetPct).toBeCloseTo(25, 5);
      expect(breakdown.topHoldings[0]?.symbol).toBe("ETH");
    });

    it("empty portfolio — every field reads honestly empty, no crash", () => {
      const breakdown = buildAllocationBreakdown([], 0);
      expect(breakdown.topHoldings).toEqual([]);
      expect(breakdown.stablecoinPct).toBe(0);
      expect(breakdown.ethPct).toBe(0);
      expect(breakdown.otherPct).toBe(0);
      expect(breakdown.unknownAssetPct).toBe(0);
      expect(breakdown.largestProtocolName).toBeNull();
    });
  });
});

describe("diversification.ts", () => {
  it("single-asset wallet scores 0 — maximal concentration", () => {
    expect(diversificationScore([eth({ usdValue: 1000, allocationPct: 100 })])).toBe(0);
  });

  it("many equal-weight assets score high", () => {
    const assets = Array.from({ length: 10 }, (_, i) => holding({ symbol: `T${i}`, usdValue: 100, allocationPct: 10 }));
    expect(diversificationScore(assets)).toBe(90);
  });

  it("empty or fully-unpriced wallet scores 0, never a fabricated mid-range guess", () => {
    expect(diversificationScore([])).toBe(0);
    expect(diversificationScore([holding({ symbol: "X", usdValue: null, allocationPct: null })])).toBe(0);
  });

  describe("diversificationRating", () => {
    it("rates the four bands with a reason that names the real score", () => {
      expect(diversificationRating(90)).toEqual({ rating: "Excellent", reason: expect.stringContaining("90/100") });
      expect(diversificationRating(65)).toEqual({ rating: "Good", reason: expect.stringContaining("65/100") });
      expect(diversificationRating(40)).toEqual({ rating: "Fair", reason: expect.stringContaining("40/100") });
      expect(diversificationRating(10)).toEqual({ rating: "Poor", reason: expect.stringContaining("10/100") });
    });

    it("is monotonic — a higher score never rates worse than a lower one", () => {
      const bands = [0, 20, 40, 60, 80, 100];
      const ranks = { Poor: 0, Fair: 1, Good: 2, Excellent: 3 };
      let lastRank = -1;
      for (const score of bands) {
        const rank = ranks[diversificationRating(score).rating];
        expect(rank).toBeGreaterThanOrEqual(lastRank);
        lastRank = rank;
      }
    });
  });
});

describe("risk.ts — riskScore", () => {
  it("scores higher for a heavily concentrated wallet than a balanced one", () => {
    const concentrated = [eth({ usdValue: 9500, allocationPct: 95 }), holding({ symbol: "USDC", usdValue: 500, allocationPct: 5 })];
    const balanced = [eth({ usdValue: 3000, allocationPct: 30 }), holding({ symbol: "USDC", usdValue: 4000, allocationPct: 40 }), holding({ symbol: "AERO", usdValue: 3000, allocationPct: 30 })];
    expect(riskScore(concentrated, 10000)).toBeGreaterThan(riskScore(balanced, 10000));
  });

  it("never scores verified:null (not checked) as risk — only an explicit verified:false counts", () => {
    const notChecked = [eth({ usdValue: 5000, allocationPct: 50 }), holding({ symbol: "USDC", usdValue: 5000, allocationPct: 50, verified: null })];
    const explicitlyUnverified = [eth({ usdValue: 5000, allocationPct: 50 }), holding({ symbol: "SCAM", usdValue: 5000, allocationPct: 50, verified: false })];
    expect(riskScore(explicitlyUnverified, 10000)).toBeGreaterThan(riskScore(notChecked, 10000));
  });

  it("stays within [0, 100] for a maximally adverse synthetic wallet", () => {
    const assets = [holding({ symbol: "SCAM", usdValue: 9900, allocationPct: 99, verified: false }), holding({ symbol: "UNKNOWN1", usdValue: null, allocationPct: null }), holding({ symbol: "UNKNOWN2", usdValue: null, allocationPct: null })];
    const score = riskScore(assets, 10000);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("scores a single-protocol-dependent wallet higher than an equivalent wallet with no known protocol", () => {
    const dependent = [holding({ symbol: "AERO", usdValue: 6000, allocationPct: 60 }), eth({ usdValue: 4000, allocationPct: 40 })];
    const notDependent = [holding({ symbol: "RANDOMTOKEN", usdValue: 6000, allocationPct: 60 }), eth({ usdValue: 4000, allocationPct: 40 })];
    expect(riskScore(dependent, 10000)).toBeGreaterThan(riskScore(notDependent, 10000));
  });
});

describe("risk.ts — buildWarnings", () => {
  it("is sorted most-severe-first — 'high' concentration before any 'moderate' warning", () => {
    const assets = [eth({ usdValue: 9500, allocationPct: 95 }), holding({ symbol: "MYSTERY", usdValue: null, allocationPct: null })];
    const warnings = buildWarnings(assets, 9500);
    expect(warnings[0].severity).toBe("high");
    expect(warnings.every((w, i) => i === 0 || w.severity !== "high")).toBe(true);
  });

  it("flags low pricing coverage distinctly from a single unpriced dust token", () => {
    // One unpriced token among many priced ones — real coverage stays high, so the count-based `unpriced-assets` warning fires but the coverage-based one must not.
    const highCoverage = [
      ...Array.from({ length: 9 }, (_, i) => holding({ symbol: `T${i}`, usdValue: 1000, allocationPct: 100 / 9 })),
      holding({ symbol: "MYSTERY", usdValue: null, allocationPct: null }),
    ];
    expect(buildWarnings(highCoverage, 9000).some((w) => w.id === "low-pricing-coverage")).toBe(false);

    const lowCoverage = [eth({ usdValue: 1000, allocationPct: 100 }), holding({ symbol: "A", usdValue: null, allocationPct: null }), holding({ symbol: "B", usdValue: null, allocationPct: null })];
    expect(buildWarnings(lowCoverage, 1000).some((w) => w.id === "low-pricing-coverage")).toBe(true);
  });

  it("flags a single protocol dependency by its real name and %", () => {
    const assets = [holding({ symbol: "AERO", usdValue: 6000, allocationPct: 60 }), eth({ usdValue: 4000, allocationPct: 40 })];
    const warning = buildWarnings(assets, 10000).find((w) => w.id === "protocol-dependency");
    expect(warning?.description).toContain("Aerodrome Finance");
    expect(warning?.description).toContain("60");
  });

  it("never flags protocol dependency when nothing held matches a known protocol", () => {
    const assets = [holding({ symbol: "RANDOMTOKEN", usdValue: 6000, allocationPct: 60 }), eth({ usdValue: 4000, allocationPct: 40 })];
    expect(buildWarnings(assets, 10000).some((w) => w.id === "protocol-dependency")).toBe(false);
  });
});

describe("health.ts", () => {
  it("healthScoreFromBreakdown always equals the sum of the breakdown it's given, clipped to [0, 100]", () => {
    const assets = ethHeavyWallet();
    const breakdown = buildHealthBreakdown(assets, TOTAL_ETH_HEAVY);
    const expectedSum = breakdown.reduce((total, item) => total + (item.direction === "positive" ? item.points : -item.points), 0);
    expect(healthScoreFromBreakdown(breakdown)).toBe(Math.max(0, Math.min(100, expectedSum)));
  });

  it("exactly five contributions, matching this phase's own worked example shape", () => {
    const breakdown = buildHealthBreakdown(ethHeavyWallet(), TOTAL_ETH_HEAVY);
    expect(breakdown.map((c) => c.id)).toEqual(["diversification", "stablecoin-exposure", "verified-assets", "concentration-risk", "unknown-assets"]);
  });

  it("a perfectly diversified, fully-verified, stablecoin-cushioned wallet scores near the ceiling", () => {
    const assets = [
      holding({ symbol: "USDC", usdValue: 2500, allocationPct: 25, verified: true }),
      holding({ symbol: "DAI", usdValue: 2500, allocationPct: 25, verified: true }),
      eth({ usdValue: 2500, allocationPct: 25 }),
      holding({ symbol: "COMP", usdValue: 2500, allocationPct: 25, verified: true }),
    ];
    const score = healthScoreFromBreakdown(buildHealthBreakdown(assets, 10000));
    expect(score).toBeGreaterThanOrEqual(85);
  });

  it("a single-asset, unverified, unpriced-heavy wallet scores near the floor", () => {
    const assets = [holding({ symbol: "SCAM", usdValue: 100, allocationPct: 100, verified: false }), holding({ symbol: "U1", usdValue: null, allocationPct: null }), holding({ symbol: "U2", usdValue: null, allocationPct: null })];
    const score = healthScoreFromBreakdown(buildHealthBreakdown(assets, 100));
    expect(score).toBeLessThanOrEqual(20);
  });

  it("concentration deduction only fires at elevated/high tiers — never a second continuous restatement of diversification", () => {
    const moderate = [eth({ usdValue: 3000, allocationPct: 30 }), holding({ symbol: "USDC", usdValue: 3500, allocationPct: 35 }), holding({ symbol: "AERO", usdValue: 3500, allocationPct: 35 })];
    const concentrationRow = buildHealthBreakdown(moderate, 10000).find((c) => c.id === "concentration-risk");
    expect(concentrationRow?.points).toBe(0);
  });

  it("empty portfolio — the only nonzero term is the honest 'nothing priced' deduction, floored at 0", () => {
    const breakdown = buildHealthBreakdown([], 0);
    expect(breakdown.find((c) => c.id === "unknown-assets")?.points).toBeGreaterThan(0);
    expect(breakdown.filter((c) => c.id !== "unknown-assets").every((c) => c.points === 0)).toBe(true);
    expect(healthScoreFromBreakdown(breakdown)).toBe(0);
  });

  it("is fully deterministic — identical input always produces byte-identical output", () => {
    const assets = ethHeavyWallet();
    expect(buildHealthBreakdown(assets, TOTAL_ETH_HEAVY)).toEqual(buildHealthBreakdown(assets, TOTAL_ETH_HEAVY));
  });
});

describe("quality.ts", () => {
  it("counts verified/unverified/not-checked ERC-20s separately, excluding native ETH from all three", () => {
    const assets = [
      eth({ usdValue: 1000, allocationPct: 25 }),
      holding({ symbol: "GOOD", usdValue: 1000, allocationPct: 25, verified: true }),
      holding({ symbol: "SCAM", usdValue: 1000, allocationPct: 25, verified: false }),
      holding({ symbol: "MYSTERY", usdValue: 1000, allocationPct: 25, verified: null }),
    ];
    const quality = buildPortfolioQuality(assets, 4000);
    expect(quality.verifiedAssetCount).toBe(1);
    expect(quality.unverifiedAssetCount).toBe(1);
    expect(quality.notCheckedAssetCount).toBe(1);
  });

  it("protocolsDetected matches protocolConcentration's own count", () => {
    const assets = [holding({ symbol: "AERO", usdValue: 3000, allocationPct: 30 }), holding({ symbol: "COMP", usdValue: 2000, allocationPct: 20 }), eth({ usdValue: 5000, allocationPct: 50 })];
    expect(buildPortfolioQuality(assets, 10000).protocolsDetected).toBe(2);
  });

  it("diversificationRating matches diversificationRating(diversificationScore(assets)) directly — never a separately-guessed label", () => {
    const assets = ethHeavyWallet();
    const expected = diversificationRating(diversificationScore(assets));
    const quality = buildPortfolioQuality(assets, TOTAL_ETH_HEAVY);
    expect(quality.diversificationRating).toBe(expected.rating);
    expect(quality.diversificationRatingReason).toBe(expected.reason);
  });

  it("empty portfolio — every count is honestly 0, no crash", () => {
    const quality = buildPortfolioQuality([], 0);
    expect(quality.verifiedAssetCount).toBe(0);
    expect(quality.unverifiedAssetCount).toBe(0);
    expect(quality.notCheckedAssetCount).toBe(0);
    expect(quality.protocolsDetected).toBe(0);
    expect(quality.diversificationRating).toBe("Poor");
  });
});

describe("recommendations.ts", () => {
  it("recommends reducing concentration for a concentrated wallet, referencing the real symbol and %, at high priority", () => {
    const assets = [eth({ usdValue: 8000, allocationPct: 80 }), holding({ symbol: "USDC", usdValue: 2000, allocationPct: 20 })];
    const recs = buildRecommendations(assets, 10000, diversificationScore(assets));
    const rec = recs.find((r) => r.id === "reduce-concentration");
    expect(rec).toBeDefined();
    expect(recText(rec!)).toContain("ETH");
    expect(recText(rec!)).toContain("80");
    expect(rec!.priority).toBe("high");
  });

  it("recommends nothing alarming for a well-balanced, fully-priced wallet with stablecoins", () => {
    const assets = [eth({ usdValue: 2500, allocationPct: 25 }), holding({ symbol: "USDC", usdValue: 2500, allocationPct: 25 }), holding({ symbol: "AERO", usdValue: 2500, allocationPct: 25 }), holding({ symbol: "COMP", usdValue: 2500, allocationPct: 25 })];
    const recs = buildRecommendations(assets, 10000, diversificationScore(assets));
    expect(recs.some((r) => r.id === "reduce-concentration")).toBe(false);
    expect(recs.some((r) => r.id === "add-stablecoins")).toBe(false);
  });

  it("recommends researching unpriced assets by real symbol", () => {
    const assets = [eth({ usdValue: 5000, allocationPct: 100 }), holding({ symbol: "MYSTERY", usdValue: null, allocationPct: null })];
    const recs = buildRecommendations(assets, 5000, diversificationScore(assets));
    expect(recs.some((r) => recText(r).includes("MYSTERY"))).toBe(true);
  });

  it("recommends reducing protocol dependency by the real protocol name", () => {
    const assets = [holding({ symbol: "AERO", usdValue: 6000, allocationPct: 60 }), eth({ usdValue: 4000, allocationPct: 40 })];
    const recs = buildRecommendations(assets, 10000, diversificationScore(assets));
    const rec = recs.find((r) => r.id === "reduce-protocol-dependency");
    expect(rec).toBeDefined();
    expect(recText(rec!)).toContain("Aerodrome Finance");
  });

  it("is sorted high-priority-first", () => {
    const assets = [eth({ usdValue: 8500, allocationPct: 85 }), holding({ symbol: "MYSTERY", usdValue: null, allocationPct: null })];
    const recs = buildRecommendations(assets, 8500, diversificationScore(assets));
    const priorityRank = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < recs.length; i++) {
      expect(priorityRank[recs[i].priority]).toBeGreaterThanOrEqual(priorityRank[recs[i - 1].priority]);
    }
  });

  it("empty portfolio produces no recommendations, never fabricated advice", () => {
    expect(buildRecommendations([], 0, 0)).toEqual([]);
  });

  it("every recommendation carries id, title, explanation, reason, and priority — never a bare string", () => {
    const recs = buildRecommendations(ethHeavyWallet(), TOTAL_ETH_HEAVY, diversificationScore(ethHeavyWallet()));
    for (const rec of recs) {
      expect(typeof rec.id).toBe("string");
      expect(typeof rec.title).toBe("string");
      expect(typeof rec.explanation).toBe("string");
      expect(typeof rec.reason).toBe("string");
      expect(["high", "medium", "low"]).toContain(rec.priority);
    }
  });
});

describe("opportunities.ts", () => {
  it("flags high concentration as an opportunity/observation card with the real symbol and %", () => {
    const assets = ethHeavyWallet();
    const opportunities = buildOpportunities(assets, TOTAL_ETH_HEAVY, diversificationScore(assets));
    const card = opportunities.find((o) => o.id === "high-concentration");
    expect(card?.title).toContain("ETH");
    expect(card?.description).toContain("82");
  });

  it("never generates a 'monitor biggest mover' card — no 24h price-change data exists on HoldingAsset to honestly back it", () => {
    const opportunities = buildOpportunities(ethHeavyWallet(), TOTAL_ETH_HEAVY, 50);
    expect(opportunities.some((o) => /daily|24h|mover/i.test(o.title) || /daily|24h|mover/i.test(o.description))).toBe(false);
  });

  it("flags low pricing coverage as an opportunity to improve it", () => {
    const assets = [eth({ usdValue: 1000, allocationPct: 100 }), holding({ symbol: "A", usdValue: null, allocationPct: null }), holding({ symbol: "B", usdValue: null, allocationPct: null })];
    expect(buildOpportunities(assets, 1000, 0).some((o) => o.id === "improve-pricing-coverage")).toBe(true);
  });

  it("flags protocol dependency by the real protocol name", () => {
    const assets = [holding({ symbol: "AERO", usdValue: 6000, allocationPct: 60 }), eth({ usdValue: 4000, allocationPct: 40 })];
    const card = buildOpportunities(assets, 10000, diversificationScore(assets)).find((o) => o.id === "monitor-protocol-dependency");
    expect(card?.title).toContain("Aerodrome Finance");
  });

  it("is sorted attention-first", () => {
    const assets = [...ethHeavyWallet(), holding({ symbol: "A", usdValue: null, allocationPct: null })];
    const opportunities = buildOpportunities(assets, TOTAL_ETH_HEAVY, diversificationScore(assets));
    const toneRank = { attention: 0, neutral: 1, positive: 2 };
    for (let i = 1; i < opportunities.length; i++) {
      expect(toneRank[opportunities[i].tone]).toBeGreaterThanOrEqual(toneRank[opportunities[i - 1].tone]);
    }
  });

  it("empty portfolio produces no opportunity cards", () => {
    expect(buildOpportunities([], 0, 0)).toEqual([]);
  });
});

describe("summary.ts", () => {
  it("matches the brief's own worked example shape for an ETH-heavy, low-stablecoin wallet", () => {
    const assets = ethHeavyWallet();
    const summary = buildSummary(assets, TOTAL_ETH_HEAVY, diversificationScore(assets));
    expect(summary).toContain("concentrated in ETH (82%)");
    expect(summary).toContain("Stablecoin exposure is low (4%)");
    expect(summary).toContain("diversifying");
  });

  it("empty wallet gets an honest, non-alarming empty-state sentence", () => {
    expect(buildSummary([], 0, 0)).toMatch(/no holdings/i);
  });

  it("fully-unpriced wallet gets an honest 'nothing priced yet' sentence, not a fabricated read", () => {
    const assets = [eth({ usdValue: null, allocationPct: null })];
    expect(buildSummary(assets, 0, 0)).toMatch(/none could be priced/i);
  });

  it("stablecoin-heavy wallet reads as cushioned, not concentrated", () => {
    const assets = [holding({ symbol: "USDC", usdValue: 9000, allocationPct: 90 }), eth({ usdValue: 1000, allocationPct: 10 })];
    const summary = buildSummary(assets, 10000, diversificationScore(assets));
    expect(summary).toMatch(/meaningful \(90%\)|cushioning/i);
  });
});

describe("buildPortfolioIntelligence — the full engine", () => {
  it("empty portfolio — every score is 0/empty, no fabricated data, no crash", () => {
    const result = buildPortfolioIntelligence([], 0, NOW);
    expect(result.overallScore).toBe(0);
    expect(result.riskScore).toBe(0);
    expect(result.diversificationScore).toBe(0);
    expect(result.healthScore).toBe(0);
    expect(result.largestHolding).toBeNull();
    expect(result.largestProtocol).toBeNull();
    expect(result.stablecoinExposure).toBe(0);
    expect(result.defiExposure).toBe(0);
    expect(result.recommendations).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.opportunities).toEqual([]);
    expect(result.lastUpdated).toBe(NOW);
  });

  it("single-asset wallet — maximal concentration, high risk, zero diversification", () => {
    const result = buildPortfolioIntelligence([eth({ usdValue: 5000, allocationPct: 100 })], 5000, NOW);
    expect(result.diversificationScore).toBe(0);
    expect(result.concentrationRisk.level).toBe("high");
    expect(result.largestHolding?.symbol).toBe("ETH");
  });

  it("stablecoin-heavy wallet — low risk, meaningful stablecoinExposure, no 'add stables' recommendation", () => {
    const assets = [holding({ symbol: "USDC", usdValue: 7000, allocationPct: 70 }), holding({ symbol: "USDT", usdValue: 3000, allocationPct: 30 })];
    const result = buildPortfolioIntelligence(assets, 10000, NOW);
    expect(result.stablecoinExposure).toBe(100);
    expect(result.warnings.some((w) => w.id === "no-stablecoins")).toBe(false);
  });

  it("100% stablecoin wallet — maximal stablecoin exposure, zero ETH/other exposure, no concentration warning suppressed incorrectly", () => {
    const result = buildPortfolioIntelligence([holding({ symbol: "USDC", usdValue: 10000, allocationPct: 100 })], 10000, NOW);
    expect(result.allocationBreakdown.stablecoinPct).toBe(100);
    expect(result.allocationBreakdown.ethPct).toBe(0);
    expect(result.concentrationRisk.level).toBe("high");
  });

  it("ETH-heavy wallet (the brief's exact 82/4/14 example) — matches expected shape end to end", () => {
    const result = buildPortfolioIntelligence(ethHeavyWallet(), TOTAL_ETH_HEAVY, NOW);
    expect(result.largestHolding?.symbol).toBe("ETH");
    expect(result.concentrationRisk.level).toBe("high");
    expect(result.stablecoinExposure).toBeCloseTo(4, 5);
    expect(result.warnings.some((w) => w.id === "concentration-high")).toBe(true);
    expect(result.summary).toContain("82%");
    expect(result.healthBreakdown.length).toBe(5);
  });

  it("unknown/unpriced assets — flagged honestly, excluded from allocation math, never fabricated", () => {
    const assets = [eth({ usdValue: 5000, allocationPct: 100 }), holding({ symbol: "MYSTERY", usdValue: null, allocationPct: null, verified: null })];
    const result = buildPortfolioIntelligence(assets, 5000, NOW);
    expect(result.warnings.some((w) => w.id === "unpriced-assets" && w.description.includes("MYSTERY"))).toBe(true);
    expect(result.recommendations.some((r) => `${r.title} ${r.explanation} ${r.reason}`.includes("MYSTERY"))).toBe(true);
    expect(result.unknownAssetCount).toBe(1);
  });

  it("no priced assets at all — every score 0, no NaN, no crash", () => {
    const result = buildPortfolioIntelligence([holding({ symbol: "A", usdValue: null, allocationPct: null }), holding({ symbol: "B", usdValue: null, allocationPct: null })], 0, NOW);
    expect(result.overallScore).toBe(0);
    expect(result.healthScore).toBe(0);
    expect(Number.isNaN(result.stablecoinExposure)).toBe(false);
    expect(Number.isNaN(result.allocationBreakdown.unknownAssetPct)).toBe(false);
    expect(result.allocationBreakdown.unknownAssetPct).toBe(100);
  });

  it("mixed pricing (some priced, some not) still produces valid, non-crashing intelligence", () => {
    const assets = [eth({ usdValue: 4000, allocationPct: 80 }), holding({ symbol: "USDC", usdValue: 1000, allocationPct: 20 }), holding({ symbol: "MYSTERY", usdValue: null, allocationPct: null })];
    const result = buildPortfolioIntelligence(assets, 5000, NOW);
    expect(Number.isFinite(result.overallScore)).toBe(true);
    expect(Number.isFinite(result.riskScore)).toBe(true);
    expect(Number.isFinite(result.healthScore)).toBe(true);
    expect(result.largestHolding?.symbol).toBe("ETH");
    expect(result.pricingCoverage).toBe(67); // 2 of 3 priced, rounded
  });

  it("protocol concentration — a wallet spread across many assets but all one protocol is flagged, even though asset-level diversification looks fine", () => {
    const assets = [
      holding({ symbol: "AERO", usdValue: 5000, allocationPct: 50 }),
      eth({ usdValue: 2500, allocationPct: 25 }),
      holding({ symbol: "USDC", usdValue: 2500, allocationPct: 25 }),
    ];
    const result = buildPortfolioIntelligence(assets, 10000, NOW);
    // Reasonable asset-level spread (3 assets, no single one over 50%)...
    expect(result.diversificationScore).toBeGreaterThan(0);
    // ...yet protocol concentration still honestly flags the real dependency.
    expect(result.allocationBreakdown.protocolConcentrationPct).toBeCloseTo(50, 5);
    expect(result.warnings.some((w) => w.id === "protocol-dependency")).toBe(true);
  });

  it("perfect diversification (many equal-weight, fully-verified, partly-stable assets) — high score across the board", () => {
    const assets = [
      holding({ symbol: "USDC", usdValue: 1000, allocationPct: 10, verified: true }),
      holding({ symbol: "DAI", usdValue: 1000, allocationPct: 10, verified: true }),
      eth({ usdValue: 1000, allocationPct: 10 }),
      ...Array.from({ length: 7 }, (_, i) => holding({ symbol: `T${i}`, usdValue: 1000, allocationPct: 10, verified: true })),
    ];
    const result = buildPortfolioIntelligence(assets, 10000, NOW);
    expect(result.diversificationScore).toBeGreaterThanOrEqual(89);
    expect(result.quality.diversificationRating).toBe("Excellent");
    expect(result.healthScore).toBeGreaterThanOrEqual(80);
  });

  it("worst-case portfolio (single unverified asset, nothing else priced) — every score bottoms out honestly, still no crash", () => {
    const assets = [holding({ symbol: "SCAM", usdValue: 10000, allocationPct: 100, verified: false }), holding({ symbol: "U1", usdValue: null, allocationPct: null }), holding({ symbol: "U2", usdValue: null, allocationPct: null })];
    const result = buildPortfolioIntelligence(assets, 10000, NOW);
    expect(result.healthScore).toBeLessThanOrEqual(15);
    expect(result.riskScore).toBeGreaterThanOrEqual(60);
    expect(result.warnings[0].severity).toBe("high");
    expect(result.recommendations[0].priority).toBe("high");
  });

  it("large portfolio (200 assets) computes without error and stays within score bounds", () => {
    const assets = Array.from({ length: 200 }, (_, i) => holding({ symbol: `T${i}`, usdValue: 50, allocationPct: 0.5 }));
    const result = buildPortfolioIntelligence(assets, 10000, NOW);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.diversificationScore).toBeGreaterThan(90); // 200 equal-weight assets is very well diversified
    expect(result.opportunities.length).toBeGreaterThanOrEqual(0);
    expect(result.allocationBreakdown.topHoldings.length).toBe(5);
  });

  it("healthScore always equals the sum of healthBreakdown, clipped 0-100 — the breakdown can never disagree with the headline number", () => {
    for (const assets of [ethHeavyWallet(), [eth({ usdValue: 5000, allocationPct: 100 })], [] as HoldingAsset[]]) {
      const total = assets.reduce((sum, a) => sum + (a.usdValue ?? 0), 0);
      const result = buildPortfolioIntelligence(assets, total, NOW);
      const expectedSum = result.healthBreakdown.reduce((sum, c) => sum + (c.direction === "positive" ? c.points : -c.points), 0);
      expect(result.healthScore).toBe(Math.max(0, Math.min(100, expectedSum)));
    }
  });

  it("is fully deterministic — identical input always produces byte-identical output (no hidden clock/random state)", () => {
    const assets = ethHeavyWallet();
    const first = buildPortfolioIntelligence(assets, TOTAL_ETH_HEAVY, NOW);
    const second = buildPortfolioIntelligence(assets, TOTAL_ETH_HEAVY, NOW);
    expect(second).toEqual(first);
  });
});
