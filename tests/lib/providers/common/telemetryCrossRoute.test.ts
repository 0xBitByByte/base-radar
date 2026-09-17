import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * PR-111 — proves the actual defect PR-110.1 found and the actual fix,
 * independent of any single Next.js route: Next.js compiles each route
 * (a Page, a Route Handler) into its own server bundle, and confirmed
 * (by directly grepping `.next/server`'s compiled output in that
 * investigation) that `lib/providers/common/telemetry.ts` and
 * `lib/providers/github/rateLimit.ts` were genuinely duplicated into
 * several separate chunk files — each `require()` of the "same" module
 * from a different bundle re-executes its top-level code and gets its
 * own private module-scope state.
 *
 * `vi.resetModules()` + a fresh dynamic `import()` is the standard way to
 * reproduce that exact situation in a test: it clears Vitest's module
 * registry and forces the next `import()` to genuinely re-evaluate the
 * module's top-level code from scratch — precisely mirroring what a
 * different Next.js route bundle's own independent `require()` does.
 * `globalThis`, unlike the module registry, is never cleared by this —
 * which is exactly the property this fix relies on.
 */

const TELEMETRY_PATH = "@/lib/providers/common/telemetry";
const GITHUB_RATE_LIMIT_PATH = "@/lib/providers/github/rateLimit";

describe("PR-111 — cross-module-instance telemetry sharing", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(async () => {
    const telemetry = await import(TELEMETRY_PATH);
    telemetry.__resetProviderTelemetryForTests();
    const github = await import(GITHUB_RATE_LIMIT_PATH);
    github.__resetGithubRateLimitSnapshotForTests();
  });

  it("Test 1 — same module: a write is readable back through the same import", async () => {
    const telemetry = await import(TELEMETRY_PATH);
    telemetry.__resetProviderTelemetryForTests();

    telemetry.recordProviderCall({ provider: "github", durationMs: 42, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });

    const snapshot = telemetry.getProviderTelemetrySnapshot("github");
    expect(snapshot.calls).toBe(1);
  });

  it("Test 2 — cross-boundary behavior: two genuinely separate module evaluations (simulating two different Next.js route bundles) see the same state", async () => {
    // "Bundle A" — e.g. a Page route's own copy of the module.
    const moduleA = await import(TELEMETRY_PATH);
    moduleA.__resetProviderTelemetryForTests();
    moduleA.recordProviderCall({ provider: "coingecko", durationMs: 10, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });

    // Force a genuinely fresh module evaluation — new top-level `const`/`let`
    // bindings, a brand-new (would-be) `Map` if this were still module-scoped.
    vi.resetModules();

    // "Bundle B" — e.g. the Admin Route Handler's own, separately-evaluated copy.
    const moduleB = await import(TELEMETRY_PATH);
    expect(moduleB).not.toBe(moduleA); // genuinely a different module instance

    const snapshotFromB = moduleB.getProviderTelemetrySnapshot("coingecko");
    expect(snapshotFromB.calls).toBe(1); // B sees what A wrote — real cross-instance sharing, not module-scope luck
  });

  it("Test 3 — Page → Admin visibility: activity recorded by a simulated Page-route module instance is visible through a simulated Admin-route module instance", async () => {
    const pageModule = await import(TELEMETRY_PATH);
    pageModule.__resetProviderTelemetryForTests();

    // Simulate a real Page route's provider call.
    pageModule.recordProviderCall({ provider: "github", durationMs: 500, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });
    pageModule.recordCacheEvent("github", false);
    pageModule.recordRateLimitEvent("github", true);

    vi.resetModules();

    const adminModule = await import(TELEMETRY_PATH);
    const snapshot = adminModule.getProviderTelemetrySnapshot("github");

    expect(snapshot.calls).toBe(1);
    expect(snapshot.cache.misses).toBe(1);
    expect(snapshot.rateLimiter.allowed).toBe(1);
  });

  it("Test 4 — Admin → Page visibility: the sharing is genuinely bidirectional, not a one-way artifact of import order", async () => {
    const adminModule = await import(TELEMETRY_PATH);
    adminModule.__resetProviderTelemetryForTests();

    vi.resetModules();

    const pageModule = await import(TELEMETRY_PATH);
    pageModule.recordProviderCall({ provider: "defillama", durationMs: 20, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });

    vi.resetModules();

    const adminModuleAgain = await import(TELEMETRY_PATH);
    expect(adminModuleAgain.getProviderTelemetrySnapshot("defillama").calls).toBe(1);
  });

  it("the GitHub rate-limit snapshot (the same defect, same admin route, a separate module) is shared identically across module instances", async () => {
    const github = await import(GITHUB_RATE_LIMIT_PATH);
    github.__resetGithubRateLimitSnapshotForTests();

    const headers = new Headers({ "x-ratelimit-limit": "5000", "x-ratelimit-remaining": "4999", "x-ratelimit-reset": "9999999999" });
    github.recordGithubRateLimitHeaders(headers);

    vi.resetModules();

    const githubAgain = await import(GITHUB_RATE_LIMIT_PATH);
    const snapshot = githubAgain.getGithubRateLimitSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot.limit).toBe(5000);
    expect(snapshot.remaining).toBe(4999);
  });

  it("resetting from one module instance genuinely clears state seen by another — proves the reset targets the real shared store, not a stale local reference", async () => {
    const moduleA = await import(TELEMETRY_PATH);
    moduleA.recordProviderCall({ provider: "base", durationMs: 5, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });

    vi.resetModules();
    const moduleB = await import(TELEMETRY_PATH);
    expect(moduleB.getProviderTelemetrySnapshot("base").calls).toBeGreaterThan(0);

    moduleB.__resetProviderTelemetryForTests();

    vi.resetModules();
    const moduleC = await import(TELEMETRY_PATH);
    expect(moduleC.getProviderTelemetrySnapshot("base").calls).toBe(0);
  });
});
