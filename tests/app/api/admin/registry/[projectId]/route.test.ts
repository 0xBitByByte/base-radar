// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { getProject } from "@/data/projects/helpers";
import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { listActivity } from "@/lib/backend/sqlite/activityLog";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { getProjectEdit } from "@/lib/backend/sqlite/projectEdits";
import { DELETE, PATCH } from "@/app/api/admin/registry/[projectId]/route";

const ADMIN_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const NON_ADMIN_ADDRESS = "0x0000000000000000000000000000000000dEaD";
const AERODROME_ID = "aerodrome-finance";

function patchRequest(projectId: string, body: unknown, cookie?: string, timeZone?: string) {
  return new NextRequest(`http://localhost:3000/api/admin/registry/${projectId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(timeZone ? { "x-client-timezone": timeZone } : {}),
    },
    body: JSON.stringify(body),
  });
}

function deleteRequest(projectId: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000/api/admin/registry/${projectId}`, {
    method: "DELETE",
    headers: cookie ? { cookie } : {},
  });
}

function params(projectId: string) {
  return { params: Promise.resolve({ projectId }) };
}

describe("PATCH /api/admin/registry/[projectId]", () => {
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

  it("a real Guest gets a real 401 — never any real edit persisted", async () => {
    const response = await PATCH(patchRequest(AERODROME_ID, { name: "x" }), params(AERODROME_ID));
    expect(response.status).toBe(401);
    expect(getProjectEdit(getDb(), AERODROME_ID)).toBeNull();
  });

  it("a real authenticated account NOT on the admin allowlist gets a real 403 — never any real edit persisted", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
    const session = createSession(db, account.id);

    const forbiddenResponse = await PATCH(patchRequest(AERODROME_ID, { name: "x" }, `br_session=${session.id}`), params(AERODROME_ID));
    expect(forbiddenResponse.status).toBe(403);
    expect(getProjectEdit(db, AERODROME_ID)).toBeNull();
  });

  it("a real authenticated, allowlisted admin genuinely persists a valid edit, updated_by is the real session account id", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await PATCH(patchRequest(AERODROME_ID, { name: "Aerodrome Finance (edited)" }, `br_session=${session.id}`), params(AERODROME_ID));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.project.name).toBe("Aerodrome Finance (edited)");

    const edit = getProjectEdit(db, AERODROME_ID);
    expect(edit?.updatedBy).toBe(admin.id);
  });

  it("updated_by can never be spoofed by the request body — the server-derived session account always wins", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    // A malicious/naive client tries to claim a different updatedBy/accountId in the body — the route never reads these fields for identity.
    const response = await PATCH(
      patchRequest(AERODROME_ID, { name: "Edited", updatedBy: "someone-else", accountId: "someone-else" }, `br_session=${session.id}`),
      params(AERODROME_ID)
    );
    // "updatedBy"/"accountId" aren't real editable Project fields, so this is correctly rejected as a whole — proving the route never silently honors a client-claimed identity field either.
    expect(response.status).toBe(400);
    expect(getProjectEdit(db, AERODROME_ID)).toBeNull();
  });

  it("id/slug edits are rejected with a real 400, never persisted", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await PATCH(patchRequest(AERODROME_ID, { id: "hijacked" }, `br_session=${session.id}`), params(AERODROME_ID));
    expect(response.status).toBe(400);
    expect(getProjectEdit(db, AERODROME_ID)).toBeNull();
  });

  it("computed-field edits (verificationLevel) are rejected with a real 400, never persisted", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await PATCH(
      patchRequest(AERODROME_ID, { verificationLevel: { level: "verified" } }, `br_session=${session.id}`),
      params(AERODROME_ID)
    );
    expect(response.status).toBe(400);
    expect(getProjectEdit(db, AERODROME_ID)).toBeNull();
  });

  it("an edit that would make the registry genuinely invalid is rejected with a real 422, never persisted", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);
    const duplicateAddress = getProject(AERODROME_ID)!.contracts[0].address;

    const response = await PATCH(
      patchRequest("uniswap", { contracts: [{ chain: "base", address: duplicateAddress, type: "token" }] }, `br_session=${session.id}`),
      params("uniswap")
    );
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.validationErrors.length).toBeGreaterThan(0);
    expect(getProjectEdit(db, "uniswap")).toBeNull();
  });

  it("editing an unknown project id gets a real 404", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await PATCH(patchRequest("not-a-real-project", { name: "x" }, `br_session=${session.id}`), params("not-a-real-project"));
    expect(response.status).toBe(404);
  });

  it("a malformed request body gets a real 400", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const request = new NextRequest(`http://localhost:3000/api/admin/registry/${AERODROME_ID}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: `br_session=${session.id}` },
      body: "{not valid json",
    });
    const response = await PATCH(request, params(AERODROME_ID));
    expect(response.status).toBe(400);
  });

  describe("PR-095.05 — Activity Log integration", () => {
    it("a real successful edit creates exactly one real activity entry, with the real authenticated admin's own name — never a client-supplied one", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: "Rajkumar" });
      const session = createSession(db, admin.id);

      const response = await PATCH(
        patchRequest(AERODROME_ID, { name: "Aerodrome Finance (edited)" }, `br_session=${session.id}`, "Asia/Kolkata"),
        params(AERODROME_ID)
      );
      expect(response.status).toBe(200);

      const activity = listActivity(db);
      expect(activity).toHaveLength(1);
      expect(activity[0].action).toBe("EDIT");
      expect(activity[0].entityId).toBe(AERODROME_ID);
      expect(activity[0].accountId).toBe(admin.id);
      expect(activity[0].actorName).toBe("Rajkumar");
      expect(activity[0].timeZone).toBe("Asia/Kolkata");
      expect(activity[0].changes).toEqual([{ field: "name", before: "Aerodrome Finance", after: "Aerodrome Finance (edited)" }]);
    });

    it("SECURITY: a malicious payload claiming updatedBy/userName/accountId can never change the identity recorded in the Activity Log", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: "Rajkumar" });
      const session = createSession(db, admin.id);

      const maliciousBody = { name: "Edited", updatedBy: "another-user", userName: "Another User", accountId: "another-account" };
      const response = await PATCH(patchRequest(AERODROME_ID, maliciousBody, `br_session=${session.id}`), params(AERODROME_ID));

      // The spoofing fields aren't real editable Project fields, so the whole request is honestly rejected —
      // proving the route never even reaches a point where it could be tricked into using them for identity.
      expect(response.status).toBe(400);
      expect(listActivity(db)).toEqual([]);
    });

    it("an invalid (validation-failed) edit never creates a false successful activity record", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS);
      const session = createSession(db, admin.id);
      const duplicateAddress = getProject(AERODROME_ID)!.contracts[0].address;

      await PATCH(
        patchRequest("uniswap", { contracts: [{ chain: "base", address: duplicateAddress, type: "token" }] }, `br_session=${session.id}`),
        params("uniswap")
      );
      expect(listActivity(db)).toEqual([]);
    });

    it("an unauthorized (401/403) request never creates an activity record", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
      const session = createSession(db, account.id);

      await PATCH(patchRequest(AERODROME_ID, { name: "x" }), params(AERODROME_ID)); // guest, 401
      await PATCH(patchRequest(AERODROME_ID, { name: "x" }, `br_session=${session.id}`), params(AERODROME_ID)); // non-admin, 403

      expect(listActivity(db)).toEqual([]);
    });

    it("an unrecognized/malformed client-reported time zone honestly falls back to UTC rather than persisting a bad value", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS);
      const session = createSession(db, admin.id);

      await PATCH(patchRequest(AERODROME_ID, { name: "Edited" }, `br_session=${session.id}`, "Not/A/Real/Zone"), params(AERODROME_ID));
      expect(listActivity(db)[0].timeZone).toBe("UTC");
    });

    it("no activity record ever contains a session id, cookie value, or other authentication material", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS);
      const session = createSession(db, admin.id);

      await PATCH(patchRequest(AERODROME_ID, { name: "Edited" }, `br_session=${session.id}`), params(AERODROME_ID));
      const raw = JSON.stringify(listActivity(db));
      expect(raw).not.toContain(session.id);
    });
  });
});

describe("DELETE /api/admin/registry/[projectId] (revert)", () => {
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
    const response = await DELETE(deleteRequest(AERODROME_ID), params(AERODROME_ID));
    expect(response.status).toBe(401);
  });

  it("a real authenticated non-admin gets a real 403", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
    const session = createSession(db, account.id);

    const response = await DELETE(deleteRequest(AERODROME_ID, `br_session=${session.id}`), params(AERODROME_ID));
    expect(response.status).toBe(403);
  });

  it("reverting a real edit genuinely removes it and restores the real seed value", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    await PATCH(patchRequest(AERODROME_ID, { name: "Temporarily renamed" }, `br_session=${session.id}`), params(AERODROME_ID));
    expect(getProjectEdit(db, AERODROME_ID)).not.toBeNull();

    const response = await DELETE(deleteRequest(AERODROME_ID, `br_session=${session.id}`), params(AERODROME_ID));
    expect(response.status).toBe(200);
    expect(getProjectEdit(db, AERODROME_ID)).toBeNull();

    const body = await response.json();
    const restored = body.snapshot.projects.find((project: { id: string }) => project.id === AERODROME_ID);
    expect(restored.name).toBe(getProject(AERODROME_ID)!.name);
  });

  it("reverting an unknown project id gets a real 404", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await DELETE(deleteRequest("not-a-real-project", `br_session=${session.id}`), params("not-a-real-project"));
    expect(response.status).toBe(404);
  });

  describe("PR-095.05 — Activity Log integration", () => {
    it("a real revert creates a real REVERT activity entry with the real authenticated admin's own name", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: "Rajkumar" });
      const session = createSession(db, admin.id);

      await PATCH(patchRequest(AERODROME_ID, { name: "Temporarily renamed" }, `br_session=${session.id}`), params(AERODROME_ID));
      const deleteRequestWithTz = new NextRequest(`http://localhost:3000/api/admin/registry/${AERODROME_ID}`, {
        method: "DELETE",
        headers: { cookie: `br_session=${session.id}`, "x-client-timezone": "Asia/Kolkata" },
      });
      const response = await DELETE(deleteRequestWithTz, params(AERODROME_ID));
      expect(response.status).toBe(200);

      const activity = listActivity(db);
      expect(activity).toHaveLength(2); // the edit + the revert
      expect(activity[0].action).toBe("REVERT");
      expect(activity[0].actorName).toBe("Rajkumar");
      expect(activity[0].timeZone).toBe("Asia/Kolkata");
    });

    it("reverting a project with no real edit on file never creates a fabricated activity entry", async () => {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS);
      const session = createSession(db, admin.id);

      await DELETE(deleteRequest(AERODROME_ID, `br_session=${session.id}`), params(AERODROME_ID));
      expect(listActivity(db)).toEqual([]);
    });

    it("an unauthorized revert never creates an activity record", async () => {
      const db = getDb();
      const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
      const session = createSession(db, account.id);

      await DELETE(deleteRequest(AERODROME_ID), params(AERODROME_ID)); // guest
      await DELETE(deleteRequest(AERODROME_ID, `br_session=${session.id}`), params(AERODROME_ID)); // non-admin

      expect(listActivity(db)).toEqual([]);
    });
  });
});
