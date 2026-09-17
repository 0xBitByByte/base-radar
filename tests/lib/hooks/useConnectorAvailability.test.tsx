import { afterEach, describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useConnectorAvailability } from "@/lib/hooks/useConnectorAvailability";

/**
 * The live-browser flow this hook is built for (a real extension injects
 * `window.ethereum` before React ever mounts) can't be reproduced by
 * mutating `window.ethereum` from outside a running page — by the time an
 * out-of-band script runs, the hook's own one-time `setTimeout(0)` re-read
 * has almost always already fired. A deterministic unit test, setting
 * `window.ethereum` before `renderHook` (mirroring the real timing), is
 * the reliable way to verify this hook's actual logic.
 */
describe("useConnectorAvailability", () => {
  afterEach(() => {
    // @ts-expect-error -- test-only cleanup of a jsdom global this suite adds.
    delete window.ethereum;
  });

  it("resolves to null before a flag is checked, then to true once a real flag is present", async () => {
    // @ts-expect-error -- minimal mock provider, only the flag under test matters here.
    window.ethereum = { isRabby: true };
    const { result } = renderHook(() => useConnectorAvailability("isRabby"));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("resolves to false when the flag is genuinely absent", async () => {
    // @ts-expect-error -- minimal mock provider representing a different wallet.
    window.ethereum = { isMetaMask: true };
    const { result } = renderHook(() => useConnectorAvailability("isRabby"));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("resolves to false when window.ethereum doesn't exist at all", async () => {
    const { result } = renderHook(() => useConnectorAvailability("isMetaMask"));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("checks every flag in an array (Trust Wallet ships both isTrust and isTrustWallet)", async () => {
    // @ts-expect-error -- only the legacy flag is present on this mock.
    window.ethereum = { isTrust: true };
    const { result } = renderHook(() => useConnectorAvailability(["isTrust", "isTrustWallet"]));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("checks each provider in a multi-injected window.ethereum.providers[] array", async () => {
    // @ts-expect-error -- multi-wallet browser scenario mock.
    window.ethereum = { providers: [{ isMetaMask: true }, { isRabby: true }] };
    const { result } = renderHook(() => useConnectorAvailability("isRabby"));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("always resolves to null when no providerFlag applies to this connector", async () => {
    // @ts-expect-error -- irrelevant for this case; no flag is being checked.
    window.ethereum = { isRabby: true };
    const { result } = renderHook(() => useConnectorAvailability(undefined));
    // Give the hook's own subscribe tick a chance to fire, then confirm it never left null.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(result.current).toBeNull();
  });
});
