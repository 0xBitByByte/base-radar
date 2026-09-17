/**
 * PR-095.06 (Roles & Permissions) — the protected Role Management listing
 * endpoint. Gated by the real, named `roles:manage` permission
 * (`resolveAdminPermission`), not a bare "is admin" check — the same
 * 401 (unauthenticated) vs. 403 (forbidden, i.e. lacks this specific
 * permission) shape every other admin route already uses.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminPermission } from "@/lib/admin/authorization";
import { getAdminRolesSnapshot } from "@/lib/admin/roles";
import { getDb } from "@/lib/backend/sqlite/db";

export async function GET(request: NextRequest) {
  const access = resolveAdminPermission(request, "roles:manage");

  if (access.state === "unauthenticated") {
    return NextResponse.json({ error: "Sign in to view Role Management." }, { status: 401 });
  }
  if (access.state === "forbidden") {
    return NextResponse.json({ error: "You don't have access to Role Management." }, { status: 403 });
  }

  return NextResponse.json(getAdminRolesSnapshot(getDb()));
}
