// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { recordActivity } from "@/lib/backend/sqlite/activityLog";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { GET } from "@/app/api/admin/activity/route";

const ADMIN_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const NON_ADMIN_ADDRESS = "0x0000000000000000000000000000000000dEaD";

function getRequest(cookie?: string) {
  return new NextRequest("http://localhost:3000/api/admin/activity", { headers: cookie ? { cookie } : {} });
}

describe("GET /api/admin/activity", () => {
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

  it("a real Guest gets a real 401 — never any real activity data", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.activity).toBeUndefined();
  });

  it("a real authenticated non-admin gets a real 403 — never any real activity data", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
    const session = createSession(db, account.id);

    const response = await GET(getRequest(`br_session=${session.id}`));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.activity).toBeUndefined();
  });

  it("a real authenticated admin retrieves the real, persisted activity records", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: "Rajkumar" });
    const session = createSession(db, admin.id);

    recordActivity(db, {
      accountId: admin.id,
      actorName: "Rajkumar",
      action: "EDIT",
      entityType: "project",
      entityId: "aerodrome-finance",
      entityName: "Aerodrome Finance",
      description: "Rajkumar edited Aerodrome Finance — name",
      changes: [{ field: "name", before: "Aerodrome", after: "Aerodrome Finance" }],
      createdAt: new Date().toISOString(),
      timeZone: "Asia/Kolkata",
    });

    const response = await GET(getRequest(`br_session=${session.id}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.activity).toHaveLength(1);
    expect(body.activity[0].actorName).toBe("Rajkumar");
    expect(body.activity[0].action).toBe("EDIT");
  });

  it("a real, honest empty result when no admin action has ever been performed", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await GET(getRequest(`br_session=${session.id}`));
    const body = await response.json();
    expect(body.activity).toEqual([]);
  });
});
