import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useAdminOverview } from "@/lib/hooks/useAdminOverview";

describe("useAdminOverview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts loading, then resolves to ready with the real metrics the server returned", async () => {
    const metrics = {
      totalAccounts: 3,
      accountsActiveLast24h: 1,
      activeSessions: 2,
      additionalLinkedWallets: 0,
      trackedProjects: 765,
      totalWatchlists: 1,
      totalSavedSearches: 4,
      syncOperationsLast24h: 5,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ metrics }), { status: 200 })));

    const { result } = renderHook(() => useAdminOverview());
    expect(result.current.state.status).toBe("loading");

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", metrics });
  });

  it("resolves to unauthenticated on a real 401, never rendering fabricated metrics", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Sign in to view the Admin Dashboard." }), { status: 401 })));

    const { result } = renderHook(() => useAdminOverview());
    await waitFor(() => expect(result.current.state.status).toBe("unauthenticated"));
  });

  it("resolves to forbidden on a real 403, distinct from unauthenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "You don't have access to the Admin Dashboard." }), { status: 403 }))
    );

    const { result } = renderHook(() => useAdminOverview());
    await waitFor(() => expect(result.current.state.status).toBe("forbidden"));
  });

  it("resolves to error on a genuine server/network failure, never silently treated as ready or unauthenticated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { result } = renderHook(() => useAdminOverview());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("resolves to error on a 200 response with a genuinely missing metrics payload — never renders undefined as if it were real data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })));

    const { result } = renderHook(() => useAdminOverview());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("retry() re-runs the real fetch on demand", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "down" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAdminOverview());
    await waitFor(() => expect(result.current.state.status).toBe("error"));

    const metrics = {
      totalAccounts: 1,
      accountsActiveLast24h: 0,
      activeSessions: 0,
      additionalLinkedWallets: 0,
      trackedProjects: 765,
      totalWatchlists: 0,
      totalSavedSearches: 0,
      syncOperationsLast24h: 0,
    };
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ metrics }), { status: 200 }));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
  });
});
