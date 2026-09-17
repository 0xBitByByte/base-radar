/**
 * PR-097.03 (Observability — Performance Dashboards) — the protected
 * summary endpoint the Performance Dashboard reads. Reuses the exact same
 * authorization boundary every PR-095 admin route already uses
 * (`resolveAdminAccess`) — same real, DB-validated session check, same
 * 401 (unauthenticated) vs. 403 (forbidden) shape — without depending on
 * or modifying any PR-095 file.
 *
 * GET-only: this route is read-only by design, matching the ingest
 * endpoint's (`/api/observability/web-vitals`) own append-only-by-
 * construction persistence layer.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminAccess } from "@/lib/admin/authorization";
import { getDb } from "@/lib/backend/sqlite/db";
import { getPerformanceMetricsSummary } from "@/lib/backend/sqlite/performanceMetrics";

export async function GET(request: NextRequest) {
  const access = resolveAdminAccess(request);

  if (access.state === "unauthenticated") {
    return NextResponse.json({ error: "Sign in to view the Performance Dashboard." }, { status: 401 });
  }
  if (access.state === "forbidden") {
    return NextResponse.json({ error: "You don't have access to the Performance Dashboard." }, { status: 403 });
  }

  return NextResponse.json({ summary: getPerformanceMetricsSummary(getDb()) });
}
