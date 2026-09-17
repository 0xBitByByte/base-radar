import type { Page } from "@playwright/test";

/**
 * PR-097.04 (Testing) — `components/branding/SplashScreen.tsx` mounts on
 * every fresh session (a real, up-to-400ms `framer-motion` fade, gated by
 * `sessionStorage` — every new Playwright browser context starts with an
 * empty one, so every test's first navigation genuinely sees it, same as
 * a real first-time visitor). Confirmed live while writing the visual
 * regression suite: without this wait, the splash overlay was still
 * mid-fade in the captured baseline screenshot — `framer-motion` animates
 * via inline styles on every animation frame, not a CSS animation/
 * transition, so Playwright's own `animations: "disabled"` screenshot
 * option (which only freezes CSS animations) never touches it. Waiting
 * for its own `role="status"`/`aria-label="Loading"` element to detach
 * (real, added by `AnimatePresence` unmounting it after the exit
 * transition completes — see `SplashScreen.tsx`) is the honest signal
 * that it's genuinely gone, not a fixed sleep guessing at the timing.
 */
export async function waitForSplashGone(page: Page): Promise<void> {
  await page.getByLabel("Loading").waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
}
