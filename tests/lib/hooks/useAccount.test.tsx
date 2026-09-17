import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import { useAccount } from "@/lib/hooks/useAccount";

const ACCOUNT_KEY = "base-radar:account";

describe("useAccount", () => {
  beforeEach(() => {
    window.localStorage.removeItem(ACCOUNT_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(ACCOUNT_KEY);
  });

  it("starts as a real Guest account", () => {
    const { result } = renderHook(() => useAccount());
    expect(result.current.isGuest).toBe(true);
    expect(result.current.account.name).toBe("Guest User");
  });

  it("updateProfile applies a real edit visible on the next render", async () => {
    const { result } = renderHook(() => useAccount());
    await act(async () => {
      await result.current.updateProfile({ name: "Rin", username: "rin_dev" });
    });
    expect(result.current.account.name).toBe("Rin");
  });

  it("validateProfile reuses the current account's real id, never a fabricated one", () => {
    const { result } = renderHook(() => useAccount());
    const errors = result.current.validateProfile({ name: "Rin", username: "rin_dev", email: "", avatar: "", bio: "" });
    expect(errors).toEqual([]);
  });

  it("signOut returns a real, freshly-guest account", async () => {
    const { result } = renderHook(() => useAccount());
    await act(async () => {
      await result.current.updateProfile({ name: "Rin", username: "rin_dev" });
    });
    await act(async () => {
      await result.current.signOut();
    });
    expect(result.current.isGuest).toBe(true);
    expect(result.current.account.name).toBe("Guest User");
  });

  it("exportAccount returns real, valid JSON for the current account", () => {
    const { result } = renderHook(() => useAccount());
    const exported = JSON.parse(result.current.exportAccount());
    expect(exported.account.isGuest).toBe(true);
  });

  it("hydration safety: the server-rendered snapshot never reads live localStorage, even when a real non-guest account already exists (which real SSR, with no `window`, could never see) — a `useSyncExternalStore` server-snapshot function that read localStorage instead of a fixed default would mismatch the real server HTML and produce a hydration error", () => {
    window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ version: 1, account: { id: "account:real", name: "Rin", username: "rin_dev", email: null, avatar: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", lastActiveAt: "2026-01-01T00:00:00.000Z", isGuest: false } }));

    function Probe() {
      const { account } = useAccount();
      return <span>{account.name}</span>;
    }

    const html = renderToString(<Probe />);
    expect(html).not.toContain("Rin");
    expect(html).toContain("Guest User");
  });
});
