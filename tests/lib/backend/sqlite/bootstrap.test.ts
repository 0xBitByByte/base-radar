// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { bootstrapAccountFromGuestSnapshot, isValidGuestSnapshot, recordAccountConflict, type GuestSnapshot } from "@/lib/backend/sqlite/bootstrap";
import { createDatabase } from "@/lib/backend/sqlite/db";
import type { PersonalWatchlist } from "@/lib/personalization/types";
import type { PersonalizationPreferences } from "@/lib/personalization/preferences";

const ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

function makeWatchlist(overrides: Partial<PersonalWatchlist> = {}): PersonalWatchlist {
  return {
    id: "wl-1",
    name: "Favorites",
    description: "",
    icon: "star",
    color: "primary",
    projectIds: ["aave", "uniswap"],
    pinned: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const PREFERENCES: PersonalizationPreferences = {
  filterDashboardByActiveWatchlist: true,
  enableSearchPrioritization: false,
  rememberActiveWatchlist: true,
  showWatchlistSelectorInTopbar: false,
};

function makeSnapshot(overrides: Partial<GuestSnapshot> = {}): GuestSnapshot {
  return {
    account: { name: "Rin", username: "rin_dev", email: null, avatar: null, bio: null },
    watchlists: [makeWatchlist()],
    preferences: PREFERENCES,
    ...overrides,
  };
}

describe("isValidGuestSnapshot", () => {
  it("accepts a real, well-formed snapshot", () => {
    expect(isValidGuestSnapshot(makeSnapshot())).toBe(true);
  });

  it("rejects a non-object, null, missing account, non-array watchlists, or missing preferences", () => {
    expect(isValidGuestSnapshot(null)).toBe(false);
    expect(isValidGuestSnapshot("not-an-object")).toBe(false);
    expect(isValidGuestSnapshot({})).toBe(false);
    expect(isValidGuestSnapshot({ account: { name: "x", username: "y" }, watchlists: "not-an-array", preferences: {} })).toBe(false);
    expect(isValidGuestSnapshot({ account: { name: "x", username: "y" }, watchlists: [] })).toBe(false);
  });

  it("rejects an account sub-object with the wrong field types", () => {
    expect(isValidGuestSnapshot({ account: { name: 1, username: "y" }, watchlists: [], preferences: {} })).toBe(false);
    expect(isValidGuestSnapshot({ account: { name: "x", username: "y", email: 5 }, watchlists: [], preferences: {} })).toBe(false);
    expect(isValidGuestSnapshot({ account: { name: "x", username: "y", bio: 5 }, watchlists: [], preferences: {} })).toBe(false);
  });

  it("accepts a real bio as either a string or null", () => {
    expect(isValidGuestSnapshot(makeSnapshot({ account: { name: "Rin", username: "rin_dev", email: null, avatar: null, bio: "Building on Base." } }))).toBe(
      true
    );
    expect(isValidGuestSnapshot(makeSnapshot({ account: { name: "Rin", username: "rin_dev", email: null, avatar: null, bio: null } }))).toBe(true);
  });
});

describe("bootstrapAccountFromGuestSnapshot", () => {
  it("migrates a real, valid watchlist and its real project membership", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const result = bootstrapAccountFromGuestSnapshot(db, account.id, makeSnapshot());

    expect(result.watchlistsMigrated).toBe(1);
    const watchlistRow = db.prepare("SELECT * FROM watchlists WHERE account_id = ?").get(account.id) as { name: string };
    expect(watchlistRow.name).toBe("Favorites");

    const memberships = db.prepare("SELECT project_id FROM watchlist_projects WHERE watchlist_id = ?").all("wl-1") as { project_id: string }[];
    expect(memberships.map((row) => row.project_id).sort()).toEqual(["aave", "uniswap"]);
    db.close();
  });

  it("migrates real preferences field-for-field", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const result = bootstrapAccountFromGuestSnapshot(db, account.id, makeSnapshot());

    expect(result.preferencesMigrated).toBe(true);
    const row = db.prepare("SELECT * FROM personalization_preferences WHERE account_id = ?").get(account.id) as Record<string, number>;
    expect(row.filter_dashboard_by_active_watchlist).toBe(1);
    expect(row.enable_search_prioritization).toBe(0);
    expect(row.remember_active_watchlist).toBe(1);
    expect(row.show_watchlist_selector_in_topbar).toBe(0);
    db.close();
  });

  it("skips a structurally invalid watchlist entry rather than writing malformed data", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const invalidWatchlist = { ...makeWatchlist(), icon: "not-a-real-icon" } as unknown as PersonalWatchlist;

    const result = bootstrapAccountFromGuestSnapshot(db, account.id, makeSnapshot({ watchlists: [invalidWatchlist] }));
    expect(result.watchlistsMigrated).toBe(0);
    const rows = db.prepare("SELECT * FROM watchlists WHERE account_id = ?").all(account.id);
    expect(rows).toHaveLength(0);
    db.close();
  });

  it("migrates multiple real watchlists, each with its own real position", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const snapshot = makeSnapshot({
      watchlists: [makeWatchlist({ id: "wl-1", name: "First" }), makeWatchlist({ id: "wl-2", name: "Second", projectIds: [] })],
    });
    bootstrapAccountFromGuestSnapshot(db, account.id, snapshot);

    const rows = db.prepare("SELECT id, position FROM watchlists WHERE account_id = ? ORDER BY position").all(account.id) as {
      id: string;
      position: number;
    }[];
    expect(rows).toEqual([
      { id: "wl-1", position: 0 },
      { id: "wl-2", position: 1 },
    ]);
    db.close();
  });

  it("logs a real sync_operations_log entry for the account, each migrated watchlist, and preferences", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    bootstrapAccountFromGuestSnapshot(db, account.id, makeSnapshot());

    const logRows = db.prepare("SELECT entity FROM sync_operations_log WHERE account_id = ?").all(account.id) as { entity: string }[];
    const entities = logRows.map((row) => row.entity).sort();
    expect(entities).toEqual(["account", "preferences", "watchlist"]);
    db.close();
  });
});

describe("recordAccountConflict", () => {
  it("writes a real, unresolved conflict record without touching the account's own data", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS, { name: "Cloud Name" });
    const snapshot = makeSnapshot({ account: { name: "Local Device Name", username: "local_user", email: null, avatar: null, bio: null } });

    recordAccountConflict(db, account.id, snapshot, { account });

    const conflictRow = db.prepare("SELECT * FROM conflicts WHERE account_id = ?").get(account.id) as {
      resolved: number;
      local_version: string;
      remote_version: string;
    };
    expect(conflictRow.resolved).toBe(0);
    expect(JSON.parse(conflictRow.local_version).account.name).toBe("Local Device Name");
    expect(JSON.parse(conflictRow.remote_version).account.name).toBe("Cloud Name");

    // The real account row itself must be untouched by recording a conflict.
    const stillCloudAccount = db.prepare("SELECT name FROM accounts WHERE id = ?").get(account.id) as { name: string };
    expect(stillCloudAccount.name).toBe("Cloud Name");
    db.close();
  });
});
