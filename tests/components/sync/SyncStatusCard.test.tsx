import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

async function freshCard() {
  vi.resetModules();
  const { SyncStatusCard } = await import("@/components/sync/SyncStatusCard");
  const syncService = await import("@/lib/sync/service");
  const { buildOperation } = await import("@/lib/sync/queue");
  return { SyncStatusCard, syncService, buildOperation };
}

describe("SyncStatusCard", () => {
  beforeEach(clearAllStorage);
  afterEach(clearAllStorage);

  it("carries the honest local-only foundation disclosure", async () => {
    const { SyncStatusCard } = await freshCard();
    render(<SyncStatusCard open onOpenChange={() => {}} />);
    expect(screen.getByText(/Local-only foundation — there is no cloud backend to sync with yet/)).toBeInTheDocument();
  });

  it("reflects a real idle status with an empty queue on an untouched device", async () => {
    const { SyncStatusCard } = await freshCard();
    render(<SyncStatusCard open onOpenChange={() => {}} />);

    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(screen.getByText("Never")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Queue (0)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Conflicts (0)" })).toBeInTheDocument();
  });

  it("a real queued operation shifts the status to Pending and updates the queue count", async () => {
    const { SyncStatusCard, syncService, buildOperation } = await freshCard();
    syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));

    render(<SyncStatusCard open onOpenChange={() => {}} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Queue (1)" })).toBeInTheDocument();
  });

  it("a real failed sync attempt is reported honestly as Error, never a fabricated success", async () => {
    const { SyncStatusCard, syncService, buildOperation } = await freshCard();
    syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    await syncService.performSync();

    render(<SyncStatusCard open onOpenChange={() => {}} />);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("a real recorded conflict updates the conflict count", async () => {
    const { SyncStatusCard, syncService } = await freshCard();
    syncService.recordConflict("account", "acct-1", { a: 1 }, { a: 2 });

    render(<SyncStatusCard open onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "View Conflicts (1)" })).toBeInTheDocument();
    expect(screen.getByText("Conflict")).toBeInTheDocument();
  });

  it("shows Healthy storage/migration status on a real, uncorrupted device", async () => {
    const { SyncStatusCard } = await freshCard();
    render(<SyncStatusCard open onOpenChange={() => {}} />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("Up to date")).toBeInTheDocument();
  });

  it("View Queue closes this dialog and opens the real Sync Queue dialog", async () => {
    const { SyncStatusCard } = await freshCard();
    render(<SyncStatusCard open onOpenChange={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "View Queue (0)" }));
    expect(screen.queryByRole("dialog", { name: "Sync Status" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Sync Queue" })).toBeInTheDocument();
  });

  it("View Conflicts closes this dialog and opens the real Sync Conflicts dialog", async () => {
    const { SyncStatusCard } = await freshCard();
    render(<SyncStatusCard open onOpenChange={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "View Conflicts (0)" }));
    expect(screen.queryByRole("dialog", { name: "Sync Status" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Sync Conflicts" })).toBeInTheDocument();
  });

  it("Diagnostics closes this dialog and opens the real Sync Diagnostics dialog", async () => {
    const { SyncStatusCard } = await freshCard();
    render(<SyncStatusCard open onOpenChange={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "Diagnostics" }));
    expect(screen.queryByRole("dialog", { name: "Sync Status" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Sync Diagnostics" })).toBeInTheDocument();
  });

  it("Close button invokes onOpenChange(false)", async () => {
    const { SyncStatusCard } = await freshCard();
    const onOpenChange = vi.fn();
    render(<SyncStatusCard open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("exposes a real accessible dialog title", async () => {
    const { SyncStatusCard } = await freshCard();
    render(<SyncStatusCard open onOpenChange={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Sync Status" })).toBeInTheDocument();
  });
});
