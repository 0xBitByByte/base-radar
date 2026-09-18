import { expect, test } from "@playwright/test";

import { gotoAndWaitForAccountSync, randomTestWallet, signIn } from "./fixtures/auth";

/**
 * PR-097.04 (Testing) — Profile page smoke coverage: the page loads, the
 * real Identity form fields (`components/account/ProfilePage.tsx`'s
 * `IdentitySection`) accept input, and Sign Out from the account menu
 * (present in the Topbar on every page, including this one) correctly
 * resets this page's own displayed identity — not just the Dashboard's.
 *
 * Uses `page.request` for sign-in (not the bare `request` fixture) — see
 * `auth.spec.ts`'s own doc comment for why.
 */

test.describe("Profile", () => {
  test("loads with real Identity, Wallet, and Preferences sections", async ({ page }) => {
    const wallet = randomTestWallet();
    await signIn(page.request, wallet);

    await page.goto("/dashboard/profile");
    await expect(page.getByRole("heading", { name: "Identity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wallet" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
  });

  test("Identity fields (Display Name, Username) accept real input", async ({ page }) => {
    const wallet = randomTestWallet();
    await signIn(page.request, wallet);
    // Not a plain `page.goto` — the Identity form seeds its editable state
    // from `account.name` exactly once on mount, so interacting with it
    // before the real post-sign-in account sync resolves races a genuine
    // async chain (see `gotoAndWaitForAccountSync`'s own doc comment).
    await gotoAndWaitForAccountSync(page, "/dashboard/profile");

    const nameInput = page.locator("#account-name");
    const usernameInput = page.locator("#account-username");

    await nameInput.fill("E2E Test Name");
    await usernameInput.fill("e2e_test_user");

    await expect(nameInput).toHaveValue("E2E Test Name");
    await expect(usernameInput).toHaveValue("e2e_test_user");
  });

  test("Sign Out from the account menu resets the Profile page's own displayed identity", async ({ page }) => {
    const wallet = randomTestWallet();
    await signIn(page.request, wallet);
    await page.goto("/dashboard/profile");

    await page.getByLabel("Open account menu").click();
    await page.getByRole("menuitem", { name: "Sign Out" }).click();

    await page.getByLabel("Open account menu").click();
    await expect(page.getByText("Guest account", { exact: true })).toBeVisible();
  });

  test("no horizontal overflow at desktop or mobile", async ({ page }) => {
    const wallet = randomTestWallet();
    await signIn(page.request, wallet);

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard/profile");
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow, `horizontal overflow at ${viewport.width}x${viewport.height}`).toBe(false);
    }
  });
});
