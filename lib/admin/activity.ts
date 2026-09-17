/**
 * PR-095.05 (Activity Logs) — the thin admin service layer over the real
 * `admin_activity_log` repository, the same route → service → repository
 * layering `lib/admin/registry.ts` already established for PR-095.02/
 * PR-095.03. Read-only: there is no write function here, matching the
 * repository's own append-only-by-construction API surface.
 */

import type { DatabaseSync } from "node:sqlite";

import { listActivity, type ActivityLogEntry } from "@/lib/backend/sqlite/activityLog";

export function getAdminActivityLog(db: DatabaseSync, limit?: number): ActivityLogEntry[] {
  return listActivity(db, limit);
}
