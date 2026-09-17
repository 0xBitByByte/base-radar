import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkspaceClaim, WorkspaceSection, WorkspaceView } from "@/lib/ai-workspace/types";

const CONFIG_KEY = "base-radar:ai-watch-config";
const ALERTS_KEY = "base-radar:ai-watch-alerts";

function makeClaim(overrides: Partial<WorkspaceClaim> = {}): WorkspaceClaim {
  return {
    id: "claim:1",
    origin: "ai-intelligence",
    category: "security",
    headline: "Headline",
    summary: "Summary",
    confidence: { kind: "level", level: "high", rationale: "rationale", evidenceCount: 1 },
    evidence: [],
    sources: [{ label: "DefiLlama" }],
    projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }],
    generatedAt: "2026-09-01T00:00:00.000Z",
    limitation: null,
    ...overrides,
  };
}

function makeSection(id: "ai-intelligence" | "daily-brief", claims: WorkspaceClaim[]): WorkspaceSection {
  return { id, title: id, description: "", claims, emptyReason: `No ${id} findings yet.` };
}

function makeView(aiClaims: WorkspaceClaim[] = [], briefClaims: WorkspaceClaim[] = []): WorkspaceView {
  return { sections: [makeSection("ai-intelligence", aiClaims), makeSection("daily-brief", briefClaims)], generatedAt: "2026-09-01T00:00:00.000Z" };
}

/** Same "simulated browser refresh" technique as `tests/lib/notifications/storage.test.ts` — resets `lib/ai-watch/storage.ts`'s module-scope cache while leaving real jsdom `localStorage` untouched. */
async function freshStorageModule() {
  vi.resetModules();
  return import("@/lib/ai-watch/storage");
}

describe("AI Watch storage — config persistence across a simulated browser refresh", () => {
  beforeEach(() => {
    window.localStorage.removeItem(CONFIG_KEY);
    window.localStorage.removeItem(ALERTS_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(CONFIG_KEY);
    window.localStorage.removeItem(ALERTS_KEY);
  });

  it("a fresh install starts disabled, with no watch ever created — never a fabricated enabled default", async () => {
    const mod = await freshStorageModule();
    expect(mod.getAIWatchConfig()).toEqual({ enabled: false, createdAt: null });
    expect(mod.getAIWatchAlerts()).toEqual([]);
  });

  it("enabling the watch persists across a refresh", async () => {
    const first = await freshStorageModule();
    first.setAIWatchEnabled(true);
    expect(first.getAIWatchConfig().enabled).toBe(true);
    expect(first.getAIWatchConfig().createdAt).not.toBeNull();

    const second = await freshStorageModule();
    expect(second.getAIWatchConfig().enabled).toBe(true);
  });

  it("disabling persists across a refresh, and createdAt is preserved (not a fresh 'created' every time it's re-enabled)", async () => {
    const first = await freshStorageModule();
    first.setAIWatchEnabled(true);
    const createdAt = first.getAIWatchConfig().createdAt;
    first.setAIWatchEnabled(false);

    const second = await freshStorageModule();
    expect(second.getAIWatchConfig().enabled).toBe(false);
    second.setAIWatchEnabled(true);
    expect(second.getAIWatchConfig().createdAt).toBe(createdAt);
  });

  it("removeAIWatch resets to the honest 'never created' default and persists that reset", async () => {
    const first = await freshStorageModule();
    first.setAIWatchEnabled(true);
    first.runAIWatchCheck(makeView([makeClaim()], []), ["aerodrome"]);
    expect(first.getAIWatchAlerts().length).toBeGreaterThan(0);

    first.removeAIWatch();
    expect(first.getAIWatchConfig()).toEqual({ enabled: false, createdAt: null });
    expect(first.getAIWatchAlerts()).toEqual([]);

    const second = await freshStorageModule();
    expect(second.getAIWatchConfig()).toEqual({ enabled: false, createdAt: null });
    expect(second.getAIWatchAlerts()).toEqual([]);
  });

  it("a corrupted config value falls back to disabled rather than throwing", async () => {
    window.localStorage.setItem(CONFIG_KEY, "not valid json{{{");
    const mod = await freshStorageModule();
    expect(() => mod.getAIWatchConfig()).not.toThrow();
    expect(mod.getAIWatchConfig().enabled).toBe(false);
  });

  it("a corrupted alerts value falls back to an empty list rather than throwing", async () => {
    window.localStorage.setItem(ALERTS_KEY, "not valid json{{{");
    const mod = await freshStorageModule();
    expect(() => mod.getAIWatchAlerts()).not.toThrow();
    expect(mod.getAIWatchAlerts()).toEqual([]);
  });
});

describe("AI Watch storage — runAIWatchCheck: triggers only on a genuinely new finding", () => {
  beforeEach(() => {
    window.localStorage.removeItem(CONFIG_KEY);
    window.localStorage.removeItem(ALERTS_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(CONFIG_KEY);
    window.localStorage.removeItem(ALERTS_KEY);
  });

  it("disabled watch: never evaluates, never persists an alert", async () => {
    const mod = await freshStorageModule();
    const claim = makeClaim();
    const added = mod.runAIWatchCheck(makeView([claim], []), ["aerodrome"]);
    expect(added).toEqual([]);
    expect(mod.getAIWatchAlerts()).toEqual([]);
  });

  it("enabled watch, a real Risk claim on a watched project: produces exactly one new alert citing the real claim verbatim", async () => {
    const mod = await freshStorageModule();
    mod.setAIWatchEnabled(true);
    const claim = makeClaim({ id: "risk:1" });
    const added = mod.runAIWatchCheck(makeView([claim], []), ["aerodrome"]);
    expect(added).toHaveLength(1);
    expect(added[0].claim).toBe(claim);
    expect(added[0].isRead).toBe(false);
    expect(mod.getAIWatchAlerts()).toHaveLength(1);
  });

  it("calling again with the exact same view and Watchlist: a no-op — never re-evaluates identical, unchanged inputs", async () => {
    const mod = await freshStorageModule();
    mod.setAIWatchEnabled(true);
    const view = makeView([makeClaim({ id: "risk:1" })], []);
    mod.runAIWatchCheck(view, ["aerodrome"]);
    const secondCall = mod.runAIWatchCheck(view, ["aerodrome"]);
    expect(secondCall).toEqual([]);
    expect(mod.getAIWatchAlerts()).toHaveLength(1);
  });

  it("an existing (already-persisted) finding never re-fires a duplicate notification, even across a real new WorkspaceView object", async () => {
    const mod = await freshStorageModule();
    mod.setAIWatchEnabled(true);
    mod.runAIWatchCheck(makeView([makeClaim({ id: "risk:1" })], []), ["aerodrome"]);
    expect(mod.getAIWatchAlerts()).toHaveLength(1);

    // A genuinely new WorkspaceView object (e.g. the page re-rendered), but the SAME underlying claim id — still not new.
    const secondAdded = mod.runAIWatchCheck(makeView([makeClaim({ id: "risk:1" })], []), ["aerodrome"]);
    expect(secondAdded).toEqual([]);
    expect(mod.getAIWatchAlerts()).toHaveLength(1);
  });

  it("a second, genuinely new (different headline) Risk finding produces a second alert without disturbing the first", async () => {
    const mod = await freshStorageModule();
    mod.setAIWatchEnabled(true);
    mod.runAIWatchCheck(makeView([makeClaim({ id: "risk:1", headline: "First finding" })], []), ["aerodrome"]);
    const secondAdded = mod.runAIWatchCheck(makeView([makeClaim({ id: "risk:1", headline: "First finding" }), makeClaim({ id: "risk:2", headline: "Second, different finding" })], []), ["aerodrome"]);
    expect(secondAdded).toHaveLength(1);
    expect(secondAdded[0].claim.headline).toBe("Second, different finding");
    expect(mod.getAIWatchAlerts()).toHaveLength(2);
  });

  it("a Risk claim for a project outside the Watchlist never triggers", async () => {
    const mod = await freshStorageModule();
    mod.setAIWatchEnabled(true);
    const claim = makeClaim({ id: "risk:1", projects: [{ id: "unwatched", name: "Unwatched", slug: null }] });
    const added = mod.runAIWatchCheck(makeView([claim], []), ["aerodrome"]);
    expect(added).toEqual([]);
  });

  it("fired alerts persist across a simulated refresh", async () => {
    const first = await freshStorageModule();
    first.setAIWatchEnabled(true);
    first.runAIWatchCheck(makeView([makeClaim({ id: "risk:1" })], []), ["aerodrome"]);

    const second = await freshStorageModule();
    expect(second.getAIWatchAlerts()).toHaveLength(1);
    expect(second.getAIWatchAlerts()[0].claim.id).toBe("risk:1");
  });

  describe("hardening — cross-reload deduplication uses a stable, content-derived identity, never a volatile id/timestamp/confidence", () => {
    it("SAME FINDING ACROSS RELOAD: the identical real condition, regenerated with a new id/timestamp/confidence (exactly what a full page reload does to this app's Alert Engine demo data), never produces a duplicate notification", async () => {
      const first = await freshStorageModule();
      first.setAIWatchEnabled(true);
      const beforeReload = makeClaim({ id: "brief:risk:aerodrome:2026-09-01T00:00:00.000Z", generatedAt: "2026-09-01T00:00:00.000Z", confidence: { kind: "score", value: 82 } });
      first.runAIWatchCheck(makeView([beforeReload], []), ["aerodrome"]);
      expect(first.getAIWatchAlerts()).toHaveLength(1);

      // Simulated full reload: a fresh module instance (in-memory state gone), the SAME real condition re-fetched with a genuinely different id/timestamp/confidence, but the same headline/category/project.
      const second = await freshStorageModule();
      second.setAIWatchEnabled(true);
      const afterReload = makeClaim({ id: "brief:risk:aerodrome:2026-09-08T00:00:00.000Z", generatedAt: "2026-09-08T00:00:00.000Z", confidence: { kind: "score", value: 92 } });
      const added = second.runAIWatchCheck(makeView([afterReload], []), ["aerodrome"]);
      expect(added).toEqual([]);
      expect(second.getAIWatchAlerts()).toHaveLength(1);
    });

    it("GENUINELY NEW FINDING after a reload: a real, distinct finding (different headline) that appears for the first time still produces a real notification", async () => {
      const first = await freshStorageModule();
      first.setAIWatchEnabled(true);
      first.runAIWatchCheck(makeView([makeClaim({ headline: "Existing finding" })], []), ["aerodrome"]);
      expect(first.getAIWatchAlerts()).toHaveLength(1);

      const second = await freshStorageModule();
      second.setAIWatchEnabled(true);
      const added = second.runAIWatchCheck(makeView([makeClaim({ headline: "Existing finding" }), makeClaim({ id: "new:1", headline: "A brand new finding that just appeared" })], []), ["aerodrome"]);
      expect(added).toHaveLength(1);
      expect(added[0].claim.headline).toBe("A brand new finding that just appeared");
      expect(second.getAIWatchAlerts()).toHaveLength(2);
    });

    it("DIFFERENT FINDING: a materially different real condition on the same project (different headline/category) is never suppressed by an unrelated, already-seen finding", async () => {
      const mod = await freshStorageModule();
      mod.setAIWatchEnabled(true);
      mod.runAIWatchCheck(makeView([makeClaim({ id: "sec:1", category: "security", headline: "Aerodrome has a contract security concern" })], []), ["aerodrome"]);
      const added = mod.runAIWatchCheck(
        makeView([makeClaim({ id: "sec:1", category: "security", headline: "Aerodrome has a contract security concern" })], [makeClaim({ id: "decline:1", origin: "daily-brief", category: "Risk", headline: "Aerodrome confidence is declining" })]),
        ["aerodrome"]
      );
      expect(added).toHaveLength(1);
      expect(added[0].claim.headline).toBe("Aerodrome confidence is declining");
      expect(mod.getAIWatchAlerts()).toHaveLength(2);
    });

    it("MULTIPLE NEW FINDINGS in one check: every genuinely new claim is captured, none dropped, none duplicated", async () => {
      const mod = await freshStorageModule();
      mod.setAIWatchEnabled(true);
      const claims = [
        makeClaim({ id: "a", headline: "Finding A", projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }] }),
        makeClaim({ id: "b", headline: "Finding B", projects: [{ id: "aave", name: "Aave", slug: "aave" }] }),
        makeClaim({ id: "c", headline: "Finding C", origin: "daily-brief", category: "Risk", projects: [{ id: "morpho", name: "Morpho", slug: "morpho" }] }),
      ];
      const added = mod.runAIWatchCheck(makeView([claims[0], claims[1]], [claims[2]]), ["aerodrome", "aave", "morpho"]);
      expect(added).toHaveLength(3);
      expect(added.map((a) => a.claim.headline).sort()).toEqual(["Finding A", "Finding B", "Finding C"]);
      expect(mod.getAIWatchAlerts()).toHaveLength(3);
    });

    it("persisted fired state (including the real claim content used for future dedup) survives a simulated reload", async () => {
      const first = await freshStorageModule();
      first.setAIWatchEnabled(true);
      const claim = makeClaim({ headline: "A persisted finding" });
      first.runAIWatchCheck(makeView([claim], []), ["aerodrome"]);

      const second = await freshStorageModule();
      expect(second.getAIWatchAlerts()).toHaveLength(1);
      expect(second.getAIWatchAlerts()[0].claim.headline).toBe("A persisted finding");

      // The same real condition, regenerated (new id/timestamp), must still be recognized as already-seen after this reload.
      const regenerated = makeClaim({ id: "regenerated-id", generatedAt: "2026-09-09T00:00:00.000Z", headline: "A persisted finding" });
      const added = second.runAIWatchCheck(makeView([regenerated], []), ["aerodrome"]);
      expect(added).toEqual([]);
      expect(second.getAIWatchAlerts()).toHaveLength(1);
    });
  });
});

describe("AI Watch storage — read/unread lifecycle", () => {
  beforeEach(() => {
    window.localStorage.removeItem(CONFIG_KEY);
    window.localStorage.removeItem(ALERTS_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(CONFIG_KEY);
    window.localStorage.removeItem(ALERTS_KEY);
  });

  it("markAIWatchAlertRead sets isRead/readAt and persists across a refresh", async () => {
    const first = await freshStorageModule();
    first.setAIWatchEnabled(true);
    const [alert] = first.runAIWatchCheck(makeView([makeClaim({ id: "risk:1" })], []), ["aerodrome"]);
    first.markAIWatchAlertRead(alert.id);
    expect(first.getAIWatchAlerts()[0].isRead).toBe(true);
    expect(first.getAIWatchAlerts()[0].readAt).not.toBeNull();

    const second = await freshStorageModule();
    expect(second.getAIWatchAlerts()[0].isRead).toBe(true);
  });

  it("markAIWatchAlertUnread reverses a read marker", async () => {
    const mod = await freshStorageModule();
    mod.setAIWatchEnabled(true);
    const [alert] = mod.runAIWatchCheck(makeView([makeClaim({ id: "risk:1" })], []), ["aerodrome"]);
    mod.markAIWatchAlertRead(alert.id);
    mod.markAIWatchAlertUnread(alert.id);
    expect(mod.getAIWatchAlerts()[0].isRead).toBe(false);
    expect(mod.getAIWatchAlerts()[0].readAt).toBeNull();
  });
});
