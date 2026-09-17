// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { createDatabase } from "@/lib/backend/sqlite/db";
import { pullSavedSearchState, pushSavedSearchOperations } from "@/lib/backend/sqlite/savedSearchSync";
import { savedSearchSyncAdapter } from "@/lib/sync/adapters/savedSearch";
import { buildOperation } from "@/lib/sync/queue";

const PRIMARY_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const OTHER_ADDRESS = "0x0000000000000000000000000000000000dEaD";

function savedSearch(id: string, query: string, createdAt = "2026-01-01T00:00:00.000Z") {
  return { id, query, createdAt };
}

describe("pushSavedSearchOperations", () => {
  it("applies a real create and logs a real sync_operations_log entry", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "aave"));

    const result = pushSavedSearchOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("success");
    expect(result.operations[0].status).toBe("success");

    const row = db.prepare("SELECT * FROM saved_searches WHERE id = ?").get("s1") as Record<string, unknown>;
    expect(row.account_id).toBe(account.id);
    expect(row.query).toBe("aave");
    expect(row.deleted_at).toBeNull();

    const logRows = db.prepare("SELECT entity FROM sync_operations_log WHERE account_id = ?").all(account.id) as { entity: string }[];
    expect(logRows.map((r) => r.entity)).toEqual(["savedSearch"]);
    db.close();
  });

  it("supports multiple real, independent records for the same account — a genuine multi-record entity, never a collapsed singleton", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    pushSavedSearchOperations(db, account.id, [
      savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "aave")),
      savedSearchSyncAdapter.createOperation("create", "s2", savedSearch("s2", "uniswap")),
      savedSearchSyncAdapter.createOperation("create", "s3", savedSearch("s3", "compound")),
    ]);

    const rows = db.prepare("SELECT id, query FROM saved_searches WHERE account_id = ? ORDER BY id").all(account.id) as {
      id: string;
      query: string;
    }[];
    expect(rows).toEqual([
      { id: "s1", query: "aave" },
      { id: "s2", query: "uniswap" },
      { id: "s3", query: "compound" },
    ]);
    db.close();
  });

  it("a duplicate/replayed create for a record this same account already owns is a real, honest no-op success — never a second row, never an error", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "aave"));
    pushSavedSearchOperations(db, account.id, [operation]);
    const result = pushSavedSearchOperations(db, account.id, [operation]);

    expect(result.outcome).toBe("success");
    const rows = db.prepare("SELECT * FROM saved_searches WHERE id = ?").all("s1");
    expect(rows).toHaveLength(1);
    db.close();
  });

  it("account isolation: a create naming an id already owned by a different real account fails honestly — never overwrites the other account's row", () => {
    const db = createDatabase(":memory:");
    const accountA = createAccountForAddress(db, PRIMARY_ADDRESS);
    const accountB = createAccountForAddress(db, OTHER_ADDRESS);
    pushSavedSearchOperations(db, accountA.id, [savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "aave-account-a"))]);

    const maliciousOperation = savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "hijacked"));
    const result = pushSavedSearchOperations(db, accountB.id, [maliciousOperation]);

    expect(result.outcome).toBe("error");
    const row = db.prepare("SELECT account_id, query FROM saved_searches WHERE id = ?").get("s1") as { account_id: string; query: string };
    expect(row.account_id).toBe(accountA.id);
    expect(row.query).toBe("aave-account-a"); // never mutated by account B's colliding create
    db.close();
  });

  it("applies a real soft-delete — the row is tombstoned (deleted_at set), never hard-deleted", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    pushSavedSearchOperations(db, account.id, [savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "aave"))]);

    const result = pushSavedSearchOperations(db, account.id, [savedSearchSyncAdapter.createOperation("delete", "s1", savedSearch("s1", "aave"))]);
    expect(result.outcome).toBe("success");

    const row = db.prepare("SELECT deleted_at FROM saved_searches WHERE id = ?").get("s1") as { deleted_at: string | null };
    expect(row.deleted_at).not.toBeNull();
    db.close();
  });

  it("account isolation: a delete for a record owned by a different real account fails honestly — never a cross-account write", () => {
    const db = createDatabase(":memory:");
    const accountA = createAccountForAddress(db, PRIMARY_ADDRESS);
    const accountB = createAccountForAddress(db, OTHER_ADDRESS);
    pushSavedSearchOperations(db, accountA.id, [savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "aave"))]);

    const result = pushSavedSearchOperations(db, accountB.id, [savedSearchSyncAdapter.createOperation("delete", "s1", savedSearch("s1", "aave"))]);
    expect(result.outcome).toBe("error");

    const row = db.prepare("SELECT deleted_at FROM saved_searches WHERE id = ?").get("s1") as { deleted_at: string | null };
    expect(row.deleted_at).toBeNull(); // account A's real record is untouched by account B's rejected delete
    db.close();
  });

  it("a genuine delete-before-create race records a real tombstone owned by the requesting account, so a later out-of-order create replay can never resurrect it", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);

    const deleteResult = pushSavedSearchOperations(db, account.id, [
      savedSearchSyncAdapter.createOperation("delete", "s1", savedSearch("s1", "aave")),
    ]);
    expect(deleteResult.outcome).toBe("success");

    const row = db.prepare("SELECT account_id, deleted_at FROM saved_searches WHERE id = ?").get("s1") as {
      account_id: string;
      deleted_at: string | null;
    };
    expect(row.account_id).toBe(account.id);
    expect(row.deleted_at).not.toBeNull();

    // The real "create" replay that raced against the delete now finds the id already tombstoned — a real no-op, never a resurrection.
    const createReplay = pushSavedSearchOperations(db, account.id, [
      savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "aave")),
    ]);
    expect(createReplay.outcome).toBe("success");
    const rowAfter = db.prepare("SELECT deleted_at FROM saved_searches WHERE id = ?").get("s1") as { deleted_at: string | null };
    expect(rowAfter.deleted_at).not.toBeNull(); // still tombstoned — never unexpectedly reappeared
    db.close();
  });

  it("real, honest per-operation error for a non-savedSearch entity — never silently dropped, never fabricated as success", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = buildOperation("create", "watchlist", "wl-1");

    const result = pushSavedSearchOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("error");
    expect(result.operations[0].retryCount).toBe(1);
    db.close();
  });

  it("real, honest error for a null payload on a create", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = buildOperation("create", "savedSearch", "s1", null);

    const result = pushSavedSearchOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("error");
    db.close();
  });

  it("real, honest error for a malformed/undeserializable payload, never a crash", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = buildOperation("create", "savedSearch", "s1", "{not valid json at all");

    expect(() => pushSavedSearchOperations(db, account.id, [operation])).not.toThrow();
    const result = pushSavedSearchOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("error");
    db.close();
  });

  it("never syncs session/auth material: a malicious payload's extra fields are simply ignored — the row only ever has the real, whitelisted columns", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const maliciousPayload = JSON.stringify({
      id: "s1",
      query: "aave",
      createdAt: "2026-01-01T00:00:00.000Z",
      sessionToken: "fake-stolen-token",
      password: "hunter2",
      account_id: "some-other-account",
    });
    const operation = buildOperation("create", "savedSearch", "s1", maliciousPayload);

    const result = pushSavedSearchOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("success"); // extra fields are simply ignored — a real, valid record is still present

    const row = db.prepare("SELECT * FROM saved_searches WHERE id = ?").get("s1") as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual(["account_id", "created_at", "deleted_at", "id", "query", "updated_at"]);
    expect(row.account_id).toBe(account.id); // the real, session-derived account id — never the payload's own claimed value

    const sessionsAfter = db.prepare("SELECT * FROM sessions").all();
    expect(sessionsAfter).toHaveLength(0);
    db.close();
  });

  it("one real push can mix multiple create and delete operations for different records — each succeeds independently", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    pushSavedSearchOperations(db, account.id, [savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "aave"))]);

    const result = pushSavedSearchOperations(db, account.id, [
      savedSearchSyncAdapter.createOperation("create", "s2", savedSearch("s2", "uniswap")),
      savedSearchSyncAdapter.createOperation("delete", "s1", savedSearch("s1", "aave")),
    ]);
    expect(result.outcome).toBe("success");
    expect(result.operations.every((op) => op.status === "success")).toBe(true);

    const s1 = db.prepare("SELECT deleted_at FROM saved_searches WHERE id = ?").get("s1") as { deleted_at: string | null };
    const s2 = db.prepare("SELECT deleted_at FROM saved_searches WHERE id = ?").get("s2") as { deleted_at: string | null };
    expect(s1.deleted_at).not.toBeNull();
    expect(s2.deleted_at).toBeNull();
    db.close();
  });
});

describe("pullSavedSearchState", () => {
  it("returns every real live record for the account, wrapped as real create operations", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    pushSavedSearchOperations(db, account.id, [
      savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "aave")),
      savedSearchSyncAdapter.createOperation("create", "s2", savedSearch("s2", "uniswap")),
    ]);

    const result = pullSavedSearchState(db, account.id);
    expect(result.operations).toHaveLength(2);
    expect(result.operations.every((op) => op.entity === "savedSearch" && op.type === "create")).toBe(true);
    const queries = result.operations.map((op) => savedSearchSyncAdapter.deserialize(op.payload!).query).sort();
    expect(queries).toEqual(["aave", "uniswap"]);
    db.close();
  });

  it("returns a genuinely deleted record as a real, explicit delete/tombstone operation — deletion is never inferred from absence", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    pushSavedSearchOperations(db, account.id, [savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "aave"))]);
    pushSavedSearchOperations(db, account.id, [savedSearchSyncAdapter.createOperation("delete", "s1", savedSearch("s1", "aave"))]);

    const result = pullSavedSearchState(db, account.id);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].type).toBe("delete");
    expect(result.operations[0].entityId).toBe("s1");
    db.close();
  });

  it("a real, honest empty result for an account that has never pushed a real Saved Search", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const result = pullSavedSearchState(db, account.id);
    expect(result.operations).toEqual([]);
    db.close();
  });

  it("account isolation: never returns a different account's real Saved Searches", () => {
    const db = createDatabase(":memory:");
    const accountA = createAccountForAddress(db, PRIMARY_ADDRESS);
    const accountB = createAccountForAddress(db, OTHER_ADDRESS);
    pushSavedSearchOperations(db, accountA.id, [savedSearchSyncAdapter.createOperation("create", "s1", savedSearch("s1", "account-a-only"))]);

    const result = pullSavedSearchState(db, accountB.id);
    expect(result.operations).toEqual([]);
    db.close();
  });
});
