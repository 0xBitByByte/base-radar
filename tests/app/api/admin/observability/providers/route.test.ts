// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { __resetProviderTelemetryForTests, recordProviderCall } from "@/lib/providers/common/telemetry";
import { GET } from "@/app/api/admin/observability/providers/route";

/**
 * PR-110 — mirrors `tests/app/api/admin/overview/route.test.ts`'s own
 * auth-gating pattern exactly (same `resolveAdminAccess` boundary, same
 * guarantee: a Guest or non-admin account never receives real data, not
 * even inside an error payload). The new behavior this file actually
 * covers is the telemetry payload shape and its safety properties.
 */
const ADMIN_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const NON_ADMIN_ADDRESS = "0x0000000000000000000000000000000000dEaD";

function getRequest(cookie?: string) {
  return new NextRequest("http://localhost:3000/api/admin/observability/providers", { headers: cookie ? { cookie } : {} });
}

describe("GET /api/admin/observability/providers", () => {
  const originalAdminEnv = process.env.ADMIN_WALLET_ADDRESSES;

  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
    process.env.ADMIN_WALLET_ADDRESSES = ADMIN_ADDRESS;
    __resetProviderTelemetryForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
    if (originalAdminEnv === undefined) delete process.env.ADMIN_WALLET_ADDRESSES;
    else process.env.ADMIN_WALLET_ADDRESSES = originalAdminEnv;
    __resetProviderTelemetryForTests();
  });

  it("a real Guest (no session) gets a real 401 — never any telemetry data", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.providers).toBeUndefined();
    expect(body.github).toBeUndefined();
  });

  it("a real authenticated account NOT on the admin allowlist gets a real 403 — never any telemetry data", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
    const session = createSession(db, account.id);

    const response = await GET(getRequest(`br_session=${session.id}`));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.providers).toBeUndefined();
  });

  it("a real authenticated, allowlisted admin gets the real process-local snapshot for all 7 providers", async () => {
    recordProviderCall({ provider: "github", durationMs: 120, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });

    const db = getDb();
    const admin = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, admin.id);

    const response = await GET(getRequest(`br_session=${session.id}`));
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.scope).toBe("process-local");
    expect(typeof body.note).toBe("string");
    expect(body.providers).toHaveLength(7);
    const github = body.providers.find((p: { provider: string }) => p.provider === "github");
    expect(github.calls).toBe(1);
    expect(github.outcomes.success).toBe(1);
  });

  it("never leaks a secret/token/authorization value in the response, even when GITHUB_TOKEN is configured", async () => {
    const original = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = "ghp_fakeTestTokenShouldNeverAppearInResponse";
    try {
      const db = getDb();
      const admin = createAccountForAddress(db, ADMIN_ADDRESS);
      const session = createSession(db, admin.id);

      const response = await GET(getRequest(`br_session=${session.id}`));
      const rawBody = await response.text();

      expect(rawBody).not.toContain("ghp_fakeTestTokenShouldNeverAppearInResponse");
      expect(rawBody).not.toMatch(/authorization/i);
      expect(rawBody).not.toMatch(/bearer/i);
    } finally {
      if (original === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = original;
    }
  });

  it("an invalid/forged session cookie is rejected as unauthenticated, never treated as authorized", async () => {
    const response = await GET(getRequest("br_session=forged-session-id"));
    expect(response.status).toBe(401);
  });
});
