/**
 * Schema migrations for the Phase C SQLite backend — real, applied DDL,
 * tracked in a `schema_migrations` table so each migration runs at most
 * once per database file, the same "honestly empty until a real schema
 * break happens" spirit `lib/sync/migration.ts` already established, just
 * with one real migration to run instead of zero. Embedded as TS string
 * constants rather than loose `.sql` files read via `fs` at runtime — this
 * module is imported into a Next.js server bundle, and reading a sibling
 * file by relative path under a bundler is exactly the kind of thing that
 * silently breaks between dev and a bundled production build; a plain
 * exported string has no such failure mode.
 *
 * `0001_initial` intentionally creates every table Phase B's `docs/
 * DATABASE.md` design describes for Account/Sync/Personalization
 * (`users`, `accounts`, `watchlists`, `watchlist_projects`,
 * `personalization_preferences`, `sync_operations_log`, `conflicts`) even
 * though Phase C only implemented `StorageService`/`HealthService`
 * against `kv_storage` — the schema foundation was built complete then, so
 * Phase D (real authentication) builds against tables that already exist,
 * rather than redesigning schema at the same time as adding real auth.
 *
 * `0002_auth_sessions` is Phase D's own addition: `auth_challenges` (a
 * real, single-use, expiring SIWE nonce per address — this is what makes
 * "prove you control this address" actually mean something, rather than
 * trusting a bare wallet address string) and `sessions` (a real,
 * server-side, revocable session — an opaque token in an httpOnly cookie
 * looked up here, not a stateless/self-verifying token, so sign-out can
 * genuinely invalidate it by deleting/marking the row, not just by
 * expiring client-side).
 *
 * `0003_account_bio` — PR-093.02's Bio field, the one `accounts` column
 * `0001_initial` didn't yet have a use for. Same optional-text shape as
 * `email`/`avatar` (nullable, no default), added via `ALTER TABLE` rather
 * than reshaping `0001_initial` in place, since that migration has already
 * run against real databases.
 */

import type { DatabaseSync } from "node:sqlite";

type Migration = {
  id: string;
  sql: string;
};

const MIGRATIONS: Migration[] = [
  {
    id: "0001_initial",
    sql: `
      CREATE TABLE IF NOT EXISTS kv_storage (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        avatar TEXT,
        active_watchlist_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS watchlists (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        pinned INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_watchlists_account_id ON watchlists(account_id);

      CREATE TABLE IF NOT EXISTS watchlist_projects (
        watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL,
        added_at TEXT NOT NULL,
        PRIMARY KEY (watchlist_id, project_id)
      );

      CREATE TABLE IF NOT EXISTS personalization_preferences (
        account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        filter_dashboard_by_active_watchlist INTEGER NOT NULL DEFAULT 1,
        enable_search_prioritization INTEGER NOT NULL DEFAULT 1,
        remember_active_watchlist INTEGER NOT NULL DEFAULT 1,
        show_watchlist_selector_in_topbar INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_operations_log (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        type TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sync_operations_log_account_id ON sync_operations_log(account_id);

      CREATE TABLE IF NOT EXISTS conflicts (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        local_version TEXT NOT NULL,
        remote_version TEXT NOT NULL,
        resolved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_conflicts_account_id ON conflicts(account_id);
    `,
  },
  {
    id: "0002_auth_sessions",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_challenges (
        nonce TEXT PRIMARY KEY,
        address TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        consumed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_auth_challenges_address ON auth_challenges(address);

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions(account_id);
    `,
  },
  {
    id: "0003_account_bio",
    sql: `
      ALTER TABLE accounts ADD COLUMN bio TEXT;
    `,
  },
  {
    id: "0004_linked_wallets",
    sql: `
      CREATE TABLE IF NOT EXISTS linked_wallets (
        address TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        linked_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_linked_wallets_account_id ON linked_wallets(account_id);
    `,
  },
  {
    id: "0005_search_history",
    sql: `
      CREATE TABLE IF NOT EXISTS search_history (
        account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        queries TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    id: "0006_saved_searches",
    sql: `
      CREATE TABLE IF NOT EXISTS saved_searches (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_saved_searches_account_id ON saved_searches(account_id);
    `,
  },
  {
    id: "0007_project_edits",
    sql: `
      CREATE TABLE IF NOT EXISTS project_edits (
        project_id TEXT PRIMARY KEY,
        fields TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_project_edits_updated_at ON project_edits(updated_at);
    `,
  },
  {
    id: "0008_admin_activity_log",
    sql: `
      CREATE TABLE IF NOT EXISTS admin_activity_log (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE SET NULL,
        actor_name TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        description TEXT NOT NULL,
        changes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        time_zone TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_admin_activity_log_entity ON admin_activity_log(entity_type, entity_id);
    `,
  },
  {
    id: "0009_account_roles",
    sql: `
      CREATE TABLE IF NOT EXISTS account_roles (
        account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE SET NULL
      );
    `,
  },
  {
    id: "0010_performance_metrics",
    sql: `
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id TEXT PRIMARY KEY,
        metric_name TEXT NOT NULL,
        value REAL NOT NULL,
        rating TEXT NOT NULL,
        path TEXT NOT NULL,
        recorded_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_name ON performance_metrics(metric_name);
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);
    `,
  },
  {
    id: "0011_analytics_events",
    sql: `
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        event_name TEXT NOT NULL,
        path TEXT NOT NULL,
        recorded_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events(path);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_recorded_at ON analytics_events(recorded_at);
    `,
  },
];

/** Real, idempotent — safe to call on every connection open. Applies only migrations not already recorded in `schema_migrations`, in order. */
export function runMigrations(db: DatabaseSync): void {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");

  const appliedRows = db.prepare("SELECT id FROM schema_migrations").all() as { id: string }[];
  const applied = new Set(appliedRows.map((row) => row.id));

  const insertMigration = db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)");

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.exec(migration.sql);
    insertMigration.run(migration.id, new Date().toISOString());
  }
}

/** Exposed for tests that need to assert on real migration identity/count without duplicating the list above. */
export function listMigrationIds(): string[] {
  return MIGRATIONS.map((migration) => migration.id);
}
