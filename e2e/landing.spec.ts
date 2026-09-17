import { expect, test } from "@playwright/test";

import { waitForSplashGone } from "./fixtures/splash";

/**
 * Landing Page V2 — smoke coverage. The public landing page (`/`) had zero
 * automated coverage of any kind before this file; this establishes the
 * baseline the same way `dashboard.spec.ts` did for `/dashboard`: real
 * headline/CTA content present, no console errors, no horizontal overflow
 * at the three required viewports plus one wide-desktop check.
 */

test.describe("Landing Page V2", () => {
  test("loads with the real hero headline and both CTAs", async ({ page }) => {
    await page.goto("/");
    await waitForSplashGone(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("See Base.");
    await expect(page.getByRole("link", { name: "Explore Base Radar" }).first()).toHaveAttribute("href", "/dashboard");
    await expect(page.getByRole("link", { name: "Explore Projects" }).first()).toHaveAttribute(
      "href",
      "/dashboard/projects"
    );
  });

  test("every major section renders", async ({ page }) => {
    await page.goto("/");
    await waitForSplashGone(page);
    await expect(page.getByRole("heading", { name: "Base intelligence at a glance." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "One intelligence layer. Everything connected." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stop watching the blockchain. Start knowing what matters." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Discover the projects shaping Base." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your wallet. Your portfolio. Your intelligence." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "From Signal to Decision" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Built on trusted Base ecosystem data." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Know what's happening on Base." })).toBeVisible();
  });

  test("no public-facing 'Roadmap' label remains anywhere on the page", async ({ page }) => {
    await page.goto("/");
    await waitForSplashGone(page);
    await expect(page.getByText("Roadmap", { exact: true })).toHaveCount(0);
  });

  test("Navbar 'How It Works' scrolls to the real workflow section", async ({ page }) => {
    await page.goto("/");
    await waitForSplashGone(page);
    await page.getByRole("link", { name: "How It Works" }).first().click();
    await expect(page.locator("#how-it-works")).toBeInViewport();
  });

  /**
   * Bug fix (mobile nav anchor scroll) — closing the mobile drawer and
   * starting `scrollIntoView` in the same tick used to race each other
   * (the drawer's own collapse animation shifted the page layout mid-scroll),
   * landing back at the top of the page instead of the clicked section —
   * reproduced with every in-page anchor link, not specific to "How It
   * Works". The desktop-viewport test above never exercised this path (it
   * clicks the always-visible desktop nav link, not the mobile drawer's),
   * so this is a dedicated mobile-viewport regression test.
   */
  test("mobile drawer: 'How It Works' closes the menu and scrolls to the real section", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await waitForSplashGone(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("banner").getByRole("link", { name: "How It Works" }).click();
    await expect(page.locator("#how-it-works")).toBeInViewport();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await waitForSplashGone(page);
    await page.waitForTimeout(500);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("no horizontal overflow at any required viewport", async ({ page }) => {
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await waitForSplashGone(page);
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow, `horizontal overflow at ${viewport.width}x${viewport.height}`).toBe(false);
    }
  });
});
