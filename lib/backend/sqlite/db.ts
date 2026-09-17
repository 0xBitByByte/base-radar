/**
 * Connection management for the Phase C SQLite backend — the one file
 * that actually opens a database. `node:sqlite` (Node's own built-in,
 * unflagged as of the Node 22 this repo's CI already pins) is used
 * directly rather than adding a new production dependency, per Phase C's
 * "minimum required production dependencies" instruction — the schema
 * foundation this phase establishes doesn't need an ORM or query builder,
 * the same "no ORM, no query client" minimalism `docs/DATABASE.md`
 * already describes as this codebase's existing convention.
 *
 * `getDb()` is a lazy singleton: nothing opens a file, creates a
 * directory, or runs a migration merely by importing this module (or
 * `lib/backend/sqlite/index.ts`, or registering `sqliteBackend` in
 * `lib/backend/registry.ts`) — the connection only opens on the first
 * real call to a Storage/Health method. Registration is not activation:
 * this backend is not wired in as the app's active backend by this phase
 * (see `registry.ts`'s own comment), so this laziness keeps registering
 * it a genuinely inert, side-effect-free act, exactly like `localBackend`
 * already is today.
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { runMigrations } from "@/lib/backend/sqlite/migrations";

const DEFAULT_DB_PATH = path.join(process.cwd(), ".data", "backend.db");

/** No secret involved — a local file path, safe to default without any `.env` configuration, matching this repo's "runs with zero environment variables set" convention (`.env.example`'s own framing). */
export function resolveDbPath(): string {
  const configured = process.env.SQLITE_DB_PATH?.trim();
  return configured && configured !== "" ? configured : DEFAULT_DB_PATH;
}

/** Real connection + real, idempotent migration run. Exported (not just used internally by `getDb()`) so tests can create a fully isolated `:memory:` instance per test — see `tests/lib/backend/sqlite/`. */
export function createDatabase(dbPath: string): DatabaseSync {
  if (dbPath !== ":memory:") {
    mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  runMigrations(db);
  return db;
}

let singleton: DatabaseSync | null = null;

/** The one real, shared connection for this server process — opened lazily on first use. */
export function getDb(): DatabaseSync {
  if (!singleton) {
    singleton = createDatabase(resolveDbPath());
  }
  return singleton;
}

/** Test-only escape hatch — forces the next `getDb()` call to open a fresh connection. Production code never calls this. */
export function resetDbSingletonForTests(): void {
  singleton?.close();
  singleton = null;
}
