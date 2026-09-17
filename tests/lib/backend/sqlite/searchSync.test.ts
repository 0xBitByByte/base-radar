// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { createDatabase } from "@/lib/backend/sqlite/db";
import { pullSearchState, pushSearchOperations } from "@/lib/backend/sqlite/searchSync";
import { searchSyncAdapter, RECENT_SEARCHES_ENTITY_ID } from "@/lib/sync/adapters/search";
import { buildOperation } from "@/lib/sync/queue";

const PRIMARY_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

describe("pushSearchOperations", () => {
  it("applies a real, valid Recent Searches update and logs a real sync_operations_log entry", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave", "uniswap"] });

    const result = pushSearchOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("success");
    expect(result.operations[0].status).toBe("success");

    const row = db.prepare("SELECT queries FROM search_history WHERE account_id = ?").get(account.id) as { queries: string };
    expect(JSON.parse(row.queries)).toEqual(["aave", "uniswap"]);

    const logRows = db.prepare("SELECT entity FROM sync_operations_log WHERE account_id = ?").all(account.id) as { entity: string }[];
    expect(logRows.map((r) => r.entity)).toEqual(["search"]);
    db.close();
  });

  it("a second real push overwrites the prior real list — remote-authoritative, matching the adapter's own merge() convention", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    pushSearchOperations(db, account.id, [searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["first"] })]);
    pushSearchOperations(db, account.id, [searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["second"] })]);

    const row = db.prepare("SELECT queries FROM search_history WHERE account_id = ?").get(account.id) as { queries: string };
    expect(JSON.parse(row.queries)).toEqual(["second"]);
    db.close();
  });

  it("real, honest per-operation error for a non-search entity — never silently dropped, never fabricated as success", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = buildOperation("update", "watchlist", "wl-1");

    const result = pushSearchOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("error");
    expect(result.operations[0].retryCount).toBe(1);
    db.close();
  });

  it("real, honest error for a null payload", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = buildOperation("update", "search", RECENT_SEARCHES_ENTITY_ID, null);

    const result = pushSearchOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("error");
    db.close();
  });

  it("real, honest error for a malformed/undeserializable payload, never a crash", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = buildOperation("update", "search", RECENT_SEARCHES_ENTITY_ID, "{not valid json at all");

    expect(() => pushSearchOperations(db, account.id, [operation])).not.toThrow();
    const result = pushSearchOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("error");
    db.close();
  });

  it("real, honest error for a payload whose queries aren't real strings", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = buildOperation("update", "search", RECENT_SEARCHES_ENTITY_ID, JSON.stringify({ queries: [1, 2, 3] }));

    const result = pushSearchOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("error");
    db.close();
  });

  /**
   * Bug fix (Guest + Sign Out follow-up — profile not restored on
   * re-sign-in) — same defect as `accountSync.test.ts`'s identical test:
   * the local Sync Queue replays `"success"` operations on a later sync, so
   * `sync_operations_log`'s `PRIMARY KEY` must tolerate a real replay
   * without a false per-operation error.
   */
  it("replaying the exact same operation id (a real re-push of an already-synced operation) is a real, honest success — never a false error", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave"] });

    const first = pushSearchOperations(db, account.id, [operation]);
    expect(first.outcome).toBe("success");

    const replay = pushSearchOperations(db, account.id, [operation]);
    expect(replay.outcome).toBe("success");

    const logRows = db.prepare("SELECT id FROM sync_operations_log WHERE account_id = ?").all(account.id) as { id: string }[];
    expect(logRows).toHaveLength(1);
    db.close();
  });

  it("PR-094.07-equivalent — never syncs session/auth material: the INSERT/UPDATE only ever writes account_id/queries/updated_at, even if a malicious payload tries to inject extra fields", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const maliciousPayload = JSON.stringify({ queries: ["aave"], sessionToken: "fake-stolen-token", password: "hunter2" });
    const operation = buildOperation("update", "search", RECENT_SEARCHES_ENTITY_ID, maliciousPayload);

    const result = pushSearchOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("success"); // extra fields are simply ignored — a real, valid `queries` array is still present

    const row = db.prepare("SELECT * FROM search_history WHERE account_id = ?").get(account.id) as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual(["account_id", "queries", "updated_at"]);

    const sessionsAfter = db.prepare("SELECT * FROM sessions").all();
    expect(sessionsAfter).toHaveLength(0);
    db.close();
  });
});

describe("pullSearchState", () => {
  it("returns the real, current cloud Recent Searches list as one real SyncOperation", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    pushSearchOperations(db, account.id, [searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave", "uniswap"] })]);

    const result = pullSearchState(db, account.id);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].entity).toBe("search");
    const pulled = searchSyncAdapter.deserialize(result.operations[0].payload!);
    expect(pulled.queries).toEqual(["aave", "uniswap"]);
    db.close();
  });

  it("a real, honest empty result for an account that has never pushed a real Recent Searches list", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const result = pullSearchState(db, account.id);
    expect(result.operations).toEqual([]);
    db.close();
  });

  it("a real, honest empty result for an account that genuinely doesn't exist", () => {
    const db = createDatabase(":memory:");
    const result = pullSearchState(db, "not-a-real-account-id");
    expect(result.operations).toEqual([]);
    db.close();
  });

  it("a genuinely corrupted stored row is treated as nothing real to pull, never a fabricated or partially-parsed list", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    db.prepare("INSERT INTO search_history (account_id, queries, updated_at) VALUES (?, ?, ?)").run(
      account.id,
      "{not valid json",
      new Date().toISOString()
    );

    const result = pullSearchState(db, account.id);
    expect(result.operations).toEqual([]);
    db.close();
  });
});
