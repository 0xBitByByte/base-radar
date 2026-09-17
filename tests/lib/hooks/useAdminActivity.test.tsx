import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useAdminActivity } from "@/lib/hooks/useAdminActivity";
import type { ActivityLogEntry } from "@/lib/backend/sqlite/activityLog";

// Mirrors the exact convention tests/lib/hooks/useAdminOverview.test.tsx
// already establishes for this same family of admin-fetch hooks
// (vi.stubGlobal("fetch", ...) + renderHook/waitFor/act) — the real
// server-side authorization/route behavior is already covered in
// tests/app/api/admin/activity/route.test.ts and
// tests/lib/admin/authorization.test.ts; this file is scoped strictly to
// useAdminActivity's own client-side binding contract: does it correctly
// map each real HTTP outcome to the right state, and does retry() work.
function entry(overrides: Partial<ActivityLogEntry> & { id: string }): ActivityLogEntry {
  return {
    accountId: "acct-1",
    actorName: "Rajkumar",
    action: "EDIT",
    entityType: "project",
    entityId: "aerodrome-finance",
    entityName: "Aerodrome Finance",
    description: "Rajkumar edited Aerodrome Finance — name",
    changes: [{ field: "name", before: "Aerodrome", after: "Aerodrome Finance" }],
    createdAt: "2026-09-11T08:30:00.000Z",
    timeZone: "Asia/Kolkata",
    ...overrides,
  };
}

describe("useAdminActivity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts loading, then resolves to ready with the real activity the server returned", async () => {
    const activity = [entry({ id: "1" }), entry({ id: "2", action: "REVERT" })];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ activity }), { status: 200 })));

    const { result } = renderHook(() => useAdminActivity());
    expect(result.current.state.status).toBe("loading");

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", activity });
  });

  it("a genuinely empty real activity log resolves to ready with an honest empty list — never treated as an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ activity: [] }), { status: 200 })));

    const { result } = renderHook(() => useAdminActivity());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", activity: [] });
  });

  it("resolves to unauthenticated on a real 401, never rendering fabricated activity", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Sign in to view the Admin Activity Log." }), { status: 401 })));

    const { result } = renderHook(() => useAdminActivity());
    await waitFor(() => expect(result.current.state.status).toBe("unauthenticated"));
  });

  it("resolves to forbidden on a real 403, distinct from unauthenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "You don't have access to the Admin Activity Log." }), { status: 403 }))
    );

    const { result } = renderHook(() => useAdminActivity());
    await waitFor(() => expect(result.current.state.status).toBe("forbidden"));
  });

  it("resolves to error on a genuine server/network failure, never silently treated as ready or unauthenticated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { result } = renderHook(() => useAdminActivity());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("resolves to error on a 200 response with a genuinely missing activity field — never renders undefined as if it were real data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })));

    const { result } = renderHook(() => useAdminActivity());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("resolves to error on a 200 response where activity is present but genuinely not an array — a malformed payload, never coerced", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ activity: "not-an-array" }), { status: 200 })));

    const { result } = renderHook(() => useAdminActivity());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("retry() re-runs the real fetch on demand and recovers from a prior error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "down" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAdminActivity());
    await waitFor(() => expect(result.current.state.status).toBe("error"));

    const activity = [entry({ id: "1" })];
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ activity }), { status: 200 }));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", activity });
  });
});
