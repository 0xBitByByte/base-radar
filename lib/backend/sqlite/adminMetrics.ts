/**
 * PR-095.01 (Admin Dashboard) — real platform operational metrics, read
 * directly from the same real SQLite database every other backend module
 * in this directory already reads/writes, plus the static Project
 * Registry (`getProjects()`, the same real source of truth every other
 * project count in this app already uses — Dashboard's "765 Projects",
 * Global Search's Projects group, etc.). Every value below is a genuine
 * `COUNT(*)` (or equivalent) against real rows — never a hardcoded or
 * placeholder number.
 *
 * Deliberately does NOT include a metric this codebase can't actually
 * derive reliably yet — there is no error-tracking/telemetry table, so
 * "error rate" or "uptime" are omitted rather than fabricated; there is
 * no distinction in `sync_operations_log` between "succeeded" and
 * "failed" attempts (it only records operations that were genuinely
 * applied — see `lib/backend/sqlite/searchSync.ts`/`savedSearchSync.ts`'s
 * own `logSyncOperation`), so this only ever reports a genuine applied-
 * operation count, never an invented success/failure split.
 */

import type { DatabaseSync, SQLInputValue } from "node:sqlite";

import { getProjects } from "@/data/projects/helpers";

export type AdminOverviewMetrics = {
  /** Every real account that has ever signed in (`accounts` table — Guests never get a row here at all). */
  totalAccounts: number;
  /** Real accounts with `last_active_at` inside the last 24 hours — the closest honest proxy this schema has for "active now," since there is no separate presence/heartbeat table. */
  accountsActiveLast24h: number;
  /** Real, currently-valid sessions: not revoked, not yet expired. */
  activeSessions: number;
  /** Real *additional* wallets linked to an account beyond its own primary address (`linked_wallets` — see that module's own top comment on why the primary wallet is never a row here). */
  additionalLinkedWallets: number;
  /** The static Project Registry's real, current size — the same `getProjects()` every other project count in this app reads. */
  trackedProjects: number;
  /** Every real Watchlist row across every account. */
  totalWatchlists: number;
  /** Real, live (non-tombstoned) Saved Search records across every account. */
  totalSavedSearches: number;
  /** Real sync operations genuinely applied in the last 24 hours, across every entity (account/search/savedSearch). */
  syncOperationsLast24h: number;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function count(db: DatabaseSync, sql: string, ...params: SQLInputValue[]): number {
  const row = db.prepare(sql).get(...params) as { count: number };
  return row.count;
}

export function getAdminOverviewMetrics(db: DatabaseSync): AdminOverviewMetrics {
  const now = new Date();
  const oneDayAgoIso = new Date(now.getTime() - ONE_DAY_MS).toISOString();
  const nowIso = now.toISOString();

  return {
    totalAccounts: count(db, "SELECT COUNT(*) AS count FROM accounts"),
    accountsActiveLast24h: count(db, "SELECT COUNT(*) AS count FROM accounts WHERE last_active_at >= ?", oneDayAgoIso),
    activeSessions: count(db, "SELECT COUNT(*) AS count FROM sessions WHERE revoked_at IS NULL AND expires_at > ?", nowIso),
    additionalLinkedWallets: count(db, "SELECT COUNT(*) AS count FROM linked_wallets"),
    trackedProjects: getProjects().length,
    totalWatchlists: count(db, "SELECT COUNT(*) AS count FROM watchlists"),
    totalSavedSearches: count(db, "SELECT COUNT(*) AS count FROM saved_searches WHERE deleted_at IS NULL"),
    syncOperationsLast24h: count(db, "SELECT COUNT(*) AS count FROM sync_operations_log WHERE applied_at >= ?", oneDayAgoIso),
  };
}
