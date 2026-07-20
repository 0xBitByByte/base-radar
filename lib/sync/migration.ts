/**
 * Versioned upgrade paths for the Sync Layer's three storage keys (queue,
 * status, conflicts). Each migration list is honestly empty today — every
 * key has only ever had the one schema version its `readQueue()`/
 * `readPersistedStatus()`/`readConflicts()` currently reads — but the
 * runner itself is real and already wired into all three read paths, so a
 * future schema break only needs a new entry here, never a rewrite of the
 * read path itself.
 *
 * This is the single source of truth for each key's current version
 * number — `queue.ts`/`status.ts`/`conflicts.ts` import
 * `CURRENT_*_VERSION` from here rather than redefining it, so the two can
 * never drift apart.
 */

export type SyncMigration = {
  fromVersion: number;
  migrate(value: Record<string, unknown>): Record<string, unknown>;
};

export const CURRENT_QUEUE_VERSION = 3;
export const CURRENT_STATUS_VERSION = 2;
export const CURRENT_CONFLICTS_VERSION = 1;

export const QUEUE_MIGRATIONS: SyncMigration[] = [];
export const STATUS_MIGRATIONS: SyncMigration[] = [];
export const CONFLICTS_MIGRATIONS: SyncMigration[] = [];

export type SyncMigrationResult = {
  value: Record<string, unknown>;
  /** Every source version a migration actually ran from, oldest first — empty when already current or when no migration path exists (the caller's own field-by-field sanitize step is the safety net in that case). */
  appliedVersions: number[];
};

function runMigrations(
  rawVersion: unknown,
  value: Record<string, unknown>,
  migrations: SyncMigration[],
  currentVersion: number
): SyncMigrationResult {
  let version = typeof rawVersion === "number" ? rawVersion : 0;
  let current = value;
  const appliedVersions: number[] = [];

  while (version < currentVersion) {
    const migration = migrations.find((candidate) => candidate.fromVersion === version);
    if (!migration) break;
    current = migration.migrate(current);
    appliedVersions.push(version);
    version += 1;
  }

  return { value: current, appliedVersions };
}

export function migrateQueueRecord(rawVersion: unknown, value: Record<string, unknown>): SyncMigrationResult {
  return runMigrations(rawVersion, value, QUEUE_MIGRATIONS, CURRENT_QUEUE_VERSION);
}

export function migrateStatusRecord(rawVersion: unknown, value: Record<string, unknown>): SyncMigrationResult {
  return runMigrations(rawVersion, value, STATUS_MIGRATIONS, CURRENT_STATUS_VERSION);
}

export function migrateConflictsRecord(rawVersion: unknown, value: Record<string, unknown>): SyncMigrationResult {
  return runMigrations(rawVersion, value, CONFLICTS_MIGRATIONS, CURRENT_CONFLICTS_VERSION);
}
