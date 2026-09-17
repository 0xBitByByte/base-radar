import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { createMockConnector } from "@/lib/sync/connectors/mock";
import { buildOperation } from "@/lib/sync/queue";
import type { Account } from "@/lib/account/types";

/**
 * Bug fix (Guest + Sign Out follow-up — profile not restored on re-sign-in)
 * — `useCloudSyncActivation` fired `performSync()` (push) and `performPull()`
 * (pull) with `void` back-to-back and no ordering between them.
 * `performPull()`'s own reconciliation treats any locally-queued operation
 * with `status !== "success"` as a real, unresolved conflict — so a
 * previously-queued-but-not-yet-pushed profile edit (e.g. one interrupted by
 * a reload before its push finished) could still read as "pending" when
 * pull's check ran, racing against the very push meant to resolve it. That
 * blocked the real remote data from ever applying. Confirmed live: the same
 * wallet's previously-saved name/username/avatar never came back on a later
 * sign-in, with the Topbar showing "Conflict".
 *
 * This reproduces the race directly: a real connector (delayed push, the
 * same `MockConnector` `tests/lib/sync/service.test.ts` already uses for
 * reconciliation tests) registered under the real "backend" connector id
 * `useCloudSyncActivation` activates, with one operation already queued
 * (the stranded edit) before sign-in. Fails under the old fire-and-forget
 * ordering; passes once push is genuinely awaited before pull runs.
 */
const AUTH_ACCOUNT: Account = {
  id: "acct-1",
  name: "Alex Rivera",
  username: "alexr",
  email: null,
  avatar: null,
  bio: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  lastActiveAt: "2026-01-01T00:00:00.000Z",
  isGuest: false,
};

const CLOUD_ACCOUNT: Account = {
  id: "acct-1",
  name: "Cloud Restored Name",
  username: "alexr_cloud",
  email: null,
  avatar: "https://example.com/avatar.png",
  bio: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  lastActiveAt: "2026-01-02T00:00:00.000Z",
  isGuest: false,
};

async function freshModules() {
  vi.resetModules();
  const { useCloudSyncActivation } = await import("@/lib/hooks/useCloudSyncActivation");
  const accountService = await import("@/lib/account/service");
  const syncService = await import("@/lib/sync/service");
  const registry = await import("@/lib/sync/connectors/registry");
  return { useCloudSyncActivation, accountService, syncService, registry };
}

function Harness({ useCloudSyncActivation }: { useCloudSyncActivation: () => void }) {
  useCloudSyncActivation();
  return null;
}

describe("useCloudSyncActivation — push/pull ordering on sign-in", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ state: "authenticated", account: AUTH_ACCOUNT }), { status: 200 }))
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("applies the real remote profile instead of racing it into a false conflict", async () => {
    const { useCloudSyncActivation, accountService, syncService, registry } = await freshModules();

    // The stranded edit: queued locally, never confirmed synced — exactly
    // what a push interrupted by a reload before this fix would leave behind.
    syncService.enqueueOperation(buildOperation("update", "account", "acct-1", JSON.stringify(AUTH_ACCOUNT)));

    // A real connector, registered as "backend" (the id this hook activates
    // on sign-in) — push is deliberately slow and pull is deliberately
    // instant, so a pull fired without waiting for push to finish would
    // still see the queued operation as "pending" (reproducing the race).
    const baseMock = createMockConnector({ scenario: "success" });
    baseMock.setPullOperations([buildOperation("update", "account", "acct-1", JSON.stringify(CLOUD_ACCOUNT))]);
    const mockBackend = {
      ...baseMock,
      id: "backend",
      push: async (operations: Parameters<typeof baseMock.push>[0]) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return baseMock.push(operations);
      },
    };
    registry.register(mockBackend);

    render(<Harness useCloudSyncActivation={useCloudSyncActivation} />);

    await waitFor(
      () => {
        expect(accountService.getAccount().name).toBe("Cloud Restored Name");
      },
      { timeout: 2000 }
    );

    expect(accountService.getAccount().username).toBe("alexr_cloud");
    expect(syncService.getConflicts()).toEqual([]);
    expect(syncService.getSyncStatus().state).not.toBe("conflict");
  });
});
