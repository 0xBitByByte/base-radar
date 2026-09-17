import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";

const QUEUE_KEY = "base-radar:sync-queue";
const CONFLICTS_KEY = "base-radar:sync-conflicts";
const STATUS_KEY = "base-radar:sync-status";

function clearSyncStorage() {
  window.localStorage.removeItem(QUEUE_KEY);
  window.localStorage.removeItem(CONFLICTS_KEY);
  window.localStorage.removeItem(STATUS_KEY);
}

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", { value: online, configurable: true });
}

/** `lib/sync/service.ts` is a module singleton — a fresh epoch per test keeps its in-memory queue/conflicts/status isolated, the same technique `tests/lib/sync/service.test.ts` already established. */
async function freshHook() {
  vi.resetModules();
  const { useSyncStatus } = await import("@/lib/hooks/useSyncStatus");
  const syncService = await import("@/lib/sync/service");
  const { buildOperation } = await import("@/lib/sync/queue");
  return { useSyncStatus, syncService, buildOperation };
}

describe("useSyncStatus", () => {
  const originalOnLine = window.navigator.onLine;
  beforeEach(() => {
    clearSyncStorage();
    setOnline(true);
  });
  afterEach(() => {
    clearSyncStorage();
    setOnline(originalOnLine);
  });

  it("starts idle with an honest, empty snapshot", async () => {
    const { useSyncStatus } = await freshHook();
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.syncStatus).toBe("idle");
    expect(result.current.pendingOperations).toEqual([]);
    expect(result.current.conflicts).toEqual([]);
    expect(result.current.lastSyncAt).toBeNull();
    expect(result.current.isOffline).toBe(false);
    expect(result.current.hasConflicts).toBe(false);
  });

  it("a real enqueued operation is visible on the next render and shifts status to pending", async () => {
    const { useSyncStatus, syncService, buildOperation } = await freshHook();
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    });

    expect(result.current.pendingOperations).toHaveLength(1);
    expect(result.current.syncStatus).toBe("pending");
  });

  it("retrySync honestly transitions to error against the real, backend-less connector", async () => {
    const { useSyncStatus, syncService, buildOperation } = await freshHook();
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    });
    await act(async () => {
      await result.current.retrySync();
    });

    expect(result.current.syncStatus).toBe("error");
  });

  it("clearQueue empties the real queue", async () => {
    const { useSyncStatus, syncService, buildOperation } = await freshHook();
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    });
    act(() => {
      result.current.clearQueue();
    });

    expect(result.current.pendingOperations).toEqual([]);
    expect(result.current.syncStatus).toBe("idle");
  });

  it("hasConflicts and conflicts reflect a real recorded conflict", async () => {
    const { useSyncStatus, syncService } = await freshHook();
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      syncService.recordConflict("account", "acct-1", { a: 1 }, { a: 2 });
    });

    expect(result.current.hasConflicts).toBe(true);
    expect(result.current.conflicts).toHaveLength(1);
    expect(result.current.syncStatus).toBe("conflict");
  });

  it("reflects real offline state and clears it on a real 'online' event", async () => {
    setOnline(false);
    const { useSyncStatus } = await freshHook();
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.isOffline).toBe(true);
    expect(result.current.syncStatus).toBe("offline");

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current.isOffline).toBe(false);
  });

  it("two hook instances stay in sync — a mutation from one is visible in the other", async () => {
    const { useSyncStatus, syncService, buildOperation } = await freshHook();
    const a = renderHook(() => useSyncStatus());
    const b = renderHook(() => useSyncStatus());

    act(() => {
      syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    });

    expect(a.result.current.pendingOperations).toHaveLength(1);
    expect(b.result.current.pendingOperations).toHaveLength(1);
  });

  it("hydration safety: the server-rendered snapshot never reads live localStorage — a real queued operation that already exists in storage (which real SSR, with no `window`, could never see) must never appear in the server-rendered HTML", async () => {
    const { useSyncStatus, syncService, buildOperation } = await freshHook();
    syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));

    function Probe() {
      const { pendingOperations } = useSyncStatus();
      return <span>{pendingOperations.length} pending</span>;
    }

    const html = renderToString(<Probe />);
    expect(html.replace(/<!--\s*-->/g, "")).toContain("0 pending");
  });
});
