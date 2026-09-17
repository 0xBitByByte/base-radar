/**
 * A real `HealthService` (`lib/backend/services/health.ts`'s contract)
 * against the Phase C SQLite database — genuinely verifies the database
 * is reachable by running a real, trivial query against it, never a
 * fabricated `{ healthy: true }`. `SELECT 1` is the standard,
 * side-effect-free "is this connection actually usable right now" probe;
 * a closed connection, a locked/corrupted file, or a missing directory
 * all surface as a real thrown error here, honestly reported as
 * `healthy: false`.
 */

import type { DatabaseSync } from "node:sqlite";

import { isPersistenceExpected } from "@/lib/backend/sqlite/db";
import type { BackendHealth, HealthService } from "@/lib/backend/services/health";

export function createHealthService(getDb: () => DatabaseSync): HealthService {
  return {
    async check(): Promise<BackendHealth> {
      try {
        const db = getDb();
        const row = db.prepare("SELECT 1 AS ok").get() as { ok: number } | undefined;
        if (!row || row.ok !== 1) {
          return { healthy: false, message: "Database returned an unexpected result", reason: "error" };
        }
        return { healthy: true };
      } catch {
        // The real error (file path, driver internals) is deliberately not
        // included — this message is safe to surface to any future caller,
        // server-side or otherwise, without leaking deployment detail.
        //
        // PR-108.2 — on Vercel, `SQLITE_DB_PATH` is never configured (no
        // persistent volume exists there — see docs/DEPLOYMENT.md), so this
        // catch is an expected, documented deployment characteristic, not
        // an operational alarm. Everywhere else (Fly.io, local dev), the
        // same catch means real persistence broke.
        return isPersistenceExpected()
          ? { healthy: false, message: "Database is unreachable", reason: "error" }
          : {
              healthy: false,
              message: "Persistent SQLite is not configured in this deployment — see docs/DEPLOYMENT.md.",
              reason: "not-configured",
            };
      }
    },
  };
}
