// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { createDatabase } from "@/lib/backend/sqlite/db";
import { createSession, revokeSession, SESSION_TTL_MS, validateSession } from "@/lib/backend/sqlite/sessions";

function seedAccount(db: ReturnType<typeof createDatabase>) {
  return createAccountForAddress(db, "0x1234567890AbcdEF1234567890aBcdef12345678");
}

describe("createSession / validateSession / revokeSession", () => {
  it("creates a real session with a real future expiration tied to the real account", () => {
    const db = createDatabase(":memory:");
    const account = seedAccount(db);
    const session = createSession(db, account.id);

    expect(session.accountId).toBe(account.id);
    expect(new Date(session.expiresAt).getTime() - new Date(session.createdAt).getTime()).toBe(SESSION_TTL_MS);
    db.close();
  });

  it("a real, unexpired, unrevoked session validates as authenticated", () => {
    const db = createDatabase(":memory:");
    const account = seedAccount(db);
    const session = createSession(db, account.id);

    expect(validateSession(db, session.id)).toEqual({ state: "authenticated", accountId: account.id });
    db.close();
  });

  it("an unknown session id is invalid, never authenticated", () => {
    const db = createDatabase(":memory:");
    expect(validateSession(db, "not-a-real-session")).toEqual({ state: "invalid" });
    db.close();
  });

  it("a genuinely expired session reports expired, distinct from invalid", () => {
    const db = createDatabase(":memory:");
    const account = seedAccount(db);
    const session = createSession(db, account.id);
    db.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").run(new Date(Date.now() - 1000).toISOString(), session.id);

    expect(validateSession(db, session.id)).toEqual({ state: "expired" });
    db.close();
  });

  it("sign-out: revokeSession genuinely invalidates the session — even before its real expiry", () => {
    const db = createDatabase(":memory:");
    const account = seedAccount(db);
    const session = createSession(db, account.id);

    revokeSession(db, session.id);
    expect(validateSession(db, session.id)).toEqual({ state: "invalid" });
    db.close();
  });

  it("revoking an unknown or already-revoked session is a real, safe no-op", () => {
    const db = createDatabase(":memory:");
    const account = seedAccount(db);
    const session = createSession(db, account.id);

    revokeSession(db, session.id);
    expect(() => revokeSession(db, session.id)).not.toThrow();
    expect(() => revokeSession(db, "never-existed")).not.toThrow();
    db.close();
  });

  it("two sessions for the same account stay genuinely independent — revoking one never invalidates the other", () => {
    const db = createDatabase(":memory:");
    const account = seedAccount(db);
    const sessionA = createSession(db, account.id);
    const sessionB = createSession(db, account.id);

    revokeSession(db, sessionA.id);
    expect(validateSession(db, sessionA.id)).toEqual({ state: "invalid" });
    expect(validateSession(db, sessionB.id)).toEqual({ state: "authenticated", accountId: account.id });
    db.close();
  });
});
