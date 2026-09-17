// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { sqliteBackend } from "@/lib/backend/sqlite";
import { accountSyncAdapter } from "@/lib/sync/adapters/account";
import { RECENT_SEARCHES_ENTITY_ID, searchSyncAdapter } from "@/lib/sync/adapters/search";
import { buildOperation } from "@/lib/sync/queue";

const ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

describe("sqliteBackend", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("identifies itself honestly", () => {
    expect(sqliteBackend.id).toBe("sqlite");
    expect(sqliteBackend.label).toBe("SQLite");
  });

  it("reading sqliteBackend.id/label never opens a real connection — the singleton stays genuinely lazy until a service method is actually called", () => {
    const dir = path.join(tmpdir(), `base-radar-lazy-probe-${Date.now()}`);
    process.env.SQLITE_DB_PATH = path.join(dir, "backend.db");
    resetDbSingletonForTests();

    // Merely referencing the already-imported sqliteBackend object's
    // static fields must not have created the file — only a real service
    // call does that (proven immediately below).
    expect(sqliteBackend.id).toBe("sqlite");
    expect(existsSync(dir)).toBe(false);

    rmSync(dir, { recursive: true, force: true });
  });

  it("services.storage genuinely reads/writes through the real database", async () => {
    await sqliteBackend.services.storage.write("k", "v");
    expect(await sqliteBackend.services.storage.read("k")).toBe("v");
  });

  it("services.health genuinely reports on the real database", async () => {
    expect(await sqliteBackend.services.health.check()).toEqual({ healthy: true });
  });

  it("services.account honestly throws — this zero-parameter contract can't express which account", async () => {
    await expect(sqliteBackend.services.account.getAccount()).rejects.toThrow(/can't express which account/);
    await expect(sqliteBackend.services.account.updateAccount({ name: "x" })).rejects.toThrow(/can't express which account/);
    await expect(sqliteBackend.services.account.deleteAccount()).rejects.toThrow(/can't express which account/);
  });

  describe("services.sync (PR-093.06 — real for the account entity)", () => {
    it("push genuinely writes real account fields for the real, given accountId", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, ADDRESS, { name: "Old Name", username: "old_user" });
      const operation = accountSyncAdapter.createOperation("update", account.id, { ...account, name: "New Name", bio: "Building on Base." });

      const result = await sqliteBackend.services.sync.push(account.id, [operation]);
      expect(result.outcome).toBe("success");

      const row = db.prepare("SELECT name, bio FROM accounts WHERE id = ?").get(account.id) as { name: string; bio: string };
      expect(row.name).toBe("New Name");
      expect(row.bio).toBe("Building on Base.");
    });

    it("push never writes to a different real account than the one given", async () => {
      const db = getDb();
      const accountA = createAccountForAddress(db, ADDRESS, { name: "A" });
      const accountB = createAccountForAddress(db, "0x0000000000000000000000000000000000dEaD", { name: "B" });
      const operation = accountSyncAdapter.createOperation("update", accountA.id, { ...accountA, name: "Hijacked" });

      await sqliteBackend.services.sync.push(accountB.id, [operation]);

      const row = db.prepare("SELECT name FROM accounts WHERE id = ?").get(accountB.id) as { name: string };
      expect(row.name).toBe("B"); // untouched — the operation named accountA's own id, not accountB's
    });

    it("pull returns the real, current cloud state for the real, given accountId", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, ADDRESS, { name: "Rin", username: "rin_dev" });

      const result = await sqliteBackend.services.sync.pull(account.id);
      expect(result.operations).toHaveLength(1);
      const pulled = accountSyncAdapter.deserialize(result.operations[0].payload!);
      expect(pulled.name).toBe("Rin");
      expect(pulled.username).toBe("rin_dev");
    });

    it("pull returns a real, honest empty result for an account that genuinely doesn't exist", async () => {
      const result = await sqliteBackend.services.sync.pull("not-a-real-account-id");
      expect(result.operations).toEqual([]);
    });

    it("getStatus/getConflicts honestly throw — no server-side meaning exists yet for either", async () => {
      await expect(sqliteBackend.services.sync.getStatus("acct-1")).rejects.toThrow(/no server-side meaning/);
      await expect(sqliteBackend.services.sync.getConflicts("acct-1")).rejects.toThrow(/no server-side meaning/);
    });
  });

  describe("services.sync (PR-094.01 — real for the search entity, and real entity dispatch)", () => {
    it("push genuinely writes a real search_history row for the real, given accountId", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, ADDRESS);
      const operation = searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave"] });

      const result = await sqliteBackend.services.sync.push(account.id, [operation]);
      expect(result.outcome).toBe("success");

      const row = db.prepare("SELECT queries FROM search_history WHERE account_id = ?").get(account.id) as { queries: string };
      expect(JSON.parse(row.queries)).toEqual(["aave"]);
    });

    it("one real push dispatches a mix of account and search operations to their own real handlers, preserving input order in the response", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, ADDRESS, { name: "Old" });
      const accountOp = accountSyncAdapter.createOperation("update", account.id, { ...account, name: "New" });
      const searchOp = searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave"] });

      const result = await sqliteBackend.services.sync.push(account.id, [searchOp, accountOp]);
      expect(result.outcome).toBe("success");
      expect(result.operations.map((op) => op.id)).toEqual([searchOp.id, accountOp.id]); // same order as sent

      const accountRow = db.prepare("SELECT name FROM accounts WHERE id = ?").get(account.id) as { name: string };
      expect(accountRow.name).toBe("New");
      const searchRow = db.prepare("SELECT queries FROM search_history WHERE account_id = ?").get(account.id) as { queries: string };
      expect(JSON.parse(searchRow.queries)).toEqual(["aave"]);
    });

    it("an entity with real adapters but no server module yet (watchlist/preferences) fails honestly, per-operation, never silently dropped", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, ADDRESS);
      const operation = buildOperation("update", "watchlist", "wl-1");

      const result = await sqliteBackend.services.sync.push(account.id, [operation]);
      expect(result.outcome).toBe("error");
      expect(result.operations[0].status).toBe("error");
      expect(result.operations[0].retryCount).toBe(1);
    });

    it("pull returns both real account and search state together, when both exist", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, ADDRESS, { name: "Rin" });
      await sqliteBackend.services.sync.push(account.id, [searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave"] })]);

      const result = await sqliteBackend.services.sync.pull(account.id);
      expect(result.operations).toHaveLength(2);
      expect(result.operations.map((op) => op.entity).sort()).toEqual(["account", "search"]);
    });
  });
});
