import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ACCOUNT_KEY = "base-radar:account";

/** Same "simulated browser refresh" technique established across this app's other module-singleton stores — resets `lib/account/storage.ts`'s module scope while leaving real jsdom `localStorage` untouched. */
async function freshStorageModule() {
  vi.resetModules();
  return import("@/lib/account/storage");
}

describe("Account storage", () => {
  beforeEach(() => {
    window.localStorage.removeItem(ACCOUNT_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(ACCOUNT_KEY);
  });

  describe("buildGuestAccount", () => {
    it("builds a real, honest Guest account — never a fabricated non-guest default", async () => {
      const { buildGuestAccount } = await freshStorageModule();
      const account = buildGuestAccount();
      expect(account.isGuest).toBe(true);
      expect(account.name).toBe("Guest User");
      expect(account.username).toBe("guest");
      expect(account.email).toBeNull();
      expect(account.avatar).toBeNull();
    });

    it("generates a real, unique id and real, current timestamps every call", async () => {
      const { buildGuestAccount } = await freshStorageModule();
      const a = buildGuestAccount();
      const b = buildGuestAccount();
      expect(a.id).not.toBe(b.id);
      expect(Date.parse(a.createdAt)).not.toBeNaN();
      expect(a.createdAt).toBe(a.updatedAt);
      expect(a.createdAt).toBe(a.lastActiveAt);
    });
  });

  describe("readAccount", () => {
    it("returns a fresh Guest account when nothing is persisted", async () => {
      const { readAccount } = await freshStorageModule();
      const account = readAccount();
      expect(account.isGuest).toBe(true);
    });

    it("round-trips a real written account exactly", async () => {
      const { readAccount, writeAccount, buildGuestAccount } = await freshStorageModule();
      const account = { ...buildGuestAccount(), name: "Rin", username: "rin_dev", isGuest: false };
      writeAccount(account);
      expect(readAccount()).toEqual(account);
    });

    it("a corrupted stored value falls back to the honest Guest default rather than throwing", async () => {
      window.localStorage.setItem(ACCOUNT_KEY, "{not valid json");
      const { readAccount } = await freshStorageModule();
      expect(() => readAccount()).not.toThrow();
      expect(readAccount().isGuest).toBe(true);
    });

    it("field-by-field recovery: one corrupted field never discards the whole record", async () => {
      const { readAccount, buildGuestAccount } = await freshStorageModule();
      const good = { ...buildGuestAccount(), name: "Rin", username: "rin_dev" };
      window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ version: 1, account: { ...good, createdAt: "not-a-real-date" } }));
      const recovered = readAccount();
      // The corrupted field falls back to the fresh-guest default's value, but every other real field survives.
      expect(recovered.name).toBe("Rin");
      expect(recovered.username).toBe("rin_dev");
      expect(Date.parse(recovered.createdAt)).not.toBeNaN();
    });

    it("an unrecognized/missing version still recovers real fields via sanitize", async () => {
      window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ version: 999, account: { name: "Rin", username: "rin_dev" } }));
      const { readAccount } = await freshStorageModule();
      const account = readAccount();
      expect(account.name).toBe("Rin");
      expect(account.username).toBe("rin_dev");
    });
  });

  describe("writeAccount", () => {
    it("persists real data that a later read recovers", async () => {
      const { writeAccount, readAccount, buildGuestAccount } = await freshStorageModule();
      const account = { ...buildGuestAccount(), name: "Persisted Name" };
      writeAccount(account);
      const raw = window.localStorage.getItem(ACCOUNT_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).account.name).toBe("Persisted Name");
      expect(readAccount().name).toBe("Persisted Name");
    });

    it("a storage failure (quota/private-browsing) is swallowed, never thrown", async () => {
      const { writeAccount, buildGuestAccount } = await freshStorageModule();
      const setItemSpy = vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      expect(() => writeAccount(buildGuestAccount())).not.toThrow();
      setItemSpy.mockRestore();
    });
  });
});
