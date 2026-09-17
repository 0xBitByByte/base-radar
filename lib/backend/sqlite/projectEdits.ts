/**
 * PR-095.03 (Project Editor) — the real, server-only repository for
 * `project_edits`: an admin-only patch/override layer on top of the
 * static Project Registry (`data/projects/seed/*.ts`), per the approved
 * PR-095.03 persistence investigation. One row per project that has ever
 * been edited by an admin; a project with no row here is simply
 * untouched — the static seed is its entire real state, exactly as
 * before this PR. `fields` is a JSON-encoded `Partial<Project>` patch,
 * never a full copy of the registry schema — the same "small, additive,
 * never a second source of truth" shape the approved investigation
 * report specified.
 *
 * This module never reads `data/projects/*` itself — merging the patch
 * onto the real seed project is `lib/admin/registry.ts`'s job, the one
 * place that already reads both. Keeping that merge out of this file
 * keeps it a plain, mechanical SQLite repository, the same shape
 * `lib/backend/sqlite/accounts.ts`/`sessions.ts`/`savedSearchSync.ts`
 * already establish — no ORM, no new database abstraction.
 */

import type { DatabaseSync } from "node:sqlite";

import type { Project } from "@/data/projects/types";

export type ProjectEditRecord = {
  projectId: string;
  fields: Partial<Project>;
  updatedAt: string;
  updatedBy: string;
};

type ProjectEditRow = { project_id: string; fields: string; updated_at: string; updated_by: string };

function rowToRecord(row: ProjectEditRow): ProjectEditRecord | null {
  try {
    const parsed: unknown = JSON.parse(row.fields);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return { projectId: row.project_id, fields: parsed as Partial<Project>, updatedAt: row.updated_at, updatedBy: row.updated_by };
  } catch {
    // A genuinely corrupted stored patch is treated as "no real edit for
    // this project" — the same graceful, silent recovery every other
    // storage layer in this codebase already uses for malformed data —
    // never a thrown error, never a fabricated partial edit.
    return null;
  }
}

/** `null` when this project has no real edit on file — the caller's signal to use the seed project unchanged. */
export function getProjectEdit(db: DatabaseSync, projectId: string): ProjectEditRecord | null {
  const row = db.prepare("SELECT * FROM project_edits WHERE project_id = ?").get(projectId) as ProjectEditRow | undefined;
  if (!row) return null;
  return rowToRecord(row);
}

/** Every real edit on file. A row with a genuinely corrupted `fields` payload is silently skipped, not surfaced as a crash — the same recovery `getProjectEdit` applies to a single row, applied here across all of them. */
export function listProjectEdits(db: DatabaseSync): ProjectEditRecord[] {
  const rows = db.prepare("SELECT * FROM project_edits").all() as ProjectEditRow[];
  const records: ProjectEditRecord[] = [];
  for (const row of rows) {
    const record = rowToRecord(row);
    if (record) records.push(record);
  }
  return records;
}

/**
 * Real upsert — `updatedBy` is always the caller's own already-resolved,
 * server-derived admin account id (see `lib/admin/authorization.ts`'s
 * `resolveAdminAccess`); this function never accepts or trusts an id from
 * anywhere else. Replaces the entire stored patch (never merges two old
 * patches together) — the caller (`app/api/admin/registry/[projectId]/
 * route.ts`) is responsible for computing the real, complete new patch
 * before calling this.
 */
export function upsertProjectEdit(db: DatabaseSync, projectId: string, fields: Partial<Project>, updatedBy: string): ProjectEditRecord {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO project_edits (project_id, fields, updated_at, updated_by) VALUES (?, ?, ?, ?)
     ON CONFLICT(project_id) DO UPDATE SET fields = excluded.fields, updated_at = excluded.updated_at, updated_by = excluded.updated_by`
  ).run(projectId, JSON.stringify(fields), now, updatedBy);

  return { projectId, fields, updatedAt: now, updatedBy };
}

/** A real, honest no-op for a project with no edit on file — reverting something that was never overridden is not an error. Returns whether a real row was actually removed. */
export function clearProjectEdit(db: DatabaseSync, projectId: string): boolean {
  const result = db.prepare("DELETE FROM project_edits WHERE project_id = ?").run(projectId);
  return result.changes > 0;
}
