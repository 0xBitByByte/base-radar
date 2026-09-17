/**
 * The Recent Searches entity's Sync Adapter — PR-094.01 (Discovery & Search
 * — Recent Searches Cross-Device Sync). Same shape `preferencesSyncAdapter`
 * already established: Recent Searches is a singleton per account (one
 * ordered list, no per-record id), so `entityId` always addresses the
 * fixed constant below rather than one of many records. The Sync Queue
 * and Sync Engine never import `lib/search/` directly.
 */

import { buildOperation } from "@/lib/sync/queue";
import type { SyncAdapter, SyncOperation, SyncOperationType } from "@/lib/sync/types";

/** Recent Searches has no per-record id — every operation addresses this fixed entityId, the same "singleton entity" shape `PREFERENCES_ENTITY_ID` already established. */
export const RECENT_SEARCHES_ENTITY_ID = "recent-searches";

export type RecentSearchesData = {
  /** Newest first — the same real order `lib/search/storage.ts` already maintains locally. Query strings only, never search results or provider data. */
  queries: string[];
};

function isValidRecentSearchesData(data: unknown): data is RecentSearchesData {
  if (typeof data !== "object" || data === null) return false;
  const candidate = data as Record<string, unknown>;
  return Array.isArray(candidate.queries) && candidate.queries.every((query) => typeof query === "string");
}

function serializeRecentSearches(data: RecentSearchesData): string {
  return JSON.stringify(data);
}

function deserializeRecentSearches(payload: string): RecentSearchesData {
  const parsed: unknown = JSON.parse(payload);
  if (!isValidRecentSearchesData(parsed)) {
    throw new Error("searchSyncAdapter.deserialize: payload failed validation");
  }
  return parsed;
}

function createRecentSearchesOperation(type: SyncOperationType, entityId: string, data: RecentSearchesData): SyncOperation {
  return buildOperation(type, "search", entityId, serializeRecentSearches(data));
}

/**
 * Recent Searches carries no per-field timestamp to compare, the same real
 * limitation `preferencesSyncAdapter.merge()` already documents for its
 * own singleton entity — this treats `remote` as authoritative by
 * convention until this adapter gains its own versioning. Never called
 * automatically today by push (only pull's conflict-vs-safe-to-apply
 * check uses the Sync Queue directly, not this function).
 */
function mergeRecentSearches(local: RecentSearchesData, remote: RecentSearchesData): RecentSearchesData {
  return remote;
}

const ADAPTER_VERSION = 1;

export const searchSyncAdapter: SyncAdapter<RecentSearchesData> = {
  entity: "search",
  version: () => ADAPTER_VERSION,
  validate: isValidRecentSearchesData,
  serialize: serializeRecentSearches,
  deserialize: deserializeRecentSearches,
  createOperation: createRecentSearchesOperation,
  merge: mergeRecentSearches,
};
