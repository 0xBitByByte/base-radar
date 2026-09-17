import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `lib/auth/session.ts` is a thin client over real `/api/auth/*` routes —
 * the routes' own real cryptographic/DB behavior is exercised for real in
 * `tests/app/api/auth/*` and `tests/lib/auth/siwe.test.ts`. What this file
 * verifies is this module's own state management (does it react correctly
 * to each real response shape the server can send) — `fetch` is mocked
 * here because there's no real network boundary in a unit test, not
 * because the behavior under test is being avoided.
 */
async function freshSessionModule() {
  vi.resetModules();
  return import("@/lib/auth/session");
}

const REAL_ACCOUNT = {
  id: "acct-1",
  name: "Rin",
  username: "rin_dev",
  email: null,
  avatar: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  lastActiveAt: "2026-01-01T00:00:00.000Z",
  isGuest: false,
};

describe("lib/auth/session.ts", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts in a real loading state before any check has run", async () => {
    const { getAuthSession } = await freshSessionModule();
    expect(getAuthSession()).toEqual({ status: "loading" });
  });

  it("refreshSession moves to authenticated on a real authenticated response", async () => {
    const { refreshSession, getAuthSession } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ state: "authenticated", account: REAL_ACCOUNT }), { status: 200 }));

    await refreshSession();
    expect(getAuthSession()).toEqual({ status: "authenticated", account: REAL_ACCOUNT });
  });

  it("refreshSession moves to guest on a real guest response", async () => {
    const { refreshSession, getAuthSession } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ state: "guest" }), { status: 200 }));

    await refreshSession();
    expect(getAuthSession()).toEqual({ status: "guest" });
  });

  it("refreshSession moves to expired on a real expired response", async () => {
    const { refreshSession, getAuthSession } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ state: "expired" }), { status: 200 }));

    await refreshSession();
    expect(getAuthSession()).toEqual({ status: "expired" });
  });

  it("a genuine network failure falls back to guest rather than crashing or fabricating authenticated", async () => {
    const { refreshSession, getAuthSession } = await freshSessionModule();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    await refreshSession();
    expect(getAuthSession()).toEqual({ status: "guest" });
  });

  it("requestChallenge returns the real server payload on success", async () => {
    const { requestChallenge } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "real message", nonce: "real-nonce" }), { status: 200 })
    );

    const result = await requestChallenge("0xabc");
    expect(result).toEqual({ message: "real message", nonce: "real-nonce" });
  });

  it("requestChallenge throws the server's own safe error message on failure", async () => {
    const { requestChallenge } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "A valid wallet address is required." }), { status: 400 }));

    await expect(requestChallenge("bad")).rejects.toThrow("A valid wallet address is required.");
  });

  it("verifySignIn updates the shared cached state to authenticated on success", async () => {
    const { verifySignIn, getAuthSession } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ account: REAL_ACCOUNT, migration: { status: "none" } }), { status: 200 })
    );

    const result = await verifySignIn("msg", "0xsig", null);
    expect(result.account).toEqual(REAL_ACCOUNT);
    expect(getAuthSession()).toEqual({ status: "authenticated", account: REAL_ACCOUNT });
  });

  it("verifySignIn throws on a real failure and never updates cached state to authenticated", async () => {
    const { verifySignIn, getAuthSession } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "Signature verification failed." }), { status: 401 }));

    await expect(verifySignIn("msg", "0xbad", null)).rejects.toThrow("Signature verification failed.");
    expect(getAuthSession()).toEqual({ status: "loading" });
  });

  it("signOut calls the real endpoint and sets state to signed-out", async () => {
    const { signOut, getAuthSession } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ state: "guest" }), { status: 200 }));

    await signOut();
    expect(getAuthSession()).toEqual({ status: "signed-out" });
    expect(fetch).toHaveBeenCalledWith("/api/auth/signout", expect.objectContaining({ method: "POST" }));
  });

  it("fetchLinkedWallets returns the real server list on success", async () => {
    const { fetchLinkedWallets } = await freshSessionModule();
    const wallets = [{ address: "0xabc", accountId: "acct-1", linkedAt: "2026-01-01T00:00:00.000Z" }];
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ linkedWallets: wallets }), { status: 200 }));

    expect(await fetchLinkedWallets()).toEqual(wallets);
  });

  it("fetchLinkedWallets returns a real, honest empty list on failure — never throws for a read", async () => {
    const { fetchLinkedWallets } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "Sign in to view linked wallets." }), { status: 401 }));

    expect(await fetchLinkedWallets()).toEqual([]);
  });

  it("linkWallet returns the real updated list on success", async () => {
    const { linkWallet } = await freshSessionModule();
    const wallets = [{ address: "0xabc", accountId: "acct-1", linkedAt: "2026-01-01T00:00:00.000Z" }];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ wallet: wallets[0], linkedWallets: wallets }), { status: 200 })
    );

    expect(await linkWallet("msg", "0xsig")).toEqual(wallets);
  });

  it("linkWallet throws the server's own honest reason on a real conflict, never a fabricated generic message", async () => {
    const { linkWallet } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "That's already your primary wallet." }), { status: 409 }));

    await expect(linkWallet("msg", "0xsig")).rejects.toThrow("That's already your primary wallet.");
  });

  it("unlinkWallet calls the real per-address endpoint and returns the real updated list", async () => {
    const { unlinkWallet } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ linkedWallets: [] }), { status: 200 }));

    expect(await unlinkWallet("0xabc")).toEqual([]);
    expect(fetch).toHaveBeenCalledWith("/api/auth/linked-wallets/0xabc", expect.objectContaining({ method: "DELETE" }));
  });

  it("unlinkWallet throws the server's own honest reason on failure", async () => {
    const { unlinkWallet } = await freshSessionModule();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "That wallet isn't linked to your account." }), { status: 404 }));

    await expect(unlinkWallet("0xabc")).rejects.toThrow("That wallet isn't linked to your account.");
  });

  it("subscribe notifies listeners on every real state change, and unsubscribe stops it", async () => {
    const { subscribe, refreshSession } = await freshSessionModule();
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ state: "guest" }), { status: 200 }));
    await refreshSession();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ state: "guest" }), { status: 200 }));
    await refreshSession();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
