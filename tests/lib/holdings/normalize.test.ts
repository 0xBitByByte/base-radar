import { describe, expect, it } from "vitest";

import { normalizeHoldings } from "@/lib/holdings/normalize";
import type { DiscoveredTokenBalance } from "@/lib/providers/blockscout/service";

const usdc: DiscoveredTokenBalance = {
  address: "0xusdc",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  balance: BigInt(1_000_000), // 1.000000 USDC
  usdPrice: 1,
  logo: "https://example.com/usdc.svg",
};

const unpricedToken: DiscoveredTokenBalance = {
  address: "0xmystery",
  symbol: "MYST",
  name: "Mystery Token",
  decimals: 18,
  balance: BigInt("1000000000000000000"), // 1.0
  usdPrice: null,
  logo: null,
};

describe("normalizeHoldings", () => {
  it("computes formattedBalance and usdValue for native ETH via viem's formatUnits", () => {
    const result = normalizeHoldings("0xwallet", 8453, "base", BigInt("2500000000000000000"), 2000, [], false);
    const eth = result.assets.find((a) => a.symbol === "ETH");
    expect(eth?.formattedBalance).toBe("2.5");
    expect(eth?.usdValue).toBe(5000);
    expect(eth?.tokenType).toBe("native");
    expect(eth?.address).toBeNull();
  });

  it("excludes native ETH entirely when the balance is zero", () => {
    const result = normalizeHoldings("0xwallet", 8453, "base", BigInt(0), 2000, [], false);
    expect(result.assets.find((a) => a.symbol === "ETH")).toBeUndefined();
  });

  it("computes correct decimal-adjusted balances for tokens with non-18 decimals", () => {
    const result = normalizeHoldings("0xwallet", 8453, "base", null, null, [usdc], false);
    expect(result.assets[0].formattedBalance).toBe("1");
    expect(result.assets[0].usdValue).toBe(1);
  });

  it("leaves usdValue and allocationPct null for a token with an unknown price, never fabricating a value", () => {
    const result = normalizeHoldings("0xwallet", 8453, "base", null, null, [unpricedToken], false);
    expect(result.assets[0].usdValue).toBeNull();
    expect(result.assets[0].allocationPct).toBeNull();
  });

  it("computes totalUsdValue as the sum of only the priced assets — an unpriced asset contributes nothing, not $0 misleadingly counted", () => {
    const result = normalizeHoldings("0xwallet", 8453, "base", BigInt("1000000000000000000"), 2000, [usdc, unpricedToken], false);
    // 1 ETH @ $2000 + 1 USDC @ $1 = $2001; the unpriced token contributes nothing to the sum.
    expect(result.totalUsdValue).toBe(2001);
  });

  it("computes allocationPct as each asset's real share of total known value, summing to ~100% across priced assets", () => {
    const result = normalizeHoldings("0xwallet", 8453, "base", BigInt("1000000000000000000"), 2000, [usdc], false);
    const eth = result.assets.find((a) => a.symbol === "ETH")!;
    const coin = result.assets.find((a) => a.symbol === "USDC")!;
    // total = 2001; ETH = 2000/2001*100 ≈ 99.95%, USDC = 1/2001*100 ≈ 0.05%
    expect(eth.allocationPct).toBeCloseTo(99.95, 1);
    expect(coin.allocationPct).toBeCloseTo(0.05, 1);
    expect(eth.allocationPct! + coin.allocationPct!).toBeCloseTo(100, 5);
  });

  it("never divides by zero when every known asset has $0 total value — allocationPct stays null rather than NaN", () => {
    const zeroPriceToken: DiscoveredTokenBalance = { ...usdc, usdPrice: 0 };
    const result = normalizeHoldings("0xwallet", 8453, "base", null, null, [zeroPriceToken], false);
    expect(result.assets[0].allocationPct).toBeNull();
    expect(Number.isNaN(result.totalUsdValue)).toBe(false);
  });

  it("sorts assets by usdValue descending, with unknown-value assets sorted last", () => {
    const lowValue: DiscoveredTokenBalance = { ...usdc, address: "0xlow", symbol: "LOW", usdPrice: 0.001 };
    const result = normalizeHoldings("0xwallet", 8453, "base", BigInt("1000000000000000000"), 2000, [usdc, unpricedToken, lowValue], false);
    const symbols = result.assets.map((a) => a.symbol);
    expect(symbols).toEqual(["ETH", "USDC", "LOW", "MYST"]);
  });

  it("passes the `partial` flag through unchanged", () => {
    expect(normalizeHoldings("0xwallet", 8453, "base", null, null, [], true).partial).toBe(true);
    expect(normalizeHoldings("0xwallet", 8453, "base", null, null, [], false).partial).toBe(false);
  });

  it("preserves the real balance as a bigint end to end — never coerced through Number", () => {
    const bigBalance = BigInt("123456789012345678901234"); // far beyond Number.MAX_SAFE_INTEGER
    const result = normalizeHoldings("0xwallet", 8453, "base", null, null, [{ ...usdc, balance: bigBalance }], false);
    expect(result.assets[0].balance).toBe(bigBalance);
    expect(typeof result.assets[0].balance).toBe("bigint");
  });
});
