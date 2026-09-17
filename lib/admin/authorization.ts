/**
 * PR-095.01 (Admin Dashboard) / PR-095.06 (Roles & Permissions) — the real
 * authorization boundary for every internal Administration Platform
 * surface.
 *
 * Authorization now derives from the real, persisted role model
 * (`account_roles`, `lib/backend/sqlite/roles.ts`) — the source of truth
 * PR-095.06 was built to introduce — checked against the exact same real,
 * DB-validated session (`resolveRequestSession`) every other protected
 * route in this app already uses: never a client-supplied flag, never
 * `localStorage`, never inferred from anything the client claims.
 *
 * `ADMIN_WALLET_ADDRESSES` (server-only, not `NEXT_PUBLIC_`-prefixed) is
 * kept as a real bootstrap fallback, not removed: an account that has
 * never been explicitly assigned a role (the real, common case for every
 * account until an admin uses the new Role Management surface to assign
 * one) resolves its role from the allowlist instead, exactly preserving
 * PR-095.01–PR-095.05's original behavior. The moment a real
 * `account_roles` row exists for an account, that row is authoritative —
 * the allowlist is consulted only as a fallback for accounts with no
 * persisted assignment, never as a second, competing source of truth for
 * one that already has one.
 *
 * Every real identity check resolves through `getAddressForAccount` to
 * the account's own real primary address (`users.id` — see
 * `lib/backend/sqlite/accounts.ts`'s own top comment on why that address
 * *is* the identity, not a separate claim about it) — never an address a
 * request could merely assert.
 */

import type { NextRequest } from "next/server";

import { resolveRequestSession } from "@/lib/auth/request-session";
import { getAddressForAccount } from "@/lib/backend/sqlite/accounts";
import { getDb } from "@/lib/backend/sqlite/db";
import { getAccountRole } from "@/lib/backend/sqlite/roles";
import { hasPermission, type AdminPermission, type Role } from "@/lib/admin/permissions";
import type { Account } from "@/lib/account/types";
import type { DatabaseSync } from "node:sqlite";

export type AdminAccessResult =
  | { state: "unauthenticated" }
  | { state: "forbidden" }
  | { state: "authorized"; account: Account };

export type AdminPermissionResult =
  | { state: "unauthenticated" }
  | { state: "forbidden" }
  | { state: "authorized"; account: Account; role: Role };

function parseAdminAddresses(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((address) => address.trim().toLowerCase())
      .filter((address) => address !== "")
  );
}

/** Exported so tests can exercise the allowlist parsing/matching directly, without needing a real request/session. Every real caller goes through `resolveAdminAccess`/`resolveAdminPermission` below. */
export function isAdminAddress(address: string): boolean {
  return parseAdminAddresses(process.env.ADMIN_WALLET_ADDRESSES).has(address.trim().toLowerCase());
}

/**
 * The real, effective role for an account: its own persisted
 * `account_roles` row if one exists, otherwise the bootstrap allowlist
 * fallback (`ADMIN` if the account's real primary address is on
 * `ADMIN_WALLET_ADDRESSES`, `USER` otherwise). Exported so the Role
 * Management surface can show every real account's true current role,
 * not just the ones with an explicit row.
 */
export function resolveEffectiveRole(db: DatabaseSync, accountId: string, address: string | null): Role {
  const assigned = getAccountRole(db, accountId);
  if (assigned) return assigned.role;
  return address && isAdminAddress(address) ? "ADMIN" : "USER";
}

/**
 * The one real entry point every admin-protected route calls for a
 * simple "is this account an administrator" check. Three real, distinct
 * outcomes — never collapsed into a single boolean — so a caller can
 * report an honest 401 ("sign in") vs. 403 ("signed in, not an admin")
 * rather than one undifferentiated rejection. Equivalent to
 * `resolveAdminPermission` checked against every real permission at once
 * (today, `ADMIN` holds all of them) — kept as its own function because
 * every PR-095.01–PR-095.05 route already calls it by this exact name
 * and shape; changing its contract would be an unnecessary, riskier
 * refactor of already-working code.
 */
export function resolveAdminAccess(request: NextRequest): AdminAccessResult {
  const session = resolveRequestSession(request);
  if (session.state !== "authenticated") return { state: "unauthenticated" };

  const db = getDb();
  const address = getAddressForAccount(db, session.account.id);
  const role = resolveEffectiveRole(db, session.account.id, address);
  if (role !== "ADMIN") return { state: "forbidden" };

  return { state: "authorized", account: session.account };
}

/**
 * PR-095.06 — the real, permission-specific entry point. Used by the new
 * Role Management routes (and available for any future route that needs
 * a narrower check than "is this account an administrator at all").
 * Resolves the account's real effective role exactly the same way
 * `resolveAdminAccess` does, then checks a specific, named permission
 * against it via `hasPermission` — never a raw boolean admin flag.
 */
export function resolveAdminPermission(request: NextRequest, permission: AdminPermission): AdminPermissionResult {
  const session = resolveRequestSession(request);
  if (session.state !== "authenticated") return { state: "unauthenticated" };

  const db = getDb();
  const address = getAddressForAccount(db, session.account.id);
  const role = resolveEffectiveRole(db, session.account.id, address);
  if (!hasPermission(role, permission)) return { state: "forbidden" };

  return { state: "authorized", account: session.account, role };
}
