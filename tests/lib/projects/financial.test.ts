import { describe, expect, it } from "vitest";

import {
  availableFinancialMetrics,
  availableFinancialRanges,
  computeFinancialSummary,
  hasReliableFinancialData,
  matchesFinancialRange,
} from "@/lib/projects/financial";
import { liveProject } from "./fixtures";

describe("matchesFinancialRange", () => {
  it("matches a value within an inclusive-min/exclusive-max bucket", () => {
    const project = liveProject({ market: { ...liveProject().market, tvlUsd: 5_000_000 } });
    expect(matchesFinancialRange(project, "tvl-1m-10m")).toBe(true);
    expect(matchesFinancialRange(project, "tvl-under-1m")).toBe(false);
    expect(matchesFinancialRange(project, "tvl-10m-100m")).toBe(false);
  });

  it("treats the upper bound as exclusive — a value exactly at the boundary falls into the next bucket up", () => {
    const project = liveProject({ market: { ...liveProject().market, tvlUsd: 10_000_000 } });
    expect(matchesFinancialRange(project, "tvl-1m-10m")).toBe(false);
    expect(matchesFinancialRange(project, "tvl-10m-100m")).toBe(true);
  });

  it("matches an open-ended upper range with no max", () => {
    const project = liveProject({ market: { ...liveProject().market, tvlUsd: 500_000_000 } });
    expect(matchesFinancialRange(project, "tvl-over-100m")).toBe(true);
  });

  it("never matches a project with no real value for the metric — null is not 'below every threshold'", () => {
    const project = liveProject({ market: { ...liveProject().market, tvlUsd: null } });
    expect(matchesFinancialRange(project, "tvl-under-1m")).toBe(false);
    expect(matchesFinancialRange(project, "tvl-over-100m")).toBe(false);
  });

  it("returns false for an unrecognized range id rather than throwing", () => {
    const project = liveProject({ market: { ...liveProject().market, tvlUsd: 5000 } });
    // @ts-expect-error — intentionally invalid id to prove no throw
    expect(matchesFinancialRange(project, "not-a-real-range")).toBe(false);
  });
});

describe("hasReliableFinancialData / availableFinancialMetrics", () => {
  it("is false for a metric with no real data anywhere in the list", () => {
    const projects = [liveProject({ id: "a" }), liveProject({ id: "b" })];
    expect(hasReliableFinancialData(projects, "liquidity")).toBe(false);
    expect(availableFinancialMetrics(projects)).not.toContain("liquidity");
  });

  it("is true once at least one project has a real value", () => {
    const withLiquidity = liveProject({ id: "a", market: { ...liveProject().market, liquidityUsd: 1_000_000 } });
    const withoutLiquidity = liveProject({ id: "b" });
    expect(hasReliableFinancialData([withLiquidity, withoutLiquidity], "liquidity")).toBe(true);
    expect(availableFinancialMetrics([withLiquidity, withoutLiquidity])).toContain("liquidity");
  });
});

describe("availableFinancialRanges", () => {
  it("never offers a bucket with zero real matches", () => {
    const projects = [liveProject({ market: { ...liveProject().market, tvlUsd: 50_000_000 } })];
    const ranges = availableFinancialRanges(projects, "tvl");
    expect(ranges.map((r) => r.id)).toEqual(["tvl-10m-100m"]);
  });

  it("returns an empty array when no project has real data for the metric", () => {
    const projects = [liveProject()];
    expect(availableFinancialRanges(projects, "volume")).toEqual([]);
  });
});

describe("computeFinancialSummary", () => {
  it("returns null when nothing in the list has real data for the metric", () => {
    const projects = [liveProject(), liveProject({ id: "b" })];
    expect(computeFinancialSummary(projects, "tvl")).toBeNull();
  });

  it("computes count/highest/average/total from only the real, non-null values", () => {
    const a = liveProject({ id: "a", market: { ...liveProject().market, tvlUsd: 100 } });
    const b = liveProject({ id: "b", market: { ...liveProject().market, tvlUsd: 300 } });
    const noData = liveProject({ id: "c" });

    const summary = computeFinancialSummary([a, b, noData], "tvl");
    expect(summary).toEqual({ metric: "tvl", count: 2, highest: 300, average: 200, total: 400 });
  });
});
