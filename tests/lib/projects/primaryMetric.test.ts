import { describe, expect, it } from "vitest";

import { categoryAwarePrimaryMetricValue, categoryPrimaryMetric, standardMetrics } from "@/lib/projects/primaryMetric";
import { liveProject } from "./fixtures";

/**
 * The single shared category-aware metric rule — consumed by both
 * `LiveProjectCard` (formatted display, `categoryPrimaryMetric`) and
 * Category Rank (raw ranking value, `categoryAwarePrimaryMetricValue`).
 * Covering both here confirms they stay in lockstep, since they share one
 * internal `CATEGORY_PRIMARY_METRIC` table and fallback chain by
 * construction (one file, one rule) rather than by convention.
 */
describe("categoryAwarePrimaryMetricValue", () => {
  it("prefers TVL for a Lending project", () => {
    const project = liveProject({ category: "lending", market: { available: true, priceUsd: 1, changePct24h: 0, changePct7d: null, changePct30d: null, marketCapUsd: 500, fdvUsd: null, volume24hUsd: 300, liquidityUsd: null, tvlUsd: 900} });
    expect(categoryAwarePrimaryMetricValue(project)).toBe(900);
  });

  it("prefers Volume for a DEX project", () => {
    const project = liveProject({ category: "dex", market: { available: true, priceUsd: 1, changePct24h: 0, changePct7d: null, changePct30d: null, marketCapUsd: 500, fdvUsd: null, volume24hUsd: 300, liquidityUsd: null, tvlUsd: 900} });
    expect(categoryAwarePrimaryMetricValue(project)).toBe(300);
  });

  it("falls back to Price when the category has no preferred metric mapping and no market cap/TVL exist", () => {
    const project = liveProject({ category: "other", market: { available: true, priceUsd: 42, changePct24h: 5, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null} });
    expect(categoryAwarePrimaryMetricValue(project)).toBe(42);
  });

  it("returns null when a project has no real market read at all", () => {
    const project = liveProject({ category: "other", market: { available: false, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null} });
    expect(categoryAwarePrimaryMetricValue(project)).toBeNull();
  });
});

describe("categoryPrimaryMetric", () => {
  it("labels TVL for a Lending project and formats the value", () => {
    const project = liveProject({ category: "lending", market: { available: true, priceUsd: 1, changePct24h: 0, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: 900_000} });
    const metric = categoryPrimaryMetric(project);
    expect(metric.label).toBe("TVL");
    expect(metric.value).toBeTruthy();
  });

  it("carries the real 24h change alongside Price when Price is the fallback", () => {
    const project = liveProject({ category: "other", market: { available: true, priceUsd: 10, changePct24h: 7.5, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null} });
    const metric = categoryPrimaryMetric(project);
    expect(metric.label).toBe("Price");
    expect(metric.changePct24h).toBe(7.5);
  });

  it("returns a bare Market label with no value when nothing real is available", () => {
    const project = liveProject({ category: "other", market: { available: false, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null} });
    const metric = categoryPrimaryMetric(project);
    expect(metric).toEqual({ label: "Market" });
  });

  it("agrees with categoryAwarePrimaryMetricValue on which raw number backs the displayed metric", () => {
    const project = liveProject({ category: "dex", market: { available: true, priceUsd: 1, changePct24h: 0, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: 12_345, liquidityUsd: null, tvlUsd: null} });
    expect(categoryPrimaryMetric(project).label).toBe("Volume 24h");
    expect(categoryAwarePrimaryMetricValue(project)).toBe(12_345);
  });
});

/**
 * PR-085.03, Requirement 5 — supersedes PR-085.02A's `discoverySecondaryMetric`.
 * Always exactly four fixed fields, fixed order, real value or `undefined`
 * (never fabricated) — never skipped even when a field happens to equal
 * the category-aware primary shown elsewhere on the card ("the layout must
 * remain identical" across every card, per the approved requirement).
 */
describe("standardMetrics", () => {
  it("always returns exactly Market Cap, Price, 24H Volume, FDV in that fixed order", () => {
    const project = liveProject({ category: "lending", market: { available: true, priceUsd: 1, changePct24h: 0, changePct7d: null, changePct30d: null, marketCapUsd: 500, fdvUsd: 2_000, volume24hUsd: 300, liquidityUsd: null, tvlUsd: 900} });
    const metrics = standardMetrics(project);
    expect(metrics.map((m) => m.label)).toEqual(["Market Cap", "Price", "24H Volume", "FDV"]);
    expect(metrics.every((m) => typeof m.value === "string")).toBe(true);
  });

  it("never fabricates a value — a field with no real read renders with an undefined value, not a guess", () => {
    const project = liveProject({ category: "lending", market: { available: false, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: 900} });
    expect(standardMetrics(project)).toEqual([
      { label: "Market Cap", value: undefined },
      { label: "Price", value: undefined },
      { label: "24H Volume", value: undefined },
      { label: "FDV", value: undefined },
    ]);
  });

  it("does not skip a field even when it duplicates the category-aware primary metric (Stablecoin's Market Cap primary)", () => {
    const project = liveProject({ category: "stablecoin", market: { available: true, priceUsd: 1, changePct24h: 0, changePct7d: null, changePct30d: null, marketCapUsd: 500, fdvUsd: null, volume24hUsd: 300, liquidityUsd: null, tvlUsd: null} });
    expect(categoryPrimaryMetric(project).label).toBe("Market Cap");
    expect(standardMetrics(project)[0]).toEqual({ label: "Market Cap", value: expect.any(String) });
  });

  /**
   * PR-085.05, Task 7 — the shared `formatCompactCurrency` pins two decimals
   * (a real hydration-mismatch fix, left untouched); this file's own
   * `formatCardCurrency` wrapper trims the resulting trailing zeros for card
   * display only, via a deterministic string operation over the already-
   * formatted value — never touching real, meaningful precision.
   */
  describe("trailing-zero trimming (Task 7 — card-local, not the shared formatter)", () => {
    it("trims a whole-number compact value: $198.00B -> $198B", () => {
      const project = liveProject({ market: { available: true, priceUsd: 1, changePct24h: 0, changePct7d: null, changePct30d: null, marketCapUsd: 198_000_000_000, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null} });
      expect(standardMetrics(project)[0].value).toBe("$198B");
    });

    it("trims exactly one meaningful decimal: $24.50M -> $24.5M", () => {
      const project = liveProject({ market: { available: true, priceUsd: 1, changePct24h: 0, changePct7d: null, changePct30d: null, marketCapUsd: 24_500_000, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null} });
      expect(standardMetrics(project)[0].value).toBe("$24.5M");
    });

    it("trims a compact-suffix value: $1.00T -> $1T", () => {
      const project = liveProject({ market: { available: true, priceUsd: 1, changePct24h: 0, changePct7d: null, changePct30d: null, marketCapUsd: 1_000_000_000_000, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null} });
      expect(standardMetrics(project)[0].value).toBe("$1T");
    });

    it("never touches real, meaningful precision: $198.45B stays $198.45B", () => {
      const project = liveProject({ market: { available: true, priceUsd: 1, changePct24h: 0, changePct7d: null, changePct30d: null, marketCapUsd: 198_450_000_000, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null} });
      expect(standardMetrics(project)[0].value).toBe("$198.45B");
    });
  });
});
