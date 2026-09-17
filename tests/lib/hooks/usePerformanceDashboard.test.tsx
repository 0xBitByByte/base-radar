import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { usePerformanceDashboard } from "@/lib/hooks/usePerformanceDashboard";
import type { PerformanceMetricSummary } from "@/lib/backend/sqlite/performanceMetrics";

// Mirrors the exact convention tests/lib/hooks/useAdminActivity.test.tsx
// already establishes for this family of admin-fetch hooks
// (vi.stubGlobal("fetch", ...) + renderHook/waitFor/act) — the real
// server-side authorization/aggregation behavior is already covered in
// tests/app/api/observability/performance/route.test.ts and
// tests/lib/backend/sqlite/performanceMetrics.test.ts; this file is
// scoped strictly to usePerformanceDashboard's own client-side binding
// contract.
function metric(overrides: Partial<PerformanceMetricSummary> & { metricName: string }): PerformanceMetricSummary {
  return { sampleCount: 1, average: 1000, min: 1000, max: 1000, goodCount: 1, needsImprovementCount: 0, poorCount: 0, ...overrides };
}

describe("usePerformanceDashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts loading, then resolves to ready with the real summary the server returned", async () => {
    const summary = [metric({ metricName: "LCP" }), metric({ metricName: "CLS", average: 0.05 })];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ summary }), { status: 200 })));

    const { result } = renderHook(() => usePerformanceDashboard());
    expect(result.current.state.status).toBe("loading");

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", summary });
  });

  it("a genuinely empty real summary resolves to ready with an honest empty list — never treated as an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ summary: [] }), { status: 200 })));

    const { result } = renderHook(() => usePerformanceDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", summary: [] });
  });

  it("resolves to unauthenticated on a real 401, never rendering fabricated metrics", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Sign in to view the Performance Dashboard." }), { status: 401 })));

    const { result } = renderHook(() => usePerformanceDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("unauthenticated"));
  });

  it("resolves to forbidden on a real 403, distinct from unauthenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "You don't have access to the Performance Dashboard." }), { status: 403 }))
    );

    const { result } = renderHook(() => usePerformanceDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("forbidden"));
  });

  it("resolves to error on a genuine server/network failure, never silently treated as ready or unauthenticated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { result } = renderHook(() => usePerformanceDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("resolves to error on a 200 response with a genuinely missing summary field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })));

    const { result } = renderHook(() => usePerformanceDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("resolves to error on a 200 response where summary is present but genuinely not an array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ summary: "not-an-array" }), { status: 200 })));

    const { result } = renderHook(() => usePerformanceDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("retry() re-runs the real fetch on demand and recovers from a prior error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "down" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePerformanceDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("error"));

    const summary = [metric({ metricName: "LCP" })];
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ summary }), { status: 200 }));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", summary });
  });
});
