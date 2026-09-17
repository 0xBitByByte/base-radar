import type { APIRequestContext } from "@playwright/test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

/**
 * PR-097.04 (Testing) — real SIWE sign-in for E2E specs, driving the exact
 * same two real routes (`/api/auth/challenge`, `/api/auth/verify`) this
 * app's own `tests/app/api/auth/verify/route.test.ts` already exercises at
 * the integration level (`issueAndSign()` there is the same shape as
 * `signIn()` below) — the safest existing mechanism to reuse rather than
 * inventing a second, parallel way to authenticate. Using Playwright's own
 * `APIRequestContext` (bound to the same browser context as the page under
 * test, not a bare `fetch`) means the real `httpOnly` session cookie a
 * successful `/verify` call sets lands in that context's real cookie jar —
 * a subsequent `page.goto()`/`page.reload()` genuinely sees the
 * authenticated session, exactly as a real browser would.
 *
 * No browser wallet extension is driven here — this app's own SIWE flow
 * only ever needs a message and a signature over it, and `viem/accounts`
 * produces both without a real wallet UI, the same shortcut the app's own
 * integration tests already take.
 */

export type TestWallet = ReturnType<typeof privateKeyToAccount>;

/** A fresh, random wallet — guaranteed not to match `ADMIN_WALLET_ADDRESSES`, for every flow that must NOT be an admin. */
export function randomTestWallet(): TestWallet {
  return privateKeyToAccount(generatePrivateKey());
}

/**
 * The one fixed test wallet `playwright.config.ts`'s `ADMIN_WALLET_ADDRESSES`
 * is set to — a throwaway key generated solely for this suite, carrying no
 * real value on any real chain. Fixed (not random) specifically so the
 * server-side admin allowlist can name it ahead of time.
 */
export const ADMIN_TEST_WALLET = privateKeyToAccount("0xa5ffa100352d04a494330b1da700e732c00a108ea67287eb7ef125dc724b05fc");

/**
 * A real browser always sends a `guestSnapshot` on first sign-in —
 * `lib/auth/guestSnapshot.ts`'s `collectGuestSnapshot()` returns one
 * unconditionally whenever the local account is still a Guest (true for
 * every fresh session), even with only default values, never `null` in
 * that case. Omitting it here would under-simulate a real sign-in: with
 * no snapshot, `/api/auth/verify` never calls `bootstrapAccountFromGuestSnapshot()`
 * (see `lib/backend/sqlite/bootstrap.ts`), so no `account` sync operation
 * is ever logged for the new account — the exact condition that left
 * `isGuest` stuck locally, confirmed by first writing this fixture without
 * a snapshot and watching the resulting E2E test fail for that reason.
 * This is what a genuinely fresh browser's own default Guest state looks
 * like — `lib/account/storage.ts`'s `buildGuestAccount()` /
 * `lib/personalization/preferences.ts`'s `DEFAULT_PERSONALIZATION_PREFERENCES`.
 */
const DEFAULT_GUEST_SNAPSHOT = {
  account: { name: "Guest User", username: "guest", email: null, avatar: null, bio: null },
  watchlists: [] as unknown[],
  preferences: {
    filterDashboardByActiveWatchlist: true,
    enableSearchPrioritization: true,
    rememberActiveWatchlist: true,
    showWatchlistSelectorInTopbar: true,
  },
};

/** Real challenge → real signature → real verify, in that order — the exact sequence `lib/auth/signIn.ts`'s `performSiweSignIn()` performs client-side, just driven directly over HTTP instead of through the React hook. */
export async function signIn(request: APIRequestContext, wallet: TestWallet): Promise<void> {
  const challengeResponse = await request.post("/api/auth/challenge", {
    data: { address: wallet.address },
  });
  if (!challengeResponse.ok()) {
    throw new Error(`Challenge request failed: ${challengeResponse.status()} ${await challengeResponse.text()}`);
  }
  const { message } = (await challengeResponse.json()) as { message: string };

  const signature = await wallet.signMessage({ message });

  const verifyResponse = await request.post("/api/auth/verify", {
    data: { message, signature, guestSnapshot: DEFAULT_GUEST_SNAPSHOT },
  });
  if (!verifyResponse.ok()) {
    throw new Error(`Verify request failed: ${verifyResponse.status()} ${await verifyResponse.text()}`);
  }
}

/** Real server-side session revocation — the same `/api/auth/signout` route Bug 3's fix wired `AccountMenu`'s Sign Out into. */
export async function signOutViaApi(request: APIRequestContext): Promise<void> {
  await request.post("/api/auth/signout");
}
