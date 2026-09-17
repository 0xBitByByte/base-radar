// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { changeAccountRole, getAdminRolesSnapshot } from "@/lib/admin/roles";
import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { listActivity } from "@/lib/backend/sqlite/activityLog";
import { createDatabase } from "@/lib/backend/sqlite/db";
import { getAccountRole } from "@/lib/backend/sqlite/roles";

const ADMIN_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const OTHER_ADDRESS = "0x0000000000000000000000000000000000dEaD";
const THIRD_ADDRESS = "0x1111111111111111111111111111111111111a";
const TIME_ZONE = "Asia/Kolkata";
const ACTOR_NAME = "Rajkumar";

describe("getAdminRolesSnapshot", () => {
  const originalEnv = process.env.ADMIN_WALLET_ADDRESSES;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ADMIN_WALLET_ADDRESSES;
    else process.env.ADMIN_WALLET_ADDRESSES = originalEnv;
  });

  it("returns an empty accounts list when no real account exists", () => {
    delete process.env.ADMIN_WALLET_ADDRESSES;
    const db = createDatabase(":memory:");
    expect(getAdminRolesSnapshot(db)).toEqual({ accounts: [] });
    db.close();
  });

  it("shows an allowlisted account as ADMIN with isBootstrapRole true when it has no real, explicit assignment", () => {
    process.env.ADMIN_WALLET_ADDRESSES = ADMIN_ADDRESS;
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADMIN_ADDRESS, { name: "Rajkumar" });

    const snapshot = getAdminRolesSnapshot(db);
    expect(snapshot.accounts).toHaveLength(1);
    expect(snapshot.accounts[0]).toMatchObject({ accountId: account.id, role: "ADMIN", isBootstrapRole: true });
    db.close();
  });

  it("shows a non-allowlisted account as USER with isBootstrapRole true", () => {
    delete process.env.ADMIN_WALLET_ADDRESSES;
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, OTHER_ADDRESS);

    const snapshot = getAdminRolesSnapshot(db);
    expect(snapshot.accounts[0]).toMatchObject({ accountId: account.id, role: "USER", isBootstrapRole: true });
    db.close();
  });

  it("a real, explicit assignment reports isBootstrapRole false and the real assigned role", () => {
    process.env.ADMIN_WALLET_ADDRESSES = ADMIN_ADDRESS;
    const db = createDatabase(":memory:");
    const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: ACTOR_NAME });
    const target = createAccountForAddress(db, OTHER_ADDRESS);

    changeAccountRole(db, admin.id, ACTOR_NAME, TIME_ZONE, target.id, "ADMIN");

    const snapshot = getAdminRolesSnapshot(db);
    const targetEntry = snapshot.accounts.find((entry) => entry.accountId === target.id)!;
    expect(targetEntry).toMatchObject({ role: "ADMIN", isBootstrapRole: false });
    db.close();
  });

  it("lists every real account, not just the ones with an explicit role", () => {
    delete process.env.ADMIN_WALLET_ADDRESSES;
    const db = createDatabase(":memory:");
    createAccountForAddress(db, ADMIN_ADDRESS);
    createAccountForAddress(db, OTHER_ADDRESS);
    createAccountForAddress(db, THIRD_ADDRESS);

    expect(getAdminRolesSnapshot(db).accounts).toHaveLength(3);
    db.close();
  });
});

describe("changeAccountRole", () => {
  const originalEnv = process.env.ADMIN_WALLET_ADDRESSES;
  beforeEach(() => {
    delete process.env.ADMIN_WALLET_ADDRESSES;
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ADMIN_WALLET_ADDRESSES;
    else process.env.ADMIN_WALLET_ADDRESSES = originalEnv;
  });

  it("a genuine role change persists and returns success with the new role", () => {
    const db = createDatabase(":memory:");
    const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: ACTOR_NAME });
    const target = createAccountForAddress(db, OTHER_ADDRESS, { name: "Target User" });

    const result = changeAccountRole(db, admin.id, ACTOR_NAME, TIME_ZONE, target.id, "ADMIN");
    expect(result).toEqual({ outcome: "success", role: "ADMIN" });
    expect(getAccountRole(db, target.id)?.role).toBe("ADMIN");
    expect(getAccountRole(db, target.id)?.updatedBy).toBe(admin.id);
    db.close();
  });

  it("rejects an unknown role string without persisting anything", () => {
    const db = createDatabase(":memory:");
    const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: ACTOR_NAME });
    const target = createAccountForAddress(db, OTHER_ADDRESS);

    const result = changeAccountRole(db, admin.id, ACTOR_NAME, TIME_ZONE, target.id, "SUPER_ADMIN");
    expect(result).toEqual({ outcome: "invalid-role" });
    expect(getAccountRole(db, target.id)).toBeNull();
    db.close();
  });

  it("rejects a malformed/non-string role payload", () => {
    const db = createDatabase(":memory:");
    const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: ACTOR_NAME });
    const target = createAccountForAddress(db, OTHER_ADDRESS);

    const result = changeAccountRole(db, admin.id, ACTOR_NAME, TIME_ZONE, target.id, { role: "ADMIN" });
    expect(result).toEqual({ outcome: "invalid-role" });
    expect(getAccountRole(db, target.id)).toBeNull();
    db.close();
  });

  it("SECURITY: an actor can never change their own role, even a real ADMIN targeting themself", () => {
    const db = createDatabase(":memory:");
    const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: ACTOR_NAME });

    const result = changeAccountRole(db, admin.id, ACTOR_NAME, TIME_ZONE, admin.id, "USER");
    expect(result).toEqual({ outcome: "cannot-change-own-role" });
    expect(getAccountRole(db, admin.id)).toBeNull(); // no override was ever persisted
    db.close();
  });

  it("targeting an unknown account is a real, honest not-found", () => {
    const db = createDatabase(":memory:");
    const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: ACTOR_NAME });

    const result = changeAccountRole(db, admin.id, ACTOR_NAME, TIME_ZONE, "not-a-real-account-id", "ADMIN");
    expect(result).toEqual({ outcome: "not-found" });
    db.close();
  });

  it("setting a role to its current effective value is a genuine no-op — succeeds but persists nothing new and logs nothing", () => {
    const db = createDatabase(":memory:");
    const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: ACTOR_NAME });
    const target = createAccountForAddress(db, OTHER_ADDRESS); // effective role is already USER (no allowlist, no override)

    const result = changeAccountRole(db, admin.id, ACTOR_NAME, TIME_ZONE, target.id, "USER");
    expect(result).toEqual({ outcome: "no-change", role: "USER" });
    expect(getAccountRole(db, target.id)).toBeNull(); // still no explicit row written
    expect(listActivity(db)).toEqual([]);
    db.close();
  });

  describe("PR-095.06.04 — Activity Log integration", () => {
    it("a real, successful role change records exactly one ROLE_CHANGE entry with real actor/target/before/after values", () => {
      const db = createDatabase(":memory:");
      const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: "Rajkumar" });
      const target = createAccountForAddress(db, OTHER_ADDRESS, { name: "John Doe" });

      changeAccountRole(db, admin.id, "Rajkumar", TIME_ZONE, target.id, "ADMIN");

      const activity = listActivity(db);
      expect(activity).toHaveLength(1);
      const entry = activity[0];
      expect(entry.action).toBe("ROLE_CHANGE");
      expect(entry.entityType).toBe("account");
      expect(entry.entityId).toBe(target.id);
      expect(entry.entityName).toBe("John Doe");
      expect(entry.accountId).toBe(admin.id);
      expect(entry.actorName).toBe("Rajkumar");
      expect(entry.timeZone).toBe(TIME_ZONE);
      expect(entry.changes).toEqual([{ field: "role", before: "USER", after: "ADMIN" }]);
      expect(Number.isNaN(Date.parse(entry.createdAt))).toBe(false);
      db.close();
    });

    it("an invalid-role rejection never creates an activity entry", () => {
      const db = createDatabase(":memory:");
      const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: ACTOR_NAME });
      const target = createAccountForAddress(db, OTHER_ADDRESS);

      changeAccountRole(db, admin.id, ACTOR_NAME, TIME_ZONE, target.id, "NOT_A_ROLE");
      expect(listActivity(db)).toEqual([]);
      db.close();
    });

    it("a self-role-change rejection never creates an activity entry", () => {
      const db = createDatabase(":memory:");
      const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: ACTOR_NAME });

      changeAccountRole(db, admin.id, ACTOR_NAME, TIME_ZONE, admin.id, "USER");
      expect(listActivity(db)).toEqual([]);
      db.close();
    });

    it("a not-found rejection never creates an activity entry", () => {
      const db = createDatabase(":memory:");
      const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: ACTOR_NAME });

      changeAccountRole(db, admin.id, ACTOR_NAME, TIME_ZONE, "not-a-real-account-id", "ADMIN");
      expect(listActivity(db)).toEqual([]);
      db.close();
    });

    it("no activity record ever contains a session id or other authentication secret", () => {
      const db = createDatabase(":memory:");
      const admin = createAccountForAddress(db, ADMIN_ADDRESS, { name: ACTOR_NAME });
      const target = createAccountForAddress(db, OTHER_ADDRESS);

      changeAccountRole(db, admin.id, ACTOR_NAME, TIME_ZONE, target.id, "ADMIN");
      const raw = JSON.stringify(listActivity(db));
      expect(raw).not.toMatch(/session/i);
      expect(raw).not.toMatch(/cookie/i);
      db.close();
    });
  });
});
