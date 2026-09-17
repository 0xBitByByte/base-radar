import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useAdminRoles } from "@/lib/hooks/useAdminRoles";
import type { EffectiveAccountRole } from "@/lib/admin/roles";

// Mirrors the exact convention tests/lib/hooks/useAdminOverview.test.tsx and
// tests/lib/hooks/useAdminActivity.test.tsx already establish for this same
// family of admin-fetch hooks (vi.stubGlobal("fetch", ...) +
// renderHook/waitFor/act). The real server-side authorization and mutation
// behavior (resolveAdminPermission, changeAccountRole, self-role-change
// rejection, identity spoofing, Activity Log integration) are already
// covered in tests/app/api/admin/roles/route.test.ts,
// tests/app/api/admin/roles/[accountId]/route.test.ts, and
// tests/lib/admin/roles.test.ts — this file is scoped strictly to
// useAdminRoles's own client-side binding contract: does it correctly map
// each real HTTP outcome to the right state, and — its one piece of real
// logic beyond the read-only admin hooks — does changeRole correctly
// replace state with the server's own real returned snapshot on success
// while leaving it genuinely untouched on rejection (never an optimistic
// update).
function account(overrides: Partial<EffectiveAccountRole> & { accountId: string }): EffectiveAccountRole {
  return {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    name: "Wallet 1234…5678",
    username: "wallet_123456",
    role: "USER",
    isBootstrapRole: true,
    ...overrides,
  };
}

describe("useAdminRoles — initial fetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts loading, then resolves to ready with the real accounts snapshot the server returned", async () => {
    const accounts = [account({ accountId: "acct-1", role: "ADMIN", isBootstrapRole: false }), account({ accountId: "acct-2" })];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ accounts }), { status: 200 })));

    const { result } = renderHook(() => useAdminRoles());
    expect(result.current.state.status).toBe("loading");

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", accounts });
  });

  it("a genuinely empty real accounts list resolves to ready with an honest empty list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ accounts: [] }), { status: 200 })));

    const { result } = renderHook(() => useAdminRoles());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", accounts: [] });
  });

  it("resolves to unauthenticated on a real 401, never rendering fabricated accounts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Sign in to view Role Management." }), { status: 401 })));

    const { result } = renderHook(() => useAdminRoles());
    await waitFor(() => expect(result.current.state.status).toBe("unauthenticated"));
  });

  it("resolves to forbidden on a real 403, distinct from unauthenticated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "You don't have access to Role Management." }), { status: 403 })));

    const { result } = renderHook(() => useAdminRoles());
    await waitFor(() => expect(result.current.state.status).toBe("forbidden"));
  });

  it("resolves to error on a genuine server/network failure, never silently treated as ready or unauthenticated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { result } = renderHook(() => useAdminRoles());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("resolves to error on a 200 response with a genuinely missing accounts field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })));

    const { result } = renderHook(() => useAdminRoles());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("resolves to error on a 200 response where accounts is present but genuinely not an array — a malformed payload, never coerced", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ accounts: "not-an-array" }), { status: 200 })));

    const { result } = renderHook(() => useAdminRoles());
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("retry() re-runs the real fetch on demand and recovers from a prior error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "down" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAdminRoles());
    await waitFor(() => expect(result.current.state.status).toBe("error"));

    const accounts = [account({ accountId: "acct-1" })];
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ accounts }), { status: 200 }));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", accounts });
  });
});

describe("useAdminRoles — changeRole mutation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function readyHook(accounts: EffectiveAccountRole[]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ accounts }), { status: 200 })));
    const { result } = renderHook(() => useAdminRoles());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    return result;
  }

  it("a real successful change PATCHes the correct real URL/body and replaces state with the server's own real returned snapshot", async () => {
    const initial = [account({ accountId: "acct-1", role: "USER" })];
    const result = await readyHook(initial);

    const nextSnapshot = [account({ accountId: "acct-1", role: "ADMIN", isBootstrapRole: false })];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ role: "ADMIN", snapshot: { accounts: nextSnapshot } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    let mutationResult;
    await act(async () => {
      mutationResult = await result.current.changeRole("acct-1", "ADMIN");
    });

    expect(mutationResult).toEqual({ ok: true });
    expect(result.current.state).toEqual({ status: "ready", accounts: nextSnapshot });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/roles/acct-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ role: "ADMIN" });
    expect(init.credentials).toBe("same-origin");
  });

  it("URL-encodes a real accountId that contains characters needing encoding", async () => {
    const result = await readyHook([account({ accountId: "acct/needs encoding" })]);

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ role: "ADMIN", snapshot: { accounts: [] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      await result.current.changeRole("acct/needs encoding", "ADMIN");
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/admin/roles/${encodeURIComponent("acct/needs encoding")}`);
  });

  it("sends the real browser IANA timezone as the x-client-timezone header", async () => {
    const result = await readyHook([account({ accountId: "acct-1" })]);

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ role: "ADMIN", snapshot: { accounts: [] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      await result.current.changeRole("acct-1", "ADMIN");
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["x-client-timezone"]).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it("a real rejected change (e.g. self-role-change, 400) returns the real server error and leaves local state genuinely untouched — never an optimistic update", async () => {
    const initial = [account({ accountId: "acct-1", role: "USER" })];
    const result = await readyHook(initial);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "You cannot change your own role." }), { status: 400 }))
    );

    let mutationResult;
    await act(async () => {
      mutationResult = await result.current.changeRole("acct-1", "ADMIN");
    });

    expect(mutationResult).toEqual({ ok: false, error: "You cannot change your own role." });
    // Still the real, original state — the rejected mutation never touched it.
    expect(result.current.state).toEqual({ status: "ready", accounts: initial });
  });

  it("a rejected change with a malformed/empty error body falls back to the honest default error message", async () => {
    const initial = [account({ accountId: "acct-1" })];
    const result = await readyHook(initial);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not valid json", { status: 500 })));

    let mutationResult;
    await act(async () => {
      mutationResult = await result.current.changeRole("acct-1", "ADMIN");
    });

    expect(mutationResult).toEqual({ ok: false, error: "Something went wrong changing this role." });
    expect(result.current.state).toEqual({ status: "ready", accounts: initial });
  });

  it("a genuine network exception during changeRole returns the honest default error and leaves state untouched", async () => {
    const initial = [account({ accountId: "acct-1" })];
    const result = await readyHook(initial);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    let mutationResult;
    await act(async () => {
      mutationResult = await result.current.changeRole("acct-1", "ADMIN");
    });

    expect(mutationResult).toEqual({ ok: false, error: "Something went wrong changing this role." });
    expect(result.current.state).toEqual({ status: "ready", accounts: initial });
  });

  it("a real success response with a missing/malformed snapshot still reports ok:true but never overwrites real state with malformed data", async () => {
    const initial = [account({ accountId: "acct-1", role: "USER" })];
    const result = await readyHook(initial);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ role: "ADMIN" }), { status: 200 })));

    let mutationResult;
    await act(async () => {
      mutationResult = await result.current.changeRole("acct-1", "ADMIN");
    });

    expect(mutationResult).toEqual({ ok: true });
    // No real snapshot was returned, so the real prior state is left exactly as it was — never replaced with something fabricated.
    expect(result.current.state).toEqual({ status: "ready", accounts: initial });
  });
});
