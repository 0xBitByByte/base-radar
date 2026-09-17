import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useAnalyticsDashboard } from "@/lib/hooks/useAnalyticsDashboard";
import type { AnalyticsSummary } from "@/lib/backend/sqlite/analyticsEvents";

// Mirrors the exact convention tests/lib/hooks/usePerformanceDashboard.test.tsx
// already establishes for this family of admin-fetch hooks
// (vi.stubGlobal("fetch", ...) + renderHook/waitFor/act) — the real
// server-side authorization/aggregation behavior is already covered in
// tests/app/api/observability/analytics/route.test.ts and
// tests/lib/backend/sqlite/analyticsEvents.test.ts; this file is scoped
// strictly to useAnalyticsDashboard's own client-side binding contract.
const SUMMARY: AnalyticsSummary = { totalPageViews: 5, topPaths: [{ path: "/dashboard", eventCount: 3 }, { path: "/dashboard/projects", eventCount: 2 }] };

describe("useAnalyticsDashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts loading, then resolves to ready with the real summary the server returned", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(SUMMARY), { status: 200 })));

    const { result } = renderHook(() => useAnalyticsDashboard());
    expect(result.current.state.status).toBe("loading");

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", summary: SUMMARY });
  });

  it("a genuinely empty real summary resolves to ready with an honest zero/empty state — never treated as an error", async () => {
    const empty: AnalyticsSummary = { totalPageViews: 0, topPaths: [] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(empty), { status: 200 })));

    const { result } = renderHook(() => useAnalyticsDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", summary: empty });
  });

  it("resolves to unauthenticated on a real 401, never rendering fabricated data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Sign in to view the Analytics Dashboard." }), { status: 401 })));

    const { result } = renderHook(() => useAnalyticsDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("unauthenticated"));
  });

  it("resolves to forbidden on a real 403, distinct from unauthenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "You don't have access to the Analytics Dashboard." }), { status: 403 }))
    );

    const { result } = renderHook(() => useAnalyticsDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("forbidden"));
  });

  it("resolves to error on a genuine server/network failure, never silently treated as ready or unauthenticated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { result } = renderHook(() => useAnalyticsDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("resolves to error on a 200 response with a genuinely missing totalPageViews field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ topPaths: [] }), { status: 200 })));

    const { result } = renderHook(() => useAnalyticsDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("resolves to error on a 200 response where topPaths is present but genuinely not an array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ totalPageViews: 0, topPaths: "not-an-array" }), { status: 200 })));

    const { result } = renderHook(() => useAnalyticsDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("retry() re-runs the real fetch on demand and recovers from a prior error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "down" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAnalyticsDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("error"));

    fetchMock.mockResolvedValue(new Response(JSON.stringify(SUMMARY), { status: 200 }));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", summary: SUMMARY });
  });
});
