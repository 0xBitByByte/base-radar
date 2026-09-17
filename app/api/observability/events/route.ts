/**
 * PR-097.03 (Observability — Analytics) — the real ingest endpoint for
 * anonymous product-usage events reported by
 * `components/observability/AnalyticsTracker.tsx` (sent via
 * `navigator.sendBeacon`/`fetch`, the same real-user-reporting shape
 * `/api/observability/web-vitals` already established).
 *
 * Deliberately unauthenticated: a page-view event describes a real page
 * load, not an authenticated action. No account/session identity, cookie,
 * or client-generated visitor id is ever read from or persisted with an
 * event. Every field is strictly validated against a real, known
 * vocabulary before being persisted — malformed or unrecognized input is
 * rejected with a real 400, never silently coerced or stored.
 *
 * PR-097.05 (Security): now real per-IP rate limited (see
 * `lib/security/requestRateLimit.ts`) — 120 requests/minute comfortably
 * covers real page-view/interaction volume from one visitor while bounding
 * how fast one IP can grow the `analytics_events` table.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/lib/backend/sqlite/db";
import { isKnownAnalyticsEventName, recordAnalyticsEvent } from "@/lib/backend/sqlite/analyticsEvents";
import { isRequestRateLimited } from "@/lib/security/requestRateLimit";

const ANALYTICS_EVENT_RATE_LIMIT = { limit: 120, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  if (isRequestRateLimited(request, "observability:events", ANALYTICS_EVENT_RATE_LIMIT)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "A real object with name/path is required." }, { status: 400 });
  }

  const { name, path } = body as Record<string, unknown>;

  if (!isKnownAnalyticsEventName(name)) {
    return NextResponse.json({ error: "Not a real, known analytics event name." }, { status: 400 });
  }
  if (typeof path !== "string" || path === "") {
    return NextResponse.json({ error: "path must be a real, non-empty string." }, { status: 400 });
  }

  recordAnalyticsEvent(getDb(), { eventName: name, path, recordedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true }, { status: 201 });
}
