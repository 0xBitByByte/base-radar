import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

async function freshDialog() {
  vi.resetModules();
  const { SyncQueueDialog } = await import("@/components/sync/SyncQueueDialog");
  const syncService = await import("@/lib/sync/service");
  const { buildOperation } = await import("@/lib/sync/queue");
  return { SyncQueueDialog, syncService, buildOperation };
}

describe("SyncQueueDialog", () => {
  const originalOnLine = window.navigator.onLine;
  beforeEach(() => {
    clearSyncStorage();
    setOnline(true);
  });
  afterEach(() => {
    clearSyncStorage();
    setOnline(originalOnLine);
  });

  it("shows a real empty-queue message when nothing is queued", async () => {
    const { SyncQueueDialog } = await freshDialog();
    render(<SyncQueueDialog open onOpenChange={() => {}} />);
    expect(screen.getByText("The queue is empty.")).toBeInTheDocument();
  });

  it("carries the honest local-only disclosure — nothing has ever been sent anywhere", async () => {
    const { SyncQueueDialog } = await freshDialog();
    render(<SyncQueueDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/Nothing here has ever been sent anywhere/)).toBeInTheDocument();
  });

  it("lists a real queued operation with its entity, type, and status", async () => {
    const { SyncQueueDialog, syncService, buildOperation } = await freshDialog();
    syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));

    render(<SyncQueueDialog open onOpenChange={() => {}} />);
    expect(screen.getByText("Watchlist · create")).toBeInTheDocument();
    expect(screen.getByText("wl-1")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("shows a real retry count once an operation has actually failed and been retried", async () => {
    const { SyncQueueDialog, syncService, buildOperation } = await freshDialog();
    syncService.enqueueOperation(buildOperation("update", "account", "acct-1"));
    await syncService.performSync();

    render(<SyncQueueDialog open onOpenChange={() => {}} />);
    expect(screen.getByText("error")).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("1 retry"))).toBeInTheDocument();
  });

  it("Retry Sync is disabled with an empty queue, enabled once something is real and queued", async () => {
    const { SyncQueueDialog, syncService, buildOperation } = await freshDialog();
    const { rerender } = render(<SyncQueueDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Retry Sync" })).toBeDisabled();

    syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    rerender(<SyncQueueDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Retry Sync" })).not.toBeDisabled();
  });

  it("Retry Sync is disabled while genuinely offline, even with real queued work", async () => {
    const { SyncQueueDialog, syncService, buildOperation } = await freshDialog();
    syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    setOnline(false);
    window.dispatchEvent(new Event("offline"));

    render(<SyncQueueDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Retry Sync" })).toBeDisabled();
  });

  it("Clear Queue genuinely empties the real queue", async () => {
    const { SyncQueueDialog, syncService, buildOperation } = await freshDialog();
    syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));

    render(<SyncQueueDialog open onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear Queue" }));

    expect(screen.getByText("The queue is empty.")).toBeInTheDocument();
    expect(syncService.getPendingOperations()).toEqual([]);
  });

  it("Close button invokes onOpenChange(false)", async () => {
    const { SyncQueueDialog } = await freshDialog();
    const onOpenChange = vi.fn();
    render(<SyncQueueDialog open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("exposes a real accessible dialog title", async () => {
    const { SyncQueueDialog } = await freshDialog();
    render(<SyncQueueDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Sync Queue" })).toBeInTheDocument();
  });
});
