/**
 * PR-095.06 (Roles & Permissions) — the real Role Management service
 * layer, the same route → service → repository layering
 * `lib/admin/registry.ts`/`lib/admin/activity.ts` already established.
 *
 * `getAdminRolesSnapshot` shows every real account's true effective role
 * (persisted assignment, or the bootstrap allowlist fallback —
 * `resolveEffectiveRole`, `lib/admin/authorization.ts`) — an honest
 * "what is this account's role right now," never just the sparse
 * `account_roles` table alone, which would silently omit every
 * allowlist-only admin.
 *
 * `changeAccountRole` is the one real write path: validates the new role
 * against the real, known vocabulary, refuses to let an actor change
 * their *own* role (a real safety rail against accidental self-lockout
 * and self-tampering — the account performing a role change is, by
 * definition, already holding `roles:manage`, the ceiling permission in
 * this flat two-role model, so there is no higher privilege to escalate
 * to; the real risk this guards against is an admin locking themselves
 * out or a compromised admin session silently demoting the real owner),
 * looks up the real target account, computes the real current role, and
 * — only on an actual change, never a duplicate no-op assignment —
 * persists it and records one real `ROLE_CHANGE` Activity Log entry.
 */

import type { DatabaseSync } from "node:sqlite";

import { getAccountById, getAddressForAccount, listAccounts } from "@/lib/backend/sqlite/accounts";
import { recordActivity } from "@/lib/backend/sqlite/activityLog";
import { getAccountRole, setAccountRole } from "@/lib/backend/sqlite/roles";
import { resolveEffectiveRole } from "@/lib/admin/authorization";
import { isValidRole, type Role } from "@/lib/admin/permissions";

export type EffectiveAccountRole = {
  accountId: string;
  address: string | null;
  name: string;
  username: string;
  role: Role;
  /** `true` when this role comes from the bootstrap allowlist fallback, not a real, explicit `account_roles` row — genuinely useful for the UI to show "not yet explicitly assigned" rather than implying every listed admin was deliberately granted the role through this surface. */
  isBootstrapRole: boolean;
};

export function getAdminRolesSnapshot(db: DatabaseSync): { accounts: EffectiveAccountRole[] } {
  const accounts = listAccounts(db).map((account) => {
    const address = getAddressForAccount(db, account.id);
    const assigned = getAccountRole(db, account.id);
    const role = resolveEffectiveRole(db, account.id, address);
    return { accountId: account.id, address, name: account.name, username: account.username, role, isBootstrapRole: assigned === null };
  });
  return { accounts };
}

export type ChangeAccountRoleResult =
  | { outcome: "not-found" }
  | { outcome: "invalid-role" }
  | { outcome: "cannot-change-own-role" }
  | { outcome: "no-change"; role: Role }
  | { outcome: "success"; role: Role };

export function changeAccountRole(
  db: DatabaseSync,
  actorAccountId: string,
  actorName: string,
  timeZone: string,
  targetAccountId: string,
  newRole: unknown
): ChangeAccountRoleResult {
  if (!isValidRole(newRole)) return { outcome: "invalid-role" };
  if (targetAccountId === actorAccountId) return { outcome: "cannot-change-own-role" };

  const targetAccount = getAccountById(db, targetAccountId);
  if (!targetAccount) return { outcome: "not-found" };

  const targetAddress = getAddressForAccount(db, targetAccountId);
  const currentRole = resolveEffectiveRole(db, targetAccountId, targetAddress);

  if (currentRole === newRole) return { outcome: "no-change", role: newRole };

  setAccountRole(db, targetAccountId, newRole, actorAccountId);

  recordActivity(db, {
    accountId: actorAccountId,
    actorName,
    action: "ROLE_CHANGE",
    entityType: "account",
    entityId: targetAccountId,
    entityName: targetAccount.name,
    description: `${actorName} changed the role for ${targetAccount.name} from ${currentRole} to ${newRole}`,
    changes: [{ field: "role", before: currentRole, after: newRole }],
    createdAt: new Date().toISOString(),
    timeZone,
  });

  return { outcome: "success", role: newRole };
}
