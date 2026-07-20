"use client";

import { useCallback, useSyncExternalStore } from "react";

import * as syncService from "@/lib/sync/service";
import type { ConflictRecord, SyncOperation, SyncStatus } from "@/lib/sync/types";

const SERVER_SNAPSHOT_STATUS: SyncStatus = {
  state: "idle",
  pendingCount: 0,
  retryCount: 0,
  conflictCount: 0,
  lastSyncAt: null,
  isOffline: false,
};

const SERVER_SNAPSHOT_OPERATIONS: SyncOperation[] = [];
const SERVER_SNAPSHOT_CONFLICTS: ConflictRecord[] = [];

function getServerStatusSnapshot(): SyncStatus {
  return SERVER_SNAPSHOT_STATUS;
}

function getServerOperationsSnapshot(): SyncOperation[] {
  return SERVER_SNAPSHOT_OPERATIONS;
}

function getServerConflictsSnapshot(): ConflictRecord[] {
  return SERVER_SNAPSHOT_CONFLICTS;
}

/**
 * Sync status, queue, and conflicts only — never accounts, watchlists,
 * personalization, providers, or engines. `conflicts` is a small,
 * pragmatic addition beyond this PR's brief (which names `hasConflicts`
 * only) since `SyncConflictDialog` needs the actual records to render,
 * not just a boolean.
 */
export function useSyncStatus() {
  const status = useSyncExternalStore(syncService.subscribe, syncService.getSyncStatus, getServerStatusSnapshot);
  const pendingOperations = useSyncExternalStore(
    syncService.subscribe,
    syncService.getPendingOperations,
    getServerOperationsSnapshot
  );
  const conflicts = useSyncExternalStore(syncService.subscribe, syncService.getConflicts, getServerConflictsSnapshot);

  const retrySync = useCallback(() => syncService.retrySync(), []);
  const clearQueue = useCallback(() => syncService.clearQueue(), []);

  return {
    syncStatus: status.state,
    lastSyncAt: status.lastSyncAt,
    pendingOperations,
    isOffline: status.isOffline,
    hasConflicts: status.conflictCount > 0,
    conflicts,
    retrySync,
    clearQueue,
  };
}
