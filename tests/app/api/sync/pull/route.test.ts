// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { pushSavedSearchOperations } from "@/lib/backend/sqlite/savedSearchSync";
import { pushSearchOperations } from "@/lib/backend/sqlite/searchSync";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { accountSyncAdapter } from "@/lib/sync/adapters/account";
import { savedSearchSyncAdapter } from "@/lib/sync/adapters/savedSearch";
import { RECENT_SEARCHES_ENTITY_ID, searchSyncAdapter } from "@/lib/sync/adapters/search";
import { GET } from "@/app/api/sync/pull/route";

const PRIMARY_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

function getRequest(cookie?: string) {
  return new NextRequest("http://localhost:3000/api/sync/pull", { headers: cookie ? { cookie } : {} });
}

describe("GET /api/sync/pull", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("requires a real session — a Guest gets a real 401", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
  });

  it("returns the real, current cloud account state for the session's own account", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Rin", username: "rin_dev" });
    const session = createSession(db, account.id);

    const response = await GET(getRequest(`br_session=${session.id}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.operations).toHaveLength(1);
    const pulled = accountSyncAdapter.deserialize(body.operations[0].payload);
    expect(pulled.name).toBe("Rin");
    expect(pulled.username).toBe("rin_dev");
  });

  it("never returns a different account's real data — the session determines identity, not anything the client could claim", async () => {
    const db = getDb();
    const accountA = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Account A" });
    createAccountForAddress(db, "0x0000000000000000000000000000000000dEaD", { name: "Account B" });
    const sessionA = createSession(db, accountA.id);

    const response = await GET(getRequest(`br_session=${sessionA.id}`));
    const body = await response.json();
    const pulled = accountSyncAdapter.deserialize(body.operations[0].payload);
    expect(pulled.name).toBe("Account A");
  });

  describe("PR-094.01 — search entity", () => {
    it("returns the real, current cloud Recent Searches state alongside the account state, in one response", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Rin" });
      const session = createSession(db, account.id);
      pushSearchOperations(db, account.id, [searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave"] })]);

      const response = await GET(getRequest(`br_session=${session.id}`));
      const body = await response.json();
      expect(body.operations).toHaveLength(2);

      const searchOp = body.operations.find((op: { entity: string }) => op.entity === "search");
      const pulled = searchSyncAdapter.deserialize(searchOp.payload);
      expect(pulled.queries).toEqual(["aave"]);
    });

    it("a real, honest empty search result for an account that never pushed Recent Searches — only the real account operation comes back", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS);
      const session = createSession(db, account.id);

      const response = await GET(getRequest(`br_session=${session.id}`));
      const body = await response.json();
      expect(body.operations).toHaveLength(1);
      expect(body.operations[0].entity).toBe("account");
    });

    it("real cross-session/device proof: a second, independent session for the same account pulls the first session's real pushed Recent Searches", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS);
      const sessionDeviceA = createSession(db, account.id);
      const sessionDeviceB = createSession(db, account.id); // a genuinely separate session id, same real account

      pushSearchOperations(db, account.id, [
        searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["pushed from device A"] }),
      ]);

      expect(sessionDeviceA.id).not.toBe(sessionDeviceB.id);
      const response = await GET(getRequest(`br_session=${sessionDeviceB.id}`));
      const body = await response.json();
      const searchOp = body.operations.find((op: { entity: string }) => op.entity === "search");
      const pulled = searchSyncAdapter.deserialize(searchOp.payload);
      expect(pulled.queries).toEqual(["pushed from device A"]);
    });
  });

  describe("PR-094.02 — savedSearch entity", () => {
    it("returns the real, current cloud Saved Searches alongside account state, in one response", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS, { name: "Rin" });
      const session = createSession(db, account.id);
      pushSavedSearchOperations(db, account.id, [
        savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" }),
        savedSearchSyncAdapter.createOperation("create", "s2", { id: "s2", query: "uniswap", createdAt: "2026-01-01T00:00:00.000Z" }),
      ]);

      const response = await GET(getRequest(`br_session=${session.id}`));
      const body = await response.json();
      expect(body.operations).toHaveLength(3); // 1 account + 2 real saved searches

      const savedSearchOps = body.operations.filter((op: { entity: string }) => op.entity === "savedSearch");
      expect(savedSearchOps).toHaveLength(2);
      expect(savedSearchOps.every((op: { type: string }) => op.type === "create")).toBe(true);
    });

    it("a genuinely deleted Saved Search comes back as a real, explicit delete operation, never silently omitted", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS);
      const session = createSession(db, account.id);
      pushSavedSearchOperations(db, account.id, [savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" })]);
      pushSavedSearchOperations(db, account.id, [savedSearchSyncAdapter.createOperation("delete", "s1", { id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" })]);

      const response = await GET(getRequest(`br_session=${session.id}`));
      const body = await response.json();
      const savedSearchOp = body.operations.find((op: { entity: string }) => op.entity === "savedSearch");
      expect(savedSearchOp.type).toBe("delete");
      expect(savedSearchOp.entityId).toBe("s1");
    });

    it("a real, honest empty savedSearch result for an account that never pushed one — only the real account operation comes back", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS);
      const session = createSession(db, account.id);

      const response = await GET(getRequest(`br_session=${session.id}`));
      const body = await response.json();
      expect(body.operations).toHaveLength(1);
      expect(body.operations[0].entity).toBe("account");
    });

    it("real cross-device proof: a second, independent session for the same account pulls the first session's real pushed Saved Search", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, PRIMARY_ADDRESS);
      const sessionDeviceA = createSession(db, account.id);
      const sessionDeviceB = createSession(db, account.id); // a genuinely separate session id, same real account

      pushSavedSearchOperations(db, account.id, [
        savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "pushed from device A", createdAt: "2026-01-01T00:00:00.000Z" }),
      ]);

      expect(sessionDeviceA.id).not.toBe(sessionDeviceB.id);
      const response = await GET(getRequest(`br_session=${sessionDeviceB.id}`));
      const body = await response.json();
      const savedSearchOp = body.operations.find((op: { entity: string }) => op.entity === "savedSearch");
      const pulled = savedSearchSyncAdapter.deserialize(savedSearchOp.payload);
      expect(pulled.query).toBe("pushed from device A");
    });

    it("account isolation: never returns a different account's real Saved Searches", async () => {
      const db = getDb();
      const accountA = createAccountForAddress(db, PRIMARY_ADDRESS);
      const accountB = createAccountForAddress(db, "0x0000000000000000000000000000000000dEaD");
      const sessionB = createSession(db, accountB.id);
      pushSavedSearchOperations(db, accountA.id, [
        savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "account-a-only", createdAt: "2026-01-01T00:00:00.000Z" }),
      ]);

      const response = await GET(getRequest(`br_session=${sessionB.id}`));
      const body = await response.json();
      const savedSearchOps = body.operations.filter((op: { entity: string }) => op.entity === "savedSearch");
      expect(savedSearchOps).toEqual([]);
    });
  });
});
