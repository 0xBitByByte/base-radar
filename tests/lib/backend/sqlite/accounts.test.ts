// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  createAccountForAddress,
  findAccountByAddress,
  getAccountById,
  getAddressForAccount,
  listAccounts,
  touchAccountLastActive,
} from "@/lib/backend/sqlite/accounts";
import { createDatabase } from "@/lib/backend/sqlite/db";

const ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

describe("createAccountForAddress / findAccountByAddress", () => {
  it("a fresh address has no account until one is created", () => {
    const db = createDatabase(":memory:");
    expect(findAccountByAddress(db, ADDRESS)).toBeNull();
    db.close();
  });

  it("creates a real, non-guest account row, findable by the same address afterward", () => {
    const db = createDatabase(":memory:");
    const created = createAccountForAddress(db, ADDRESS);
    expect(created.isGuest).toBe(false);

    const found = findAccountByAddress(db, ADDRESS);
    expect(found).toEqual(created);
    db.close();
  });

  it("findAccountByAddress is case-insensitive on the address, matching real checksummed/lowercase input alike", () => {
    const db = createDatabase(":memory:");
    createAccountForAddress(db, ADDRESS);
    expect(findAccountByAddress(db, ADDRESS.toUpperCase())).not.toBeNull();
    expect(findAccountByAddress(db, ADDRESS.toLowerCase())).not.toBeNull();
    db.close();
  });

  it("uses the requested profile name/username when provided and available", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS, { name: "Rin", username: "rin_dev" });
    expect(account.name).toBe("Rin");
    expect(account.username).toBe("rin_dev");
    db.close();
  });

  it("falls back to a real, address-derived name/username when none is requested", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    expect(account.name).toMatch(/^Wallet /);
    expect(account.username).toMatch(/^wallet_/);
    db.close();
  });

  it("a real username collision resolves to a genuinely available fallback, never a fabricated duplicate", () => {
    const db = createDatabase(":memory:");
    createAccountForAddress(db, ADDRESS, { username: "rin_dev" });

    const otherAddress = "0x0000000000000000000000000000000000dEaD";
    const second = createAccountForAddress(db, otherAddress, { username: "rin_dev" });
    expect(second.username).not.toBe("rin_dev");

    // Both real accounts genuinely exist, each with its own distinct username.
    expect(findAccountByAddress(db, ADDRESS)?.username).toBe("rin_dev");
    expect(findAccountByAddress(db, otherAddress)?.username).toBe(second.username);
    db.close();
  });

  it("email/avatar/bio default to real null, never an empty string standing in for absence", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    expect(account.email).toBeNull();
    expect(account.avatar).toBeNull();
    expect(account.bio).toBeNull();
    db.close();
  });

  it("uses the requested bio when provided, and it survives a real round trip through findAccountByAddress", () => {
    const db = createDatabase(":memory:");
    createAccountForAddress(db, ADDRESS, { bio: "Building on Base." });
    expect(findAccountByAddress(db, ADDRESS)?.bio).toBe("Building on Base.");
    db.close();
  });
});

describe("getAccountById / touchAccountLastActive", () => {
  it("getAccountById returns null for an unknown id", () => {
    const db = createDatabase(":memory:");
    expect(getAccountById(db, "not-a-real-id")).toBeNull();
    db.close();
  });

  it("touchAccountLastActive genuinely advances lastActiveAt", async () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    await new Promise((resolve) => setTimeout(resolve, 5));
    touchAccountLastActive(db, account.id);

    const updated = getAccountById(db, account.id)!;
    expect(new Date(updated.lastActiveAt).getTime()).toBeGreaterThan(new Date(account.lastActiveAt).getTime());
    db.close();
  });
});

describe("getAddressForAccount — PR-095.01", () => {
  it("returns the real, lowercased primary wallet address for a real account id", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, ADDRESS);
    expect(getAddressForAccount(db, account.id)).toBe(ADDRESS.toLowerCase());
    db.close();
  });

  it("returns null for an unknown account id — a genuine no-op, never a thrown error", () => {
    const db = createDatabase(":memory:");
    expect(getAddressForAccount(db, "not-a-real-id")).toBeNull();
    db.close();
  });
});

describe("listAccounts — PR-095.06", () => {
  it("returns an empty list when no real account has ever been created", () => {
    const db = createDatabase(":memory:");
    expect(listAccounts(db)).toEqual([]);
    db.close();
  });

  it("returns every real account, oldest first", () => {
    const db = createDatabase(":memory:");
    const first = createAccountForAddress(db, ADDRESS);
    const second = createAccountForAddress(db, "0x0000000000000000000000000000000000dEaD");

    const accounts = listAccounts(db);
    expect(accounts.map((account) => account.id)).toEqual([first.id, second.id]);
    db.close();
  });
});
