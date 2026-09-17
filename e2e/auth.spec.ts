import { expect, test } from "@playwright/test";

import { ADMIN_TEST_WALLET, randomTestWallet, signIn, signOutViaApi } from "./fixtures/auth";

/**
 * PR-097.04 (Testing) — critical-path E2E coverage for the real
 * authentication flow Bug 3 fixed this session: User Login, Admin Login,
 * and Sign Out (both the real server session and the local account
 * profile). Only flows this app genuinely supports today are covered —
 * there is no separate "Admin Login" mechanism (see `lib/admin/
 * authorization.ts`'s own doc comment), so "Admin Login" here is the same
 * real SIWE sign-in as any user, just with an allowlisted wallet address.
 *
 * Every sign-in/sign-out call uses `page.request`, not the bare `request`
 * fixture — confirmed live while writing this suite that the two are
 * separate `APIRequestContext`s with separate cookie jars in this
 * Playwright version, so a session cookie set via the bare `request`
 * fixture is invisible to `page.goto()` afterward. `page.request` shares
 * the same browser context `page` navigates with, so the cookie a real
 * sign-in sets is the one the page actually sees.
 */

test.describe("Authentication", () => {
  test("logged-out state: /api/auth/session reports guest, admin routes require sign-in", async ({ page }) => {
    const sessionRes = await page.request.get("/api/auth/session");
    expect(sessionRes.ok()).toBe(true);
    expect((await sessionRes.json()).state).toBe("guest");

    const adminRes = await page.request.get("/api/admin/overview");
    expect(adminRes.status()).toBe(401);

    await page.goto("/dashboard");
    await expect(page.getByLabel("Open account menu")).toBeVisible();
  });

  test("real User Login reaches an authenticated session and the account menu reflects it, not Guest", async ({ page }) => {
    const wallet = randomTestWallet();
    await signIn(page.request, wallet);

    const sessionRes = await page.request.get("/api/auth/session");
    const session = await sessionRes.json();
    expect(session.state).toBe("authenticated");
    expect(session.account.isGuest).toBe(false);

    await page.goto("/dashboard");
    await page.getByLabel("Open account menu").click();
    // Bug 3's real fix — a genuinely authenticated account must never still
    // show "Guest account" here (the `isGuest` sync bug that made a working
    // login look broken).
    await expect(page.getByText("Guest account", { exact: true })).not.toBeVisible();
  });

  test("Sign Out from the account menu revokes the real session, resets local state, and blocks protected routes", async ({ page }) => {
    const wallet = randomTestWallet();
    await signIn(page.request, wallet);
    await page.goto("/dashboard");

    await page.getByLabel("Open account menu").click();
    await page.getByRole("menuitem", { name: "Sign Out" }).click();

    // The real, server-verified state — not just a UI label change.
    await expect(async () => {
      const sessionRes = await page.request.get("/api/auth/session");
      expect((await sessionRes.json()).state).toBe("guest");
    }).toPass({ timeout: 5_000 });

    const adminRes = await page.request.get("/api/admin/overview");
    expect(adminRes.status()).toBe(401);

    await page.getByLabel("Open account menu").click();
    await expect(page.getByText("Guest account", { exact: true })).toBeVisible();
  });

  test("real Admin Login (allowlisted wallet) reaches the Admin Dashboard with real data", async ({ page }) => {
    await signIn(page.request, ADMIN_TEST_WALLET);

    const adminRes = await page.request.get("/api/admin/overview");
    expect(adminRes.ok()).toBe(true);
    expect((await adminRes.json()).metrics).toBeTruthy();

    await page.goto("/dashboard/admin");
    await expect(page.getByText("Administration Overview")).toBeVisible();

    await signOutViaApi(page.request);
  });

  test("an authenticated non-admin wallet is blocked from Admin routes (403, not 401)", async ({ page }) => {
    const wallet = randomTestWallet();
    await signIn(page.request, wallet);

    const adminRes = await page.request.get("/api/admin/overview");
    // 403 (signed in, not authorized) — never 401 (would mean the server
    // stopped believing this is even a real session) and never 200.
    expect(adminRes.status()).toBe(403);

    await page.goto("/dashboard/admin");
    await expect(page.getByText("Access restricted")).toBeVisible();
  });
});
