import { describe, expect, it } from "vitest";

import { getOrSet } from "@/lib/providers/common/cache";
import { invalidateHoldingsCache } from "@/lib/holdings/cache";

describe("invalidateHoldingsCache — cache invalidation", () => {
  it("clears the exact keys base.getEthBalance / blockscout.getAddressTokenBalances use, so the next getOrSet call is a genuine cache miss", async () => {
    const address = "0xCacheTestWallet";
    const normalized = address.toLowerCase();

    let ethCalls = 0;
    let tokenCalls = 0;
    const ethKey = `base:eth-balance:${normalized}`;
    const tokenKey = `blockscout:token-balances:${normalized}`;

    await getOrSet(ethKey, 60_000, async () => {
      ethCalls++;
      return "eth-value";
    });
    await getOrSet(tokenKey, 60_000, async () => {
      tokenCalls++;
      return "token-value";
    });
    expect(ethCalls).toBe(1);
    expect(tokenCalls).toBe(1);

    // Still within TTL — a second call must be a real cache hit (no re-fetch).
    await getOrSet(ethKey, 60_000, async () => {
      ethCalls++;
      return "eth-value";
    });
    expect(ethCalls).toBe(1);

    invalidateHoldingsCache(address);

    await getOrSet(ethKey, 60_000, async () => {
      ethCalls++;
      return "eth-value-2";
    });
    await getOrSet(tokenKey, 60_000, async () => {
      tokenCalls++;
      return "token-value-2";
    });
    expect(ethCalls).toBe(2);
    expect(tokenCalls).toBe(2);
  });

  it("is case-insensitive — invalidating a mixed-case address clears the same lowercased cache key a real lookup used", async () => {
    const lower = "0xabc123";
    let calls = 0;
    const key = `base:eth-balance:${lower}`;

    await getOrSet(key, 60_000, async () => {
      calls++;
      return "v1";
    });
    expect(calls).toBe(1);

    invalidateHoldingsCache("0xABC123"); // same address, different case
    await getOrSet(key, 60_000, async () => {
      calls++;
      return "v2";
    });
    expect(calls).toBe(2);
  });

  it("does not affect an unrelated cache key for a different address", async () => {
    let calls = 0;
    const untouchedKey = "base:eth-balance:0xdifferentwallet";

    await getOrSet(untouchedKey, 60_000, async () => {
      calls++;
      return "v1";
    });

    invalidateHoldingsCache("0xSomeOtherWallet");

    await getOrSet(untouchedKey, 60_000, async () => {
      calls++;
      return "v1";
    });
    expect(calls).toBe(1); // still cached — untouched by an unrelated invalidation
  });
});
