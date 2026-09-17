import { expect, test } from "@playwright/test";

import { randomTestWallet, signIn } from "../fixtures/auth";
import { waitForSplashGone } from "../fixtures/splash";

/**
 * PR-097.04 (Testing) — visual regression baseline for the Topbar and its
 * account menu (open state) — the one UI surface Bug 2 and Bug 3 both
 * changed this session (AI Summary removal, Sign Out fix), so a real
 * layout/style baseline here is directly meaningful, not arbitrary.
 * Scoped to just the header element (not the full page) to keep this
 * screenshot small and focused, per "do not create a huge screenshot
 * matrix." Uses `page.request` for sign-in — see `auth.spec.ts`'s own
 * doc comment.
 */

test.describe("Topbar visual regression", () => {
  test("account menu open (desktop)", async ({ page }) => {
    const wallet = randomTestWallet();
    await signIn(page.request, wallet);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/dashboard");
    await waitForSplashGone(page);
    await page.getByLabel("Open account menu").click();
    await expect(page.getByRole("menuitem", { name: "Sign Out" })).toBeVisible();

    const ticker = page.locator('[role="status"]').filter({ hasText: "Block" });
    await expect(page).toHaveScreenshot("topbar-account-menu.png", {
      clip: { x: 0, y: 0, width: 1920, height: 420 },
      mask: [ticker],
    });
  });
});
