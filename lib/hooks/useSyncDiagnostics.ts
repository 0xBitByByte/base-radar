"use client";

import { useSyncExternalStore } from "react";

import { getDiagnostics, subscribe } from "@/lib/sync/diagnostics";
import type { SyncDiagnostics } from "@/lib/sync/diagnostics";

const SERVER_SNAPSHOT: SyncDiagnostics = {
  queueSize: 0,
  pendingOperationCount: 0,
  conflictCount: 0,
  isOffline: false,
  lastSyncAt: null,
  storageHealth: [],
  migrationStatus: [],
  storageIntegrity: true,
  migrationIntegrity: true,
};

function getServerSnapshot(): SyncDiagnostics {
  return SERVER_SNAPSHOT;
}

/** Queue health, storage health, migration status, and diagnostics only — no provider access, no polling. */
export function useSyncDiagnostics(): SyncDiagnostics {
  return useSyncExternalStore(subscribe, getDiagnostics, getServerSnapshot);
}
