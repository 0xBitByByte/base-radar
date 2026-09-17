import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * PR-090.05 defect fix — `lib/alerts/service.ts`'s module-level auto-refresh
 * trigger previously relied on a double `requestAnimationFrame`, which
 * never fires while the document is hidden (a backgrounded/minimized tab).
 * Confirmed live: `/dashboard/reports` (the one real consumer that hard-
 * gates its entire UI on `alertRefreshStatus` ever leaving `"loading"`)
 * stayed on "Checking…" forever when the tab loaded hidden — not because
 * the refresh was slow, but because it was never started at all.
 *
 * Each test imports a fresh instance of the module (`vi.resetModules()` +
 * dynamic `import()`, the same pattern already established elsewhere in
 * this codebase for testing module-singleton stores) so the once-per-
 * module-load trigger can be observed from a clean starting condition
 * every time.
 */

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
}

vi.mock("@/lib/alerts/actions", () => ({ fetchAllProviderAlertsAction: vi.fn(async () => []) }));

describe("lib/alerts/service — auto-refresh trigger and document visibility", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    setVisibility("visible");
    vi.clearAllMocks();
  });

  it("starts the refresh via the existing double-rAF path when the document is already visible on module load", async () => {
    setVisibility("visible");
    const { fetchAllProviderAlertsAction } = await import("@/lib/alerts/actions");
    const { getAlertRefreshStatus } = await import("@/lib/alerts/service");

    // Two real animation frames plus a microtask flush — the exact real timing this trigger already uses.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchAllProviderAlertsAction).toHaveBeenCalled();
    expect(getAlertRefreshStatus()).not.toBe("loading");
  });

  it("does NOT call the refresh action while the document stays hidden — reproduces the exact defect before the fix", async () => {
    setVisibility("hidden");
    const { fetchAllProviderAlertsAction } = await import("@/lib/alerts/actions");
    const { getAlertRefreshStatus } = await import("@/lib/alerts/service");

    // Generous real wait — long enough that a working rAF-only trigger would already have fired.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(fetchAllProviderAlertsAction).not.toHaveBeenCalled();
    // The real, honest consequence of the pre-fix defect: status stays "loading" forever while hidden.
    expect(getAlertRefreshStatus()).toBe("loading");
  });

  it("starts the refresh once the hidden document becomes visible — the actual fix", async () => {
    setVisibility("hidden");
    const { fetchAllProviderAlertsAction } = await import("@/lib/alerts/actions");
    const { getAlertRefreshStatus } = await import("@/lib/alerts/service");

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchAllProviderAlertsAction).not.toHaveBeenCalled();

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchAllProviderAlertsAction).toHaveBeenCalled();
    expect(getAlertRefreshStatus()).not.toBe("loading");
  });
});
