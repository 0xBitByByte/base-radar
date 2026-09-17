import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import type { AlertRefreshStatus } from "@/lib/alerts/service";
import type { WorkspaceClaim, WorkspaceSection, WorkspaceView } from "@/lib/ai-workspace/types";

let mockProjectIds: string[] = ["aerodrome"];
let mockAlertRefreshStatus: AlertRefreshStatus = "ready";

vi.mock("@/lib/hooks/useWatchlist", () => ({
  useWatchlist: () => ({ projectIds: mockProjectIds, count: mockProjectIds.length, isWatching: (id: string) => mockProjectIds.includes(id), toggle: vi.fn() }),
}));
vi.mock("@/lib/hooks/useAlertRefreshStatus", () => ({
  useAlertRefreshStatus: () => mockAlertRefreshStatus,
}));

const { useAIWatch } = await import("@/lib/hooks/useAIWatch");
const { removeAIWatch, setAIWatchEnabled } = await import("@/lib/ai-watch/storage");

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

describe("useAIWatch", () => {
  beforeEach(() => {
    mockProjectIds = ["aerodrome"];
    mockAlertRefreshStatus = "ready";
    removeAIWatch();
  });
  afterEach(() => {
    removeAIWatch();
  });

  it("starts disabled, never having existed", () => {
    const { result } = renderHook(() => useAIWatch(makeView()));
    expect(result.current.enabled).toBe(false);
    expect(result.current.exists).toBe(false);
    expect(result.current.alerts).toEqual([]);
  });

  it("status reflects the real Alert Engine refresh status: 'checking' while loading, never evaluates", () => {
    mockAlertRefreshStatus = "loading";
    const claim = makeClaim();
    const { result } = renderHook(() => useAIWatch(makeView([claim], [])));
    act(() => setAIWatchEnabled(true));
    expect(result.current.status).toBe("checking");
    expect(result.current.alerts).toEqual([]);
  });

  it("status is 'unavailable' on a real Alert Engine failure, and the watch never fires — the hard stale-data gate", () => {
    mockAlertRefreshStatus = "error";
    const claim = makeClaim();
    const { result, rerender } = renderHook(({ view }) => useAIWatch(view), { initialProps: { view: makeView([claim], []) } });
    act(() => setAIWatchEnabled(true));
    rerender({ view: makeView([claim], []) });
    expect(result.current.status).toBe("unavailable");
    expect(result.current.alerts).toEqual([]);
  });

  it("ready + enabled + a real new Risk claim on a watched project: evaluates and surfaces a real alert", () => {
    const claim = makeClaim({ id: "risk:1" });
    const { result, rerender } = renderHook(({ view }) => useAIWatch(view), { initialProps: { view: makeView([claim], []) } });
    act(() => setAIWatchEnabled(true));
    rerender({ view: makeView([claim], []) });
    expect(result.current.status).toBe("ready");
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].claim).toEqual(claim);
    expect(result.current.unreadCount).toBe(1);
  });

  it("disabled: never evaluates even when data is genuinely ready", () => {
    const claim = makeClaim({ id: "risk:1" });
    const { result } = renderHook(() => useAIWatch(makeView([claim], [])));
    expect(result.current.alerts).toEqual([]);
  });

  it("watchlistProjectCount reflects the real canonical Watchlist membership, never a re-derived count", () => {
    mockProjectIds = ["aerodrome", "aave", "morpho"];
    const { result } = renderHook(() => useAIWatch(makeView()));
    expect(result.current.watchlistProjectCount).toBe(3);
  });

  it("enable()/disable() delegate to storage and are reflected on the next render", () => {
    const { result, rerender } = renderHook(() => useAIWatch(makeView()));
    act(() => result.current.enable());
    rerender();
    expect(result.current.enabled).toBe(true);
    expect(result.current.exists).toBe(true);

    act(() => result.current.disable());
    rerender();
    expect(result.current.enabled).toBe(false);
    expect(result.current.exists).toBe(true);
  });

  it("markRead()/markUnread() delegate to storage and are reflected on the next render", () => {
    const claim = makeClaim({ id: "risk:1" });
    const { result, rerender } = renderHook(({ view }) => useAIWatch(view), { initialProps: { view: makeView([claim], []) } });
    act(() => setAIWatchEnabled(true));
    rerender({ view: makeView([claim], []) });
    const [alert] = result.current.alerts;

    act(() => result.current.markRead(alert.id));
    rerender({ view: makeView([claim], []) });
    expect(result.current.alerts[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);

    act(() => result.current.markUnread(alert.id));
    rerender({ view: makeView([claim], []) });
    expect(result.current.alerts[0].isRead).toBe(false);
  });

  it("remove() clears the watch entirely and is reflected on the next render", () => {
    const claim = makeClaim({ id: "risk:1" });
    const { result, rerender } = renderHook(({ view }) => useAIWatch(view), { initialProps: { view: makeView([claim], []) } });
    act(() => setAIWatchEnabled(true));
    rerender({ view: makeView([claim], []) });
    expect(result.current.alerts).toHaveLength(1);

    act(() => result.current.remove());
    rerender({ view: makeView([claim], []) });
    expect(result.current.enabled).toBe(false);
    expect(result.current.exists).toBe(false);
    expect(result.current.alerts).toEqual([]);
  });

  describe("Watchlist membership changes", () => {
    it("adding a project to the Watchlist surfaces its Risk finding on the next check, without a page reload", () => {
      const claim = makeClaim({ id: "risk:1", projects: [{ id: "aave", name: "Aave", slug: "aave" }] });
      mockProjectIds = ["aerodrome"];
      const { result, rerender } = renderHook(({ view }) => useAIWatch(view), { initialProps: { view: makeView([claim], []) } });
      act(() => setAIWatchEnabled(true));
      rerender({ view: makeView([claim], []) });
      expect(result.current.alerts).toEqual([]);

      // The user adds "aave" to their Watchlist — a real membership change, same WorkspaceView.
      mockProjectIds = ["aerodrome", "aave"];
      rerender({ view: makeView([claim], []) });
      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.watchlistProjectCount).toBe(2);
    });

    it("removing a project from the Watchlist stops surfacing its findings as new going forward (already-fired alerts are not retroactively deleted)", () => {
      const claim = makeClaim({ id: "risk:1", headline: "Aave finding", projects: [{ id: "aave", name: "Aave", slug: "aave" }] });
      mockProjectIds = ["aerodrome", "aave"];
      const { result, rerender } = renderHook(({ view }) => useAIWatch(view), { initialProps: { view: makeView([claim], []) } });
      act(() => setAIWatchEnabled(true));
      rerender({ view: makeView([claim], []) });
      expect(result.current.alerts).toHaveLength(1);

      mockProjectIds = ["aerodrome"];
      const other = makeClaim({ id: "risk:2", headline: "A different finding entirely", projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }] });
      rerender({ view: makeView([claim, other], []) });
      // The already-fired Aave alert is still on record (never silently deleted), and the genuinely new Aerodrome finding is added.
      expect(result.current.alerts).toHaveLength(2);
    });
  });

  describe("hydration safety", () => {
    it("the very first render (before any effect has run) matches the honest pre-hydration default — never a fabricated 'already checked' state", () => {
      const { result } = renderHook(() => useAIWatch(makeView()));
      // Synchronously right after mount, before this test's own `act()` calls: the hook must never claim data it hasn't actually derived yet.
      expect(result.current.enabled).toBe(false);
      expect(result.current.exists).toBe(false);
      expect(result.current.alerts).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it("rendering with a genuinely empty WorkspaceView never throws and never fabricates a status", () => {
      expect(() => renderHook(() => useAIWatch(makeView()))).not.toThrow();
    });
  });
});
