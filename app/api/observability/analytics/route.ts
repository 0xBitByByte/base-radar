/**
 * PR-097.03 (Observability — Analytics) — the protected summary endpoint
 * the Analytics Dashboard reads. Reuses the exact same authorization
 * boundary every PR-095 admin route and `/api/observability/performance`
 * already use (`resolveAdminAccess`) — same real, DB-validated session
 * check, same 401/403 shape — without depending on or modifying any
 * PR-095 file.
 *
 * GET-only: this route is read-only by design, matching the ingest
 * endpoint's (`/api/observability/events`) own append-only-by-
 * construction persistence layer.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminAccess } from "@/lib/admin/authorization";
import { getAnalyticsSummary } from "@/lib/backend/sqlite/analyticsEvents";
import { getDb } from "@/lib/backend/sqlite/db";

export async function GET(request: NextRequest) {
  const access = resolveAdminAccess(request);

  if (access.state === "unauthenticated") {
    return NextResponse.json({ error: "Sign in to view the Analytics Dashboard." }, { status: 401 });
  }
  if (access.state === "forbidden") {
    return NextResponse.json({ error: "You don't have access to the Analytics Dashboard." }, { status: 403 });
  }

  return NextResponse.json(getAnalyticsSummary(getDb()));
}
