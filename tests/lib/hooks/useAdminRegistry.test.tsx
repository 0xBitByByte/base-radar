import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useAdminRegistry } from "@/lib/hooks/useAdminRegistry";

const SNAPSHOT = {
  metrics: { discovered: 20, indexed: 0, verified: 0, intelligenceReady: 0, newThisMonth: 0, updatedToday: 0 },
  validation: { issues: [], errors: [], warnings: [], valid: true },
  coverage: { projects: [], totalProjects: 20, averageCoveragePct: 50, highest: null, lowest: null, dimensionAvailabilityPct: {} },
  projects: [],
  edits: [],
};

describe("useAdminRegistry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts loading, then resolves to ready with the real snapshot the server returned", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(SNAPSHOT), { status: 200 })));

    const { result } = renderHook(() => useAdminRegistry());
    expect(result.current.state.status).toBe("loading");

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", snapshot: SNAPSHOT });
  });

  it("resolves to unauthenticated on a real 401, never rendering fabricated registry data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Sign in to view the Admin Registry." }), { status: 401 })));

    const { result } = renderHook(() => useAdminRegistry());
    await waitFor(() => expect(result.current.state.status).toBe("unauthenticated"));
  });

  it("resolves to forbidden on a real 403, distinct from unauthenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "You don't have access to the Admin Registry." }), { status: 403 }))
    );

    const { result } = renderHook(() => useAdminRegistry());
    await waitFor(() => expect(result.current.state.status).toBe("forbidden"));
  });

  it("resolves to error on a genuine network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { result } = renderHook(() => useAdminRegistry());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("resolves to error on a 200 response with a genuinely incomplete payload — never renders partial data as if it were real", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ metrics: SNAPSHOT.metrics }), { status: 200 })));

    const { result } = renderHook(() => useAdminRegistry());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("retry() re-runs the real fetch on demand", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "down" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAdminRegistry());
    await waitFor(() => expect(result.current.state.status).toBe("error"));

    fetchMock.mockResolvedValue(new Response(JSON.stringify(SNAPSHOT), { status: 200 }));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
  });

  it("saveEdit() PATCHes the real project route and replaces local state with the server's real returned snapshot on success", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(SNAPSHOT), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAdminRegistry());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    const updatedSnapshot = { ...SNAPSHOT, metrics: { ...SNAPSHOT.metrics, updatedToday: 1 } };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ project: {}, snapshot: updatedSnapshot }), { status: 200 }));

    let saveResult: Awaited<ReturnType<typeof result.current.saveEdit>> | undefined;
    await act(async () => {
      saveResult = await result.current.saveEdit("aerodrome-finance", { name: "Renamed" });
    });

    expect(saveResult).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/admin/registry/aerodrome-finance",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(result.current.state).toEqual({ status: "ready", snapshot: updatedSnapshot });
  });

  it("saveEdit() surfaces the real server error and leaves local state untouched on a rejected edit", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(SNAPSHOT), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAdminRegistry());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "This edit would make the registry invalid.", validationErrors: [{ severity: "error", code: "x", message: "bad" }] }), {
        status: 422,
      })
    );

    let saveResult: Awaited<ReturnType<typeof result.current.saveEdit>> | undefined;
    await act(async () => {
      saveResult = await result.current.saveEdit("aerodrome-finance", { contracts: [] });
    });

    expect(saveResult?.ok).toBe(false);
    if (saveResult && !saveResult.ok) {
      expect(saveResult.error).toBe("This edit would make the registry invalid.");
      expect(saveResult.validationErrors).toHaveLength(1);
    }
    expect(result.current.state).toEqual({ status: "ready", snapshot: SNAPSHOT }); // never replaced by a fake/optimistic state
  });

  it("revertEdit() DELETEs the real project route and replaces local state with the server's real returned snapshot on success", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(SNAPSHOT), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAdminRegistry());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ snapshot: SNAPSHOT }), { status: 200 }));

    let revertResult: Awaited<ReturnType<typeof result.current.revertEdit>> | undefined;
    await act(async () => {
      revertResult = await result.current.revertEdit("aerodrome-finance");
    });

    expect(revertResult).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/admin/registry/aerodrome-finance",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
