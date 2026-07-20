/**
 * The Preferences entity's Sync Adapter — the only place that knows how
 * `PersonalizationPreferences` serializes, merges, and validates for the
 * Sync Layer. Preferences are a singleton per browser (no id, no
 * timestamp), so `entityId` always addresses the fixed constant below
 * rather than one of many records. The Sync Queue and Sync Engine never
 * import `lib/personalization/` directly.
 */

import { buildOperation } from "@/lib/sync/queue";
import type { SyncAdapter, SyncOperation, SyncOperationType } from "@/lib/sync/types";
import type { PersonalizationPreferences } from "@/lib/personalization/preferences";

const ADAPTER_VERSION = 1;

/** Preferences have no per-record id — every operation addresses this fixed entityId. */
export const PREFERENCES_ENTITY_ID = "personalization-preferences";

function isValidPreferences(data: unknown): data is PersonalizationPreferences {
  if (typeof data !== "object" || data === null) return false;
  const preferences = data as Record<string, unknown>;
  return (
    typeof preferences.filterDashboardByActiveWatchlist === "boolean" &&
    typeof preferences.enableSearchPrioritization === "boolean" &&
    typeof preferences.rememberActiveWatchlist === "boolean" &&
    typeof preferences.showWatchlistSelectorInTopbar === "boolean"
  );
}

function serializePreferences(data: PersonalizationPreferences): string {
  return JSON.stringify(data);
}

function deserializePreferences(payload: string): PersonalizationPreferences {
  const parsed: unknown = JSON.parse(payload);
  if (!isValidPreferences(parsed)) {
    throw new Error("preferencesSyncAdapter.deserialize: payload failed validation");
  }
  return parsed;
}

function createPreferencesOperation(
  type: SyncOperationType,
  entityId: string,
  data: PersonalizationPreferences
): SyncOperation {
  return buildOperation(type, "preferences", entityId, serializePreferences(data));
}

/**
 * Preferences carry no per-record timestamp to compare, unlike Account or
 * Watchlist, so this treats `remote` as authoritative by convention until
 * this adapter gains its own versioning. Never called automatically
 * today: there is no remote Preferences version to merge against without
 * a backend.
 */
function mergePreferences(
  local: PersonalizationPreferences,
  remote: PersonalizationPreferences
): PersonalizationPreferences {
  return remote;
}

export const preferencesSyncAdapter: SyncAdapter<PersonalizationPreferences> = {
  entity: "preferences",
  version: () => ADAPTER_VERSION,
  validate: isValidPreferences,
  serialize: serializePreferences,
  deserialize: deserializePreferences,
  createOperation: createPreferencesOperation,
  merge: mergePreferences,
};
