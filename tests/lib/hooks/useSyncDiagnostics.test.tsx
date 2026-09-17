import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import { ACCOUNT_STORAGE_KEY } from "@/lib/account/storage";

const QUEUE_KEY = "base-radar:sync-queue";
const CONFLICTS_KEY = "base-radar:sync-conflicts";
const STATUS_KEY = "base-radar:sync-status";

function clearAllStorage() {
  window.localStorage.removeItem(QUEUE_KEY);
  window.localStorage.removeItem(CONFLICTS_KEY);
  window.localStorage.removeItem(STATUS_KEY);
  window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}

/** `lib/sync/diagnostics.ts` subscribes to both `lib/sync/service.ts` and `lib/account/service.ts` — a real, isolated test needs all three from the same fresh module epoch. */
async function freshHook() {
  vi.resetModules();
  const { useSyncDiagnostics } = await import("@/lib/hooks/useSyncDiagnostics");
  const syncService = await import("@/lib/sync/service");
  const { buildOperation } = await import("@/lib/sync/queue");
  return { useSyncDiagnostics, syncService, buildOperation };
}

describe("useSyncDiagnostics", () => {
  beforeEach(clearAllStorage);
  afterEach(clearAllStorage);

  it("starts with a real, honest zero state on an untouched device", async () => {
    const { useSyncDiagnostics } = await freshHook();
    const { result } = renderHook(() => useSyncDiagnostics());

    expect(result.current.queueSize).toBe(0);
    expect(result.current.pendingOperationCount).toBe(0);
    expect(result.current.conflictCount).toBe(0);
    expect(result.current.lastSyncAt).toBeNull();
    expect(result.current.storageIntegrity).toBe(true);
    expect(result.current.migrationIntegrity).toBe(true);
  });

  it("updates on a real enqueued operation", async () => {
    const { useSyncDiagnostics, syncService, buildOperation } = await freshHook();
    const { result } = renderHook(() => useSyncDiagnostics());

    act(() => {
      syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    });

    expect(result.current.queueSize).toBe(1);
    expect(result.current.pendingOperationCount).toBe(1);
  });

  it("updates on a real recorded conflict", async () => {
    const { useSyncDiagnostics, syncService } = await freshHook();
    const { result } = renderHook(() => useSyncDiagnostics());

    act(() => {
      syncService.recordConflict("watchlist", "wl-1", { a: 1 }, { a: 2 });
    });

    expect(result.current.conflictCount).toBe(1);
  });

  it("reports a genuine integrity issue from real corrupted storage, not a fabricated one", async () => {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify({ version: 3, operations: [{ id: "sync:bad", type: "explode" }] }));
    const { useSyncDiagnostics } = await freshHook();
    const { result } = renderHook(() => useSyncDiagnostics());

    expect(result.current.storageIntegrity).toBe(false);
    const queueEntry = result.current.storageHealth.find((entry) => entry.key === "Sync Queue")!;
    expect(queueEntry.issueCount).toBeGreaterThan(0);
  });

  it("two hook instances stay in sync — a mutation from one is visible in the other", async () => {
    const { useSyncDiagnostics, syncService, buildOperation } = await freshHook();
    const a = renderHook(() => useSyncDiagnostics());
    const b = renderHook(() => useSyncDiagnostics());

    act(() => {
      syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    });

    expect(a.result.current.queueSize).toBe(1);
    expect(b.result.current.queueSize).toBe(1);
  });

  it("hydration safety: the server-rendered snapshot never reads live localStorage — a real queue/conflict state that already exists in storage (which real SSR, with no `window`, could never see) must never appear in the server-rendered HTML", async () => {
    const { useSyncDiagnostics, syncService, buildOperation } = await freshHook();
    syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    syncService.recordConflict("account", "acct-1", { a: 1 }, { a: 2 });

    function Probe() {
      const { queueSize, conflictCount } = useSyncDiagnostics();
      return <span>{queueSize} queued, {conflictCount} conflicts</span>;
    }

    const html = renderToString(<Probe />);
    const normalized = html.replace(/<!--\s*-->/g, "");
    expect(normalized).toContain("0 queued");
    expect(normalized).toContain("0 conflicts");
  });
});
