/**
 * PR-095.05 (Activity Logs) — the real, append-only administrative audit
 * history. Same real backend/pattern every other admin table already
 * uses (`project_edits`, `saved_searches`) — no ORM, no new database
 * abstraction. Deliberately exports no update/delete function: an
 * `admin_activity_log` row, once written, can never be changed or
 * removed through this module's own API surface — the structural
 * guarantee behind "the Activity Log must be append-only" (this PR's own
 * brief), not just a UI convention that happens not to offer the
 * controls.
 *
 * `accountId`/`actorName` are always the caller's own already-resolved,
 * server-derived admin identity (`resolveAdminAccess`) — this module
 * never accepts or trusts an identity from anywhere else. `actorName` is
 * a real snapshot of the account's display name *at the time of the
 * action* (not a live join against `accounts` at read time), because a
 * later rename must never rewrite what an already-recorded event says
 * happened — the same "the record describes a moment, not the present"
 * principle a real audit log exists to guarantee.
 */

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

/** Controlled vocabulary — only the actions a real PR-095 mutation actually performs today. `CREATE`/`ADD`/`DELETE` are deliberately absent: no project-creation or project-deletion capability exists anywhere in this codebase (the registry is static; PR-095.03 only edits an admin override or reverts it); no account-creation/deletion capability exists either (PR-095.06 only ever changes an existing account's role) — adding those action types now would be exactly the "completeness for its own sake" this PR's brief prohibits. */
export const ADMIN_ACTIVITY_ACTIONS = ["EDIT", "REVERT", "ROLE_CHANGE"] as const;
export type AdminActivityAction = (typeof ADMIN_ACTIVITY_ACTIONS)[number];

/** Entity types a real activity record can describe. `"project"` (PR-095.03) and `"account"` (PR-095.06's real role-change target) are the only two real mutation targets that exist today. */
export const ADMIN_ACTIVITY_ENTITY_TYPES = ["project", "account"] as const;
export type AdminActivityEntityType = (typeof ADMIN_ACTIVITY_ENTITY_TYPES)[number];

export type ActivityFieldChange = {
  field: string;
  before: unknown;
  after: unknown;
};

export type ActivityLogEntry = {
  id: string;
  accountId: string;
  actorName: string;
  action: AdminActivityAction;
  entityType: AdminActivityEntityType;
  entityId: string;
  entityName: string;
  description: string;
  changes: ActivityFieldChange[];
  createdAt: string;
  timeZone: string;
};

export type NewActivityLogEntry = Omit<ActivityLogEntry, "id">;

type ActivityLogRow = {
  id: string;
  account_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  description: string;
  changes: string;
  created_at: string;
  time_zone: string;
};

function rowToEntry(row: ActivityLogRow): ActivityLogEntry {
  let changes: ActivityFieldChange[];
  try {
    const parsed: unknown = JSON.parse(row.changes);
    changes = Array.isArray(parsed) ? (parsed as ActivityFieldChange[]) : [];
  } catch {
    // A genuinely corrupted `changes` payload degrades to an honest empty
    // list — the same graceful recovery every other storage layer in this
    // codebase already applies to malformed JSON — never a crash, and
    // never fabricated field data.
    changes = [];
  }
  return {
    id: row.id,
    accountId: row.account_id,
    actorName: row.actor_name,
    action: row.action as AdminActivityAction,
    entityType: row.entity_type as AdminActivityEntityType,
    entityId: row.entity_id,
    entityName: row.entity_name,
    description: row.description,
    changes,
    createdAt: row.created_at,
    timeZone: row.time_zone,
  };
}

/** The one real write path — a genuine `INSERT`, nothing else. There is deliberately no `updateActivityLogEntry`/`deleteActivityLogEntry` export anywhere in this module. */
export function recordActivity(db: DatabaseSync, entry: NewActivityLogEntry): ActivityLogEntry {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO admin_activity_log (id, account_id, actor_name, action, entity_type, entity_id, entity_name, description, changes, created_at, time_zone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    entry.accountId,
    entry.actorName,
    entry.action,
    entry.entityType,
    entry.entityId,
    entry.entityName,
    entry.description,
    JSON.stringify(entry.changes),
    entry.createdAt,
    entry.timeZone
  );
  return { ...entry, id };
}

/**
 * Every real, persisted activity record, newest first. `limit` bounds a
 * genuinely unbounded-over-time table — 200 is a generous real page size
 * for this scale, not an arbitrary cutoff hiding data.
 *
 * Sorted by `created_at DESC` with SQLite's own implicit `rowid DESC` as
 * the tiebreaker — never `id` (a random UUID) for the tiebreaker, since
 * two real events recorded within the same millisecond need a tiebreaker
 * that actually reflects real insertion order, and a random UUID doesn't.
 * `rowid` genuinely does: it's assigned in real insertion order by
 * SQLite itself for this ordinary (non-`WITHOUT ROWID`) table.
 */
export function listActivity(db: DatabaseSync, limit = 200): ActivityLogEntry[] {
  const rows = db.prepare("SELECT *, rowid FROM admin_activity_log ORDER BY created_at DESC, rowid DESC LIMIT ?").all(limit) as ActivityLogRow[];
  return rows.map(rowToEntry);
}
