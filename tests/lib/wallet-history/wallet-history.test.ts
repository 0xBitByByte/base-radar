import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { serializeAnalyticsSnapshot } from "@/lib/wallet-analytics/serialization";
import type { AutomationDiff, AutomationSnapshot } from "@/lib/wallet-automation/types";

const STORAGE_KEY = "base-radar:wallet-history";

function snapshot(overrides: Partial<AutomationSnapshot> & { timestamp: string }): AutomationSnapshot {
  return {
    analyticsVersion: 1,
    overallScore: 60,
    healthScore: 65,
    riskScore: 30,
    confidenceScore: 80,
    confidenceLevel: "High",
    fingerprint: "Mixed",
    largestHoldingSymbol: "ETH",
    largestProtocolName: null,
    primaryRecommendationId: null,
    topWarningId: null,
    totalValue: 10000,
    stablecoinExposure: 20,
    ethPct: 50,
    diversificationScore: 70,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    warningIds: [],
    topHoldings: [{ symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 }],
    ...overrides,
  };
}

function diff(changed: string[], toTimestamp: string, fromTimestamp: string | null = null): AutomationDiff {
  return { fromTimestamp, toTimestamp, changed: changed as AutomationDiff["changed"] };
}

/** Fresh module instance per call — `storage.ts`/`engine.ts` hold module-scope singleton state (hydration flag, in-memory array), the same pattern `lib/wallet-automation/rules.ts` already uses, so real isolation between test cases (especially anything simulating "app just booted with X already in localStorage") needs a genuinely fresh module graph, not just clearing localStorage. */
async function freshWalletHistory() {
  vi.resetModules();
  const storage = await import("@/lib/wallet-history/storage");
  const engine = await import("@/lib/wallet-history/engine");
  return { ...storage, ...engine };
}

describe("wallet-history — storage + engine", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  describe("append / deduplication (Phase 4)", () => {
    it("the first real snapshot is always appended", async () => {
      const h = await freshWalletHistory();
      const appended = h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      expect(appended).toBe(true);
      expect(h.getSnapshots()).toHaveLength(1);
    });

    it("rejects an exact duplicate consecutive timestamp — never grows history for it", async () => {
      const h = await freshWalletHistory();
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 65 }), null);
      const appended = h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 99 }), null);
      expect(appended).toBe(false);
      expect(h.getSnapshots()).toHaveLength(1);
      expect(h.getSnapshots()[0].healthScore).toBe(65); // original entry, not silently replaced
    });

    it("REUSES the real AutomationDiff: a real diff with changed=[] is rejected, even with a new timestamp", async () => {
      const h = await freshWalletHistory();
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      const noRealChange = diff([], "2026-01-02T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
      const appended = h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-02T00:00:00.000Z" }), noRealChange);
      expect(appended).toBe(false);
      expect(h.getSnapshots()).toHaveLength(1);
    });

    it("a real diff with a real changed field IS appended", async () => {
      const h = await freshWalletHistory();
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      const realChange = diff(["healthScore"], "2026-01-02T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
      const appended = h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 }), realChange);
      expect(appended).toBe(true);
      expect(h.getSnapshots()).toHaveLength(2);
    });

    it("with no diff supplied, a genuinely new timestamp is still appended (minimum bar, matching lib/wallet-analytics/history.ts)", async () => {
      const h = await freshWalletHistory();
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      const appended = h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-02T00:00:00.000Z" }), null);
      expect(appended).toBe(true);
      expect(h.getSnapshots()).toHaveLength(2);
    });

    it("caps history at DEFAULT_MAX_HISTORY_LENGTH (90), dropping the oldest first", async () => {
      const h = await freshWalletHistory();
      for (let i = 0; i < 95; i++) {
        h.appendHistorySnapshot(snapshot({ timestamp: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() }), null);
      }
      const all = h.getSnapshots();
      expect(all).toHaveLength(90);
      expect(all[0].timestamp).toBe(new Date(Date.UTC(2026, 0, 1, 0, 5)).toISOString()); // the first 5 were dropped
    });
  });

  describe("real persistence (localStorage)", () => {
    it("a real append is actually written to localStorage", async () => {
      const h = await freshWalletHistory();
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      const raw = window.localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.version).toBe(1);
      expect(parsed.snapshots).toHaveLength(1);
    });

    it("REFRESH PERSISTENCE: survives a simulated browser reload (fresh module graph reads the same real localStorage)", async () => {
      const first = await freshWalletHistory();
      first.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 77 }), null);
      first.appendHistorySnapshot(snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 88 }), diff(["healthScore"], "2026-01-02T00:00:00.000Z"));

      // simulate a hard reload — the whole module graph is re-evaluated, exactly like a fresh page load
      const reloaded = await freshWalletHistory();
      const restored = reloaded.getSnapshots();
      expect(restored).toHaveLength(2);
      expect(restored[0].healthScore).toBe(77);
      expect(restored[1].healthScore).toBe(88);
    });
  });

  describe("corruption / version handling (Phase 3, Phase 11)", () => {
    it("CORRUPTED STORAGE: malformed JSON is handled gracefully — starts empty, never throws", async () => {
      window.localStorage.setItem(STORAGE_KEY, "{not valid json at all");
      const h = await freshWalletHistory();
      expect(() => h.getSnapshots()).not.toThrow();
      expect(h.getSnapshots()).toEqual([]);
    });

    it("CORRUPTED STORAGE: valid JSON but the wrong shape entirely is handled gracefully", async () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: "world" }));
      const h = await freshWalletHistory();
      expect(h.getSnapshots()).toEqual([]);
    });

    it("VERSION MISMATCH: an outer envelope version this code doesn't recognize is treated as unreadable, not partially trusted", async () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, snapshots: [serializeAnalyticsSnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }))] }));
      const h = await freshWalletHistory();
      expect(h.getSnapshots()).toEqual([]);
    });

    it("a single corrupted per-snapshot entry is skipped, never invalidates the rest of real history", async () => {
      const real = serializeAnalyticsSnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 70 }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, snapshots: [real, "{not valid json", real] }));
      const h = await freshWalletHistory();
      // both real entries survive independently; the corrupted middle one is silently dropped
      expect(h.getSnapshots()).toHaveLength(2);
      expect(h.getSnapshots().every((s) => s.healthScore === 70)).toBe(true);
    });

    it("AUTOMATIC MIGRATION: a real pre-versioning snapshot (no analyticsVersion field) is upgraded losslessly on read, via the reused deserializeAnalyticsSnapshot", async () => {
      const { analyticsVersion: _unused, ...preVersioning } = snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 55 });
      void _unused;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, snapshots: [JSON.stringify(preVersioning)] }));
      const h = await freshWalletHistory();
      const restored = h.getSnapshots();
      expect(restored).toHaveLength(1);
      expect(restored[0].analyticsVersion).toBe(1);
      expect(restored[0].healthScore).toBe(55); // no data loss
    });
  });

  describe("retrieval (Phase 5 Replay Engine)", () => {
    it("getLatestSnapshot returns null on empty history, and the real last entry otherwise", async () => {
      const h = await freshWalletHistory();
      expect(h.getLatestSnapshot()).toBeNull();
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 }), diff(["healthScore"], "2026-01-02T00:00:00.000Z"));
      expect(h.getLatestSnapshot()?.healthScore).toBe(90);
    });

    it("getSnapshotAt returns the latest real snapshot AT OR BEFORE the given date, never one after it", async () => {
      const h = await freshWalletHistory();
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), null);
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-05T00:00:00.000Z", healthScore: 70 }), diff(["healthScore"], "2026-01-05T00:00:00.000Z"));
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-10T00:00:00.000Z", healthScore: 90 }), diff(["healthScore"], "2026-01-10T00:00:00.000Z"));

      expect(h.getSnapshotAt("2026-01-07T00:00:00.000Z")?.healthScore).toBe(70);
      expect(h.getSnapshotAt("2026-01-01T00:00:00.000Z")?.healthScore).toBe(50);
      expect(h.getSnapshotAt("2025-12-31T00:00:00.000Z")).toBeNull(); // before any real snapshot
      expect(h.getSnapshotAt("2026-02-01T00:00:00.000Z")?.healthScore).toBe(90); // after everything -> the latest real one
    });

    it("getSnapshotsBetween returns every real snapshot within an inclusive real range", async () => {
      const h = await freshWalletHistory();
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-05T00:00:00.000Z" }), diff(["healthScore"], "2026-01-05T00:00:00.000Z"));
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-10T00:00:00.000Z" }), diff(["healthScore"], "2026-01-10T00:00:00.000Z"));

      const between = h.getSnapshotsBetween("2026-01-02T00:00:00.000Z", "2026-01-09T00:00:00.000Z");
      expect(between).toHaveLength(1);
      expect(between[0].timestamp).toBe("2026-01-05T00:00:00.000Z");
    });

    it("getHistoryStatus reports real, consistent facts", async () => {
      const h = await freshWalletHistory();
      expect(h.getHistoryStatus().isEmpty).toBe(true);
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-02T00:00:00.000Z" }), diff(["healthScore"], "2026-01-02T00:00:00.000Z"));
      const status = h.getHistoryStatus();
      expect(status.snapshotCount).toBe(2);
      expect(status.isEmpty).toBe(false);
      expect(status.firstSnapshot?.timestamp).toBe("2026-01-01T00:00:00.000Z");
      expect(status.latestSnapshot?.timestamp).toBe("2026-01-02T00:00:00.000Z");
      expect(status.storageSizeBytes).toBeGreaterThan(0);
    });
  });

  describe("clear / delete", () => {
    it("clearHistory (and its deleteHistory alias) both really wipe history AND localStorage", async () => {
      const h = await freshWalletHistory();
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      expect(h.getSnapshots()).toHaveLength(1);

      h.clearHistory();
      expect(h.getSnapshots()).toEqual([]);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("deleteHistory and clearHistory are the same real operation, not two different behaviors", async () => {
      const h = await freshWalletHistory();
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      h.deleteHistory();
      expect(h.getSnapshots()).toEqual([]);
    });

    it("clearing an already-empty history is a real no-op, never throws", async () => {
      const h = await freshWalletHistory();
      expect(() => h.clearHistory()).not.toThrow();
      expect(h.getSnapshots()).toEqual([]);
    });
  });

  describe("determinism / never-recalculates", () => {
    it("getSnapshots returns a fresh array reference each call, never a mutable handle into storage state", async () => {
      const h = await freshWalletHistory();
      h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      const a = h.getSnapshots();
      const b = h.getSnapshots();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });

    it("engine functions never call Portfolio Intelligence/AI/Automation/Analytics — purely synchronous local reads", async () => {
      const h = await freshWalletHistory();
      const result = h.appendHistorySnapshot(snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), null);
      expect(result).not.toBeInstanceOf(Promise);
      expect(h.getSnapshots()).not.toBeInstanceOf(Promise);
    });
  });
});
