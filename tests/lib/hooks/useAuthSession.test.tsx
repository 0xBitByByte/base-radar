import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import { useAuthSession } from "@/lib/hooks/useAuthSession";

describe("useAuthSession", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ state: "guest" }), { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts loading, then resolves to guest once the real mount-triggered session check completes", async () => {
    const { result } = renderHook(() => useAuthSession());
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("guest"));
    expect(result.current.account).toBeNull();
  });

  it("resolves to authenticated with the real account once the server reports one", async () => {
    const account = {
      id: "acct-1",
      name: "Rin",
      username: "rin_dev",
      email: null,
      avatar: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastActiveAt: "2026-01-01T00:00:00.000Z",
      isGuest: false,
    };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ state: "authenticated", account }), { status: 200 }));

    const { result } = renderHook(() => useAuthSession());
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.account).toEqual(account);
  });

  it("resolves to expired, distinct from guest, when the server reports an expired session", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ state: "expired" }), { status: 200 }));

    const { result } = renderHook(() => useAuthSession());
    await waitFor(() => expect(result.current.status).toBe("expired"));
  });

  it("refresh() re-runs the real session check on demand", async () => {
    const { result } = renderHook(() => useAuthSession());
    await waitFor(() => expect(result.current.status).toBe("guest"));

    const account = {
      id: "acct-1",
      name: "Rin",
      username: "rin_dev",
      email: null,
      avatar: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastActiveAt: "2026-01-01T00:00:00.000Z",
      isGuest: false,
    };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ state: "authenticated", account }), { status: 200 }));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.status).toBe("authenticated");
  });

  it("hydration safety: the server-rendered snapshot is always loading — a real, already-authenticated cached state (which real SSR, with no cookie to read, could never see) must never appear in the server-rendered HTML", async () => {
    const account = {
      id: "acct-1",
      name: "Rin",
      username: "rin_dev",
      email: null,
      avatar: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastActiveAt: "2026-01-01T00:00:00.000Z",
      isGuest: false,
    };
    // A real prior sign-in already populated the module's shared cached
    // state — the exact real-world case a broken getServerSnapshot would
    // leak into SSR output.
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ account, migration: { status: "none" } }), { status: 200 }));
    const { verifySignIn } = await import("@/lib/auth/session");
    await verifySignIn("msg", "0xsig", null);

    function Probe() {
      const { status } = useAuthSession();
      return <span>{status}</span>;
    }

    const html = renderToString(<Probe />);
    expect(html.replace(/<!--\s*-->/g, "")).toContain("loading");
    expect(html).not.toContain("authenticated");
  });
});
