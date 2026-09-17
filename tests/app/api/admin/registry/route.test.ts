// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { getProjects } from "@/data/projects/helpers";
import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { GET } from "@/app/api/admin/registry/route";

const ADMIN_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const NON_ADMIN_ADDRESS = "0x0000000000000000000000000000000000dEaD";

function getRequest(cookie?: string) {
  return new NextRequest("http://localhost:3000/api/admin/registry", { headers: cookie ? { cookie } : {} });
}

describe("GET /api/admin/registry", () => {
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

  it("a real Guest (no session) gets a real 401 — never any registry data", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.projects).toBeUndefined();
  });

  it("a real authenticated account NOT on the admin allowlist gets a real 403 — never any registry data", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
    const session = createSession(db, account.id);

    const response = await GET(getRequest(`br_session=${session.id}`));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.projects).toBeUndefined();
  });

  it("a real authenticated, allowlisted admin account gets the real registry snapshot", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await GET(getRequest(`br_session=${session.id}`));
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(Array.isArray(body.projects)).toBe(true);
    expect(body.projects.length).toBe(getProjects().length);
    expect(typeof body.metrics.discovered).toBe("number");
    expect(typeof body.validation.valid).toBe("boolean");
    expect(typeof body.coverage.averageCoveragePct).toBe("number");
  });

  it("an invalid/forged session cookie is rejected as unauthenticated, never treated as authorized", async () => {
    const response = await GET(getRequest("br_session=forged-session-id"));
    expect(response.status).toBe(401);
  });
});
