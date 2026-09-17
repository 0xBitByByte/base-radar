/**
 * Guest → Authenticated migration — the "existing Sync/Adapter
 * architecture can support the bootstrap flow" path Phase B and this
 * phase's own brief both ask for, rather than a separate migration
 * mechanism. Reuses the real `accountSyncAdapter`/`watchlistSyncAdapter`/
 * `preferencesSyncAdapter` (`lib/sync/adapters/*`) to validate and
 * describe every piece of the migrated snapshot — the same functions that
 * would build a real `SyncOperation` for a genuine future queue drain —
 * and records each one in `sync_operations_log` (Phase C's schema),
 * rather than inventing a second serialization format just for this
 * one-time bootstrap.
 *
 * Only ever runs once per address, gated by the caller (`/api/auth/verify`
 * only calls `bootstrapAccountFromGuestSnapshot` immediately after
 * `createAccountForAddress` — i.e. only on a genuinely first-ever sign-in
 * for that address). A returning address with an existing account instead
 * gets `recordAccountConflict` — the local Guest data on a *second*
 * device is a real, honest conflict against the already-authoritative
 * cloud state, not silently discarded or silently overwritten. Resolving
 * that conflict is explicitly out of this phase's scope (Phase B's
 * dependency plan places real conflict resolution after real Sync); this
 * phase only records it, reusing the real `conflicts` table Phase C
 * already built for exactly this.
 */

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import { accountSyncAdapter } from "@/lib/sync/adapters/account";
import { PREFERENCES_ENTITY_ID, preferencesSyncAdapter } from "@/lib/sync/adapters/preferences";
import { watchlistSyncAdapter } from "@/lib/sync/adapters/watchlists";
import type { Account } from "@/lib/account/types";
import type { PersonalizationPreferences } from "@/lib/personalization/preferences";
import type { PersonalWatchlist } from "@/lib/personalization/types";

export type GuestSnapshot = {
  account: Pick<Account, "name" | "username" | "email" | "avatar" | "bio">;
  watchlists: PersonalWatchlist[];
  preferences: PersonalizationPreferences;
};

/** Boundary validation for a client-supplied migration payload — checked before any of it reaches a query. Only the top-level shape; each individual watchlist/preferences object is further validated by its own real adapter inside `bootstrapAccountFromGuestSnapshot` (a structurally-valid-but-adapter-rejected entry is skipped there, not trusted here). */
export function isValidGuestSnapshot(value: unknown): value is GuestSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  const account = candidate.account;
  if (typeof account !== "object" || account === null) return false;
  const accountFields = account as Record<string, unknown>;
  if (typeof accountFields.name !== "string" || typeof accountFields.username !== "string") return false;
  if (accountFields.email !== null && typeof accountFields.email !== "string") return false;
  if (accountFields.avatar !== null && typeof accountFields.avatar !== "string") return false;
  if (accountFields.bio !== null && typeof accountFields.bio !== "string") return false;

  if (!Array.isArray(candidate.watchlists)) return false;
  if (typeof candidate.preferences !== "object" || candidate.preferences === null) return false;

  return true;
}

function logOperation(db: DatabaseSync, accountId: string, entity: string, entityId: string, type: string): void {
  db.prepare(
    "INSERT INTO sync_operations_log (id, account_id, entity, entity_id, type, applied_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(randomUUID(), accountId, entity, entityId, type, new Date().toISOString());
}

export type BootstrapResult = { watchlistsMigrated: number; preferencesMigrated: boolean };

/**
 * Writes the migrated Watchlists and Preferences for a brand-new
 * authenticated account. Every watchlist is validated via
 * `watchlistSyncAdapter.validate()` before being written — a malformed
 * entry in the client-supplied snapshot is skipped, never trusted as-is;
 * this function never touches the `accounts` row itself (the caller
 * already created it via `createAccountForAddress`, seeded from the same
 * snapshot's `account` fields).
 */
export function bootstrapAccountFromGuestSnapshot(db: DatabaseSync, accountId: string, snapshot: GuestSnapshot): BootstrapResult {
  const now = new Date().toISOString();
  let watchlistsMigrated = 0;

  const insertWatchlist = db.prepare(
    `INSERT INTO watchlists (id, account_id, name, description, icon, color, pinned, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertWatchlistProject = db.prepare("INSERT INTO watchlist_projects (watchlist_id, project_id, added_at) VALUES (?, ?, ?)");

  snapshot.watchlists.forEach((watchlist, index) => {
    if (!watchlistSyncAdapter.validate(watchlist)) return;

    insertWatchlist.run(
      watchlist.id,
      accountId,
      watchlist.name,
      watchlist.description,
      watchlist.icon,
      watchlist.color,
      watchlist.pinned ? 1 : 0,
      index,
      watchlist.createdAt,
      watchlist.updatedAt
    );
    for (const projectId of watchlist.projectIds) {
      insertWatchlistProject.run(watchlist.id, projectId, now);
    }

    const operation = watchlistSyncAdapter.createOperation("create", watchlist.id, watchlist);
    logOperation(db, accountId, operation.entity, operation.entityId, operation.type);
    watchlistsMigrated += 1;
  });

  let preferencesMigrated = false;
  if (preferencesSyncAdapter.validate(snapshot.preferences)) {
    const preferences = snapshot.preferences;
    db.prepare(
      `INSERT INTO personalization_preferences
         (account_id, filter_dashboard_by_active_watchlist, enable_search_prioritization, remember_active_watchlist, show_watchlist_selector_in_topbar, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      accountId,
      preferences.filterDashboardByActiveWatchlist ? 1 : 0,
      preferences.enableSearchPrioritization ? 1 : 0,
      preferences.rememberActiveWatchlist ? 1 : 0,
      preferences.showWatchlistSelectorInTopbar ? 1 : 0,
      now
    );
    const operation = preferencesSyncAdapter.createOperation("create", PREFERENCES_ENTITY_ID, preferences);
    logOperation(db, accountId, operation.entity, operation.entityId, operation.type);
    preferencesMigrated = true;
  }

  if (accountSyncAdapter.validate({ ...snapshot.account, id: accountId, createdAt: now, updatedAt: now, lastActiveAt: now, isGuest: false })) {
    logOperation(db, accountId, "account", accountId, "create");
  }

  return { watchlistsMigrated, preferencesMigrated };
}

/**
 * Records a real, unresolved conflict rather than overwriting the
 * already-authoritative cloud account with a second device's local Guest
 * state. Bundles the whole snapshot as `local_version` against the
 * current real account+watchlists+preferences as `remote_version` — a
 * single, honest conflict record per sign-in, not a fabricated
 * field-by-field merge this phase was never asked to build.
 */
export function recordAccountConflict(
  db: DatabaseSync,
  accountId: string,
  localSnapshot: GuestSnapshot,
  remoteState: unknown
): void {
  db.prepare(
    `INSERT INTO conflicts (id, account_id, entity, entity_id, local_version, remote_version, resolved, created_at, resolved_at)
     VALUES (?, ?, 'account', ?, ?, ?, 0, ?, NULL)`
  ).run(randomUUID(), accountId, accountId, JSON.stringify(localSnapshot), JSON.stringify(remoteState), new Date().toISOString());
}
