// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { setAccountRole } from "@/lib/backend/sqlite/roles";
import { isAdminAddress, resolveAdminAccess, resolveAdminPermission, resolveEffectiveRole } from "@/lib/admin/authorization";

const ADMIN_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const NON_ADMIN_ADDRESS = "0x0000000000000000000000000000000000dEaD";

function request(cookie?: string) {
  return new NextRequest("http://localhost:3000/dashboard/admin", { headers: cookie ? { cookie } : {} });
}

describe("isAdminAddress", () => {
  const originalEnv = process.env.ADMIN_WALLET_ADDRESSES;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ADMIN_WALLET_ADDRESSES;
    else process.env.ADMIN_WALLET_ADDRESSES = originalEnv;
  });

  it("an unset allowlist is a real, honest default-deny — nobody is an admin", () => {
    delete process.env.ADMIN_WALLET_ADDRESSES;
    expect(isAdminAddress(ADMIN_ADDRESS)).toBe(false);
  });

  it("an empty-string allowlist is also a default-deny", () => {
    process.env.ADMIN_WALLET_ADDRESSES = "";
    expect(isAdminAddress(ADMIN_ADDRESS)).toBe(false);
  });

  it("matches a real configured address, case-insensitively", () => {
    process.env.ADMIN_WALLET_ADDRESSES = ADMIN_ADDRESS.toLowerCase();
    expect(isAdminAddress(ADMIN_ADDRESS.toUpperCase())).toBe(true);
    expect(isAdminAddress(ADMIN_ADDRESS.toLowerCase())).toBe(true);
  });

  it("supports a real comma-separated list, trimming whitespace around each entry", () => {
    process.env.ADMIN_WALLET_ADDRESSES = ` ${ADMIN_ADDRESS} , ${NON_ADMIN_ADDRESS} `;
    expect(isAdminAddress(ADMIN_ADDRESS)).toBe(true);
    expect(isAdminAddress(NON_ADMIN_ADDRESS)).toBe(true);
  });

  it("rejects an address genuinely not on the allowlist", () => {
    process.env.ADMIN_WALLET_ADDRESSES = ADMIN_ADDRESS;
    expect(isAdminAddress(NON_ADMIN_ADDRESS)).toBe(false);
  });
});

describe("resolveAdminAccess", () => {
  const originalEnv = process.env.ADMIN_WALLET_ADDRESSES;

  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
    process.env.ADMIN_WALLET_ADDRESSES = ADMIN_ADDRESS;
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
    if (originalEnv === undefined) delete process.env.ADMIN_WALLET_ADDRESSES;
    else process.env.ADMIN_WALLET_ADDRESSES = originalEnv;
  });

  it("a real Guest (no session cookie at all) is unauthenticated — never forbidden, never authorized", () => {
    const result = resolveAdminAccess(request());
    expect(result.state).toBe("unauthenticated");
  });

  it("a signed-in account NOT on the allowlist is forbidden, never authorized", () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
    const session = createSession(db, account.id);

    const result = resolveAdminAccess(request(`br_session=${session.id}`));
    expect(result.state).toBe("forbidden");
  });

  it("a signed-in account ON the allowlist is authorized, with the real account attached", () => {
    const db = getDb();
    const account = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, account.id);

    const result = resolveAdminAccess(request(`br_session=${session.id}`));
    expect(result.state).toBe("authorized");
    if (result.state === "authorized") {
      expect(result.account.id).toBe(account.id);
    }
  });

  it("never trusts a client-supplied identity — an invalid/unknown session cookie is unauthenticated, not authorized", () => {
    const result = resolveAdminAccess(request("br_session=not-a-real-session-id"));
    expect(result.state).toBe("unauthenticated");
  });

  it("PR-095.06: a real, persisted USER role override wins over an allowlisted address — the role model is authoritative once a real assignment exists", () => {
    const db = getDb();
    const account = createAccountForAddress(db, ADMIN_ADDRESS); // on the allowlist
    const session = createSession(db, account.id);
    setAccountRole(db, account.id, "USER", account.id); // but explicitly demoted

    const result = resolveAdminAccess(request(`br_session=${session.id}`));
    expect(result.state).toBe("forbidden");
  });

  it("PR-095.06: a real, persisted ADMIN role override grants access even for an address NOT on the allowlist", () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS); // not on the allowlist
    const session = createSession(db, account.id);
    setAccountRole(db, account.id, "ADMIN", account.id);

    const result = resolveAdminAccess(request(`br_session=${session.id}`));
    expect(result.state).toBe("authorized");
  });
});

describe("resolveEffectiveRole", () => {
  const originalEnv = process.env.ADMIN_WALLET_ADDRESSES;
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
    process.env.ADMIN_WALLET_ADDRESSES = ADMIN_ADDRESS;
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
    if (originalEnv === undefined) delete process.env.ADMIN_WALLET_ADDRESSES;
    else process.env.ADMIN_WALLET_ADDRESSES = originalEnv;
  });

  it("falls back to the real allowlist when no persisted role exists", () => {
    const db = getDb();
    expect(resolveEffectiveRole(db, "acct-1", ADMIN_ADDRESS)).toBe("ADMIN");
    expect(resolveEffectiveRole(db, "acct-2", NON_ADMIN_ADDRESS)).toBe("USER");
  });

  it("a null address (no real primary address on file) is never treated as an admin", () => {
    const db = getDb();
    expect(resolveEffectiveRole(db, "acct-1", null)).toBe("USER");
  });

  it("a real persisted role always wins over the allowlist fallback", () => {
    const db = getDb();
    const account = createAccountForAddress(db, ADMIN_ADDRESS);
    setAccountRole(db, account.id, "USER", account.id);
    expect(resolveEffectiveRole(db, account.id, ADMIN_ADDRESS)).toBe("USER");
  });
});

describe("resolveAdminPermission", () => {
  const originalEnv = process.env.ADMIN_WALLET_ADDRESSES;
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
    process.env.ADMIN_WALLET_ADDRESSES = ADMIN_ADDRESS;
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
    if (originalEnv === undefined) delete process.env.ADMIN_WALLET_ADDRESSES;
    else process.env.ADMIN_WALLET_ADDRESSES = originalEnv;
  });

  it("a real Guest is unauthenticated for any real permission", () => {
    const result = resolveAdminPermission(request(), "roles:manage");
    expect(result.state).toBe("unauthenticated");
  });

  it("a USER (real, persisted) is forbidden for a real ADMIN-only permission", () => {
    const db = getDb();
    const account = createAccountForAddress(db, NON_ADMIN_ADDRESS);
    const session = createSession(db, account.id);

    const result = resolveAdminPermission(request(`br_session=${session.id}`), "roles:manage");
    expect(result.state).toBe("forbidden");
  });

  it("a real ADMIN is authorized for every real permission, with the real role attached", () => {
    const db = getDb();
    const account = createAccountForAddress(db, ADMIN_ADDRESS);
    const session = createSession(db, account.id);

    const result = resolveAdminPermission(request(`br_session=${session.id}`), "roles:manage");
    expect(result.state).toBe("authorized");
    if (result.state === "authorized") expect(result.role).toBe("ADMIN");
  });

  it("a demoted (real, persisted USER) account loses a permission it previously had via the allowlist — the role model is authoritative", () => {
    const db = getDb();
    const account = createAccountForAddress(db, ADMIN_ADDRESS); // on the allowlist
    const session = createSession(db, account.id);
    setAccountRole(db, account.id, "USER", account.id);

    const result = resolveAdminPermission(request(`br_session=${session.id}`), "registry:view");
    expect(result.state).toBe("forbidden");
  });
});
