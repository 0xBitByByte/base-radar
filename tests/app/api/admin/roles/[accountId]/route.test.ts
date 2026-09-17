// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { listActivity } from "@/lib/backend/sqlite/activityLog";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { getAccountRole } from "@/lib/backend/sqlite/roles";
import { PATCH } from "@/app/api/admin/roles/[accountId]/route";

const ADMIN_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const NON_ADMIN_ADDRESS = "0x0000000000000000000000000000000000dEaD";
const OTHER_ADMIN_ADDRESS = "0x1111111111111111111111111111111111111a";

function patchRequest(accountId: string, body: unknown, cookie?: string, timeZone?: string) {
  return new NextRequest(`http://localhost:3000/api/admin/roles/${accountId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(timeZone ? { "x-client-timezone": timeZone } : {}),
    },
    body: JSON.stringify(body),
  });
}

function params(accountId: string) {
  return { params: Promise.resolve({ accountId }) };
}

describe("PATCH /api/admin/roles/[accountId]", () => {
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

  it("a real Guest gets a real 401 — never any real role persisted", async () => {
    const db = getDb();
    const target = createAccountForAddress(db, NON_ADMIN_ADDRESS);

    const response = await PATCH(patchRequest(target.id, { role: "ADMIN" }), params(target.id));
    expect(response.status).toBe(401);
    expect(getAccountRole(db, target.id)).toBeNull();
  });

  it("a real authenticated account without roles:manage gets a real 403 — never any real role persisted", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
    const session = createSession(db, account.id);
    const target = createAccountForAddress(db, OTHER_ADMIN_ADDRESS);

    const response = await PATCH(patchRequest(target.id, { role: "ADMIN" }, `br_session=${session.id}`), params(target.id));
    expect(response.status).toBe(403);
    expect(getAccountRole(db, target.id)).toBeNull();
  });

  it("a real, authorized admin genuinely changes another account's role", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: "Rajkumar" });
    const session = createSession(db, admin.id);
    const target = createAccountForAddress(db, NON_ADMIN_ADDRESS, { name: "John Doe" });

    const response = await PATCH(patchRequest(target.id, { role: "ADMIN" }, `br_session=${session.id}`), params(target.id));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.role).toBe("ADMIN");
    expect(body.snapshot.accounts.find((entry: { accountId: string }) => entry.accountId === target.id).role).toBe("ADMIN");
    expect(getAccountRole(db, target.id)?.role).toBe("ADMIN");
    expect(getAccountRole(db, target.id)?.updatedBy).toBe(admin.id);
  });

  it("an unknown role value gets a real 400, never persisted", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);
    const target = createAccountForAddress(db, NON_ADMIN_ADDRESS);

    const response = await PATCH(patchRequest(target.id, { role: "SUPER_ADMIN" }, `br_session=${session.id}`), params(target.id));
    expect(response.status).toBe(400);
    expect(getAccountRole(db, target.id)).toBeNull();
  });

  it("a malformed request body gets a real 400", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);
    const target = createAccountForAddress(db, NON_ADMIN_ADDRESS);

    const request = new NextRequest(`http://localhost:3000/api/admin/roles/${target.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: `br_session=${session.id}` },
      body: "{not valid json",
    });
    const response = await PATCH(request, params(target.id));
    expect(response.status).toBe(400);
  });

  it("SECURITY: an authorized admin can never change their own role via the API — real 400, never persisted", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await PATCH(patchRequest(admin.id, { role: "USER" }, `br_session=${session.id}`), params(admin.id));
    expect(response.status).toBe(400);
    expect(getAccountRole(db, admin.id)).toBeNull();
  });

  it("changing an unknown account id gets a real 404", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await PATCH(patchRequest("not-a-real-account-id", { role: "ADMIN" }, `br_session=${session.id}`), params("not-a-real-account-id"));
    expect(response.status).toBe(404);
  });

  it("SECURITY: a client-supplied accountId/updatedBy/userName in the body can never override the URL target or the session actor", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: "Rajkumar" });
    const session = createSession(db, admin.id);
    const target = createAccountForAddress(db, NON_ADMIN_ADDRESS, { name: "John Doe" });
    const decoy = createAccountForAddress(db, OTHER_ADMIN_ADDRESS, { name: "Decoy" });

    const maliciousBody = { role: "ADMIN", accountId: decoy.id, updatedBy: decoy.id, userName: "Someone Else" };
    const response = await PATCH(patchRequest(target.id, maliciousBody, `br_session=${session.id}`), params(target.id));

    expect(response.status).toBe(200);
    // The real URL path param decided the target, not the spoofed body field.
    expect(getAccountRole(db, target.id)?.role).toBe("ADMIN");
    expect(getAccountRole(db, decoy.id)).toBeNull();
    // The real session account decided the actor, not the spoofed updatedBy.
    expect(getAccountRole(db, target.id)?.updatedBy).toBe(admin.id);

    const [entry] = listActivity(db);
    expect(entry.accountId).toBe(admin.id);
    expect(entry.actorName).toBe("Rajkumar");
  });

  it("a direct API call from a non-admin session cannot bypass the permission system regardless of payload shape", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
    const session = createSession(db, account.id);
    const target = createAccountForAddress(db, OTHER_ADMIN_ADDRESS);

    const response = await PATCH(
      patchRequest(target.id, { role: "ADMIN", accountId: target.id }, `br_session=${session.id}`),
      params(target.id)
    );
    expect(response.status).toBe(403);
    expect(getAccountRole(db, target.id)).toBeNull();
  });

  describe("PR-095.06.04 — Activity Log integration", () => {
    it("a real successful role change creates exactly one real ROLE_CHANGE activity entry", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: "Rajkumar" });
      const session = createSession(db, admin.id);
      const target = createAccountForAddress(db, NON_ADMIN_ADDRESS, { name: "John Doe" });

      const response = await PATCH(
        patchRequest(target.id, { role: "ADMIN" }, `br_session=${session.id}`, "Asia/Kolkata"),
        params(target.id)
      );
      expect(response.status).toBe(200);

      const activity = listActivity(db);
      expect(activity).toHaveLength(1);
      expect(activity[0].action).toBe("ROLE_CHANGE");
      expect(activity[0].entityType).toBe("account");
      expect(activity[0].entityId).toBe(target.id);
      expect(activity[0].entityName).toBe("John Doe");
      expect(activity[0].accountId).toBe(admin.id);
      expect(activity[0].actorName).toBe("Rajkumar");
      expect(activity[0].timeZone).toBe("Asia/Kolkata");
      expect(activity[0].changes).toEqual([{ field: "role", before: "USER", after: "ADMIN" }]);
    });

    it("a rejected (invalid role) request never creates an activity record", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS);
      const session = createSession(db, admin.id);
      const target = createAccountForAddress(db, NON_ADMIN_ADDRESS);

      await PATCH(patchRequest(target.id, { role: "NOT_A_ROLE" }, `br_session=${session.id}`), params(target.id));
      expect(listActivity(db)).toEqual([]);
    });

    it("a rejected self-role-change request never creates an activity record", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS);
      const session = createSession(db, admin.id);

      await PATCH(patchRequest(admin.id, { role: "USER" }, `br_session=${session.id}`), params(admin.id));
      expect(listActivity(db)).toEqual([]);
    });

    it("an unauthorized (401/403) request never creates an activity record", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
      const session = createSession(db, account.id);
      const target = createAccountForAddress(db, OTHER_ADMIN_ADDRESS);

      await PATCH(patchRequest(target.id, { role: "ADMIN" }), params(target.id)); // guest, 401
      await PATCH(patchRequest(target.id, { role: "ADMIN" }, `br_session=${session.id}`), params(target.id)); // non-admin, 403

      expect(listActivity(db)).toEqual([]);
    });

    it("an unrecognized/malformed client-reported time zone honestly falls back to UTC", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS);
      const session = createSession(db, admin.id);
      const target = createAccountForAddress(db, NON_ADMIN_ADDRESS);

      await PATCH(patchRequest(target.id, { role: "ADMIN" }, `br_session=${session.id}`, "Not/A/Real/Zone"), params(target.id));
      expect(listActivity(db)[0].timeZone).toBe("UTC");
    });

    it("no activity record ever contains a session id, cookie value, or other authentication material", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS);
      const session = createSession(db, admin.id);
      const target = createAccountForAddress(db, NON_ADMIN_ADDRESS);

      await PATCH(patchRequest(target.id, { role: "ADMIN" }, `br_session=${session.id}`), params(target.id));
      const raw = JSON.stringify(listActivity(db));
      expect(raw).not.toContain(session.id);
    });
  });
});
