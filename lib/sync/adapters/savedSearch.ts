/**
 * The Saved Search entity's Sync Adapter — PR-094.02 (Saved Searches Cloud
 * Sync). Unlike `accountSyncAdapter`/`searchSyncAdapter` (each a singleton
 * per account, one fixed `entityId`), a Saved Search list is genuinely
 * multiple independent named records — the same real shape
 * `watchlistSyncAdapter` already established: `entityId` addresses one
 * real saved search by its own id, and `type` is `"create"` or
 * `"delete"` (a saved search is immutable once created — there is no
 * "edit" action anywhere in the app, so this adapter never needs to
 * express an `"update"`; see `lib/search/savedSearches.ts`).
 */

import { buildOperation } from "@/lib/sync/queue";
import type { SyncAdapter, SyncOperation, SyncOperationType } from "@/lib/sync/types";
import type { SavedSearch } from "@/lib/search/savedSearches";

const ADAPTER_VERSION = 1;

function isValidSavedSearch(data: unknown): data is SavedSearch {
  if (typeof data !== "object" || data === null) return false;
  const candidate = data as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.trim() !== "" &&
    typeof candidate.query === "string" &&
    candidate.query.trim() !== "" &&
    typeof candidate.createdAt === "string" &&
    !Number.isNaN(Date.parse(candidate.createdAt as string))
  );
}

function serializeSavedSearch(data: SavedSearch): string {
  return JSON.stringify(data);
}

function deserializeSavedSearch(payload: string): SavedSearch {
  const parsed: unknown = JSON.parse(payload);
  if (!isValidSavedSearch(parsed)) {
    throw new Error("savedSearchSyncAdapter.deserialize: payload failed validation");
  }
  return parsed;
}

function createSavedSearchOperation(type: SyncOperationType, entityId: string, data: SavedSearch): SyncOperation {
  return buildOperation(type, "savedSearch", entityId, serializeSavedSearch(data));
}

/**
 * A Saved Search never changes in place (create or delete only — see this
 * file's own top comment), so there is no real field-level race for this
 * to arbitrarily resolve; kept for contract symmetry with every other
 * adapter, and — like every other adapter's own `merge()` — never called
 * automatically today.
 */
function mergeSavedSearch(local: SavedSearch, remote: SavedSearch): SavedSearch {
  return remote;
}

export const savedSearchSyncAdapter: SyncAdapter<SavedSearch> = {
  entity: "savedSearch",
  version: () => ADAPTER_VERSION,
  validate: isValidSavedSearch,
  serialize: serializeSavedSearch,
  deserialize: deserializeSavedSearch,
  createOperation: createSavedSearchOperation,
  merge: mergeSavedSearch,
};
