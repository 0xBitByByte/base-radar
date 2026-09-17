import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Bug 3 (Authentication Flow) — the Sign Out menu item here previously
 * called only `useAccount().signOut()` (a local, no-network reset of the
 * Account Layer's own profile store), never `useAuthSession().signOut()`
 * (the real, server-side session revocation behind `/api/auth/signout`).
 * Confirmed live: clicking it left a genuinely authenticated session
 * untouched — `/api/auth/session` kept reporting `authenticated` with the
 * same account afterward. This test exercises the real hooks/stores (only
 * `fetch` is mocked, the same boundary `tests/lib/auth/session.test.ts`
 * already draws), fresh per test via `vi.resetModules()` so each test gets
 * its own singleton `accountService`/`authSession` state, matching that
 * file's and `tests/lib/account/service.test.ts`'s own established pattern.
 */
async function freshAccountMenuModule() {
  vi.resetModules();
  const { AccountMenu } = await import("@/components/account/AccountMenu");
  return AccountMenu;
}

/** Seeds a real, signed-in-looking account into the same `base-radar:account` key `lib/account/storage.ts` reads on boot — the shape `Sign Out` is only ever rendered for now. */
function seedSignedInAccount() {
  window.localStorage.setItem(
    "base-radar:account",
    JSON.stringify({
      version: 1,
      account: {
        id: "acct-1",
        name: "Alex Rivera",
        username: "alexr",
        email: null,
        avatar: null,
        bio: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        lastActiveAt: "2026-01-01T00:00:00.000Z",
        isGuest: false,
      },
    })
  );
}

describe("AccountMenu — Sign Out", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ state: "guest" }), { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  /**
   * Bug fix (Guest + Sign Out) — a Guest has no real session to revoke;
   * `Sign Out` used to render unconditionally anyway, so clicking it as a
   * Guest called `/api/auth/signout` against a request with no session
   * cookie (a real, documented no-op) and silently reset the local
   * profile — a real action with no visible effect, which read as "Sign
   * Out doesn't work." This proves the item is now genuinely absent for a
   * Guest, matching `WalletAuthRow`'s (`ProfilePage.tsx`) own established
   * `auth.status === "authenticated"` gating.
   */
  it("does not render Sign Out for a Guest account — nothing to sign out of", async () => {
    const AccountMenu = await freshAccountMenuModule();
    const user = userEvent.setup();
    render(<AccountMenu />);

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    await screen.findByText("Guest account");
    expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
  });

  it("calls the real /api/auth/signout endpoint, not just the local account reset", async () => {
    seedSignedInAccount();
    const AccountMenu = await freshAccountMenuModule();
    const user = userEvent.setup();
    render(<AccountMenu />);

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    const signOutItem = await screen.findByText("Sign Out");
    await user.click(signOutItem);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/auth/signout", expect.objectContaining({ method: "POST" }));
    });
  });

  it("resets the local account profile to a fresh Guest record after signing out", async () => {
    seedSignedInAccount();
    const AccountMenu = await freshAccountMenuModule();
    const user = userEvent.setup();
    render(<AccountMenu />);

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    const signOutItem = await screen.findByText("Sign Out");
    await user.click(signOutItem);

    await waitFor(() => {
      const raw = window.localStorage.getItem("base-radar:account");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!) as { account: { isGuest: boolean; name: string } };
      expect(parsed.account.isGuest).toBe(true);
      expect(parsed.account.name).toBe("Guest User");
    });
  });
});
