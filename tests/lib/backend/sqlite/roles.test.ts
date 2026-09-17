// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { createDatabase } from "@/lib/backend/sqlite/db";
import { getAccountRole, listAccountRoles, setAccountRole } from "@/lib/backend/sqlite/roles";

const ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

describe("getAccountRole", () => {
  it("returns null when an account has no real, persisted role override on file", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    expect(getAccountRole(db, account.id)).toBeNull();
    db.close();
  });
});

describe("setAccountRole", () => {
  it("persists a real role assignment, readable back afterward", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const actor = createAccountForAddress(db, "0x0000000000000000000000000000000000dEaD");

    const record = setAccountRole(db, account.id, "ADMIN", actor.id);
    expect(record.role).toBe("ADMIN");
    expect(record.updatedBy).toBe(actor.id);

    const stored = getAccountRole(db, account.id)!;
    expect(stored.role).toBe("ADMIN");
    expect(stored.accountId).toBe(account.id);
    expect(stored.updatedBy).toBe(actor.id);
    expect(Number.isNaN(Date.parse(stored.updatedAt))).toBe(false);
    db.close();
  });

  it("is a genuine atomic upsert — a second call updates the same row rather than creating a duplicate", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    const firstActor = createAccountForAddress(db, "0x0000000000000000000000000000000000dEaD");
    const secondActor = createAccountForAddress(db, "0x1111111111111111111111111111111111111a");

    setAccountRole(db, account.id, "ADMIN", firstActor.id);
    setAccountRole(db, account.id, "USER", secondActor.id);

    expect(listAccountRoles(db)).toHaveLength(1);
    const stored = getAccountRole(db, account.id)!;
    expect(stored.role).toBe("USER");
    expect(stored.updatedBy).toBe(secondActor.id);
    db.close();
  });
});

describe("listAccountRoles", () => {
  it("returns an empty list when no role has ever been assigned", () => {
    const db = createDatabase(":memory:");
    expect(listAccountRoles(db)).toEqual([]);
    db.close();
  });

  it("returns every real, persisted role assignment", () => {
    const db = createDatabase(":memory:");
    const first = createAccountForAddress(db, ADDRESS);
    const second = createAccountForAddress(db, "0x0000000000000000000000000000000000dEaD");
    setAccountRole(db, first.id, "ADMIN", first.id);
    setAccountRole(db, second.id, "USER", first.id);

    const records = listAccountRoles(db);
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.accountId).sort()).toEqual([first.id, second.id].sort());
    db.close();
  });

  it("a genuinely corrupted role value is recovered as absent rather than trusted", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    // setAccountRole itself can never write an invalid role — this simulates
    // a corrupted row directly, the same "fail closed on malformed data"
    // scenario every other storage layer in this codebase already handles.
    db.prepare(
      `INSERT INTO account_roles (account_id, role, updated_at, updated_by) VALUES (?, ?, ?, ?)`
    ).run(account.id, "SUPER_ADMIN", new Date().toISOString(), account.id);

    expect(getAccountRole(db, account.id)).toBeNull();
    expect(listAccountRoles(db)).toEqual([]);
    db.close();
  });
});
