import { expect, test } from "@playwright/test";

/**
 * PR-097.04 (Testing) — Project Profile smoke coverage: a real project
 * route loads with its real intelligence content (health/confidence,
 * category rank — the C2 performance fix's own target route), an invalid
 * slug correctly 404s, and the page holds up responsively. `aave` is used
 * as the real, stable fixture project (real TVL, real category rank data)
 * already relied on throughout this app's own manual/live verification
 * this session.
 */

test.describe("Project Profile", () => {
  test("a real project route loads with identity and health data", async ({ page }) => {
    await page.goto("/dashboard/projects/aave");
    await expect(page.getByRole("heading", { name: "Aave", exact: true })).toBeVisible();
    await expect(page.getByText(/Health:\s*\d+\/100/)).toBeVisible();
    await expect(page.getByText(/Confidence:\s*\d+\/100/)).toBeVisible();
  });

  test("category rank content renders (the C2 fast-path/rank data path)", async ({ page }) => {
    await page.goto("/dashboard/projects/aave");
    await expect(page.getByText("CATEGORY RANK")).toBeVisible();
    await expect(page.getByText(/Lending rank \(by TVL\)/)).toBeVisible();
  });

  test("an invalid project slug renders the real not-found page", async ({ page }) => {
    // Confirmed live (direct `curl`) that this route's HTTP status is 200,
    // not 404, despite genuinely rendering the not-found UI — this Server
    // Component calls `notFound()` deep inside an async render tree, after
    // Next.js's streaming response has already committed a 200 status
    // line; the status can't be retroactively changed once streaming has
    // started. A real Next.js/App-Router streaming behavior, not a bug in
    // this app — so this test asserts on the real rendered content, the
    // one thing that's actually true, not an HTTP status that isn't.
    await page.goto("/dashboard/projects/this-project-does-not-exist-e2e");
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("no horizontal overflow at desktop, tablet, or mobile", async ({ page }) => {
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard/projects/aave");
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow, `horizontal overflow at ${viewport.width}x${viewport.height}`).toBe(false);
    }
  });
});
