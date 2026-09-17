/**
 * PR-095.01 (Admin Dashboard) — the one real, protected server boundary
 * for the Administration Overview. Requires real, authenticated,
 * allowlisted admin access (`resolveAdminAccess`) — never a client-
 * supplied flag. A Guest or a signed-in-but-non-admin account never
 * receives any real metric value, not even inside an error payload: the
 * response body itself is either `{ metrics }` (fully authorized) or a
 * generic `{ error }` string, exactly the same "the failure reason is
 * safe to show, the data behind it never leaks" shape every other
 * protected route in this app already follows (see
 * `app/api/sync/push/route.ts`).
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminAccess } from "@/lib/admin/authorization";
import { getAdminOverviewMetrics } from "@/lib/backend/sqlite/adminMetrics";
import { getDb } from "@/lib/backend/sqlite/db";

export async function GET(request: NextRequest) {
  const access = resolveAdminAccess(request);

  if (access.state === "unauthenticated") {
    return NextResponse.json({ error: "Sign in to view the Admin Dashboard." }, { status: 401 });
  }
  if (access.state === "forbidden") {
    return NextResponse.json({ error: "You don't have access to the Admin Dashboard." }, { status: 403 });
  }

  const metrics = getAdminOverviewMetrics(getDb());
  return NextResponse.json({ metrics });
}
