import { expect, test } from "@playwright/test";

/**
 * PR-097.04 (Testing) — Dashboard smoke coverage: the primary route loads
 * with real data, the Topbar's real controls (Watchlist selector, Compare)
 * are present and functional, and the page holds up at desktop/tablet/
 * mobile without horizontal overflow. Only controls confirmed real and
 * present in the current Topbar (`components/dashboard/Topbar.tsx`) are
 * covered — Bug 2 removed the non-functional "AI Summary" stub, so this
 * suite doesn't test for it.
 */

test.describe("Dashboard", () => {
  test("loads with real executive summary and command center content", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Executive Summary")).toBeVisible();
    await expect(page.getByText("AI Command Center")).toBeVisible();
  });

  test("Topbar: Watchlist selector switches the active watchlist", async ({ page }) => {
    await page.goto("/dashboard");
    const trigger = page.getByLabel("Switch active watchlist");
    await expect(trigger).toBeVisible();
    await trigger.click();

    const defiOption = page.getByRole("menuitem", { name: "DeFi" });
    await expect(defiOption).toBeVisible();
    await defiOption.click();

    await expect(trigger).toContainText("DeFi");
  });

  test("Topbar: Compare is a real link, not a disabled placeholder", async ({ page }) => {
    await page.goto("/dashboard");
    const compareLink = page.getByRole("link", { name: /Compare/ });
    await expect(compareLink).toBeVisible();
    await expect(compareLink).toHaveAttribute("href", "/dashboard/compare");
  });

  test("no horizontal overflow at desktop, tablet, or mobile", async ({ page }) => {
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard");
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow, `horizontal overflow at ${viewport.width}x${viewport.height}`).toBe(false);
    }
  });
});
