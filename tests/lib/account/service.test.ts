import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ACCOUNT_KEY = "base-radar:account";
const SYNC_KEYS = ["base-radar:sync-queue", "base-radar:sync-conflicts", "base-radar:sync-status"];

function clearAllStorage() {
  window.localStorage.removeItem(ACCOUNT_KEY);
  for (const key of SYNC_KEYS) window.localStorage.removeItem(key);
}

async function freshServiceModule() {
  vi.resetModules();
  return import("@/lib/account/service");
}

describe("Account service", () => {
  beforeEach(clearAllStorage);
  afterEach(clearAllStorage);

  it("getAccount starts as a real Guest on first load", async () => {
    const { getAccount } = await freshServiceModule();
    expect(getAccount().isGuest).toBe(true);
  });

  describe("validateProfileInput", () => {
    it("flags a genuinely empty name and username", async () => {
      const { validateProfileInput } = await freshServiceModule();
      const errors = validateProfileInput({ name: "  ", username: "  ", email: "", avatar: "", bio: "" }, "id1");
      expect(errors).toContain("empty-name");
      expect(errors).toContain("empty-username");
    });

    it("flags a real invalid username shape (too short, or bad characters)", async () => {
      const { validateProfileInput } = await freshServiceModule();
      expect(validateProfileInput({ name: "Rin", username: "ab", email: "", avatar: "", bio: "" }, "id1")).toContain("invalid-username");
      expect(validateProfileInput({ name: "Rin", username: "has space", email: "", avatar: "", bio: "" }, "id1")).toContain("invalid-username");
    });

    it("accepts a real valid username", async () => {
      const { validateProfileInput } = await freshServiceModule();
      expect(validateProfileInput({ name: "Rin", username: "rin_dev1", email: "", avatar: "", bio: "" }, "id1")).not.toContain("invalid-username");
    });

    it("email is optional — an empty email is never flagged", async () => {
      const { validateProfileInput } = await freshServiceModule();
      expect(validateProfileInput({ name: "Rin", username: "rin_dev", email: "", avatar: "", bio: "" }, "id1")).toEqual([]);
    });

    it("flags a real malformed email, accepts a real valid one", async () => {
      const { validateProfileInput } = await freshServiceModule();
      expect(validateProfileInput({ name: "Rin", username: "rin_dev", email: "not-an-email", avatar: "", bio: "" }, "id1")).toContain("invalid-email");
      expect(validateProfileInput({ name: "Rin", username: "rin_dev", email: "rin@example.com", avatar: "", bio: "" }, "id1")).not.toContain("invalid-email");
    });

    it("reports every real error found at once, never just the first", async () => {
      const { validateProfileInput } = await freshServiceModule();
      const errors = validateProfileInput({ name: "", username: "x", email: "bad", avatar: "", bio: "" }, "id1");
      expect(errors).toContain("empty-name");
      expect(errors).toContain("invalid-username");
      expect(errors).toContain("invalid-email");
    });

    it("duplicate-username never fires today — there is only ever one real local account (a genuine, not-yet-triggerable seam for a future multi-account backend)", async () => {
      const { validateProfileInput } = await freshServiceModule();
      expect(validateProfileInput({ name: "Rin", username: "guest", email: "", avatar: "", bio: "" }, "id1")).not.toContain("duplicate-username");
    });

    it("bio is optional — an empty bio is never flagged", async () => {
      const { validateProfileInput } = await freshServiceModule();
      expect(validateProfileInput({ name: "Rin", username: "rin_dev", email: "", avatar: "", bio: "" }, "id1")).toEqual([]);
    });

    it("flags a bio over the real character cap, accepts one at or under it", async () => {
      const { validateProfileInput } = await freshServiceModule();
      const tooLong = "a".repeat(161);
      const atCap = "a".repeat(160);
      expect(validateProfileInput({ name: "Rin", username: "rin_dev", email: "", avatar: "", bio: tooLong }, "id1")).toContain("bio-too-long");
      expect(validateProfileInput({ name: "Rin", username: "rin_dev", email: "", avatar: "", bio: atCap }, "id1")).not.toContain("bio-too-long");
    });
  });

  describe("updateAccount", () => {
    it("applies a real patch and persists it, notifying subscribers", async () => {
      const { updateAccount, getAccount, subscribe } = await freshServiceModule();
      const listener = vi.fn();
      subscribe(listener);
      await updateAccount({ name: "Rin", username: "rin_dev" });
      expect(getAccount().name).toBe("Rin");
      expect(getAccount().username).toBe("rin_dev");
      expect(listener).toHaveBeenCalled();
    });

    it("updatedAt reflects the real moment of the edit", async () => {
      const { updateAccount, getAccount } = await freshServiceModule();
      const before = getAccount().updatedAt;
      await new Promise((r) => setTimeout(r, 5));
      await updateAccount({ name: "Rin" });
      expect(getAccount().updatedAt).not.toBe(before);
    });

    it("without a real authAccountId, nothing is enqueued for Cloud Sync — preserves existing Guest-only behavior exactly", async () => {
      const { updateAccount } = await freshServiceModule();
      const { getPendingOperations } = await import("@/lib/sync/service");
      await updateAccount({ name: "Rin" });
      expect(getPendingOperations()).toEqual([]);
    });

    it("PR-093.06 — with a real authAccountId, enqueues a real account Sync operation and attempts an immediate sync", async () => {
      const { updateAccount, getAccount } = await freshServiceModule();
      const { getPendingOperations } = await import("@/lib/sync/service");
      await updateAccount({ name: "Rin", bio: "Building on Base." }, "real-auth-account-id");

      // performSync() runs against the default LocalConnector here (no
      // backend activated in this unit test), which honestly errors —
      // the operation is still real and queued either way.
      const queued = getPendingOperations();
      expect(queued).toHaveLength(1);
      expect(queued[0].entity).toBe("account");
      expect(queued[0].entityId).toBe("real-auth-account-id");
      const payload = JSON.parse(queued[0].payload!);
      expect(payload.name).toBe("Rin");
      expect(payload.bio).toBe("Building on Base.");
      expect(payload.id).toBe(getAccount().id); // the real local account snapshot, not a fabricated one
    });

    it("persists across a simulated refresh", async () => {
      const first = await freshServiceModule();
      await first.updateAccount({ name: "Rin", username: "rin_dev" });
      const second = await freshServiceModule();
      expect(second.getAccount().name).toBe("Rin");
    });

    it("applies a real bio patch, and clearing it back to Guest defaults leaves it null on sign-out", async () => {
      const { updateAccount, getAccount, signOut } = await freshServiceModule();
      await updateAccount({ bio: "Building on Base." });
      expect(getAccount().bio).toBe("Building on Base.");
      await signOut();
      expect(getAccount().bio).toBeNull();
    });
  });

  describe("createAccount", () => {
    it("replaces the Guest record with a real, non-guest local profile — no server call", async () => {
      const { createAccount, getAccount } = await freshServiceModule();
      await createAccount({ name: "Rin", username: "rin_dev", email: "rin@example.com" });
      const account = getAccount();
      expect(account.isGuest).toBe(false);
      expect(account.name).toBe("Rin");
      expect(account.email).toBe("rin@example.com");
    });

    it("an empty email becomes a real null, never an empty string", async () => {
      const { createAccount, getAccount } = await freshServiceModule();
      await createAccount({ name: "Rin", username: "rin_dev", email: "  " });
      expect(getAccount().email).toBeNull();
    });
  });

  describe("signOut", () => {
    it("returns to a fresh Guest account with a genuinely new id, never reusing the old one", async () => {
      const { createAccount, signOut, getAccount } = await freshServiceModule();
      await createAccount({ name: "Rin", username: "rin_dev", email: "" });
      const signedInId = getAccount().id;
      await signOut();
      const account = getAccount();
      expect(account.isGuest).toBe(true);
      expect(account.id).not.toBe(signedInId);
      expect(account.name).toBe("Guest User");
    });

    it("never touches Personalization/Watchlist/preferences storage", async () => {
      window.localStorage.setItem("base-radar:personalization", "untouched-sentinel");
      const { signOut } = await freshServiceModule();
      await signOut();
      expect(window.localStorage.getItem("base-radar:personalization")).toBe("untouched-sentinel");
      window.localStorage.removeItem("base-radar:personalization");
    });
  });

  describe("deleteAccount", () => {
    it("today behaves identically to signOut — a fresh Guest, since nothing server-side exists to actually delete", async () => {
      const { createAccount, deleteAccount, getAccount } = await freshServiceModule();
      await createAccount({ name: "Rin", username: "rin_dev", email: "" });
      await deleteAccount();
      expect(getAccount().isGuest).toBe(true);
    });
  });

  describe("exportAccount", () => {
    it("serializes the real current account as valid, real JSON — no network call", async () => {
      const { createAccount, exportAccount } = await freshServiceModule();
      await createAccount({ name: "Rin", username: "rin_dev", email: "" });
      const exported = JSON.parse(exportAccount());
      expect(exported.account.name).toBe("Rin");
      expect(exported.version).toBe(1);
      expect(typeof exported.exportedAt).toBe("string");
    });
  });

  describe("subscribe", () => {
    it("unsubscribing stops further notifications", async () => {
      const { updateAccount, subscribe } = await freshServiceModule();
      const listener = vi.fn();
      const unsubscribe = subscribe(listener);
      await updateAccount({ name: "First" });
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      await updateAccount({ name: "Second" });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("applyRemoteAccountFields (PR-093.06 — Ongoing Cloud Sync)", () => {
    it("applies a real pulled remote state directly, notifying subscribers", async () => {
      const { applyRemoteAccountFields, getAccount, subscribe } = await freshServiceModule();
      const listener = vi.fn();
      subscribe(listener);

      applyRemoteAccountFields({ name: "Cloud Name", username: "cloud_user", email: null, avatar: null, bio: "From the cloud." });
      expect(getAccount().name).toBe("Cloud Name");
      expect(getAccount().username).toBe("cloud_user");
      expect(getAccount().bio).toBe("From the cloud.");
      expect(listener).toHaveBeenCalled();
    });

    it("never enqueues a Sync operation — applying a pull must never re-trigger a push of the same state back", async () => {
      const { applyRemoteAccountFields } = await freshServiceModule();
      const { getPendingOperations } = await import("@/lib/sync/service");

      applyRemoteAccountFields({ name: "Cloud Name", username: "cloud_user", email: null, avatar: null, bio: null });
      expect(getPendingOperations()).toEqual([]);
    });

    it("Bug 3 (Authentication Flow) — normalizes isGuest to false: a fresh (guest) local account is only ever pulled into once a real, authenticated session exists, so receiving remote fields at all must clear the stale Guest flag", async () => {
      const { applyRemoteAccountFields, getAccount } = await freshServiceModule();

      expect(getAccount().isGuest).toBe(true);
      applyRemoteAccountFields({ name: "Wallet d756…de96", username: "wallet_d7562f", email: null, avatar: null, bio: null });
      expect(getAccount().isGuest).toBe(false);
    });
  });
});
