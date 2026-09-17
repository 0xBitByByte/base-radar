// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { accountSyncAdapter } from "@/lib/sync/adapters/account";
import { savedSearchSyncAdapter } from "@/lib/sync/adapters/savedSearch";
import { RECENT_SEARCHES_ENTITY_ID, searchSyncAdapter } from "@/lib/sync/adapters/search";
import { POST } from "@/app/api/sync/push/route";

const PRIMARY_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

function postRequest(body: unknown, cookie?: string) {
  return new NextRequest("http://localhost:3000/api/sync/push", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

describe("POST /api/sync/push", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("requires a real session — a Guest gets a real 401, never a fabricated success", async () => {
    const operation = accountSyncAdapter.createOperation("update", "acct-1", {
      id: "local-1",
      name: "Rin",
      username: "rin_dev",
      email: null,
      avatar: null,
      bio: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastActiveAt: "2026-01-01T00:00:00.000Z",
      isGuest: false,
    });
    const response = await POST(postRequest({ operations: [operation] }));
    expect(response.status).toBe(401);
  });

  it("a real authenticated push genuinely writes the real account row, scoped to the session's own account", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Old Name" });
    const session = createSession(db, account.id);

    const operation = accountSyncAdapter.createOperation("update", account.id, {
      ...account,
      name: "New Name",
      bio: "Building on Base.",
    });

    const response = await POST(postRequest({ operations: [operation] }, `br_session=${session.id}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.outcome).toBe("success");
    expect(body.operations[0].status).toBe("success");

    const row = db.prepare("SELECT name, bio FROM accounts WHERE id = ?").get(account.id) as { name: string; bio: string };
    expect(row.name).toBe("New Name");
    expect(row.bio).toBe("Building on Base.");
  });

  it("rejects a malformed request body", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const session = createSession(db, account.id);

    const request = new NextRequest("http://localhost:3000/api/sync/push", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `br_session=${session.id}` },
      body: "{not valid json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects a real request whose operations aren't a genuine array of valid operations", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const session = createSession(db, account.id);

    const response = await POST(postRequest({ operations: [{ not: "a real operation" }] }, `br_session=${session.id}`));
    expect(response.status).toBe(400);
  });

  it("a malformed/undeserializable payload for one operation fails only that operation, never a crash", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const session = createSession(db, account.id);

    const operation = accountSyncAdapter.createOperation("update", account.id, {
      ...account,
      name: "New Name",
    });
    const malformedOperation = { ...operation, id: "sync:malformed", payload: "{not valid account json" };

    const response = await POST(postRequest({ operations: [malformedOperation] }, `br_session=${session.id}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.outcome).toBe("error");
    expect(body.operations[0].status).toBe("error");
  });

  describe("PR-094.01 — search entity", () => {
    it("a real authenticated push genuinely writes the real search_history row, scoped to the session's own account", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS);
      const session = createSession(db, account.id);

      const operation = searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave", "uniswap"] });
      const response = await POST(postRequest({ operations: [operation] }, `br_session=${session.id}`));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.outcome).toBe("success");

      const row = db.prepare("SELECT queries FROM search_history WHERE account_id = ?").get(account.id) as { queries: string };
      expect(JSON.parse(row.queries)).toEqual(["aave", "uniswap"]);
    });

    it("one real push can mix account and search entity operations — each is routed to its own real handler and both succeed", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Old Name" });
      const session = createSession(db, account.id);

      const accountOp = accountSyncAdapter.createOperation("update", account.id, { ...account, name: "New Name" });
      const searchOp = searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave"] });

      const response = await POST(postRequest({ operations: [accountOp, searchOp] }, `br_session=${session.id}`));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.outcome).toBe("success");
      expect(body.operations).toHaveLength(2);
      // Results come back in the same order the operations were sent, regardless of entity.
      expect(body.operations[0].id).toBe(accountOp.id);
      expect(body.operations[1].id).toBe(searchOp.id);

      const accountRow = db.prepare("SELECT name FROM accounts WHERE id = ?").get(account.id) as { name: string };
      expect(accountRow.name).toBe("New Name");
      const searchRow = db.prepare("SELECT queries FROM search_history WHERE account_id = ?").get(account.id) as { queries: string };
      expect(JSON.parse(searchRow.queries)).toEqual(["aave"]);
    });

    it("never writes a different account's real search history than the session's own", async () => {
      const db = getDb();
      const accountA = createAccountForAddress(db, PRIMARY_ADDRESS);
      const accountB = createAccountForAddress(db, "0x0000000000000000000000000000000000dEaD");
      const sessionA = createSession(db, accountA.id);

      const operation = searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave"] });
      await POST(postRequest({ operations: [operation] }, `br_session=${sessionA.id}`));

      const rowB = db.prepare("SELECT * FROM search_history WHERE account_id = ?").get(accountB.id);
      expect(rowB).toBeUndefined();
    });
  });

  describe("PR-094.02 — savedSearch entity", () => {
    it("requires a real session — a Guest gets a real 401, never a fabricated success", async () => {
      const operation = savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" });
      const response = await POST(postRequest({ operations: [operation] }));
      expect(response.status).toBe(401);
    });

    it("a real authenticated push genuinely creates a real saved_searches row, scoped to the session's own account", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS);
      const session = createSession(db, account.id);

      const operation = savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" });
      const response = await POST(postRequest({ operations: [operation] }, `br_session=${session.id}`));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.outcome).toBe("success");

      const row = db.prepare("SELECT account_id, query FROM saved_searches WHERE id = ?").get("s1") as { account_id: string; query: string };
      expect(row.account_id).toBe(account.id);
      expect(row.query).toBe("aave");
    });

    it("a real authenticated push genuinely soft-deletes a real saved_searches row", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS);
      const session = createSession(db, account.id);

      await POST(
        postRequest(
          { operations: [savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" })] },
          `br_session=${session.id}`
        )
      );
      const response = await POST(
        postRequest(
          { operations: [savedSearchSyncAdapter.createOperation("delete", "s1", { id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" })] },
          `br_session=${session.id}`
        )
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.outcome).toBe("success");
      const row = db.prepare("SELECT deleted_at FROM saved_searches WHERE id = ?").get("s1") as { deleted_at: string | null };
      expect(row.deleted_at).not.toBeNull();
    });

    it("account isolation: a malicious client cannot write another account's Saved Search by claiming its id — creating a real, existing id owned by a different account fails honestly", async () => {
      const db = getDb();
      const accountA = createAccountForAddress(db, PRIMARY_ADDRESS);
      const accountB = createAccountForAddress(db, "0x1111111111111111111111111111111111aAaA");
      const sessionA = createSession(db, accountA.id);
      const sessionB = createSession(db, accountB.id);

      await POST(
        postRequest(
          {
            operations: [savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "account-a-only", createdAt: "2026-01-01T00:00:00.000Z" })],
          },
          `br_session=${sessionA.id}`
        )
      );

      const response = await POST(
        postRequest(
          { operations: [savedSearchSyncAdapter.createOperation("delete", "s1", { id: "s1", query: "account-a-only", createdAt: "2026-01-01T00:00:00.000Z" })] },
          `br_session=${sessionB.id}`
        )
      );
      const body = await response.json();
      expect(body.outcome).toBe("error");

      const row = db.prepare("SELECT account_id, deleted_at FROM saved_searches WHERE id = ?").get("s1") as {
        account_id: string;
        deleted_at: string | null;
      };
      expect(row.account_id).toBe(accountA.id);
      expect(row.deleted_at).toBeNull(); // account B's rejected delete never touched account A's real row
    });

    it("real, honest per-operation error for a malformed/undeserializable Saved Search payload, never a crash", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS);
      const session = createSession(db, account.id);

      const operation = savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" });
      const malformedOperation = { ...operation, id: "sync:malformed-saved-search", payload: "{not valid saved search json" };

      const response = await POST(postRequest({ operations: [malformedOperation] }, `br_session=${session.id}`));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.outcome).toBe("error");
      expect(body.operations[0].status).toBe("error");
    });

    it("one real push can mix account, search, and savedSearch entity operations — each is routed to its own real handler and all succeed", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Old Name" });
      const session = createSession(db, account.id);

      const accountOp = accountSyncAdapter.createOperation("update", account.id, { ...account, name: "New Name" });
      const searchOp = searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave"] });
      const savedSearchOp = savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "uniswap", createdAt: "2026-01-01T00:00:00.000Z" });

      const response = await POST(postRequest({ operations: [accountOp, searchOp, savedSearchOp] }, `br_session=${session.id}`));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.outcome).toBe("success");
      expect(body.operations).toHaveLength(3);
      expect(body.operations.map((op: { id: string }) => op.id)).toEqual([accountOp.id, searchOp.id, savedSearchOp.id]);

      const savedRow = db.prepare("SELECT query FROM saved_searches WHERE id = ?").get("s1") as { query: string };
      expect(savedRow.query).toBe("uniswap");
    });
  });
});
