/**
 * The Watchlist entity's Sync Adapter — the only place that knows how a
 * `PersonalWatchlist` serializes, merges, and validates for the Sync
 * Layer. Operates on one watchlist record at a time (the Sync Queue's
 * `entityId` addresses a single watchlist by id); the Sync Queue and Sync
 * Engine never import `lib/personalization/` directly.
 */

import { buildOperation } from "@/lib/sync/queue";
import type { SyncAdapter, SyncOperation, SyncOperationType } from "@/lib/sync/types";
import { WATCHLIST_COLORS, WATCHLIST_ICONS, type PersonalWatchlist } from "@/lib/personalization/types";

const ADAPTER_VERSION = 1;

function isValidWatchlist(data: unknown): data is PersonalWatchlist {
  if (typeof data !== "object" || data === null) return false;
  const watchlist = data as Record<string, unknown>;
  return (
    typeof watchlist.id === "string" &&
    typeof watchlist.name === "string" &&
    typeof watchlist.description === "string" &&
    typeof watchlist.icon === "string" &&
    (WATCHLIST_ICONS as readonly string[]).includes(watchlist.icon) &&
    typeof watchlist.color === "string" &&
    (WATCHLIST_COLORS as readonly string[]).includes(watchlist.color) &&
    Array.isArray(watchlist.projectIds) &&
    watchlist.projectIds.every((id): id is string => typeof id === "string") &&
    typeof watchlist.pinned === "boolean" &&
    typeof watchlist.createdAt === "string" &&
    typeof watchlist.updatedAt === "string"
  );
}

function serializeWatchlist(data: PersonalWatchlist): string {
  return JSON.stringify(data);
}

function deserializeWatchlist(payload: string): PersonalWatchlist {
  const parsed: unknown = JSON.parse(payload);
  if (!isValidWatchlist(parsed)) {
    throw new Error("watchlistSyncAdapter.deserialize: payload failed validation");
  }
  return parsed;
}

function createWatchlistOperation(type: SyncOperationType, entityId: string, data: PersonalWatchlist): SyncOperation {
  return buildOperation(type, "watchlist", entityId, serializeWatchlist(data));
}

/**
 * Last-write-wins by `updatedAt` — the same strategy `accountSyncAdapter`
 * uses. Never called automatically today: there is no remote Watchlist
 * version to merge against without a backend.
 */
function mergeWatchlist(local: PersonalWatchlist, remote: PersonalWatchlist): PersonalWatchlist {
  return new Date(remote.updatedAt).getTime() >= new Date(local.updatedAt).getTime() ? remote : local;
}

export const watchlistSyncAdapter: SyncAdapter<PersonalWatchlist> = {
  entity: "watchlist",
  version: () => ADAPTER_VERSION,
  validate: isValidWatchlist,
  serialize: serializeWatchlist,
  deserialize: deserializeWatchlist,
  createOperation: createWatchlistOperation,
  merge: mergeWatchlist,
};
