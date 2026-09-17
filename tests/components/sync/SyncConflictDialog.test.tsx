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

/** Fresh module registry per test — `lib/sync/service.ts` is a module singleton (its `conflicts` array is only ever read at import time and mutated in-memory), so a real, isolated test needs its own epoch, the same technique `tests/lib/sync/service.test.ts` and `tests/lib/sync/diagnostics.test.ts` already established. */
async function freshDialog() {
  vi.resetModules();
  const { SyncConflictDialog } = await import("@/components/sync/SyncConflictDialog");
  const syncService = await import("@/lib/sync/service");
  return { SyncConflictDialog, syncService };
}

describe("SyncConflictDialog", () => {
  beforeEach(clearSyncStorage);
  afterEach(clearSyncStorage);

  it("shows an honest empty state when there are no real conflicts — never a bare 'no data' placeholder", async () => {
    const { SyncConflictDialog } = await freshDialog();
    render(<SyncConflictDialog open onOpenChange={() => {}} />);

    expect(screen.getByText("No conflicts recorded. Detecting a real conflict requires a cloud backend, which doesn’t exist yet.")).toBeInTheDocument();
  });

  it("never implies conflict resolution is built or that conflicts sync remotely", async () => {
    const { SyncConflictDialog } = await freshDialog();
    render(<SyncConflictDialog open onOpenChange={() => {}} />);

    expect(screen.getByText(/Conflict resolution isn.t built yet/)).toBeInTheDocument();
  });

  it("renders a real recorded conflict, unresolved by default", async () => {
    const { SyncConflictDialog, syncService } = await freshDialog();
    syncService.recordConflict("account", "acct-1", { name: "Local" }, { name: "Remote" });

    render(<SyncConflictDialog open onOpenChange={() => {}} />);

    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("acct-1")).toBeInTheDocument();
    expect(screen.getByText("Unresolved")).toBeInTheDocument();
  });

  it("reflects a real resolved conflict's own state, distinct from an unresolved one", async () => {
    const { SyncConflictDialog, syncService } = await freshDialog();
    syncService.recordConflict("watchlist", "wl-1", { a: 1 }, { a: 2 });
    syncService.recordConflict("watchlist", "wl-2", { b: 1 }, { b: 2 });
    syncService.resolveConflict("watchlist", "wl-1");

    render(<SyncConflictDialog open onOpenChange={() => {}} />);

    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("Unresolved")).toBeInTheDocument();
  });

  it("Close button invokes onOpenChange(false)", async () => {
    const { SyncConflictDialog } = await freshDialog();
    const onOpenChange = vi.fn();
    render(<SyncConflictDialog open onOpenChange={onOpenChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders no dialog content at all when closed — a real closed state, not just visually hidden", async () => {
    const { SyncConflictDialog } = await freshDialog();
    render(<SyncConflictDialog open={false} onOpenChange={() => {}} />);
    expect(screen.queryByText("Sync Conflicts")).not.toBeInTheDocument();
  });

  it("exposes a real accessible dialog title", async () => {
    const { SyncConflictDialog } = await freshDialog();
    render(<SyncConflictDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Sync Conflicts" })).toBeInTheDocument();
  });
});
