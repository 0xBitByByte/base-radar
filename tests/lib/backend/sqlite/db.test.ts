// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createDatabase, isPersistenceExpected, resolveDbPath } from "@/lib/backend/sqlite/db";

describe("createDatabase", () => {
  let db: DatabaseSync | null = null;
  afterEach(() => {
    db?.close();
    db = null;
  });

  it("opens a real, usable in-memory database", () => {
    db = createDatabase(":memory:");
    const row = db.prepare("SELECT 1 AS ok").get() as { ok: number };
    expect(row.ok).toBe(1);
  });

  it("runs real migrations on open — every expected table genuinely exists", () => {
    db = createDatabase(":memory:");
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
      (row) => row.name
    );
    for (const expected of [
      "kv_storage",
      "users",
      "accounts",
      "watchlists",
      "watchlist_projects",
      "personalization_preferences",
      "sync_operations_log",
      "conflicts",
      "auth_challenges",
      "sessions",
      "schema_migrations",
    ]) {
      expect(tables).toContain(expected);
    }
  });

  it("enforces real foreign-key constraints — PRAGMA foreign_keys is genuinely on", () => {
    db = createDatabase(":memory:");
    expect(() =>
      db!
        .prepare(
          "INSERT INTO watchlists (id, account_id, name, description, icon, color, pinned, position, created_at, updated_at) VALUES ('wl-1', 'does-not-exist', 'Test', '', 'star', 'primary', 0, 0, '2026-01-01', '2026-01-01')"
        )
        .run()
    ).toThrow();
  });

  it("enforces a real UNIQUE constraint on accounts.username", () => {
    db = createDatabase(":memory:");
    db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES ('u1', '2026-01-01', '2026-01-01')").run();
    db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES ('u2', '2026-01-01', '2026-01-01')").run();
    db.prepare(
      "INSERT INTO accounts (id, user_id, name, username, created_at, updated_at, last_active_at) VALUES ('a1', 'u1', 'Rin', 'rin_dev', '2026-01-01', '2026-01-01', '2026-01-01')"
    ).run();
    expect(() =>
      db!
        .prepare(
          "INSERT INTO accounts (id, user_id, name, username, created_at, updated_at, last_active_at) VALUES ('a2', 'u2', 'Rin Two', 'rin_dev', '2026-01-01', '2026-01-01', '2026-01-01')"
        )
        .run()
    ).toThrow();
  });

  it("recording an already-applied sync_operations_log id is naturally idempotent — a real PRIMARY KEY conflict, not silent duplication", () => {
    db = createDatabase(":memory:");
    db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES ('u1', '2026-01-01', '2026-01-01')").run();
    db.prepare(
      "INSERT INTO accounts (id, user_id, name, username, created_at, updated_at, last_active_at) VALUES ('a1', 'u1', 'Rin', 'rin_dev', '2026-01-01', '2026-01-01', '2026-01-01')"
    ).run();
    db.prepare(
      "INSERT INTO sync_operations_log (id, account_id, entity, entity_id, type, applied_at) VALUES ('sync:1', 'a1', 'watchlist', 'wl-1', 'create', '2026-01-01')"
    ).run();
    expect(() =>
      db!
        .prepare(
          "INSERT INTO sync_operations_log (id, account_id, entity, entity_id, type, applied_at) VALUES ('sync:1', 'a1', 'watchlist', 'wl-1', 'create', '2026-01-02')"
        )
        .run()
    ).toThrow();
    const rows = db.prepare("SELECT * FROM sync_operations_log WHERE id = 'sync:1'").all();
    expect(rows).toHaveLength(1);
  });

  it("creates its own parent directory on a real file path", () => {
    const dbPath = path.join(tmpdir(), `base-radar-test-${Date.now()}`, "backend.db");
    expect(existsSync(path.dirname(dbPath))).toBe(false);
    db = createDatabase(dbPath);
    expect(existsSync(path.dirname(dbPath))).toBe(true);
    db.close();
    db = null;
    rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  it("re-opening a real file-based database is idempotent — no duplicate-table error, and real data persists across the reopen", () => {
    const dir = path.join(tmpdir(), `base-radar-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const dbPath = path.join(dir, "backend.db");

    const first = createDatabase(dbPath);
    first
      .prepare("INSERT INTO kv_storage (key, value, updated_at) VALUES ('probe', 'still-here', '2026-01-01')")
      .run();
    first.close();

    const second = createDatabase(dbPath);
    const row = second.prepare("SELECT value FROM kv_storage WHERE key = 'probe'").get() as { value: string };
    expect(row.value).toBe("still-here");
    second.close();

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("resolveDbPath", () => {
  const originalEnv = process.env.SQLITE_DB_PATH;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.SQLITE_DB_PATH;
    else process.env.SQLITE_DB_PATH = originalEnv;
  });

  it("defaults to a real path under the repo's own .data directory when unset", () => {
    delete process.env.SQLITE_DB_PATH;
    expect(resolveDbPath()).toMatch(/\.data[\\/]backend\.db$/);
  });

  it("honors a real configured SQLITE_DB_PATH", () => {
    process.env.SQLITE_DB_PATH = "/tmp/custom-backend-test.db";
    expect(resolveDbPath()).toBe("/tmp/custom-backend-test.db");
  });

  it("falls back to the default when SQLITE_DB_PATH is set but blank", () => {
    process.env.SQLITE_DB_PATH = "   ";
    expect(resolveDbPath()).toMatch(/\.data[\\/]backend\.db$/);
  });
});

describe("isPersistenceExpected (PR-108.2)", () => {
  const originalEnv = process.env.VERCEL;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalEnv;
  });

  it("is true when VERCEL is unset — Fly.io/local, where a real persistent volume is expected", () => {
    delete process.env.VERCEL;
    expect(isPersistenceExpected()).toBe(true);
  });

  it("is false when VERCEL is set — Vercel's own system env var, no persistent volume there", () => {
    process.env.VERCEL = "1";
    expect(isPersistenceExpected()).toBe(false);
  });
});
