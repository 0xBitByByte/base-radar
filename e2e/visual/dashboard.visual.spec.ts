import { expect, test } from "@playwright/test";

import { waitForSplashGone } from "../fixtures/splash";

/**
 * PR-097.04 (Testing) — visual regression baseline for the Dashboard,
 * the app's highest-traffic route.
 *
 * Scoped to the page's genuinely invariant chrome — Sidebar nav, Topbar
 * (with its live ticker masked), and the static greeting header — rather
 * than the full page. Confirmed live, through several iterations while
 * writing this suite, that every card below the greeting (Executive
 * Summary's highlights list, AI Command Center's recommendation list)
 * has real, variable-length content: even with each card's own text
 * masked, its real HEIGHT still varies between runs (a mask paints over
 * pixels, it doesn't reserve layout space), which reflows everything
 * below it and defeats determinism no matter how much is masked. Clipping
 * to end right after the greeting — the one region confirmed, across
 * several consecutive runs, to never move — is an honest, deliberate
 * scope decision (documented here and in `docs/TESTING.md`), not a
 * forced, flaky full-page baseline. Sidebar/Topbar structure and controls
 * are exactly what a layout/style regression here would actually break.
 */

async function clipToInvariantChrome(page: import("@playwright/test").Page) {
  const subtitle = page.getByText("Here's what's happening across Base today.");
  const box = await subtitle.boundingBox();
  return { x: 0, y: 0, width: page.viewportSize()!.width, height: box ? Math.round(box.y + box.height) + 24 : page.viewportSize()!.height };
}

function maskTicker(page: import("@playwright/test").Page) {
  return [page.locator('[role="status"]').filter({ hasText: "Block" })];
}

test.describe("Dashboard visual regression", () => {
  test("desktop (1920x1080)", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/dashboard");
    await expect(page.getByText("Here's what's happening across Base today.")).toBeVisible();
    await waitForSplashGone(page);
    await expect(page).toHaveScreenshot("dashboard-desktop.png", {
      clip: await clipToInvariantChrome(page),
      mask: maskTicker(page),
    });
  });

  test("tablet (768x1024)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/dashboard");
    await expect(page.getByText("Here's what's happening across Base today.")).toBeVisible();
    await waitForSplashGone(page);
    await expect(page).toHaveScreenshot("dashboard-tablet.png", {
      clip: await clipToInvariantChrome(page),
      mask: maskTicker(page),
    });
  });

  test("mobile (375x812)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");
    await expect(page.getByText("Here's what's happening across Base today.")).toBeVisible();
    await waitForSplashGone(page);
    await expect(page).toHaveScreenshot("dashboard-mobile.png", {
      clip: await clipToInvariantChrome(page),
      mask: maskTicker(page),
    });
  });
});
