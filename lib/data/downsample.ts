/**
 * PR-097.01 (Performance — Provider optimization) — `docs/PERFORMANCE_AUDIT.md`'s
 * H2 finding: `ProfileChart.tsx` (an SVG-based `recharts` `AreaChart`,
 * which renders every data point as a real DOM/SVG node) received raw
 * provider time-series data with no decimation step — a multi-year "ALL"
 * period could pass several hundred to ~1,000+ raw points straight into
 * the chart. Fixed at the data-fetch boundary (`actions.ts`), per the
 * audit's own suggested approach, rather than inside `ProfileChart.tsx`
 * itself — the chart component stays a dumb renderer, unaware sampling
 * ever happened.
 *
 * Uniform stride sampling, not a bucketed min/max/avg pass — the smaller
 * of the audit's own two suggested approaches, genuinely sufficient for a
 * `recharts` area/line rendering at typical chart widths (a chart can't
 * usefully resolve more visually-distinct points than it has horizontal
 * pixels for). Always keeps the real first and real last point — an "ALL"
 * period chart must still show its true start and true current value,
 * never an approximated one.
 */

import type { SparklinePoint } from "@/lib/data/types";

/** `points` stays nullable end-to-end — a genuinely missing/malformed provider series is a real `null`, never coerced into a fabricated empty array just to satisfy this function's own signature. */
export function downsampleSparkline(points: SparklinePoint[] | null, maxPoints: number): SparklinePoint[] | null {
  if (points === null || points.length <= maxPoints) return points;

  const stride = Math.ceil(points.length / maxPoints);
  const sampled: SparklinePoint[] = [];
  for (let i = 0; i < points.length; i += stride) {
    sampled.push(points[i]);
  }

  const lastPoint = points[points.length - 1];
  if (sampled[sampled.length - 1] !== lastPoint) {
    sampled.push(lastPoint);
  }

  return sampled;
}
