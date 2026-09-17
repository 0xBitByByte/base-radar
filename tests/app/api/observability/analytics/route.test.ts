// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { recordAnalyticsEvent } from "@/lib/backend/sqlite/analyticsEvents";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { GET } from "@/app/api/observability/analytics/route";

const ADMIN_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const NON_ADMIN_ADDRESS = "0x0000000000000000000000000000000000dEaD";

function getRequest(cookie?: string) {
  return new NextRequest("http://localhost:3000/api/observability/analytics", { headers: cookie ? { cookie } : {} });
}

describe("GET /api/observability/analytics", () => {
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

  it("a real Guest (no session) gets a real 401 — never any real analytics data", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.topPaths).toBeUndefined();
  });

  it("a real authenticated account NOT on the admin allowlist gets a real 403 — never any real analytics data", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
    const session = createSession(db, account.id);

    const response = await GET(getRequest(`br_session=${session.id}`));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.topPaths).toBeUndefined();
  });

  it("a real authenticated, allowlisted admin account gets the real, aggregated summary", async () => {
    const db = getDb();
    recordAnalyticsEvent(db, { eventName: "page_view", path: "/dashboard", recordedAt: "2026-09-11T00:00:00.000Z" });
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await GET(getRequest(`br_session=${session.id}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ totalPageViews: 1, topPaths: [{ path: "/dashboard", eventCount: 1 }] });
  });

  it("a real, honest empty result when no real page view has ever been recorded", async () => {
    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await GET(getRequest(`br_session=${session.id}`));
    const body = await response.json();
    expect(body).toEqual({ totalPageViews: 0, topPaths: [] });
  });

  it("an invalid/forged session cookie is rejected as unauthenticated, never treated as authorized", async () => {
    const response = await GET(getRequest("br_session=forged-session-id"));
    expect(response.status).toBe(401);
  });
});
