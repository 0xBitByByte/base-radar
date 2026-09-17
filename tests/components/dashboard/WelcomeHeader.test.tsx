import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * Bug fix (Sign Out) — the Dashboard greeting used to read
 * `{getGreeting()}, RK`, a hardcoded literal never wired to any real
 * account/session state. The real sign-out flow (`/api/auth/signout`,
 * session revocation, cookie clearing) was confirmed live to already work
 * correctly; the hardcoded name simply never changed regardless of who
 * was signed in or out, which made a real, successful sign-out look like
 * it had failed. These tests prove the greeting now reads the real,
 * current account — via `useAccount()`, the same `useSyncExternalStore`
 * source `AccountMenu`/`AccountAvatar` already use — and updates
 * reactively when the account changes, the same fresh-module-per-test
 * pattern `tests/components/account/AccountMenu.test.tsx` already
 * established for this exact singleton store.
 */
async function freshWelcomeHeaderModule() {
  vi.resetModules();
  const { WelcomeHeader } = await import("@/components/dashboard/WelcomeHeader");
  return WelcomeHeader;
}

describe("WelcomeHeader — real account name, not a hardcoded literal", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("never renders the old hardcoded 'RK' literal", async () => {
    const WelcomeHeader = await freshWelcomeHeaderModule();
    render(<WelcomeHeader />);

    await waitFor(() => {
      expect(screen.queryByText(/, RK$/)).not.toBeInTheDocument();
    });
  });

  it("renders the real current account's name for a signed-in account", async () => {
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

    const WelcomeHeader = await freshWelcomeHeaderModule();
    render(<WelcomeHeader />);

    await waitFor(() => {
      expect(screen.getByText(/, Alex Rivera$/)).toBeInTheDocument();
    });
  });

  it("updates the displayed name reactively after a real sign-out, on the same store AccountMenu's Sign Out writes to", async () => {
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

    vi.resetModules();
    const { WelcomeHeader } = await import("@/components/dashboard/WelcomeHeader");
    const accountService = await import("@/lib/account/service");

    render(<WelcomeHeader />);
    await waitFor(() => {
      expect(screen.getByText(/, Alex Rivera$/)).toBeInTheDocument();
    });

    await accountService.signOut();

    await waitFor(() => {
      expect(screen.getByText(/, Guest User$/)).toBeInTheDocument();
    });
  });
});
