/**
 * A versioned upgrade path for `base-radar:account`. There has only ever
 * been one Account schema version, so `ACCOUNT_MIGRATIONS` is honestly
 * empty today — but the runner is real and already wired into
 * `storage.ts`'s `readAccount()`, so a future schema break only needs a
 * new entry here, never a rewrite of the read path. `sanitizeAccount()`'s
 * field-by-field recovery remains the safety net for anything a migration
 * can't (or doesn't yet) handle.
 */

export type AccountMigration = {
  fromVersion: number;
  migrate(value: Record<string, unknown>): Record<string, unknown>;
};

export const CURRENT_ACCOUNT_VERSION = 1;

export const ACCOUNT_MIGRATIONS: AccountMigration[] = [];

export type AccountMigrationResult = {
  value: Record<string, unknown>;
  /** Every source version a migration actually ran from, oldest first — empty when already current or when no migration path exists. */
  appliedVersions: number[];
};

export function migrateAccountRecord(rawVersion: unknown, value: Record<string, unknown>): AccountMigrationResult {
  let version = typeof rawVersion === "number" ? rawVersion : 0;
  let current = value;
  const appliedVersions: number[] = [];

  while (version < CURRENT_ACCOUNT_VERSION) {
    const migration = ACCOUNT_MIGRATIONS.find((candidate) => candidate.fromVersion === version);
    if (!migration) break;
    current = migration.migrate(current);
    appliedVersions.push(version);
    version += 1;
  }

  return { value: current, appliedVersions };
}
