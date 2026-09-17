/**
 * PR-097.03 (Observability — Performance Dashboards) — the real ingest
 * endpoint for Core Web Vitals samples reported by
 * `components/observability/WebVitalsReporter.tsx` (`next/web-vitals`,
 * sent via `navigator.sendBeacon`/`fetch`).
 *
 * Deliberately unauthenticated: a Web Vitals sample describes a real
 * page-load's own performance, not an authenticated action — the same
 * real-user-monitoring shape Next.js's own docs describe (`useReportWebVitals`
 * "Sending results to external systems"). No account/session identity is
 * ever read from or persisted with a sample. Every field is strictly
 * validated against a real, known vocabulary before being persisted —
 * malformed or unrecognized input is rejected with a real 400, never
 * silently coerced or stored.
 *
 * PR-097.05 (Security): now real per-IP rate limited (see
 * `lib/security/requestRateLimit.ts`) — 120 requests/minute comfortably
 * covers a real page's own Web Vitals volume (5 metrics per page load)
 * across normal browsing while bounding how fast one IP can grow the
 * `performance_metrics` table.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/lib/backend/sqlite/db";
import { isKnownPerformanceMetricName, isPerformanceMetricRating, recordPerformanceMetric } from "@/lib/backend/sqlite/performanceMetrics";
import { isRequestRateLimited } from "@/lib/security/requestRateLimit";

const WEB_VITALS_RATE_LIMIT = { limit: 120, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  if (isRequestRateLimited(request, "observability:web-vitals", WEB_VITALS_RATE_LIMIT)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "A real object with name/value/rating/path is required." }, { status: 400 });
  }

  const { name, value, rating, path } = body as Record<string, unknown>;

  if (!isKnownPerformanceMetricName(name)) {
    return NextResponse.json({ error: "Not a real, known performance metric name." }, { status: 400 });
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: "value must be a real, finite, non-negative number." }, { status: 400 });
  }
  if (!isPerformanceMetricRating(rating)) {
    return NextResponse.json({ error: "Not a real, known rating." }, { status: 400 });
  }
  if (typeof path !== "string" || path === "") {
    return NextResponse.json({ error: "path must be a real, non-empty string." }, { status: 400 });
  }

  recordPerformanceMetric(getDb(), { metricName: name, value, rating, path, recordedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true }, { status: 201 });
}
