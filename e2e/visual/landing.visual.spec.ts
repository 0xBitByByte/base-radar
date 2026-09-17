import { expect, test } from "@playwright/test";

import { waitForSplashGone } from "../fixtures/splash";

/**
 * Landing Page V2 — visual regression baseline. Clipped to Navbar + Hero
 * only, not the full page — following `dashboard.visual.spec.ts`'s own
 * documented reasoning: real, variable-height content further down the
 * page (the marquee, the ticker, the AI Command Center cards) would defeat
 * screenshot determinism even with masking, since a mask paints over
 * pixels without reserving layout space.
 *
 * `reducedMotion: "reduce"` is forced for the whole test — this does two
 * things at once: it freezes `FeaturedEcosystem`'s marquee/`KeyMetrics`'
 * ticker (irrelevant to this clip, but harmless), and — the part that
 * actually matters here — `DashboardPreviewPanel`'s `AnimatedNumber`/
 * `useLivePreviewStats` both check `useReducedMotion()` and, when true,
 * skip the count-up animation and the periodic jitter entirely, rendering
 * the exact fixed `PREVIEW_STATS` values with no timing dependency. Without
 * this, the screenshot's timing relative to the 1.2s count-up and the 4.5s
 * jitter interval would make the stat numbers non-deterministic.
 */
async function clipToNavbarAndHero(page: import("@playwright/test").Page) {
  const hero = page.locator("#hero");
  const box = await hero.boundingBox();
  return {
    x: 0,
    y: 0,
    width: page.viewportSize()!.width,
    height: box ? Math.round(box.y + box.height) : page.viewportSize()!.height,
  };
}

test.describe("Landing Page V2 visual regression", () => {
  test.use({ reducedMotion: "reduce" });

  test("desktop (1920x1080)", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await waitForSplashGone(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot("landing-desktop.png", { clip: await clipToNavbarAndHero(page) });
  });

  test("tablet (768x1024)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await waitForSplashGone(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot("landing-tablet.png", { clip: await clipToNavbarAndHero(page) });
  });

  test("mobile (375x812)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await waitForSplashGone(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot("landing-mobile.png", { clip: await clipToNavbarAndHero(page) });
  });
});
