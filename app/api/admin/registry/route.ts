/**
 * PR-095.02 (Project Registry) — the protected Admin Registry endpoint.
 * Reuses PR-095.01's exact authorization boundary (`resolveAdminAccess`)
 * rather than a second mechanism — same real, DB-validated session check,
 * same allowlist, same 401 (unauthenticated) vs. 403 (forbidden) shape as
 * `/api/admin/overview`.
 *
 * GET-only here: this route itself never mutates anything. PR-095.03's
 * real write path (`PATCH`/`DELETE` for editing/reverting a single real
 * project) lives at `/api/admin/registry/[projectId]`, not here — the
 * snapshot this route returns already reflects PR-095.03's real,
 * persisted admin edits (`getAdminRegistrySnapshot` now merges
 * `project_edits` onto the static seed), it just doesn't accept writes
 * itself.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminAccess } from "@/lib/admin/authorization";
import { getAdminRegistrySnapshot } from "@/lib/admin/registry";
import { getDb } from "@/lib/backend/sqlite/db";

export async function GET(request: NextRequest) {
  const access = resolveAdminAccess(request);

  if (access.state === "unauthenticated") {
    return NextResponse.json({ error: "Sign in to view the Admin Registry." }, { status: 401 });
  }
  if (access.state === "forbidden") {
    return NextResponse.json({ error: "You don't have access to the Admin Registry." }, { status: 403 });
  }

  return NextResponse.json(getAdminRegistrySnapshot(getDb()));
}
