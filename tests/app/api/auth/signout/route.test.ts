// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession, validateSession } from "@/lib/backend/sqlite/sessions";
import { POST } from "@/app/api/auth/signout/route";

const ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

function requestWithCookie(cookie?: string) {
  return new NextRequest("http://localhost:3000/api/auth/signout", { method: "POST", headers: cookie ? { cookie } : {} });
}

describe("POST /api/auth/signout", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("genuinely revokes a real session — a later validateSession call for the same id fails", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, ADDRESS);
    const session = createSession(db, account.id);

    const response = await POST(requestWithCookie(`br_session=${session.id}`));
    expect(response.status).toBe(200);
    expect(validateSession(db, session.id)).toEqual({ state: "invalid" });
  });

  it("clears the session cookie in the response", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, ADDRESS);
    const session = createSession(db, account.id);

    const response = await POST(requestWithCookie(`br_session=${session.id}`));
    expect(response.headers.get("set-cookie")).toContain("br_session=;");
  });

  it("is a real, safe no-op with no session cookie at all", async () => {
    const response = await POST(requestWithCookie());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: "guest" });
  });

  it("is a real, safe no-op for an already-invalid session id", async () => {
    const response = await POST(requestWithCookie("br_session=not-a-real-session"));
    expect(response.status).toBe(200);
  });
});
