/**
 * PR-095.06 (Roles & Permissions) — the real, persisted role assignment
 * repository. One row per account that has ever been explicitly assigned
 * a role; an account with no row here simply has no persisted override —
 * `lib/admin/authorization.ts`'s `resolveEffectiveRole` is the one real
 * place that decides what an account's role actually *is* when no row
 * exists (a bootstrap fallback to the existing `ADMIN_WALLET_ADDRESSES`
 * allowlist, preserving PR-095.01's original behavior for any account
 * that has never had a real role assigned).
 *
 * Same real backend pattern every other admin table already uses
 * (`project_edits`, `admin_activity_log`) — no ORM, no new database
 * abstraction. `updated_by` is always the caller's own already-resolved,
 * server-derived admin identity — this module never accepts an identity
 * from anywhere else.
 */

import type { DatabaseSync } from "node:sqlite";

import { ROLES, type Role } from "@/lib/admin/permissions";

export type AccountRoleRecord = {
  accountId: string;
  role: Role;
  updatedAt: string;
  updatedBy: string;
};

type AccountRoleRow = { account_id: string; role: string; updated_at: string; updated_by: string };

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function rowToRecord(row: AccountRoleRow): AccountRoleRecord | null {
  // A row whose `role` column somehow isn't one of the real, known roles
  // (a genuinely corrupted value — this module's own `setAccountRole` can
  // never write one) is treated the same as "no real assignment" rather
  // than trusted — the same fail-closed recovery every other storage
  // layer in this codebase already applies to malformed data.
  if (!isRole(row.role)) return null;
  return { accountId: row.account_id, role: row.role, updatedAt: row.updated_at, updatedBy: row.updated_by };
}

/** `null` when this account has no real, persisted role override on file. */
export function getAccountRole(db: DatabaseSync, accountId: string): AccountRoleRecord | null {
  const row = db.prepare("SELECT * FROM account_roles WHERE account_id = ?").get(accountId) as AccountRoleRow | undefined;
  return row ? rowToRecord(row) : null;
}

/** Every real, persisted role assignment on file. */
export function listAccountRoles(db: DatabaseSync): AccountRoleRecord[] {
  const rows = db.prepare("SELECT * FROM account_roles").all() as AccountRoleRow[];
  const records: AccountRoleRecord[] = [];
  for (const row of rows) {
    const record = rowToRecord(row);
    if (record) records.push(record);
  }
  return records;
}

/** Real, atomic upsert — a single `INSERT ... ON CONFLICT DO UPDATE` statement, the same atomicity guarantee `upsertProjectEdit` already relies on. */
export function setAccountRole(db: DatabaseSync, accountId: string, role: Role, updatedBy: string): AccountRoleRecord {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO account_roles (account_id, role, updated_at, updated_by) VALUES (?, ?, ?, ?)
     ON CONFLICT(account_id) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at, updated_by = excluded.updated_by`
  ).run(accountId, role, now, updatedBy);

  return { accountId, role, updatedAt: now, updatedBy };
}
