/**
 * PR-095.06 (Roles & Permissions) — the real write path for a single
 * account's role. Gated by the real, named `roles:manage` permission
 * (`resolveAdminPermission`) — never a bare "is admin" check, never a
 * client-supplied role/permission/identity. The acting account is always
 * `access.account` (server-resolved from the validated session);
 * `changeAccountRole()` (`lib/admin/roles.ts`) is the one place that
 * validates the new role, refuses a self-role-change, looks up the real
 * target account, and records the real Activity Log entry only after a
 * genuine change is actually persisted.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminPermission } from "@/lib/admin/authorization";
import { resolveClientTimeZone } from "@/lib/admin/clientTimeZone";
import { changeAccountRole, getAdminRolesSnapshot } from "@/lib/admin/roles";
import { getDb } from "@/lib/backend/sqlite/db";

type RouteParams = { params: Promise<{ accountId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const access = resolveAdminPermission(request, "roles:manage");
  if (access.state === "unauthenticated") {
    return NextResponse.json({ error: "Sign in to manage roles." }, { status: 401 });
  }
  if (access.state === "forbidden") {
    return NextResponse.json({ error: "You don't have access to manage roles." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "A real object with a role is required." }, { status: 400 });
  }

  const { accountId } = await params;
  const db = getDb();
  const timeZone = resolveClientTimeZone(request);
  // Only `role` is ever read from the body — a spoofed `accountId`/`updatedBy`/`userName`/similar
  // identity field elsewhere in the payload is simply never looked at, for the actor or the target.
  const result = changeAccountRole(db, access.account.id, access.account.name, timeZone, accountId, (body as { role?: unknown }).role);

  if (result.outcome === "not-found") {
    return NextResponse.json({ error: "No such account." }, { status: 404 });
  }
  if (result.outcome === "invalid-role") {
    return NextResponse.json({ error: "Not a real, known role." }, { status: 400 });
  }
  if (result.outcome === "cannot-change-own-role") {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }

  return NextResponse.json({ role: result.role, snapshot: getAdminRolesSnapshot(db) });
}
