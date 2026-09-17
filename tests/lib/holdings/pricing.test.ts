import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `coingecko/service.ts` is mocked directly — `priceHoldings` only ever
 * needs its two exported functions, and mocking at this boundary (rather
 * than `client.ts`) keeps this test focused on `pricing.ts`'s own merge
 * logic (which tokens get a fallback lookup, which don't, deduplication)
 * without also re-exercising the provider layer's cache/rate-limit wiring —
 * that's already covered by the provider-layer's own tests.
 */
vi.mock("@/lib/providers/coingecko/service", () => ({
  getMajorPrices: vi.fn(),
  getTokenPriceByAddress: vi.fn(),
}));

import * as coingecko from "@/lib/providers/coingecko/service";
import { priceHoldings } from "@/lib/holdings/pricing";
import type { DiscoveredTokenBalance } from "@/lib/providers/blockscout/service";

const token = (overrides: Partial<DiscoveredTokenBalance>): DiscoveredTokenBalance => ({
  address: "0xtoken",
  symbol: "TKN",
  name: "Token",
  decimals: 18,
  balance: BigInt(1),
  usdPrice: null,
  logo: null,
  ...overrides,
});

describe("priceHoldings — price merging", () => {
  afterEach(() => {
    vi.mocked(coingecko.getMajorPrices).mockReset();
    vi.mocked(coingecko.getTokenPriceByAddress).mockReset();
  });

  it("leaves a token's price untouched when Blockscout already provided one — never overwrites a real price with a fallback lookup", async () => {
    const priced = token({ address: "0xa", usdPrice: 1.23 });
    const result = await priceHoldings([priced], false);
    expect(result.tokens[0].usdPrice).toBe(1.23);
    expect(coingecko.getTokenPriceByAddress).not.toHaveBeenCalled();
  });

  it("fetches a fallback price only for tokens Blockscout returned a null price for", async () => {
    vi.mocked(coingecko.getTokenPriceByAddress).mockResolvedValue(4.56);
    const unpriced = token({ address: "0xb", usdPrice: null });
    const result = await priceHoldings([unpriced], false);
    expect(result.tokens[0].usdPrice).toBe(4.56);
    expect(coingecko.getTokenPriceByAddress).toHaveBeenCalledWith("0xb");
    expect(coingecko.getTokenPriceByAddress).toHaveBeenCalledTimes(1);
  });

  it("deduplicates fallback lookups for the same address — never one request per holding when duplicates exist", async () => {
    vi.mocked(coingecko.getTokenPriceByAddress).mockResolvedValue(1);
    const dup1 = token({ address: "0xc", usdPrice: null });
    const dup2 = token({ address: "0xc", usdPrice: null, symbol: "TKN2" });
    await priceHoldings([dup1, dup2], false);
    expect(coingecko.getTokenPriceByAddress).toHaveBeenCalledTimes(1);
  });

  it("leaves the price null (never fabricates one) when the fallback lookup also finds nothing", async () => {
    vi.mocked(coingecko.getTokenPriceByAddress).mockResolvedValue(null);
    const unpriced = token({ address: "0xd", usdPrice: null });
    const result = await priceHoldings([unpriced], false);
    expect(result.tokens[0].usdPrice).toBeNull();
  });

  it("resolves native ETH's price via getMajorPrices only when includeNativeEth is true", async () => {
    vi.mocked(coingecko.getMajorPrices).mockResolvedValue({ ok: true, source: "coingecko", fetchedAt: "now", data: { eth: { usd: 2500, changePct24h: 1 }, btc: { usd: 50000, changePct24h: 1 } } });
    const result = await priceHoldings([], true);
    expect(result.nativeEthUsdPrice).toBe(2500);
    expect(coingecko.getMajorPrices).toHaveBeenCalledTimes(1);
  });

  it("never calls getMajorPrices when includeNativeEth is false (no ETH balance to price)", async () => {
    await priceHoldings([], false);
    expect(coingecko.getMajorPrices).not.toHaveBeenCalled();
  });

  it("leaves nativeEthUsdPrice null when the ETH price lookup fails", async () => {
    vi.mocked(coingecko.getMajorPrices).mockResolvedValue({ ok: false, source: "coingecko", error: { code: "network_error", message: "down" } });
    const result = await priceHoldings([], true);
    expect(result.nativeEthUsdPrice).toBeNull();
  });

  it("preserves every token's identity fields and order, only ever changing usdPrice", async () => {
    vi.mocked(coingecko.getTokenPriceByAddress).mockResolvedValue(9);
    const a = token({ address: "0xa", symbol: "AAA", usdPrice: 1 });
    const b = token({ address: "0xb", symbol: "BBB", usdPrice: null });
    const result = await priceHoldings([a, b], false);
    expect(result.tokens.map((t) => t.symbol)).toEqual(["AAA", "BBB"]);
    expect(result.tokens[0].usdPrice).toBe(1);
    expect(result.tokens[1].usdPrice).toBe(9);
  });
});
