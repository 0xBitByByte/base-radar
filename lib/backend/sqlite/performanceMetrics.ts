/**
 * PR-097.03 (Observability — Performance Dashboards) — real, persisted
 * Core Web Vitals samples reported by real browser sessions
 * (`components/observability/WebVitalsReporter.tsx`, via `next/web-vitals`).
 * Same real backend pattern every other table in this file already uses —
 * no ORM, no new database abstraction. Deliberately append-only: there is
 * no update/delete export, matching `admin_activity_log`'s own "once
 * written, never changed" shape — a performance sample describes a real
 * moment, not a value to be revised later.
 *
 * Anonymous by design: no account/session identity is ever recorded here,
 * only the metric name/value/rating and the page path — Core Web Vitals
 * are a property of a page load, not of who loaded it.
 */

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

/** The Web Vitals names `next/web-vitals` can report, plus Next's own custom render-timing metrics — the real, known vocabulary this table's `metric_name` values are validated against before ever being persisted. */
export const KNOWN_PERFORMANCE_METRIC_NAMES = [
  "TTFB",
  "FCP",
  "LCP",
  "FID",
  "CLS",
  "INP",
  "Next.js-hydration",
  "Next.js-route-change-to-render",
  "Next.js-render",
] as const;
export type PerformanceMetricName = (typeof KNOWN_PERFORMANCE_METRIC_NAMES)[number];

export const PERFORMANCE_METRIC_RATINGS = ["good", "needs-improvement", "poor"] as const;
export type PerformanceMetricRating = (typeof PERFORMANCE_METRIC_RATINGS)[number];

export type NewPerformanceMetric = {
  metricName: string;
  value: number;
  rating: PerformanceMetricRating;
  path: string;
  recordedAt: string;
};

export function isKnownPerformanceMetricName(name: unknown): name is PerformanceMetricName {
  return typeof name === "string" && (KNOWN_PERFORMANCE_METRIC_NAMES as readonly string[]).includes(name);
}

export function isPerformanceMetricRating(rating: unknown): rating is PerformanceMetricRating {
  return typeof rating === "string" && (PERFORMANCE_METRIC_RATINGS as readonly string[]).includes(rating);
}

/** The one real write path — a genuine `INSERT`, nothing else. There is deliberately no update/delete export anywhere in this module. */
export function recordPerformanceMetric(db: DatabaseSync, metric: NewPerformanceMetric): void {
  db.prepare(
    "INSERT INTO performance_metrics (id, metric_name, value, rating, path, recorded_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(randomUUID(), metric.metricName, metric.value, metric.rating, metric.path, metric.recordedAt);
}

export type PerformanceMetricSummary = {
  metricName: string;
  sampleCount: number;
  average: number;
  min: number;
  max: number;
  goodCount: number;
  needsImprovementCount: number;
  poorCount: number;
};

type PerformanceMetricSummaryRow = {
  metric_name: string;
  sample_count: number;
  average: number;
  min: number;
  max: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
};

/**
 * One real, aggregated row per distinct metric name that has at least one
 * real sample on file — a metric with zero samples simply doesn't appear
 * (never a fabricated zero-row), so the dashboard can render an honest
 * "no data yet" state per metric rather than a misleading empty chart.
 */
export function getPerformanceMetricsSummary(db: DatabaseSync): PerformanceMetricSummary[] {
  const rows = db
    .prepare(
      `SELECT
         metric_name,
         COUNT(*) AS sample_count,
         AVG(value) AS average,
         MIN(value) AS min,
         MAX(value) AS max,
         SUM(CASE WHEN rating = 'good' THEN 1 ELSE 0 END) AS good_count,
         SUM(CASE WHEN rating = 'needs-improvement' THEN 1 ELSE 0 END) AS needs_improvement_count,
         SUM(CASE WHEN rating = 'poor' THEN 1 ELSE 0 END) AS poor_count
       FROM performance_metrics
       GROUP BY metric_name
       ORDER BY metric_name ASC`
    )
    .all() as PerformanceMetricSummaryRow[];

  return rows.map((row) => ({
    metricName: row.metric_name,
    sampleCount: row.sample_count,
    average: row.average,
    min: row.min,
    max: row.max,
    goodCount: row.good_count,
    needsImprovementCount: row.needs_improvement_count,
    poorCount: row.poor_count,
  }));
}
