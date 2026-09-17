// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";

import { listMigrationIds, runMigrations } from "@/lib/backend/sqlite/migrations";

describe("runMigrations", () => {
  it("records every real migration id in schema_migrations after running", () => {
    const db = new DatabaseSync(":memory:");
    runMigrations(db);

    const rows = db.prepare("SELECT id FROM schema_migrations ORDER BY id").all() as { id: string }[];
    expect(rows.map((row) => row.id)).toEqual(listMigrationIds());
    db.close();
  });

  it("is genuinely idempotent — running twice against the same connection never throws or duplicates", () => {
    const db = new DatabaseSync(":memory:");
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();

    const rows = db.prepare("SELECT id FROM schema_migrations").all();
    expect(rows).toHaveLength(listMigrationIds().length);
    db.close();
  });

  it("listMigrationIds reflects the real, current migration set", () => {
    expect(listMigrationIds()).toEqual([
      "0001_initial",
      "0002_auth_sessions",
      "0003_account_bio",
      "0004_linked_wallets",
      "0005_search_history",
      "0006_saved_searches",
      "0007_project_edits",
      "0008_admin_activity_log",
      "0009_account_roles",
      "0010_performance_metrics",
      "0011_analytics_events",
    ]);
  });
});
