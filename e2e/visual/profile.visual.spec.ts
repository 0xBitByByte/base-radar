import { expect, test } from "@playwright/test";

import { randomTestWallet, signIn } from "../fixtures/auth";
import { waitForSplashGone } from "../fixtures/splash";

/**
 * PR-097.04 (Testing) — visual regression baseline for the Profile page.
 * A freshly-signed-in test account has no live market data of its own on
 * this page (guest-style defaults: no wallet connected, no watchlist
 * activity), so only the shared, always-present `LiveStatusBar` ticker
 * needs masking — see `dashboard.visual.spec.ts` for why. Uses
 * `page.request` for sign-in — see `auth.spec.ts`'s own doc comment.
 */

test.describe("Profile visual regression", () => {
  test("desktop (1920x1080)", async ({ page }) => {
    const wallet = randomTestWallet();
    await signIn(page.request, wallet);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/dashboard/profile");
    await expect(page.getByRole("heading", { name: "Identity" })).toBeVisible();
    await waitForSplashGone(page);

    const ticker = page.locator('[role="status"]').filter({ hasText: "Block" });
    await expect(page).toHaveScreenshot("profile-desktop.png", { mask: [ticker] });
  });

  test("mobile (375x812)", async ({ page }) => {
    const wallet = randomTestWallet();
    await signIn(page.request, wallet);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard/profile");
    await expect(page.getByRole("heading", { name: "Identity" })).toBeVisible();
    await waitForSplashGone(page);

    await expect(page).toHaveScreenshot("profile-mobile.png");
  });
});
