/**
 * PR-095.03 (Project Editor) — the real write path for a single Project
 * Registry entry's admin override. Same real authorization boundary as
 * every other admin route (`resolveAdminAccess`) — never a second
 * mechanism, never a client-supplied identity. `updated_by` always comes
 * from the already-resolved, server-derived `account.id` on the
 * authorized session, never anything the request body could claim.
 *
 * `PATCH` — apply a real edit. `applyProjectEdit()`
 * (`lib/admin/registry.ts`) does the actual field-whitelisting,
 * merge-with-existing-edit, and full-registry `validateRegistry()` check
 * before ever persisting anything — this route only translates its
 * outcome into the right HTTP status, it makes no security or validation
 * decision of its own.
 *
 * `DELETE` — revert: remove the stored edit entirely, restoring the seed
 * project's own values. There is deliberately no project-deletion
 * endpoint anywhere in this PR — `DELETE` here only ever deletes an
 * *edit*, never a project, matching this PR's explicit scope.
 *
 * PR-095.05 (Activity Logs) — both handlers pass the real, server-
 * resolved `access.account.name` (never a request-body value) as the
 * acting admin's display-name snapshot, and a real client-reported IANA
 * time zone (the `X-Client-Timezone` header — a real, standard
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` value the browser
 * itself reports, contextual metadata like a User-Agent, never an
 * identity claim) down into `lib/admin/registry.ts`, which records the
 * actual Activity Log entry only after a mutation genuinely succeeds.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminAccess } from "@/lib/admin/authorization";
import { resolveClientTimeZone } from "@/lib/admin/clientTimeZone";
import { applyProjectEdit, getAdminRegistrySnapshot, revertProjectEdit } from "@/lib/admin/registry";
import { getDb } from "@/lib/backend/sqlite/db";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const access = resolveAdminAccess(request);
  if (access.state === "unauthenticated") {
    return NextResponse.json({ error: "Sign in to edit the Project Registry." }, { status: 401 });
  }
  if (access.state === "forbidden") {
    return NextResponse.json({ error: "You don't have access to edit the Project Registry." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "A real object of fields to edit is required." }, { status: 400 });
  }

  const { projectId } = await params;
  const db = getDb();
  const timeZone = resolveClientTimeZone(request);
  const result = applyProjectEdit(db, projectId, body as Record<string, unknown>, access.account.id, access.account.name, timeZone);

  if (result.outcome === "not-found") {
    return NextResponse.json({ error: "No such project in the registry." }, { status: 404 });
  }
  if (result.outcome === "rejected-fields") {
    return NextResponse.json({ error: `These fields aren't editable: ${result.rejectedFields.join(", ")}` }, { status: 400 });
  }
  if (result.outcome === "validation-failed") {
    return NextResponse.json({ error: "This edit would make the registry invalid.", validationErrors: result.errors }, { status: 422 });
  }

  return NextResponse.json({ project: result.project, snapshot: getAdminRegistrySnapshot(db) });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const access = resolveAdminAccess(request);
  if (access.state === "unauthenticated") {
    return NextResponse.json({ error: "Sign in to edit the Project Registry." }, { status: 401 });
  }
  if (access.state === "forbidden") {
    return NextResponse.json({ error: "You don't have access to edit the Project Registry." }, { status: 403 });
  }

  const { projectId } = await params;
  const db = getDb();
  const timeZone = resolveClientTimeZone(request);
  const result = revertProjectEdit(db, projectId, access.account.id, access.account.name, timeZone);

  if (result.outcome === "not-found") {
    return NextResponse.json({ error: "No such project in the registry." }, { status: 404 });
  }

  return NextResponse.json({ snapshot: getAdminRegistrySnapshot(db) });
}
