"use client";

/**
 * PR-097.03 (Observability — Analytics) — real, anonymous page-view
 * tracking. Mounted once from `app/layout.tsx`, renders nothing. Reports
 * one real `page_view` event per real pathname the app renders (initial
 * load, plus every real client-side navigation `usePathname()` observes)
 * to `/api/observability/events`, via `navigator.sendBeacon` (falling
 * back to `fetch` with `keepalive`) — the exact same fire-and-forget,
 * non-blocking reporting shape `WebVitalsReporter` already established,
 * so a dropped or slow report never affects real page-load performance.
 *
 * No account identity, cookie, or client-generated visitor id is ever
 * read or sent — only the real path itself.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function reportPageView(path: string) {
  const body = JSON.stringify({ name: "page_view", path });
  const url = "/api/observability/events";

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {
      // A dropped page-view report is never worth surfacing to the real user.
    });
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    reportPageView(pathname);
  }, [pathname]);

  return null;
}
