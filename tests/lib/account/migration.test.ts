import { describe, expect, it } from "vitest";

import { ACCOUNT_MIGRATIONS, CURRENT_ACCOUNT_VERSION, migrateAccountRecord } from "@/lib/account/migration";

describe("Account migration", () => {
  it("there has only ever been one real Account schema version — the migration list is honestly empty", () => {
    expect(ACCOUNT_MIGRATIONS).toEqual([]);
    expect(CURRENT_ACCOUNT_VERSION).toBe(1);
  });

  it("a record already at the current version passes through unchanged, with no applied migrations", () => {
    const value = { name: "Rin" };
    const result = migrateAccountRecord(CURRENT_ACCOUNT_VERSION, value);
    expect(result.value).toBe(value);
    expect(result.appliedVersions).toEqual([]);
  });

  it("a missing/undefined version defaults to 0, per the real fallback — still a real no-op today since no migration from 0 exists", () => {
    const value = { name: "Rin" };
    const result = migrateAccountRecord(undefined, value);
    // No migration is registered from version 0, so the while-loop breaks immediately — honest no-op, not a fabricated upgrade.
    expect(result.value).toBe(value);
    expect(result.appliedVersions).toEqual([]);
  });

  it("stops honestly when no migration path exists for the record's real version, rather than looping forever", () => {
    const value = { name: "Rin" };
    const result = migrateAccountRecord(0, value);
    expect(result.appliedVersions).toEqual([]);
    expect(result.value).toEqual(value);
  });
});
