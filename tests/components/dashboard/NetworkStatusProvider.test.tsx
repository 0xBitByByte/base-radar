import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { NetworkStatusProvider, useSharedNetworkStatus } from "@/components/dashboard/NetworkStatusProvider";
import * as baseService from "@/lib/providers/base/service";

/**
 * PR-107 — regression coverage for the Base RPC polling consolidation.
 * The property under test: no matter how many components read shared
 * network status, exactly ONE `getBaseNetworkStatus()` call (and one 45s
 * timer) exists per mounted `<NetworkStatusProvider>` — never one per
 * consumer, which is the exact duplication this PR removes (confirmed
 * live in the PR-106/106.1 audits: Topbar + ProfileNetworkLive both
 * polling independently on Project Profile).
 */

vi.mock("@/lib/providers/base/service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/providers/base/service")>("@/lib/providers/base/service");
  return { ...actual, getBaseNetworkStatus: vi.fn() };
});

function networkStatus(gasGwei: number) {
  return {
    ok: true as const,
    data: { gasGwei, blockHeight: 100, estimatedTps: 50, txCountLatestBlock: 10, chainId: 8453 },
    source: "base" as const,
    fetchedAt: new Date().toISOString(),
  };
}

/** A consumer component, mirroring how `Topbar`/`ProfileNetworkLive`/`MarketWidgetLive` each read the shared value. */
function Consumer({ testId }: { testId: string }) {
  const { status } = useSharedNetworkStatus();
  return <div data-testid={testId}>{status ? `gas:${status.gasGwei}` : "no-status"}</div>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(baseService.getBaseNetworkStatus).mockReset();
  vi.mocked(baseService.getBaseNetworkStatus).mockResolvedValue(networkStatus(1));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("NetworkStatusProvider — single shared poller (PR-107)", () => {
  it("multiple consumers under one Provider share the exact same poll — only one getBaseNetworkStatus call, not one per consumer", async () => {
    render(
      <NetworkStatusProvider>
        <Consumer testId="a" />
        <Consumer testId="b" />
        <Consumer testId="c" />
      </NetworkStatusProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(baseService.getBaseNetworkStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("a")).toHaveTextContent("gas:1");
    expect(screen.getByTestId("b")).toHaveTextContent("gas:1");
    expect(screen.getByTestId("c")).toHaveTextContent("gas:1");
  });

  it("polls again after exactly one 45-second interval — never faster, never per-consumer", async () => {
    render(
      <NetworkStatusProvider>
        <Consumer testId="a" />
        <Consumer testId="b" />
      </NetworkStatusProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(baseService.getBaseNetworkStatus).toHaveBeenCalledTimes(1);

    vi.mocked(baseService.getBaseNetworkStatus).mockResolvedValue(networkStatus(2));

    await act(async () => {
      vi.advanceTimersByTime(45_000);
      await Promise.resolve();
    });

    expect(baseService.getBaseNetworkStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("a")).toHaveTextContent("gas:2");
    expect(screen.getByTestId("b")).toHaveTextContent("gas:2");
  });

  it("a consumer rendered outside any Provider gracefully falls back to null status — never throws", () => {
    expect(() => render(<Consumer testId="orphan" />)).not.toThrow();
    expect(screen.getByTestId("orphan")).toHaveTextContent("no-status");
    expect(baseService.getBaseNetworkStatus).not.toHaveBeenCalled();
  });

  it("two independently mounted Providers each poll — confirms the fix is 'one poller per Provider', and documents why only ONE Provider must ever be mounted in the real app", async () => {
    render(
      <>
        <NetworkStatusProvider>
          <Consumer testId="tree1" />
        </NetworkStatusProvider>
        <NetworkStatusProvider>
          <Consumer testId="tree2" />
        </NetworkStatusProvider>
      </>
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Two Providers really do mean two pollers — this is expected and is
    // exactly why DashboardLayout mounts exactly one, at the top of the
    // `/dashboard/*` segment, never per-page or per-component.
    expect(baseService.getBaseNetworkStatus).toHaveBeenCalledTimes(2);
  });
});
