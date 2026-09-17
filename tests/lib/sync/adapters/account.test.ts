import { describe, expect, it } from "vitest";

import { accountSyncAdapter } from "@/lib/sync/adapters/account";
import type { Account } from "@/lib/account/types";

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acct-1",
    name: "Rin",
    username: "rin_dev",
    email: null,
    avatar: null,
    bio: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastActiveAt: "2026-01-01T00:00:00.000Z",
    isGuest: true,
    ...overrides,
  };
}

describe("accountSyncAdapter", () => {
  it("identifies itself as the account entity with a real version number", () => {
    expect(accountSyncAdapter.entity).toBe("account");
    expect(accountSyncAdapter.version()).toBe(1);
  });

  it("validate accepts a real, well-formed Account", () => {
    expect(accountSyncAdapter.validate(makeAccount())).toBe(true);
  });

  it("validate rejects a structurally malformed value", () => {
    expect(accountSyncAdapter.validate({ id: "acct-1" })).toBe(false);
    expect(accountSyncAdapter.validate(null)).toBe(false);
  });

  it("validate accepts a real bio as either a string or null, rejects any other type", () => {
    expect(accountSyncAdapter.validate(makeAccount({ bio: "Building on Base." }))).toBe(true);
    expect(accountSyncAdapter.validate(makeAccount({ bio: null }))).toBe(true);
    expect(accountSyncAdapter.validate({ ...makeAccount(), bio: 42 })).toBe(false);
  });

  it("serialize/deserialize round-trip a real Account exactly", () => {
    const account = makeAccount({ email: "rin@example.com" });
    const payload = accountSyncAdapter.serialize(account);
    expect(accountSyncAdapter.deserialize(payload)).toEqual(account);
  });

  it("deserialize throws on a payload that fails validation, never returns a malformed object", () => {
    expect(() => accountSyncAdapter.deserialize(JSON.stringify({ id: "acct-1" }))).toThrow(/failed validation/);
  });

  it("createOperation produces a real, correctly-typed SyncOperation with a serialized payload", () => {
    const account = makeAccount();
    const operation = accountSyncAdapter.createOperation("update", account.id, account);
    expect(operation.entity).toBe("account");
    expect(operation.type).toBe("update");
    expect(operation.entityId).toBe(account.id);
    expect(accountSyncAdapter.deserialize(operation.payload!)).toEqual(account);
  });

  it("merge picks whichever real version has the newer updatedAt", () => {
    const older = makeAccount({ updatedAt: "2026-01-01T00:00:00.000Z" });
    const newer = makeAccount({ updatedAt: "2026-02-01T00:00:00.000Z", name: "Newer Rin" });
    expect(accountSyncAdapter.merge(older, newer)).toEqual(newer);
    expect(accountSyncAdapter.merge(newer, older)).toEqual(newer);
  });

  it("merge treats an equal remote updatedAt as remote-wins (>=), not a tie kept local", () => {
    const local = makeAccount({ name: "Local" });
    const remote = makeAccount({ name: "Remote" });
    expect(accountSyncAdapter.merge(local, remote)).toEqual(remote);
  });
});
