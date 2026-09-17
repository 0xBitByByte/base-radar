// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { GET } from "@/app/api/auth/session/route";

const ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

function requestWithCookie(cookie?: string) {
  return new NextRequest("http://localhost:3000/api/auth/session", {
    headers: cookie ? { cookie } : {},
  });
}

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("reports guest with no session cookie at all — the honest default", async () => {
    const response = await GET(requestWithCookie());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: "guest" });
  });

  it("reports authenticated with a real, valid session cookie, including the real account", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, ADDRESS);
    const session = createSession(db, account.id);

    const response = await GET(requestWithCookie(`br_session=${session.id}`));
    const body = await response.json();
    expect(body.state).toBe("authenticated");
    expect(body.account.id).toBe(account.id);
  });

  it("reports guest for an unknown/garbage session cookie, never authenticated", async () => {
    const response = await GET(requestWithCookie("br_session=not-a-real-session"));
    expect(await response.json()).toEqual({ state: "guest" });
  });

  it("reports expired (distinct from guest) for a real session past its real expiry, and clears the stale cookie", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, ADDRESS);
    const session = createSession(db, account.id);
    db.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").run(new Date(Date.now() - 1000).toISOString(), session.id);

    const response = await GET(requestWithCookie(`br_session=${session.id}`));
    expect(await response.json()).toEqual({ state: "expired" });
    expect(response.headers.get("set-cookie")).toContain("br_session=;");
  });

  it("never returns account data for a revoked session", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, ADDRESS);
    const session = createSession(db, account.id);
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").run(new Date().toISOString(), session.id);

    const response = await GET(requestWithCookie(`br_session=${session.id}`));
    const body = await response.json();
    expect(body.state).toBe("guest");
    expect(body.account).toBeUndefined();
  });
});
