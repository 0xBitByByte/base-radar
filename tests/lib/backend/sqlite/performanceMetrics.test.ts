// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createDatabase } from "@/lib/backend/sqlite/db";
import {
  getPerformanceMetricsSummary,
  isKnownPerformanceMetricName,
  isPerformanceMetricRating,
  recordPerformanceMetric,
} from "@/lib/backend/sqlite/performanceMetrics";

describe("isKnownPerformanceMetricName", () => {
  it("accepts every real, known Web Vitals / Next.js custom metric name", () => {
    for (const name of ["TTFB", "FCP", "LCP", "FID", "CLS", "INP", "Next.js-hydration", "Next.js-route-change-to-render", "Next.js-render"]) {
      expect(isKnownPerformanceMetricName(name)).toBe(true);
    }
  });

  it("rejects an unrecognized or non-string name", () => {
    expect(isKnownPerformanceMetricName("made-up-metric")).toBe(false);
    expect(isKnownPerformanceMetricName(123)).toBe(false);
    expect(isKnownPerformanceMetricName(null)).toBe(false);
  });
});

describe("isPerformanceMetricRating", () => {
  it("accepts the three real ratings", () => {
    expect(isPerformanceMetricRating("good")).toBe(true);
    expect(isPerformanceMetricRating("needs-improvement")).toBe(true);
    expect(isPerformanceMetricRating("poor")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isPerformanceMetricRating("great")).toBe(false);
    expect(isPerformanceMetricRating(1)).toBe(false);
  });
});

describe("recordPerformanceMetric / getPerformanceMetricsSummary", () => {
  it("a metric with zero real samples never appears in the summary — no fabricated zero-row", () => {
    const db = createDatabase(":memory:");
    expect(getPerformanceMetricsSummary(db)).toEqual([]);
    db.close();
  });

  it("aggregates real samples for one metric into one real summary row", () => {
    const db = createDatabase(":memory:");
    recordPerformanceMetric(db, { metricName: "LCP", value: 1000, rating: "good", path: "/dashboard", recordedAt: "2026-09-11T00:00:00.000Z" });
    recordPerformanceMetric(db, { metricName: "LCP", value: 3000, rating: "poor", path: "/dashboard/projects", recordedAt: "2026-09-11T00:01:00.000Z" });
    recordPerformanceMetric(db, { metricName: "LCP", value: 2000, rating: "needs-improvement", path: "/dashboard", recordedAt: "2026-09-11T00:02:00.000Z" });

    const summary = getPerformanceMetricsSummary(db);
    expect(summary).toEqual([
      { metricName: "LCP", sampleCount: 3, average: 2000, min: 1000, max: 3000, goodCount: 1, needsImprovementCount: 1, poorCount: 1 },
    ]);
    db.close();
  });

  it("keeps each distinct metric name as its own separate, real summary row", () => {
    const db = createDatabase(":memory:");
    recordPerformanceMetric(db, { metricName: "CLS", value: 0.05, rating: "good", path: "/", recordedAt: "2026-09-11T00:00:00.000Z" });
    recordPerformanceMetric(db, { metricName: "LCP", value: 1500, rating: "good", path: "/", recordedAt: "2026-09-11T00:00:00.000Z" });

    const summary = getPerformanceMetricsSummary(db);
    expect(summary.map((row) => row.metricName)).toEqual(["CLS", "LCP"]); // real alphabetical order
    expect(summary.find((row) => row.metricName === "CLS")?.sampleCount).toBe(1);
    expect(summary.find((row) => row.metricName === "LCP")?.sampleCount).toBe(1);
    db.close();
  });

  it("records no account/session identity of any kind — anonymous by construction", () => {
    const db = createDatabase(":memory:");
    recordPerformanceMetric(db, { metricName: "FCP", value: 800, rating: "good", path: "/dashboard", recordedAt: "2026-09-11T00:00:00.000Z" });

    const row = db.prepare("SELECT * FROM performance_metrics").get() as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual(["id", "metric_name", "path", "rating", "recorded_at", "value"].sort());
    db.close();
  });
});
