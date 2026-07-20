/**
 * Read-only observability for the Account + Sync platform — introduces no
 * new sync logic of its own. It aggregates what `queue.ts`/`conflicts.ts`/
 * `status.ts`/`lib/account/storage.ts` already store, running the
 * diagnostic validators (`lib/sync/validation.ts`, `lib/account/
 * validation.ts`) against each key's *raw* (pre-sanitize) value so real
 * integrity problems are reported rather than silently dropped the way
 * each store's own read-time recovery already does.
 *
 * Performance: `computeDiagnostics()` is only ever run again in response
 * to a real mutation notification from `lib/sync/service.ts` or
 * `lib/account/service.ts` — never polled, never recomputed on every
 * render — and only while at least one consumer (the Diagnostics dialog,
 * via `useSyncDiagnostics()`) is actually subscribed. No provider access
 * anywhere in this file.
 */

import { CURRENT_ACCOUNT_VERSION } from "@/lib/account/migration";
import * as accountService from "@/lib/account/service";
import { ACCOUNT_STORAGE_KEY } from "@/lib/account/storage";
import { validateAccountRecord } from "@/lib/account/validation";
import { CONFLICTS_STORAGE_KEY, readConflicts } from "@/lib/sync/conflicts";
import { CURRENT_CONFLICTS_VERSION, CURRENT_QUEUE_VERSION, CURRENT_STATUS_VERSION } from "@/lib/sync/migration";
import { QUEUE_STORAGE_KEY, readQueue } from "@/lib/sync/queue";
import * as syncService from "@/lib/sync/service";
import { readIsOffline, readPersistedStatus, STATUS_STORAGE_KEY } from "@/lib/sync/status";
import { isKnownStorageVersion, validateConflictRecords, validateQueueRecords } from "@/lib/sync/validation";

export type StorageHealthEntry = {
  key: string;
  storageKey: string;
  /** `false` when this key has never been written yet — a normal state (e.g. the queue before anything is ever enqueued), not a problem to flag as "unrecognized." */
  exists: boolean;
  version: number | null;
  isKnownVersion: boolean;
  totalRecords: number;
  validRecords: number;
  issueCount: number;
};

export type MigrationStatusEntry = {
  key: string;
  currentVersion: number;
  upToDate: boolean;
};

export type SyncDiagnostics = {
  queueSize: number;
  /** Operations whose own `status` is still `"pending"` — distinct from `queueSize`, since a failed `performSync()` attempt leaves operations in the queue with `status: "error"` until retried or cleared. */
  pendingOperationCount: number;
  conflictCount: number;
  isOffline: boolean;
  lastSyncAt: string | null;
  storageHealth: StorageHealthEntry[];
  migrationStatus: MigrationStatusEntry[];
  storageIntegrity: boolean;
  migrationIntegrity: boolean;
};

function readRawJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readVersion(raw: unknown): number | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = (raw as Record<string, unknown>).version;
  return typeof value === "number" ? value : null;
}

/** Pure — a single pass over each storage key's current raw value. Never mutates anything. */
export function computeDiagnostics(): SyncDiagnostics {
  const queue = readQueue();
  const conflicts = readConflicts();
  const persistedStatus = readPersistedStatus();
  const isOffline = readIsOffline();

  const queueRaw = readRawJson(QUEUE_STORAGE_KEY) as { operations?: unknown } | null;
  const conflictsRaw = readRawJson(CONFLICTS_STORAGE_KEY) as { conflicts?: unknown } | null;
  const statusRaw = readRawJson(STATUS_STORAGE_KEY) as { lastSyncAt?: unknown } | null;
  const accountRaw = readRawJson(ACCOUNT_STORAGE_KEY) as { account?: unknown } | null;

  const queueVersion = readVersion(queueRaw);
  const conflictsVersion = readVersion(conflictsRaw);
  const statusVersion = readVersion(statusRaw);
  const accountVersion = readVersion(accountRaw);

  const queueValidation = validateQueueRecords(queueRaw?.operations ?? []);
  const conflictValidation = validateConflictRecords(conflictsRaw?.conflicts ?? []);
  const accountValidation = validateAccountRecord(accountRaw?.account ?? null);
  const statusValid = statusRaw !== null && (typeof statusRaw.lastSyncAt === "string" || statusRaw.lastSyncAt === null);

  const storageHealth: StorageHealthEntry[] = [
    {
      key: "Sync Queue",
      storageKey: QUEUE_STORAGE_KEY,
      exists: queueRaw !== null,
      version: queueVersion,
      isKnownVersion: isKnownStorageVersion(queueVersion, [CURRENT_QUEUE_VERSION]),
      totalRecords: queueValidation.totalRecords,
      validRecords: queueValidation.validRecords,
      issueCount: queueValidation.issues.length,
    },
    {
      key: "Sync Conflicts",
      storageKey: CONFLICTS_STORAGE_KEY,
      exists: conflictsRaw !== null,
      version: conflictsVersion,
      isKnownVersion: isKnownStorageVersion(conflictsVersion, [CURRENT_CONFLICTS_VERSION]),
      totalRecords: conflictValidation.totalRecords,
      validRecords: conflictValidation.validRecords,
      issueCount: conflictValidation.issues.length,
    },
    {
      key: "Sync Status",
      storageKey: STATUS_STORAGE_KEY,
      exists: statusRaw !== null,
      version: statusVersion,
      isKnownVersion: isKnownStorageVersion(statusVersion, [CURRENT_STATUS_VERSION]),
      totalRecords: statusRaw ? 1 : 0,
      validRecords: statusValid ? 1 : 0,
      issueCount: statusRaw && !statusValid ? 1 : 0,
    },
    {
      key: "Account",
      storageKey: ACCOUNT_STORAGE_KEY,
      exists: accountRaw !== null,
      version: accountVersion,
      isKnownVersion: isKnownStorageVersion(accountVersion, [CURRENT_ACCOUNT_VERSION]),
      totalRecords: accountRaw ? 1 : 0,
      validRecords: accountValidation.valid ? 1 : 0,
      issueCount: accountValidation.issues.length,
    },
  ];

  const migrationStatus: MigrationStatusEntry[] = [
    { key: "Sync Queue", currentVersion: CURRENT_QUEUE_VERSION, upToDate: queueVersion === null || queueVersion >= CURRENT_QUEUE_VERSION },
    { key: "Sync Conflicts", currentVersion: CURRENT_CONFLICTS_VERSION, upToDate: conflictsVersion === null || conflictsVersion >= CURRENT_CONFLICTS_VERSION },
    { key: "Sync Status", currentVersion: CURRENT_STATUS_VERSION, upToDate: statusVersion === null || statusVersion >= CURRENT_STATUS_VERSION },
    { key: "Account", currentVersion: CURRENT_ACCOUNT_VERSION, upToDate: accountVersion === null || accountVersion >= CURRENT_ACCOUNT_VERSION },
  ];

  return {
    queueSize: queue.length,
    pendingOperationCount: queue.filter((operation) => operation.status === "pending").length,
    conflictCount: conflicts.filter((conflict) => !conflict.resolved).length,
    isOffline,
    lastSyncAt: persistedStatus.lastSyncAt,
    storageHealth,
    migrationStatus,
    storageIntegrity: storageHealth.every((entry) => entry.issueCount === 0),
    migrationIntegrity: migrationStatus.every((entry) => entry.upToDate),
  };
}

let cached: SyncDiagnostics | null = null;
let unsubscribeSync: (() => void) | null = null;
let unsubscribeAccount: (() => void) | null = null;
const listeners = new Set<() => void>();

function refresh(): void {
  cached = computeDiagnostics();
  for (const listener of listeners) listener();
}

/** Lazily computes on first call, then returns the same cached reference until a real upstream mutation triggers `refresh()` — never recomputed on every render. */
export function getDiagnostics(): SyncDiagnostics {
  if (cached === null) cached = computeDiagnostics();
  return cached;
}

/** Only listens for upstream Sync/Account mutations while at least one consumer is subscribed — avoids scanning storage in response to app-wide activity nobody is watching. */
export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    unsubscribeSync = syncService.subscribe(refresh);
    unsubscribeAccount = accountService.subscribe(refresh);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      unsubscribeSync?.();
      unsubscribeAccount?.();
      unsubscribeSync = null;
      unsubscribeAccount = null;
    }
  };
}
