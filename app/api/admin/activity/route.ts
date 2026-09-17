/**
 * PR-095.05 (Activity Logs) — the protected Admin Activity Log endpoint.
 * Reuses the exact PR-095.01 authorization boundary (`resolveAdminAccess`)
 * — same real, DB-validated session check, same allowlist, same 401
 * (unauthenticated) vs. 403 (forbidden) shape as every other admin route.
 *
 * GET-only: this route is read-only by design — activity records are
 * only ever created as a side effect of a real admin mutation
 * (`applyProjectEdit`/`revertProjectEdit` in `lib/admin/registry.ts`),
 * never through a request to this route itself. There is no POST/PATCH/
 * DELETE handler here — the Activity Log's append-only guarantee holds
 * structurally, not just by UI convention.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminAccess } from "@/lib/admin/authorization";
import { getAdminActivityLog } from "@/lib/admin/activity";
import { getDb } from "@/lib/backend/sqlite/db";

export async function GET(request: NextRequest) {
  const access = resolveAdminAccess(request);

  if (access.state === "unauthenticated") {
    return NextResponse.json({ error: "Sign in to view the Admin Activity Log." }, { status: 401 });
  }
  if (access.state === "forbidden") {
    return NextResponse.json({ error: "You don't have access to the Admin Activity Log." }, { status: 403 });
  }

  return NextResponse.json({ activity: getAdminActivityLog(getDb()) });
}
