// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { pullAccountState, pushAccountOperations } from "@/lib/backend/sqlite/accountSync";
import { createDatabase } from "@/lib/backend/sqlite/db";
import { accountSyncAdapter } from "@/lib/sync/adapters/account";
import { buildOperation } from "@/lib/sync/queue";

const PRIMARY_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

describe("pushAccountOperations", () => {
  it("applies a real, valid account update and logs a real sync_operations_log entry", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Old" });
    const operation = accountSyncAdapter.createOperation("update", account.id, { ...account, name: "New" });

    const result = pushAccountOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("success");
    expect(result.operations[0].status).toBe("success");

    const row = db.prepare("SELECT name FROM accounts WHERE id = ?").get(account.id) as { name: string };
    expect(row.name).toBe("New");

    const logRows = db.prepare("SELECT entity FROM sync_operations_log WHERE account_id = ?").all(account.id) as { entity: string }[];
    expect(logRows.map((r) => r.entity)).toEqual(["account"]);
    db.close();
  });

  it("real, honest per-operation error for a non-account entity — never silently dropped, never fabricated as success", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = buildOperation("update", "watchlist", "wl-1");

    const result = pushAccountOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("error");
    expect(result.operations[0].status).toBe("error");
    expect(result.operations[0].retryCount).toBe(1);
    db.close();
  });

  it("real, honest error for a null payload", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = buildOperation("update", "account", account.id, null);

    const result = pushAccountOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("error");
    db.close();
  });

  it("real, honest error for a malformed/undeserializable payload, never a crash", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const operation = buildOperation("update", "account", account.id, "{not valid json at all");

    expect(() => pushAccountOperations(db, account.id, [operation])).not.toThrow();
    const result = pushAccountOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("error");
    db.close();
  });

  it("a real username collision with a DIFFERENT real account fails only that operation, never crashes the batch", () => {
    const db = createDatabase(":memory:");
    const accountA = createAccountForAddress(db, PRIMARY_ADDRESS, { username: "taken_name" });
    const accountB = createAccountForAddress(db, "0x0000000000000000000000000000000000dEaD", { username: "free_name" });

    const operation = accountSyncAdapter.createOperation("update", accountB.id, { ...accountA, id: accountB.id, username: "taken_name" });
    const result = pushAccountOperations(db, accountB.id, [operation]);
    expect(result.outcome).toBe("error");

    const row = db.prepare("SELECT username FROM accounts WHERE id = ?").get(accountB.id) as { username: string };
    expect(row.username).toBe("free_name"); // untouched by the failed write
    db.close();
  });

  it("PR-093.07 — never syncs session/auth material, even if a malicious payload tries to inject it: the UPDATE statement whitelists exactly the five real profile columns, so an extra field is structurally silently ignored, not written anywhere", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Original" });
    const session = db.prepare("SELECT id FROM sessions WHERE account_id = ?").all(account.id);
    expect(session).toHaveLength(0); // no real session exists yet at this point — sanity check

    // A payload shaped like an Account but with extra, non-Account fields
    // an attacker might try to smuggle through — the adapter only ever
    // reads real Account fields, and the SQL below only ever writes
    // name/username/email/avatar/bio, so there is no code path that could
    // persist `sessionToken`/`password`/etc. even if present here.
    const maliciousPayload = JSON.stringify({
      ...account,
      name: "New Name",
      sessionToken: "fake-stolen-token",
      password: "hunter2",
    });
    const operation = buildOperation("update", "account", account.id, maliciousPayload);

    const result = pushAccountOperations(db, account.id, [operation]);
    expect(result.outcome).toBe("success");

    // Every column in the real `accounts` row — nothing beyond the known, real schema.
    const row = db.prepare("SELECT * FROM accounts WHERE id = ?").get(account.id) as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual(
      ["id", "user_id", "name", "username", "email", "avatar", "bio", "active_watchlist_id", "created_at", "updated_at", "last_active_at"].sort()
    );
    expect(row.name).toBe("New Name");

    // The real `sessions`/`auth_challenges` tables are never touched by a sync push.
    const sessionsAfter = db.prepare("SELECT * FROM sessions").all();
    const challengesAfter = db.prepare("SELECT * FROM auth_challenges").all();
    expect(sessionsAfter).toHaveLength(0);
    expect(challengesAfter).toHaveLength(0);
    db.close();
  });

  /**
   * Bug fix (Guest + Sign Out follow-up — profile not restored on
   * re-sign-in) — the local Sync Queue never dequeues a `"success"`
   * operation (nothing did, until this same fix), so the exact same
   * operation id gets pushed again on a later `performSync()` — a real,
   * reachable replay, not a hypothetical. `sync_operations_log.id` is this
   * table's `PRIMARY KEY`; a plain `INSERT` on replay used to throw there
   * and report a false per-operation `"error"` even though the account row
   * itself was updated correctly both times. Confirmed live: this is what
   * kept a real, already-saved profile edit from ever coming back on a
   * later sign-in, with the Topbar stuck on "Conflict".
   */
  it("replaying the exact same operation id (a real re-push of an already-synced operation) is a real, honest success — never a false error", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Old" });
    const operation = accountSyncAdapter.createOperation("update", account.id, { ...account, name: "New" });

    const first = pushAccountOperations(db, account.id, [operation]);
    expect(first.outcome).toBe("success");

    const replay = pushAccountOperations(db, account.id, [operation]);
    expect(replay.outcome).toBe("success");
    expect(replay.operations[0].status).toBe("success");

    const logRows = db.prepare("SELECT id FROM sync_operations_log WHERE account_id = ?").all(account.id) as { id: string }[];
    expect(logRows).toHaveLength(1); // the replay was a real no-op, never a second row
    db.close();
  });

  /**
   * Bug fix (Guest + Sign Out follow-up — profile not restored on
   * re-sign-in) — found via direct database inspection during live
   * verification: the local Sync Queue can still hold an operation queued
   * for a *previous* account (it's never scoped/cleared per account — see
   * `lib/account/service.ts`'s `signOut()`), and pushing it while signed in
   * as a *different* account used to silently apply it to that unrelated
   * account. `entityId` is set once, client-side, at enqueue time — it must
   * always be verified against the real, session-derived `accountId`.
   */
  it("rejects an operation whose entityId names a DIFFERENT account than the real, session-derived accountId — never silently applies it", () => {
    const db = createDatabase(":memory:");
    const staleAccount = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Stale Owner" });
    const currentAccount = createAccountForAddress(db, "0x0000000000000000000000000000000000dEaD", { name: "Current Owner" });

    // A real operation, queued for staleAccount, still sitting in the
    // local queue by the time a DIFFERENT account (currentAccount) is
    // the one actually signed in when it finally gets pushed.
    const staleOperation = accountSyncAdapter.createOperation("update", staleAccount.id, { ...staleAccount, name: "Leaked Name" });

    const result = pushAccountOperations(db, currentAccount.id, [staleOperation]);
    expect(result.outcome).toBe("error");
    expect(result.operations[0].status).toBe("error");

    const currentRow = db.prepare("SELECT name FROM accounts WHERE id = ?").get(currentAccount.id) as { name: string };
    expect(currentRow.name).toBe("Current Owner"); // untouched by the mismatched operation

    const staleRow = db.prepare("SELECT name FROM accounts WHERE id = ?").get(staleAccount.id) as { name: string };
    expect(staleRow.name).toBe("Stale Owner"); // also untouched — this account was never the one signed in
    db.close();
  });

  it("applies multiple real operations in order — last one wins for a given field", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Original" });
    const first = accountSyncAdapter.createOperation("update", account.id, { ...account, name: "First Edit" });
    const second = accountSyncAdapter.createOperation("update", account.id, { ...account, name: "Second Edit" });

    const result = pushAccountOperations(db, account.id, [first, second]);
    expect(result.outcome).toBe("success");

    const row = db.prepare("SELECT name FROM accounts WHERE id = ?").get(account.id) as { name: string };
    expect(row.name).toBe("Second Edit");
    db.close();
  });
});

describe("pullAccountState", () => {
  it("returns the real, current account as one real SyncOperation", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Rin", username: "rin_dev" });

    const result = pullAccountState(db, account.id);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].entity).toBe("account");
    expect(result.operations[0].status).toBe("success");

    const pulled = accountSyncAdapter.deserialize(result.operations[0].payload!);
    expect(pulled.name).toBe("Rin");
    expect(pulled.username).toBe("rin_dev");
    db.close();
  });

  it("a real, honest empty result for an account that genuinely doesn't exist", () => {
    const db = createDatabase(":memory:");
    const result = pullAccountState(db, "not-a-real-account-id");
    expect(result.operations).toEqual([]);
    db.close();
  });

  it("PR-093.07 — the pulled payload contains only real Account fields, never a session id or any other credential", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Rin" });

    const result = pullAccountState(db, account.id);
    const pulled = JSON.parse(result.operations[0].payload!) as Record<string, unknown>;
    expect(Object.keys(pulled).sort()).toEqual(
      ["id", "name", "username", "email", "avatar", "bio", "createdAt", "updatedAt", "lastActiveAt", "isGuest"].sort()
    );
    db.close();
  });
});
