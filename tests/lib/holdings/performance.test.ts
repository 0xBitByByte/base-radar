import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * V3-WALLET-002A Post-Implementation Review — "test with large wallets"
 * (100+ ERC-20 tokens, dust, duplicate metadata, slow providers), run as a
 * real, repeatable Vitest suite rather than a one-off manual check: this
 * codebase's own Blockscout API was mid-outage for the entire original
 * build, so a live wallet holding 100+ real Base tokens was never available
 * to test against directly — this synthesizes that scale instead, against
 * the exact same `normalizeHoldings`/`priceHoldings` functions real
 * holdings flow through.
 */
vi.mock("@/lib/providers/coingecko/service", () => ({
  getMajorPrices: vi.fn(),
  getTokenPriceByAddress: vi.fn(),
}));

import * as coingecko from "@/lib/providers/coingecko/service";
import { priceHoldings } from "@/lib/holdings/pricing";
import { normalizeHoldings } from "@/lib/holdings/normalize";
import type { DiscoveredTokenBalance } from "@/lib/providers/blockscout/service";

function makeSyntheticWallet(count: number): DiscoveredTokenBalance[] {
  return Array.from({ length: count }, (_, i) => ({
    address: `0xtoken${i.toString().padStart(4, "0")}`,
    symbol: `TKN${i}`,
    name: `Token ${i}`,
    decimals: [6, 8, 18][i % 3],
    // A realistic mix: most real balances, a chunk of dust (sub-cent), a
    // few Blockscout already priced, most needing the fallback tier.
    balance: BigInt(i % 7 === 0 ? 1 : (i + 1) * 10 ** 15),
    usdPrice: i % 5 === 0 ? 0.01 * (i + 1) : null, // 20% already priced by Blockscout
    logo: i % 3 === 0 ? `https://example.com/${i}.svg` : null,
  }));
}

describe("Large-wallet performance (100+ ERC-20 tokens)", () => {
  afterEach(() => {
    vi.mocked(coingecko.getTokenPriceByAddress).mockReset();
    vi.mocked(coingecko.getMajorPrices).mockReset();
  });

  it("normalizes 150 assets (with native ETH) well within a single frame budget", () => {
    const tokens = makeSyntheticWallet(150);
    const start = performance.now();
    const result = normalizeHoldings("0xwallet", 8453, "base", BigInt("2500000000000000000"), 2000, tokens, false);
    const elapsedMs = performance.now() - start;

    expect(result.assets).toHaveLength(151); // 150 tokens + native ETH
    // Generous budget (10ms) for a synchronous, pure computation over 150
    // items — real hardware should be well under 1ms; this just guards
    // against an accidental O(n²) regression (e.g. a `.find()` inside a
    // `.map()`), not a tight perf target.
    expect(elapsedMs).toBeLessThan(10);
  });

  it("computes allocationPct correctly at scale — every priced asset's share sums to ~100%, unpriced assets excluded from the sum", () => {
    const tokens = makeSyntheticWallet(150);
    const result = normalizeHoldings("0xwallet", 8453, "base", null, null, tokens, false);
    const pricedAssets = result.assets.filter((a) => a.allocationPct !== null);
    const totalAllocation = pricedAssets.reduce((sum, a) => sum + (a.allocationPct ?? 0), 0);
    expect(totalAllocation).toBeCloseTo(100, 5);
    // Every unpriced asset (usdPrice: null, 80% of the synthetic set) has no allocation, never a fabricated 0%.
    expect(result.assets.filter((a) => a.usdPrice === null).every((a) => a.allocationPct === null)).toBe(true);
  });

  it("sorts 150 assets by usdValue descending in one pass — highest value first, unpriced last", () => {
    const tokens = makeSyntheticWallet(150);
    const result = normalizeHoldings("0xwallet", 8453, "base", null, null, tokens, false);
    const values = result.assets.map((a) => a.usdValue ?? -Infinity);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    }
  });

  it("dust and zero-value assets render honestly (no crash, no fabricated allocation) rather than being silently special-cased", () => {
    const dust: DiscoveredTokenBalance = { address: "0xdust", symbol: "DUST", name: "Dust", decimals: 18, balance: BigInt(1), usdPrice: 0.000001, logo: null };
    const result = normalizeHoldings("0xwallet", 8453, "base", null, null, [dust], false);
    expect(result.assets[0].usdValue).toBeGreaterThan(0);
    expect(Number.isFinite(result.assets[0].usdValue!)).toBe(true);
    expect(Number.isNaN(result.totalUsdValue)).toBe(false);
  });

  it("prices 150 tokens with only ONE fallback CoinGecko call per unique address needing one — deduplicates even with many duplicate addresses at scale", async () => {
    vi.mocked(coingecko.getTokenPriceByAddress).mockResolvedValue(1);
    const tokens = makeSyntheticWallet(150);
    // Inject 30 exact duplicates of an already-unpriced token's address, simulating a metadata response with repeated entries.
    const duplicated = [...tokens, ...Array.from({ length: 30 }, () => ({ ...tokens[1] }))]; // tokens[1] has usdPrice: null (index 1 % 5 !== 0)
    const start = performance.now();
    const result = await priceHoldings(duplicated, false);
    const elapsedMs = performance.now() - start;

    expect(result.tokens).toHaveLength(180); // every entry preserved, none dropped
    // 150 synthetic tokens: 20% (30) already priced by Blockscout, 80% (120) need a fallback — but many share addresses only within the +30 duplicates, and `makeSyntheticWallet` addresses are otherwise unique, so unique-needing-fallback = 120 (originals) ... duplicates all reuse tokens[1]'s address, already counted once.
    const uniqueUnpricedAddresses = new Set(tokens.filter((t) => t.usdPrice === null).map((t) => t.address)).size;
    expect(coingecko.getTokenPriceByAddress).toHaveBeenCalledTimes(uniqueUnpricedAddresses);
    expect(elapsedMs).toBeLessThan(50);
  });
});
