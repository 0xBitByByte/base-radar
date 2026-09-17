// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getAdminOverviewMetrics } from "@/lib/backend/sqlite/adminMetrics";
import { createDatabase } from "@/lib/backend/sqlite/db";
import { createSession, revokeSession } from "@/lib/backend/sqlite/sessions";
import { linkWalletToAccount } from "@/lib/backend/sqlite/linkedWallets";
import { pushSavedSearchOperations } from "@/lib/backend/sqlite/savedSearchSync";
import { pushSearchOperations } from "@/lib/backend/sqlite/searchSync";
import { savedSearchSyncAdapter } from "@/lib/sync/adapters/savedSearch";
import { RECENT_SEARCHES_ENTITY_ID, searchSyncAdapter } from "@/lib/sync/adapters/search";
import { getProjects } from "@/data/projects/helpers";

const PRIMARY_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const SECOND_ADDRESS = "0x0000000000000000000000000000000000dEaD";
const LINKED_ADDRESS = "0x1111111111111111111111111111111111aAaA";

describe("getAdminOverviewMetrics", () => {
  it("a fresh database reports real, honest zero counts — never a fabricated non-zero placeholder", () => {
    const db = createDatabase(":memory:");
    const metrics = getAdminOverviewMetrics(db);

    expect(metrics.totalAccounts).toBe(0);
    expect(metrics.accountsActiveLast24h).toBe(0);
    expect(metrics.activeSessions).toBe(0);
    expect(metrics.additionalLinkedWallets).toBe(0);
    expect(metrics.totalWatchlists).toBe(0);
    expect(metrics.totalSavedSearches).toBe(0);
    expect(metrics.syncOperationsLast24h).toBe(0);
    // The one metric that is never zero in this codebase — the static Registry.
    expect(metrics.trackedProjects).toBe(getProjects().length);
    db.close();
  });

  it("totalAccounts reflects the real number of accounts created", () => {
    const db = createDatabase(":memory:");
    createAccountForAddress(db, PRIMARY_ADDRESS);
    createAccountForAddress(db, SECOND_ADDRESS);

    expect(getAdminOverviewMetrics(db).totalAccounts).toBe(2);
    db.close();
  });

  it("accountsActiveLast24h counts only real accounts with a recent last_active_at, not every account", () => {
    const db = createDatabase(":memory:");
    const recent = createAccountForAddress(db, PRIMARY_ADDRESS);
    createAccountForAddress(db, SECOND_ADDRESS);

    // Force the second account's last_active_at far in the past — a real, stale account.
    db.prepare("UPDATE accounts SET last_active_at = ? WHERE id != ?").run("2020-01-01T00:00:00.000Z", recent.id);

    expect(getAdminOverviewMetrics(db).accountsActiveLast24h).toBe(1);
    db.close();
  });

  it("activeSessions counts only real, non-revoked, non-expired sessions", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const liveSession = createSession(db, account.id);
    const revokedSession = createSession(db, account.id);
    revokeSession(db, revokedSession.id);

    expect(getAdminOverviewMetrics(db).activeSessions).toBe(1);

    // A genuinely expired session (expires_at in the past) is not counted either.
    db.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").run("2020-01-01T00:00:00.000Z", liveSession.id);
    expect(getAdminOverviewMetrics(db).activeSessions).toBe(0);
    db.close();
  });

  it("additionalLinkedWallets counts real linked_wallets rows, never the primary wallet itself", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    linkWalletToAccount(db, account.id, LINKED_ADDRESS);

    expect(getAdminOverviewMetrics(db).additionalLinkedWallets).toBe(1);
    db.close();
  });

  it("totalWatchlists counts every real watchlist row across every account", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO watchlists (id, account_id, name, description, icon, color, pinned, position, created_at, updated_at) VALUES (?, ?, ?, '', 'star', 'blue', 0, 0, ?, ?)"
    ).run("wl-1", account.id, "Favorites", now, now);

    expect(getAdminOverviewMetrics(db).totalWatchlists).toBe(1);
    db.close();
  });

  it("totalSavedSearches counts only live (non-deleted) records — a real tombstone doesn't count", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    pushSavedSearchOperations(db, account.id, [
      savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "aave", createdAt: new Date().toISOString() }),
      savedSearchSyncAdapter.createOperation("create", "s2", { id: "s2", query: "uniswap", createdAt: new Date().toISOString() }),
    ]);
    expect(getAdminOverviewMetrics(db).totalSavedSearches).toBe(2);

    pushSavedSearchOperations(db, account.id, [
      savedSearchSyncAdapter.createOperation("delete", "s1", { id: "s1", query: "aave", createdAt: new Date().toISOString() }),
    ]);
    expect(getAdminOverviewMetrics(db).totalSavedSearches).toBe(1);
    db.close();
  });

  it("syncOperationsLast24h counts genuine recent sync_operations_log rows across entities", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    pushSearchOperations(db, account.id, [searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave"] })]);
    pushSavedSearchOperations(db, account.id, [
      savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "aave", createdAt: new Date().toISOString() }),
    ]);

    expect(getAdminOverviewMetrics(db).syncOperationsLast24h).toBe(2);

    // A genuinely old log entry (outside the 24h window) is not counted.
    db.prepare("UPDATE sync_operations_log SET applied_at = ?").run("2020-01-01T00:00:00.000Z");
    expect(getAdminOverviewMetrics(db).syncOperationsLast24h).toBe(0);
    db.close();
  });
});
