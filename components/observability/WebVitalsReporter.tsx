"use client";

/**
 * PR-097.03 (Observability — Performance Dashboards) — real Core Web
 * Vitals capture, using Next.js's own built-in `useReportWebVitals`
 * (`next/web-vitals`) — no third-party analytics dependency. Mounted once
 * from `app/layout.tsx`, renders nothing.
 *
 * Reports via `navigator.sendBeacon` (falling back to `fetch` with
 * `keepalive`) to `/api/observability/performance`'s sibling ingest route,
 * `/api/observability/web-vitals` — the exact pattern Next's own docs show
 * under "Sending results to external systems." Only a metric's own
 * name/value/rating plus the current pathname are ever sent — no account
 * identity, no PII.
 */

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

function reportMetric(metric: { name: string; value: number; rating: string }, path: string) {
  const body = JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating, path });
  const url = "/api/observability/web-vitals";

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {
      // A dropped performance sample is never worth surfacing to the real user.
    });
  }
}

export function WebVitalsReporter() {
  const pathname = usePathname();

  // A stable callback reference (stable for as long as `pathname` doesn't
  // change) — required by `useReportWebVitals`'s own contract to avoid
  // re-reporting the same already-reported metrics on every render.
  const handleWebVitals = useCallback(
    (metric: Parameters<Parameters<typeof useReportWebVitals>[0]>[0]) => {
      reportMetric(metric, pathname);
    },
    [pathname]
  );

  useReportWebVitals(handleWebVitals);

  return null;
}
