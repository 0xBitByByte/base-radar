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

/** Diagnostics binds to both the Sync and Account services (`lib/sync/diagnostics.ts`'s own `subscribe()`), so a real, isolated render needs all three modules from the same fresh epoch. */
async function freshDialog() {
  vi.resetModules();
  const { SyncDiagnosticsDialog } = await import("@/components/sync/SyncDiagnosticsDialog");
  const syncService = await import("@/lib/sync/service");
  const { buildOperation } = await import("@/lib/sync/queue");
  return { SyncDiagnosticsDialog, syncService, buildOperation };
}

describe("SyncDiagnosticsDialog", () => {
  beforeEach(clearAllStorage);
  afterEach(clearAllStorage);

  it("renders a real, honest default diagnostics snapshot on an untouched device", async () => {
    const { SyncDiagnosticsDialog } = await freshDialog();
    render(<SyncDiagnosticsDialog open onOpenChange={() => {}} />);

    expect(screen.getByText("Queue size")).toBeInTheDocument();
    // Two distinct rows both legitimately read "0" (queue size, pending operations) —
    // assert the row exists and reflects the real default rather than a fabricated one.
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Never")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("carries the honest local-only disclosure", async () => {
    const { SyncDiagnosticsDialog } = await freshDialog();
    render(<SyncDiagnosticsDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/local only, nothing here is sent anywhere/)).toBeInTheDocument();
  });

  it("reflects a real enqueued operation's queue size", async () => {
    const { SyncDiagnosticsDialog, syncService, buildOperation } = await freshDialog();
    syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));

    render(<SyncDiagnosticsDialog open onOpenChange={() => {}} />);
    const queueRow = screen.getByText("Queue size").closest("div");
    expect(queueRow).toHaveTextContent("1");
  });

  it("shows Healthy storage integrity for a real, uncorrupted device", async () => {
    const { SyncDiagnosticsDialog } = await freshDialog();
    render(<SyncDiagnosticsDialog open onOpenChange={() => {}} />);
    expect(screen.getAllByText("Healthy").length).toBeGreaterThan(0);
  });

  it("reports a genuine integrity issue when the raw queue is actually corrupted", async () => {
    const { SyncDiagnosticsDialog } = await freshDialog();
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify({ version: 3, operations: [{ id: "sync:bad", type: "explode" }] }));

    render(<SyncDiagnosticsDialog open onOpenChange={() => {}} />);
    expect(screen.getByText("Issues found")).toBeInTheDocument();
  });

  it("lists each real storage key's own health entry, including one that hasn't been created yet", async () => {
    const { SyncDiagnosticsDialog } = await freshDialog();
    render(<SyncDiagnosticsDialog open onOpenChange={() => {}} />);

    expect(screen.getByText("Sync Queue")).toBeInTheDocument();
    expect(screen.getByText("Sync Conflicts")).toBeInTheDocument();
    expect(screen.getByText("Sync Status")).toBeInTheDocument();
    expect(screen.getAllByText("Not yet created").length).toBeGreaterThan(0);
  });

  it("Close button invokes onOpenChange(false)", async () => {
    const { SyncDiagnosticsDialog } = await freshDialog();
    const onOpenChange = vi.fn();
    render(<SyncDiagnosticsDialog open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("exposes a real accessible dialog title", async () => {
    const { SyncDiagnosticsDialog } = await freshDialog();
    render(<SyncDiagnosticsDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Sync Diagnostics" })).toBeInTheDocument();
  });
});
