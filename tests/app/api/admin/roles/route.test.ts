// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { GET } from "@/app/api/admin/roles/route";

const ADMIN_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const NON_ADMIN_ADDRESS = "0x0000000000000000000000000000000000dEaD";

function request(cookie?: string) {
  return new NextRequest("http://localhost:3000/api/admin/roles", { headers: cookie ? { cookie } : {} });
}

describe("GET /api/admin/roles", () => {
  const originalAdminEnv = process.env.ADMIN_WALLET_ADDRESSES;

  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
    process.env.ADMIN_WALLET_ADDRESSES = ADMIN_ADDRESS;
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
    if (originalAdminEnv === undefined) delete process.env.ADMIN_WALLET_ADDRESSES;
    else process.env.ADMIN_WALLET_ADDRESSES = originalAdminEnv;
  });

  it("a real Guest gets a real 401", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
  });

  it("a real authenticated account without roles:manage gets a real 403", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
    const session = createSession(db, account.id);

    const response = await GET(request(`br_session=${session.id}`));
    expect(response.status).toBe(403);
  });

  it("a real, authorized admin gets a real 200 with the real accounts snapshot", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: "Rajkumar" });
    const session = createSession(db, admin.id);
    createAccountForAddress(db, NON_ADMIN_ADDRESS);

    const response = await GET(request(`br_session=${session.id}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.accounts).toHaveLength(2);
    expect(body.accounts.find((entry: { accountId: string }) => entry.accountId === admin.id).role).toBe("ADMIN");
  });

  it("no returned account record contains a session id or other authentication secret", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await GET(request(`br_session=${session.id}`));
    const raw = JSON.stringify(await response.json());
    expect(raw).not.toContain(session.id);
  });
});
